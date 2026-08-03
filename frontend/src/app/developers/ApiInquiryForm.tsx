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
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8">
        <h2 className="text-xl font-bold text-[#1F2B37]">Your request is recorded</h2>
        <p className="mt-2 max-w-xl leading-relaxed text-gray-600">
          We&rsquo;ll reach out at <strong>{email}</strong> to talk through what
          you&rsquo;re building. Keys are issued after that conversation — it&rsquo;s a
          short one, and it means the fit is clear on both sides.
        </p>
      </div>
    );
  }

  return (
    <div id="request-access" className="scroll-mt-24 rounded-2xl border border-gray-200 bg-gray-50 p-8">
      <h2 className="text-xl font-bold text-[#1F2B37]">Request API access</h2>
      <p className="mt-2 max-w-xl leading-relaxed text-gray-600">
        Three fields, no account needed. Tell us what you&rsquo;re integrating and
        we&rsquo;ll get in touch — we issue keys after a short conversation.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 max-w-xl space-y-4">
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-[#1F2B37]">
            Company
          </label>
          <input
            id="company"
            required
            maxLength={200}
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#7C4DFF] focus:outline-none focus:ring-2 focus:ring-[#7C4DFF]/20"
            placeholder="Pacific Coast Escrow"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[#1F2B37]">
            Work email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#7C4DFF] focus:outline-none focus:ring-2 focus:ring-[#7C4DFF]/20"
            placeholder="you@company.com"
          />
        </div>

        <div>
          <label htmlFor="use-case" className="block text-sm font-medium text-[#1F2B37]">
            What are you building?
          </label>
          <textarea
            id="use-case"
            required
            rows={4}
            maxLength={2000}
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#7C4DFF] focus:outline-none focus:ring-2 focus:ring-[#7C4DFF]/20"
            placeholder="Generating grant deeds at closing from our escrow platform — roughly 200 a month, California only."
          />
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-[#7C4DFF] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#6a3ff0] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Sending…' : 'Request access'}
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-500">
        Already have a DeedPro account?{' '}
        <a href="/api-key-request" className="text-[#7C4DFF] hover:underline">
          Use the full form
        </a>{' '}
        — it asks a few more questions about volume and timeline.
      </p>
    </div>
  );
}
