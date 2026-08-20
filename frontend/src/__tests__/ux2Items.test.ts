/**
 * UX2 items 3–9.
 *
 * ═══ ITEM 4 STOOD DOWN, AND THAT IS THE INTERESTING ONE ═══
 *
 * The ticket asked for the sidebar badge and the dashboard attention
 * number to match. They are DIFFERENT CLAIMS, deliberately, decided in
 * DASH1 and recorded in `officer_queue.queue`: a badge says "there are
 * things here"; the attention number says "these have gone quiet".
 *
 * Forcing them to match destroys one or the other — badges counting only
 * stale means a request sent this morning shows no badge; attention
 * counting everything turns the number she checks first into "there are
 * rows below", which is verbatim what DASH1 rejected.
 *
 * Owner-ruled: stand down, and build the REAL defect. Two different
 * claims presented as two identical bare numbers invite the reading that
 * they are one claim — and the evidence is that the ticket asking to
 * reconcile them was written by somebody with the code in front of him.
 * If it misreads there, it misreads on screen.
 *
 * So: labelling, not arithmetic. Each number names its own claim.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';
import {
  NUDGE_AT, addressKey, nudgeSentence, staleClusters,
} from '../lib/staleDrafts';

const SRC = path.join(__dirname, '..');
const read = (...p: string[]) => codeOnly(
  fs.readFileSync(path.join(SRC, ...p), 'utf8'));
const TRACKER = read('app', 'requests', 'page.tsx');
const PAST_DEEDS = read('app', 'past-deeds', 'page.tsx');
const SIDEBAR = read('components', 'Sidebar.tsx');
const DASHBOARD = read('app', 'dashboard', 'page.tsx');
const PARTNERS = read('app', 'partners', 'page.tsx');
const PY_QUEUE = fs.readFileSync(
  path.join(SRC, '..', '..', 'backend', 'services', 'officer_queue.py'), 'utf8');
const WORKLIST_PY = fs.readFileSync(
  path.join(SRC, '..', '..', 'backend', 'services', 'worklist.py'), 'utf8');

// ── item 3 ───────────────────────────────────────────────────────────

describe('one vocabulary for a document name', () => {
  it('the tracker names deeds the way Past Deeds does', () => {
    // "Grant Deed" on one screen and `grant-deed` on another, for the
    // same document, two clicks apart. The slug is our storage key and
    // she never chose it.
    expect(TRACKER).toContain('deedTypeLabel(deed.deed_type)');
    expect(TRACKER).not.toContain('>{deed.deed_type}<');
  });
});

// ── item 4 ───────────────────────────────────────────────────────────

describe('two numbers, two claims, each named', () => {
  it('the deliberate difference is still in the server', () => {
    /** THE PIN THIS BLOCK EXISTS FOR — it protects a RULING against a
     *  ticket, which is the unusual direction. */
    expect(PY_QUEUE).toContain('These are NOT the attention count');
    /* The attention count now counts GONE QUIET in both its shapes —
       stale by age, lapsed by event (DASH-FIX #4). What this pin
       protects is unchanged and is the RULING, not the expression: the
       badge counts presence, the attention number counts silence, and
       they must not become one number. So it asserts the two are
       computed from different predicates rather than pinning a literal
       line, which broke here the moment the ruling was applied and
       taught nothing when it did. */
    expect(PY_QUEUE).toMatch(/"needs_attention": len\(\[r for r in awaiting\s*\n?\s*if r\["stale"\] or r\["lapsed"\]\]\)/);
    expect(PY_QUEUE).toContain('"signings": len([r for r in awaiting if r["kind"] == "signing"])');
  });

  it('the badge says what it counts', () => {
    expect(SIDEBAR).toContain('waiting on you here');
    expect(SIDEBAR).toContain('aria-label={`${count} waiting`}');
  });

  it('the dashboard headline says something narrower', () => {
    /**
     * §16 — WHERE THIS RULING WENT.
     *
     * "Gone quiet" was the dashboard's own wording. DASH3 moved every
     * sentence on this screen to the server (§13 rule 3), so the words
     * are now `worklist.chase_row`'s tag and the screen renders them. The
     * ruling is unchanged and the file that has to satisfy it moved.
     *
     * The prohibition stays where it always was: the screen must never
     * go back to naming a population it cannot define.
     */
    expect(WORKLIST_PY).toContain('Gone quiet');
    expect(DASHBOARD).not.toContain('your attention');
  });

  it('the threshold comes from the payload, not from the screen', () => {
    /**
     * SATISFIED MORE STRONGLY THAN IT WAS PINNED. The screen used to
     * read `queue.thresholds.stale_after_days` in order to phrase the
     * headline itself. It no longer phrases anything: staleness is
     * decided and worded server-side, and the page cannot consult a
     * threshold because it never sees one.
     *
     * So the pin becomes the property rather than the reading: no
     * threshold arithmetic happens on this screen at all.
     *
     * Pinned as the READING, not the word. `stale_after_days` still
     * appears on this screen — inside the `Queue` TYPE, because the
     * payload still carries it for other readers — and a pin that
     * forbade the noun would fail on a declaration that describes the
     * server's shape rather than on any use of it (§14.1: the property,
     * not the spelling). What must not exist is the screen READING it.
     */
    expect(DASHBOARD).not.toMatch(/queue\??\.thresholds/);
    expect(DASHBOARD).not.toMatch(/thresholds\.\w/);
  });
});

