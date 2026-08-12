/**
 * The Share button on the deed preview opens the dialog, in place.
 *
 * ═══ THE DEFECT ═══
 *
 * It pushed `/shared-deeds?deed={id}` — later `/requests?deed={id}` when
 * the tracker was renamed — and NOTHING HAS EVER READ `?deed=`. So the
 * button navigated away from the deed, landed on an unfiltered tracker
 * with no dialog open and no indication which deed it was about, and
 * left her to find the deed she had been looking at a moment earlier.
 *
 * A parameter built by one half and read by neither: the same defect
 * DASH1 found in `?focus=`, arriving from the other end. It survived the
 * Requests merge because a rename PR should carry behaviour across
 * unchanged, and was ledgered for a ruling rather than fixed in passing.
 *
 * ═══ THE RULING, AND WHY THIS ANSWER AND NOT THE OTHER ONE ═══
 *
 * Teaching `/requests` to read `?deed=` would also have worked. It
 * optimises the wrong journey: the tracker is where she goes to FIND
 * something, and she has already found it — she is looking at it. A
 * surface that tells you about a thing and then makes you go locate it
 * is a list of chores, which is the reasoning behind the dashboard
 * queue's `onOpen` opening the row's subject rather than its list.
 *
 * ═══ AND THE KIND IS STILL NOT ASKED ═══
 *
 * PARTNER2/B: `share_kind` is set by WHICH BUTTON SHE PRESSED, never
 * inferred and never offered as a selector. This button has always meant
 * a review — it pointed at the reviews tracker. So it opens the review
 * modal, and the signing path is reachable only through FLOW1 item 1's
 * interrupt, which is a suggestion with a way to act on it rather than a
 * chooser that makes her classify her own intent first.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';

const SRC = path.join(__dirname, '..');
const PREVIEW = codeOnly(
  fs.readFileSync(path.join(SRC, 'app', 'deeds', '[id]', 'preview', 'page.tsx'), 'utf8'));

describe('Share opens the dialog rather than navigating to a list', () => {
  it('does not send her to the tracker to find the deed she is on', () => {
    expect(PREVIEW).not.toContain('/requests?deed=');
    expect(PREVIEW).not.toContain('/shared-deeds?deed=');
    // And not with any other parameter either — the point is that Share
    // does not navigate, not that this particular query string is gone.
    expect(PREVIEW).not.toMatch(/router\.push\(\s*[`'"]\/requests/);
  });

  it('opens the review modal on this deed', () => {
    expect(PREVIEW).toContain('const handleShare = () => setReviewOpen(true)');
    expect(PREVIEW).toContain('<ShareForReviewModal');
    expect(PREVIEW).toContain('deedId={Number(deedId)}');
  });

  it('offers the signing switch rather than leaving the interrupt hanging', () => {
    /**
     * The modal notices when the recipient is filed as a notary and asks
     * whether she meant a signing. On a surface with nowhere to switch
     * to, that question is a scolding — it names a mistake and offers no
     * way out of it. So this page wires the other half.
     */
    expect(PREVIEW).toContain('onSwitchToSigning');
    expect(PREVIEW).toContain('<RequestSigningModal');
  });

  it('does not ask her which kind of share this is', () => {
    // A chooser would make her classify her own intent for the
    // database's benefit before she could act. One button, one kind.
    expect(PREVIEW).not.toContain('share_kind');
    expect(PREVIEW).not.toMatch(/Choose.{0,20}(share|kind)/i);
  });

  it('seeds signer NAMES and never a way to reach anybody', () => {
    /** §13.1 — the deed holds names. It has never held a phone number or
     *  an email for a party and does not start now; she types those. */
    expect(PREVIEW).toContain('suggestedSigners');
    expect(PREVIEW).not.toMatch(/suggestedSigners=\{[^}]*email/);
    expect(PREVIEW).not.toMatch(/suggestedSigners=\{[^}]*phone/);
  });

  it('reuses the partner path rather than growing another creation form', () => {
    expect(PREVIEW).toContain('<PartnersProvider>');
  });
});
