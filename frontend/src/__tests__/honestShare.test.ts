/**
 * S1 — the silent share, traced and fixed.
 *
 * Chain verdict: production bundle was current; the share stack works
 * (row saves, review link valid); the email transport was never
 * configured (owner-side env) — and the UI fabricated success anyway,
 * toasting "the recipient will receive an email" while the backend's
 * response said email_sent: false. The mirror image of invariant #4.
 *
 * The fix pinned here: the share result panel reports the backend's
 * truth (email_sent) and surfaces the approval_url with a copy button,
 * so a share is usable even with no email transport at all.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * PARTNER2/B: the share flow moved out of `past-deeds/page.tsx` into its
 * own component, and the inline modal was DELETED rather than kept
 * alongside — two code paths creating the same kind of share with
 * different wording is the divergence this ticket is deleting elsewhere.
 *
 * S1's property is unchanged and travels with the flow: the UI reports
 * the transport's actual outcome and surfaces the link either way, so a
 * share is usable with no email configured at all.
 */
const PAGE = fs.readFileSync(
  path.join(__dirname, '..', 'features', 'signing', 'ShareForReviewModal.tsx'),
  'utf8'
);

describe('S1 — share feedback tells the truth', () => {
  it('the fabricated email promise is gone', () => {
    expect(PAGE).not.toContain('The recipient will receive an email');
  });

  it('the result reads the backend truth: email_sent and approval_url', () => {
    expect(PAGE).toContain('data?.email_sent');
    expect(PAGE).toContain('data?.shared_deed?.approval_url');
    expect(PAGE).toContain('data?.email_error');
  });

  it('email failure is stated, not hidden — with the manual path', () => {
    // The PROPERTY, not the old sentence: a failed send says so, and the
    // link is offered for her to send herself.
    expect(PAGE).toContain('The email did not go out');
    expect(PAGE).toContain('Send the link below yourself');
    // And the failure panel is visually distinct from success — an amber
    // that means "this did not happen", per the palette's own rule.
    expect(PAGE).toContain('bg-amber-50');
  });

  it('the review link is surfaced with a copy affordance', () => {
    expect(PAGE).toContain('navigator.clipboard.writeText(result.url)');
    expect(PAGE).toContain("{copied ? 'Copied' : 'Copy'}");
  });

  it('a previous result cannot leak into the next share', () => {
    // Was: an explicit `setShareResult(null)` in the open handler, because
    // the modal lived inside the page and its state outlived it. The
    // component now MOUNTS on open and unmounts on close, so the result
    // state cannot survive — structurally rather than by remembering to
    // clear it. Pinned at the mount site, which is where the guarantee is.
    const page = fs.readFileSync(
      path.join(__dirname, '..', 'app', 'past-deeds', 'page.tsx'),
      'utf8'
    );
    expect(page).toContain('{reviewDeedId !== null && (');
    expect(page).toContain('onClose={() => setReviewDeedId(null)}');
    // And the result state is local to the component, not the page.
    expect(PAGE).toContain('const [result, setResult] = useState<');
    expect(page).not.toContain('shareResult');
  });
});