// ── item 5 ───────────────────────────────────────────────────────────

describe('an expired share can be nudged', () => {
  it('expired is no longer refused by the screen', () => {
    // `resend_approval_email` has always extended a lapsed share by 24
    // hours and sent. The capability was built; the one screen that
    // could offer it refused, so her only route back was a second link.
    expect(PAST_DEEDS).not.toContain('"expired", "approved"');
    expect(TRACKER).toContain('return !["approved", "rejected", "revoked"]');
  });

  it('and the three that stay are the ANSWERED and the WITHDRAWN', () => {
    // Nudging somebody who already replied asks them to reply again;
    // un-revoking silently would undo her decision.
    for (const kept of ['approved', 'rejected', 'revoked']) {
      expect(TRACKER).toContain(`"${kept}"`);
    }
  });
});

// ── item 6 ───────────────────────────────────────────────────────────

describe('the rolodex is readable and actionable', () => {
  it('the phone is on the row, not only in the editor', () => {
    // Reading and editing are different acts, and the number she most
    // often wants was behind a click into a form built for changing it.
    expect(PARTNERS).toContain('formatPhone(p.phone)');
    expect(PARTNERS).toContain('href={`tel:${p.phone}`}');
  });

  it('one click starts a signing with that partner', () => {
    expect(PARTNERS).toContain('action=signing&notary=');
  });

  it('and it is offered on EVERY row, not gated on the filing', () => {
    /**
     * The first draft gated it on `category === 'notary'`. The registry
     * pin caught the literal, and the rule behind the pin is the
     * stronger objection: a category "says how the officer FILES them.
     * It says nothing about their authority, their licensure, or what
     * they are permitted to do, and no code may read it as though it
     * did."
     *
     * Gating the button on the category IS reading it as permission.
     */
    expect(PARTNERS).not.toContain("p.category === 'notary'");
  });

  it('the deed is chosen where the deeds are', () => {
    // It cannot create the request from the rolodex — there is no deed
    // on that row, and inventing one would be the product choosing her
    // document.
    expect(PAST_DEEDS).toContain('notaryFromPartner');
    expect(PAST_DEEDS).toContain('preselectNotaryId={notaryFromPartner}');
  });

  it('and the arrival is explained rather than mysterious', () => {
    expect(PAST_DEEDS).toContain('Pick the deed you want signed');
  });
});

// ── item 7 ───────────────────────────────────────────────────────────

describe('the actions column is reachable without scrolling sideways', () => {
  it('Updated is gone', () => {
    /**
     * Seven columns at px-6 made 1197px in a 1150px viewport.
     * `overflow-x-auto` was ALREADY here, so Actions was not clipped —
     * it was off-screen behind a scroll nothing signalled, which is
     * worse: a clipped control looks broken, an absent one looks like it
     * does not exist.
     */
    expect(PAST_DEEDS).not.toContain('>Updated</th>');
    expect(PAST_DEEDS).not.toContain('formatDate(deed.updated_at)');
  });

  it('and it was the only column whose removal undoes no prior decision', () => {
    // X2.7 promoted Doc ID out of the address cell on purpose; Created
    // orders the list. `updated_at` is on deed_activity.FORBIDDEN with
    // the reason "it moves for reasons that are not events".
    expect(PAST_DEEDS).toContain('>Doc ID<');
    expect(PAST_DEEDS).toContain('>Created</th>');
    expect(PAST_DEEDS).toContain('>Actions</th>');
  });
});

