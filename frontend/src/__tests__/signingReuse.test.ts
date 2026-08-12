/**
 * CANCEL1 items 4–5 — the row knows, and the officer sets the clock.
 *
 * ═══ ITEM 4: THE ROW OFFERED A SECOND REQUEST ═══
 *
 * Past Deeds showed "Request signing" on a deed that already had one
 * pending, with nothing on screen saying so. The officer's only way to
 * check was to create a second request and find out — which is three
 * more emails, two notaries who each believe they have the appointment,
 * and two sets of links to whichever signers were invited twice.
 *
 * ═══ ITEM 5: THE EXPIRY WAS IMPOSED SILENTLY ═══
 *
 * `expires_in_days` has been on the create payload since NOTARY2 and no
 * screen ever sent one, so every request got the 21-day default and the
 * officer read the date off the agenda afterwards. Reviews have had the
 * control all along — this is the same field, in the same place, on the
 * other modal.
 *
 * ═══ WHAT THIS FILE DOES NOT PIN ═══
 *
 * Which states count as "still out". That is `signing_loop.is_live` and
 * it is pinned in Python, where it lives. This screen joins a verdict it
 * is handed; if it ever starts deciding, the pin in
 * `signingCancel.test.ts` fails.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';
import { signingRowAction } from '../lib/signingRowAction';

const SRC = path.join(__dirname, '..');
const PAST_DEEDS = codeOnly(fs.readFileSync(path.join(SRC, 'app', 'past-deeds', 'page.tsx'), 'utf8'));
const SIGNING_MODAL = codeOnly(fs.readFileSync(
  path.join(SRC, 'features', 'signing', 'RequestSigningModal.tsx'), 'utf8'));
const REVIEW_MODAL = codeOnly(fs.readFileSync(
  path.join(SRC, 'features', 'signing', 'ShareForReviewModal.tsx'), 'utf8'));

describe('a deed with a signing already out says so', () => {
  it('reads the verdict rather than deciding which states are over', () => {
    expect(PAST_DEEDS).toContain('r.live');
    // The judgement stays in Python. A list here would be the copy that
    // gets missed the day a seventh state is added.
    expect(PAST_DEEDS).not.toContain("'cancelled', 'expired'");
  });

  it('opens the existing request instead of offering a second', () => {
    /**
     * CALLED, not grepped. The first version of this test asserted the
     * strings appeared in `page.tsx` — and stayed green when the whole
     * branch was disabled with `{false ? (`, because both strings were
     * still there, inside code that could never run.
     *
     * A string-presence pin cannot tell REACHABLE from PRESENT. The
     * decision moved into a function so the test can call it.
     */
    const live = { 7: { id: 42, summary: 'Waiting on the notary' } };
    expect(signingRowAction(7, live)).toEqual({
      kind: 'open',
      href: '/requests?kind=signings&focus=42',
      label: 'Open signing request',
      summary: 'Waiting on the notary',
    });
  });

  it('still offers to create one on a deed that has none', () => {
    expect(signingRowAction(9, { 7: { id: 42, summary: 'x' } }))
      .toEqual({ kind: 'create', label: 'Request signing' });
    expect(signingRowAction(9, {})).toEqual({ kind: 'create', label: 'Request signing' });
  });

  it('is what the row actually calls', () => {
    /** The function is only the decision if the page uses it. */
    expect(PAST_DEEDS).toContain('signingRowAction(deed.id, liveSignings)');
    expect(PAST_DEEDS).not.toContain('?focus=${liveSignings');
  });

  it('shows the state as text, never as a tooltip', () => {
    /**
     * FLOW1 item 1's ruling reaches status as much as controls: a tooltip
     * is invisible until you already suspect you need it, and absent
     * entirely on touch. The first draft of this row put the summary in a
     * `title` — this asserts it is rendered and that no `title` carries
     * it, which is the half that would have gone unnoticed.
     */
    expect(PAST_DEEDS).toContain('{liveSignings[deed.id].summary}');
    expect(PAST_DEEDS).not.toContain('title={liveSignings');
  });

  it('does not compose its own sentence about the signing', () => {
    /** §13 rule 3 — one place turns a scheduling state into English. */
    expect(PAST_DEEDS).not.toMatch(/waiting on the notary/i);
    expect(PAST_DEEDS).not.toMatch(/scheduled for/i);
  });

  it('degrades to the old behaviour if the lookup fails', () => {
    /**
     * A failed signings lookup must not blank a page full of real deeds.
     * The cost of missing it is the pre-CANCEL1 row, which is a worse
     * row and not a broken one.
     */
    expect(PAST_DEEDS).toContain('silent: true');
  });
});

describe('the officer sets the expiry on a signing, as she does on a review', () => {
  it('sends the field the API has always accepted', () => {
    expect(SIGNING_MODAL).toContain('expires_in_days: expiresInDays');
  });

  it('offers the choice in the same place the review dialog does', () => {
    expect(SIGNING_MODAL).toContain('Links expire after');
    expect(REVIEW_MODAL).toContain('Link expires after');
  });

  it('measures a signing in days and a review in hours', () => {
    /** Same control, units that match the thing: a review is read in an
     * afternoon, a signing is arranged over weeks. */
    expect(SIGNING_MODAL).toMatch(/days: 21/);
    expect(REVIEW_MODAL).toMatch(/hours: 168/);
  });

  it('says what expiry does and what it is NOT', () => {
    /**
     * Expiring is not cancelling, and the difference matters: expiry is a
     * clock running out and nobody is told, cancellation is a decision
     * and everybody is. A control that blurred them would have the
     * officer reaching for the wrong one.
     */
    expect(SIGNING_MODAL).toContain('The request is not cancelled — nobody is told.');
  });
});
