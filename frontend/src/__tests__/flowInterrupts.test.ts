/**
 * FLOW1 items 1, 2 and 5 — the officer picking the right action, and the
 * right person, without being told she cannot.
 *
 * ═══ THE FAILURE ═══
 *
 * A notary received a REVIEW request. Every component behaved as built:
 * two identical slate icon-squares sit on a deed row, distinguished only
 * by `Share2` vs `CalendarClock` and a `title` attribute that requires a
 * hover; the Share icon opens the review flow; the review flow's picker
 * lists every partner with nothing to say one of them is a mistake here.
 * So a notary was picked from a reviewer's picker, got a reviewer's
 * email, and landed on a page offering Approve and Request Changes and
 * no way to say when she was free.
 *
 * ═══ THE THREE PROPERTIES ═══
 *
 * 1. **A tooltip is not a label** (item 1). The two actions carry their
 *    words on their faces. Pinned in `shareEntryPoints.test.ts`, which
 *    was retargeted from `title=` to visible text rather than having a
 *    new pin bolted beside it.
 *
 * 2. **The flow asks who it is talking to — and does not decide**
 *    (items 1 and 5). Picking across the flows raises a question with
 *    BOTH answers attached. It never disables submit, never removes
 *    anybody from a list, and never blocks. Suggest, never hide; ask,
 *    never block.
 *
 * 3. **The wording is a FILING OBSERVATION, never a capability claim.**
 *    `partnerRegistry.ts` is explicit: "A partner's category says how
 *    the officer FILES them. It says nothing about their authority,
 *    their licensure, or what they are permitted to do, and no code may
 *    read it as though it did." "Nora is filed as a Notary" is a true
 *    statement about her rolodex. "Marcus is not a notary" would be a
 *    statement about Marcus that this product has no basis for — he may
 *    hold a commission and be filed under his title company. The sweep
 *    below is fail-closed across the whole tree for that reason.
 *
 * And item 2: **two dead buttons are gone**, and cannot come back as
 * a modal whose body is directions to the real feature.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';

const SRC = path.join(__dirname, '..');
const read = (...p: string[]) => fs.readFileSync(path.join(SRC, ...p), 'utf8');
const flat = (s: string) => s.replace(/\s+/g, ' ');

const PAST_DEEDS = read('app', 'past-deeds', 'page.tsx');
/** The tracker moved to `/requests`; `app/shared-deeds/page.tsx` is now
 *  the permanent alias that redirects there. The screen these pins are
 *  about is the tracker — see sharedDeedsContract.test.ts for the full
 *  retarget reasoning. */
const SHARED_DEEDS = read('app', 'requests', 'page.tsx');
const DASHBOARD = read('app', 'dashboard', 'page.tsx');
const REVIEW = read('features', 'signing', 'ShareForReviewModal.tsx');
const SIGNING = read('features', 'signing', 'RequestSigningModal.tsx');
const PICKER = read('features', 'partners', 'PartnerRecipientPicker.tsx');
const QUICKADD = read('features', 'partners', 'QuickAddPartnerModal.tsx');
const MISMATCH = read('features', 'partners', 'RecipientMismatch.tsx');

/** Every .ts/.tsx under src, so a capability claim cannot arrive in a
 * file this test did not think to name. */
function allSources(dir: string = SRC): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
      out.push(...allSources(full));
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe('FLOW1 item 1 — the review flow asks who it is talking to', () => {
  it('notices a notary picked out of the review picker', () => {
    expect(codeOnly(REVIEW)).toContain("recipient?.category === NOTARY_CATEGORY");
    expect(flat(REVIEW)).toContain('Did you mean to request a signing?');
  });

  it('offers BOTH answers, and switching actually switches', () => {
    // Asking "did you mean a signing?" and then making her close the
    // modal, find the row again and press the other button would be a
    // scolding rather than a suggestion.
    expect(REVIEW).toContain('Request a signing instead');
    expect(REVIEW).toContain('No — send it for review');
    expect(REVIEW).toContain('onSwitchToSigning');
    // And the page wires it to the signing modal for the SAME deed.
    expect(flat(PAST_DEEDS)).toContain('onSwitchToSigning={() => { setSigningDeedId(reviewDeedId); setReviewDeedId(null); }}');
  });

  it('never blocks the review it is asking about', () => {
    // The submit button's disabled condition may depend on having a
    // recipient and on being mid-flight. It may not depend on the
    // interrupt: "suggest, never hide" extends to "ask, never block".
    const code = codeOnly(REVIEW);
    const disabled = /disabled=\{([^}]*)\}/g;
    for (const m of code.matchAll(disabled)) {
      expect(m[1]).not.toContain('Interrupt');
      expect(m[1]).not.toContain('interrupt');
      expect(m[1]).not.toContain('category');
    }
  });
});