// ── items 8 / 9 ──────────────────────────────────────────────────────

const draft = (id: number, address: string, created: string) => ({
  id, status: 'draft', property_address: address, created_at: created,
});

describe('the stale-draft nudge', () => {
  const five = [
    draft(1, '123 Baseline St', '2026-08-01T00:00:00Z'),
    draft(2, '123 Baseline St', '2026-08-02T00:00:00Z'),
    draft(3, '123 baseline st.', '2026-08-03T00:00:00Z'),
    draft(4, '123 Baseline St', '2026-08-04T00:00:00Z'),
    draft(5, '123 Baseline St', '2026-08-05T00:00:00Z'),
  ];

  it('fires at five and not at four', () => {
    expect(staleClusters(five)).toHaveLength(1);
    expect(staleClusters(five.slice(0, 4))).toHaveLength(0);
    expect(NUDGE_AT).toBe(5);
  });

  it('matches the address the way a person means it', () => {
    // Five attempts spread across two spellings is exactly the case.
    expect(addressKey('123 Baseline St')).toBe(addressKey('123 baseline st.'));
    expect(staleClusters(five)[0].drafts).toHaveLength(5);
  });

  it('NEVER offers the newest', () => {
    /**
     * THE PIN THIS BLOCK EXISTS FOR. The product cannot know which of
     * five attempts is current, and archiving the one she is working on
     * is the single outcome that makes this feature worse than nothing.
     */
    const [cluster] = staleClusters(five);
    expect(cluster.older.map((d) => d.id)).not.toContain(5);
    expect(cluster.older).toHaveLength(4);
    expect(cluster.drafts[0].id).toBe(5);
  });

  it('a draft with no date sorts last, not first', () => {
    // An unknown time is not a recent one.
    const withUnknown = [...five, { id: 6, status: 'draft',
      property_address: '123 Baseline St', created_at: null }];
    expect(staleClusters(withUnknown)[0].drafts[0].id).toBe(5);
  });

  it('completed deeds are not drafts and archived ones stop asking', () => {
    const mixed = [
      ...five.slice(0, 4),
      { ...draft(5, '123 Baseline St', '2026-08-05T00:00:00Z'), status: 'completed' },
    ];
    expect(staleClusters(mixed)).toHaveLength(0);
    const done = five.map((d) => ({ ...d, archived_at: '2026-08-06T00:00:00Z' }));
    expect(staleClusters(done)).toHaveLength(0);
  });

  it('an address-less draft belongs to no property', () => {
    const blanks = [1, 2, 3, 4, 5].map((i) => draft(i, '', '2026-08-01T00:00:00Z'));
    expect(staleClusters(blanks)).toHaveLength(0);
  });

  it('the sentence says what it sees and offers, and claims nothing else', () => {
    const [cluster] = staleClusters(five);
    const said = nudgeSentence(cluster);
    expect(said).toContain('5 unfinished drafts');
    expect(said).toContain('Archive the 4 older ones');
    // It does NOT call them abandoned — we do not know that.
    expect(said).not.toMatch(/abandoned|stale|dead/i);
    // And it says archiving is not deleting, where she is deciding.
    expect(said).toContain('kept');
    expect(said).toContain('not deleted');
  });
});

describe('archiving is verifiable, not just promised', () => {
  it('there is a filter that shows them', () => {
    // "Kept, not deleted" is a claim she has no way to check unless a
    // filter can produce them.
    expect(PAST_DEEDS).toContain('<option value="archived">Archived</option>');
    expect(PAST_DEEDS).toContain('include_archived=true');
  });

  it('and archived rows are out of the working list otherwise', () => {
    expect(PAST_DEEDS).toContain('if (deed.archived_at) return false');
  });

  it('a partial failure is reported rather than swallowed', () => {
    // §4 on a bulk action: a partial archive reported as success leaves
    // her list disagreeing with what she was told.
    expect(PAST_DEEDS).toContain('Could not archive #');
  });
});
