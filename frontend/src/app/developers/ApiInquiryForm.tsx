'use client';
/**
 * The public API-access inquiry — three fields, no account.
 *
 * A4 shipped /developers as a public page whose "Request access" call to
 * action led to /api-key-request, which sits behind auth. A platform
 * engineer evaluating the API would hit a login wall before they could
 * ask a question — friction in the exact funnel the page exists to
 * serve. Ruled: a public path with company, email, and use case. The
 * authenticated form stays for logged-in users, who can tell us more.
 *
 * Honesty rules inherited from A3: a failed submit says so and keeps the
 * input; success promises a conversation, not a key.
 */
import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function ApiInquiryForm() {
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [useCase, setUseCase] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api-key-inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: company,
          email,
          use_case: useCase,
        }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(
          typeof detail.detail === 'string'
            ? detail.detail
            : 'We could not record your request.'
        );
      }
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} You can also email us directly.`
          : 'We could not record your request. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
        <div className="serif" style={{ fontSize: 32, lineHeight: 1.1, color: '#fff' }}>Request received.</div>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: 'var(--on-dark)' }}>
          We&rsquo;ll reach out at <strong>{email}</strong> to talk through what
          you&rsquo;re building. Keys are issued after that conversation — it&rsquo;s a
          short one, and it means the fit is clear on both sides.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em', color: '#fff' }}>Request a sandbox key</div>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--on-dark)' }}>
        Company
        <input
          id="company"
          required
          maxLength={200}
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Pacific Coast Escrow"
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--on-dark)' }}>
        Work email
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--on-dark)' }}>
        What are you building?
        <textarea
          id="use-case"
          required
          rows={3}
          maxLength={2000}
          value={useCase}
          onChange={(e) => setUseCase(e.target.value)}
          placeholder="A closing platform that needs grant deeds at funding"
        />
      </label>
      <button type="submit" className="mkt-cta lg" disabled={submitting}>
        {submitting ? 'Sending…' : 'Send my request →'}
      </button>
      {error && (
        <div role="alert" style={{ fontSize: 14, color: '#fca5a5' }}>
          {error}
        </div>
      )}
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--on-dark-muted)' }}>
        No account needed. A person reads this and replies with your key. Already have a DeedPro account?{' '}
        <a href="/api-key-request">Use the full form</a>.
      </p>
    </form>
  );
}
