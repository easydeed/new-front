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

const PAGE = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'past-deeds', 'page.tsx'),
  'utf8'
);

describe('S1 — share feedback tells the truth', () => {
  it('the fabricated email promise is gone', () => {
    expect(PAGE).not.toContain('The recipient will receive an email');
  });

  it('the result reads the backend truth: email_sent and approval_url', () => {
    expect(PAGE).toContain('data?.email_sent');
    expect(PAGE).toContain('data?.shared_deed?.approval_url');
  });

  it('email failure is stated, not hidden — with the manual path', () => {
    expect(PAGE).toContain('could <strong>not</strong> be sent');
    expect(PAGE).toContain('send it to the recipient yourself');
  });

  it('the review link is surfaced with a copy affordance', () => {
    expect(PAGE).toContain('Review link');
    expect(PAGE).toContain('navigator.clipboard.writeText(shareResult.approvalUrl)');
  });

  it('opening the modal resets any previous result', () => {
    const handler = PAGE.substring(
      PAGE.indexOf('const handleShareClick'),
      PAGE.indexOf('const handleShareSubmit')
    );
    expect(handler).toContain('setShareResult(null)');
  });
});
