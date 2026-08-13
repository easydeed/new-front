/**
 * VERIFY-CHECK — the product says whether the address is confirmed.
 *
 * ═══ WHY THIS EXISTS AT ALL ═══
 *
 * `users.verified` was written by a working endpoint, read by nobody,
 * and displayed in exactly one place: an admin column. The person whose
 * address it is could not see it, could not act on it, and was never
 * asked. A record that looks like a control, invisible to its subject,
 * is the shape the /security ruling refused — enforce or remove, not
 * leave it looking real.
 *
 * ═══ IT ASKS. IT DOES NOT BLOCK. ═══
 *
 * Nothing in this product is gated on verification, deliberately and by
 * owner ruling: every existing account is unverified, because nobody has
 * ever been asked, so a gate switched on today locks out the entire
 * customer base.
 *
 * So the copy has to be honest about that. It does NOT say "verify to
 * continue" or imply anything is withheld — nothing is. It says what we
 * know and offers to send the link again, which is the whole of what
 * this feature currently does.
 *
 * ═══ ONE PLACE TURNS THE STATE INTO ENGLISH ═══
 *
 * §13 rule 3. Two screens show this — the dashboard and account settings
 * — and two copies would be two sentences that drift, one of which would
 * eventually promise something the other did not.
 */
'use client';

import { useState } from 'react';

export interface EmailVerificationNoticeProps {
  /** From `GET /users/profile`. `undefined` while the profile loads. */
  verified?: boolean;
  email?: string;
  /** Compact form for sitting under a field rather than atop a page. */
  inline?: boolean;
}

type SendState = 'idle' | 'sending' | 'sent' | 'failed';

const API = process.env.NEXT_PUBLIC_API_URL
  || 'https://deedpro-main-api.onrender.com';

export default function EmailVerificationNotice({
  verified, email, inline = false,
}: EmailVerificationNoticeProps) {
  const [state, setState] = useState<SendState>('idle');
  const [problem, setProblem] = useState<string | null>(null);

  // Nothing to say when it is confirmed, and nothing to say before we
  // know. A notice that flashes "unconfirmed" while the profile is still
  // loading is the product telling somebody something untrue, briefly.
  if (verified !== false) return null;

  const resend = async () => {
    if (!email) return;
    setState('sending');
    setProblem(null);
    try {
      const res = await fetch(`${API}/users/verify-email/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Could not send (${res.status})`);
      }
      setState('sent');
    } catch (err) {
      // §4 — a send that did not happen must not look like one that did.
      setState('failed');
      setProblem(err instanceof Error ? err.message : 'Could not send the link');
    }
  };

  return (
    <div
      role="status"
      className={inline
        ? 'mt-2 text-xs text-slate-600'
        : 'rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900'}
    >
      <span>
        Your email address is not confirmed yet
        {email ? <> — we sent a link to <strong>{email}</strong></> : null}.
      </span>{' '}
      {state === 'sent' ? (
        <span data-testid="verify-sent">Sent. Check your inbox.</span>
      ) : (
        <button
          type="button"
          onClick={resend}
          disabled={state === 'sending' || !email}
          className="underline underline-offset-2 disabled:opacity-60"
        >
          {state === 'sending' ? 'Sending…' : 'Send it again'}
        </button>
      )}
      {problem && (
        <div className="mt-1 text-red-700" data-testid="verify-problem">{problem}</div>
      )}
    </div>
  );
}