describe('FLOW1 item 5 — the signing fallback is acknowledged, not equal-weight', () => {
  it('notices a non-notary picked out of the signing picker', () => {
    const code = codeOnly(SIGNING);
    expect(code).toContain("notary.category !== NOTARY_CATEGORY");
    expect(flat(SIGNING)).toContain('This request asks them to take the acknowledgement.');
  });

  it('keeps the fallback: acknowledge and continue is one press', () => {
    expect(SIGNING).toContain('Yes — send it to them');
    expect(SIGNING).toContain('Pick someone else');
    const code = codeOnly(SIGNING);
    for (const m of code.matchAll(/disabled=\{([^}]*)\}/g)) {
      expect(m[1]).not.toContain('Acknowledged');
      expect(m[1]).not.toContain('category');
    }
  });

  it('still hides nobody from the list', () => {
    // Item 5 said make the fallback explicit, NOT remove it. The picker
    // keeps sorting suggested-first and filtering nobody out.
    expect(PICKER).toContain("hits.filter((p) => p.category !== suggestCategory)");
    expect(PICKER).toContain('Everyone else');
  });

  it('a typed address raises nothing, because it has no filing', () => {
    // A one-off recipient was never filed, so there is no observation to
    // make. `category` is undefined and both notices stay closed.
    expect(codeOnly(SIGNING)).toContain('!!notary?.category');
    expect(codeOnly(PICKER)).toContain('category: p.category');
  });

  it('a partner created mid-flow carries its filing too', () => {
    // Otherwise creating a notary from inside the review modal is the
    // one path that slips past the interrupt.
    expect(flat(QUICKADD)).toContain('email: formData.email || undefined, category,');
    expect(flat(PICKER)).toContain('category: created.category,');
  });
});

describe('FLOW1 — the notice states a FILING, never a capability', () => {
  it('the shared sentence says "is filed as"', () => {
    expect(MISMATCH).toContain('is filed as a');
  });

  it('no source anywhere claims what a partner may or may not do', () => {
    // Fail-closed across the tree. A category is how she FILED somebody;
    // reading it as licensure would be the registry quietly making a
    // legal characterization, which is §1's whole subject.
    const CLAIMS = [
      /is not a notary/i,
      /isn'?t a notary/i,
      /not a licensed/i,
      /not qualified/i,
      /cannot notarize/i,
      /can'?t notarize/i,
      /not commissioned/i,
      /unlicensed/i,
    ];
    const offenders: string[] = [];
    for (const file of allSources()) {
      const code = codeOnly(fs.readFileSync(file, 'utf8'));
      for (const claim of CLAIMS) {
        if (claim.test(code)) offenders.push(`${path.relative(SRC, file)} :: ${claim}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('FLOW1 item 2 — the dead buttons are gone', () => {
  it('Shared Deeds has no "Share New Deed" and no placeholder modal', () => {
    const code = codeOnly(SHARED_DEEDS);
    expect(code).not.toContain('Share New Deed');
    expect(code).not.toContain('shareModalOpen');
    // The modal's body was a sentence telling her to go elsewhere and
    // press a different button. Forbidden as a SHAPE, not as a spelling:
    // a dialog whose content is directions to the real feature.
    expect(code).not.toContain('please go to the Past Deeds page');
    expect(code).not.toContain('Share Deed for Review');
  });

  it('the header action it left behind promises navigation and delivers it', () => {
    // Not a dead button traded for a differently-dead button: the label
    // and the act agree now.
    expect(flat(SHARED_DEEDS)).toContain('onClick={() => router.push("/past-deeds")}');
    expect(SHARED_DEEDS).toContain('Go to Past Deeds');
  });

  it('the dashboard row has no share icon that does not share', () => {
    const code = codeOnly(DASHBOARD);
    expect(code).not.toContain('Share from Past Deeds');
    // And no remaining control on that row carries a share glyph.
    expect(code).not.toContain('<Share2');
  });
});
