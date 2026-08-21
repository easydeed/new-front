/**
 * NOTIF1 — the rulings a later edit could reverse while every gate stays
 * green.
 *
 * The finding underneath all of them: the worklist selects the UNDECIDED
 * share statuses, so an approval removes its row rather than changing it,
 * and **a disappearance is not a notification**.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';

const SRC = path.join(__dirname, '..');
const read = (...p: string[]) => fs.readFileSync(path.join(SRC, ...p), 'utf8');

const DASH = codeOnly(read('app', 'dashboard', 'page.tsx'));
const STRIP = codeOnly(read('features', 'dashboard', 'RecentlyResolved.tsx'));

describe('NOTIF1 — news is not a task, and does not share the queue container', () => {
  it('the strip renders outside the worklist and above it', () => {
    /**
     * OWNER-RULED. A fourth band would put an approval inside a container
     * whose hero counts rows and promises "things that need you" — the
     * metric-vs-worklist error DASH3 spent itself removing.
     */
    expect(DASH).toContain('<RecentlyResolved');
    expect(DASH.indexOf('<RecentlyResolved')).toBeLessThan(DASH.indexOf('<Worklist'));
    // And the strip is its own component, not a Worklist band.
    expect(codeOnly(read('features', 'dashboard', 'Worklist.tsx')))
      .not.toContain('news');
  });

  it('the headline count still reads only the worklist', () => {
    // The one number on this screen promises "things that need you". An
    // approval needs nothing, so it must not reach the count.
    expect(DASH).toContain('worklist?.count');
    expect(DASH).not.toMatch(/news[\s\S]{0,40}count/);
  });
});

describe('NOTIF1 — quieter than the queue, and it does not become wallpaper', () => {
  it('carries no card, border or spine — the worklist owns those', () => {
    expect(STRIP).not.toMatch(/rounded-2xl|border-gray-200|shadow/);
  });

  it('is dismissible in one press', () => {
    expect(STRIP).toContain('onDismiss');
    expect(STRIP).toContain('Dismiss');
  });

  it('says what it cannot fit rather than trimming it', () => {
    // A strip that silently truncates tells her she has seen everything
    // when she has not — the same defect as a count disagreeing with its
    // rows.
    /* PINNED AS THE GUARD, not the mention. My first version asserted
       that `news.more` appears — and it passed with the render disabled,
       because the count is ALSO mentioned inside the block it guards.
       The mutation probe found it; reading the test did not. Same shape
       as §14.1.1's third symptom: the right property, asserted against
       something incapable of distinguishing it. */
    expect(STRIP).toMatch(/\{news\.more > 0 && \(/);
    expect(STRIP).toContain('{news.more} more');
  });

  it('renders nothing when there is no news, and that is NOT the empty-state rule', () => {
    /* The worklist's empty state is a RESULT she needs told ("Nothing
       needs you"). An absence of news is not a result — "nothing happened
       since you last looked" is the ordinary case, and saying it every
       morning is how a strip becomes wallpaper. The distinction is
       deliberate and is why this file pins both halves. */
    expect(STRIP).toContain('return null');
    expect(DASH).toContain('Nothing needs you.');
  });
});

describe('NOTIF1 — the property is navigation, never a task', () => {
  it('renders the property as a link and offers no action button', () => {
    /**
     * OWNER-RULED, and the gap it closes was real: she learns her
     * reviewer approved and would otherwise have to go find the deed.
     *
     * The fix is NOT a "Review it" button. That would turn news into a
     * task — the exact collapse the separate-strip ruling exists to
     * prevent. She presses the property because she wants to see it, not
     * because the strip told her to do something.
     */
    expect(STRIP).toContain('{row.property}');
    expect(STRIP).toMatch(/<a\s/);
    /* No verb-bearing action LABEL. Pinned at the rendered strings
       rather than the word: my first version forbade /Resolve/ anywhere
       and tripped on the component's own name, `RecentlyResolved` —
       §14.1, matching the spelling instead of the property. */
    expect(STRIP).not.toMatch(/>\s*(Review|Open|Finish|Resolve) it\s*</);
    // The sentence REPORTS; it is not a control.
    expect(STRIP).toContain('<span className="text-[13px] text-gray-600">{row.say}</span>');
  });

  it('the only button is the dismiss', () => {
    const buttons = STRIP.match(/<button/g) ?? [];
    expect(buttons.length).toBe(1);
  });
});

describe('NOTIF1 — the sentence and the write', () => {
  it('renders the server sentence verbatim', () => {
    // §13 rule 3 — one place turns state into English, and it is the one
    // that had the facts when the event happened.
    expect(STRIP).toContain('{row.say}');
  });

  it('dismissal does not write through the read-only queue endpoint', () => {
    /* `routers/dashboard.py` declares itself READ-ONLY in its own
       docstring. An endpoint that writes would make that statement false
       for every future reader who trusts it, so the dismiss goes to the
       notifications router instead. */
    expect(DASH).toContain('/notifications/mark-read');
    expect(DASH).not.toMatch(/dashboard\/queue[\s\S]{0,80}method:\s*'POST'/);
  });

  it('a failed dismissal leaves the strip up', () => {
    // §4 — the error is not swallowed into a UI that looks like it
    // worked. The local clear happens only after a successful response.
    const fn = DASH.slice(DASH.indexOf('const dismissNews'));
    const clearAt = fn.indexOf('setQueue');
    const guardAt = fn.indexOf('if (!res.ok) return');
    expect(guardAt).toBeGreaterThan(-1);
    expect(guardAt).toBeLessThan(clearAt);
  });
});
