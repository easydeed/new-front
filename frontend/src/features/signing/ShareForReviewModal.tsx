'use client';

/**
 * PARTNER2 / Part B — "Share for review", its own action and its own words.
 *
 * ═══ WHY TWO MODALS AND NOT ONE WITH A TOGGLE ═══
 *
 * There used to be one Share button. It asked for a typed email and a
 * free-text "role", and it produced a review share — which meant
 * requesting a signing was a different button somewhere else, and the
 * generic one quietly meant "review" without saying so.
 *
 * Two actions ask two different QUESTIONS. "Will you check this?" and
 * "are you free on Tuesday?" have different recipients, different
 * emails, different status language and different outcomes. A single
 * modal with a kind-selector would have made the officer classify her
 * own intent for the database's benefit before she could act on it.
 *
 * `share_kind` is therefore set by WHICH BUTTON SHE PRESSED, never
 * inferred and never asked.
 */

import { useState } from 'react';
import { FileText, Loader2, X } from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';
import { PartnerRecipientPicker, Recipient } from '@/features/partners/PartnerRecipientPicker';

const EXPIRY_CHOICES = [
  { hours: 72, label: '3 days' },
  { hours: 168, label: '7 days' },
  { hours: 336, label: '14 days' },
];

export function ShareForReviewModal({
  deedId,
  onClose,
}: {
  deedId: number;
  onClose: () => void;
}) {
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [message, setMessage] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(168);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    url: string;
    emailSent: boolean;
    emailError?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient?.email) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await apiFetch(
        '/shared-deeds',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deed_id: deedId,
            recipient_email: recipient.email,
            recipient_name: recipient.name || undefined,
            recipient_role: 'Reviewer',
            message: message || undefined,
            expires_in_hours: expiresInHours,
          }),
        },
        { label: 'Sharing deed for review' },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || `Failed to share (${response.status})`);
      }
      // S1's rule: report the transport's actual outcome and surface the
      // link either way, so a share works with no email configured.
      setResult({
        url: data?.shared_deed?.approval_url || '',
        emailSent: !!data?.email_sent,
        emailError: typeof data?.email_error === 'string' ? data.email_error : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-[560px] w-full max-h-[85vh] flex flex-col p-8">
        <div className="flex items-center justify-between mb-6 shrink-0">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#7C4DFF]" />
            Share for review
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg" aria-label="Close">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {result ? (
          <div className="space-y-4">
            <p className="text-slate-700">
              The review request is on the record. They can approve it or ask for
              changes, and you will be told which.
            </p>
            <div
              className={`rounded-lg border p-4 text-sm ${
                result.emailSent
                  ? 'border-slate-200 bg-slate-50 text-slate-700'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
            >
              {result.emailSent
                ? `Email sent to ${recipient?.email}.`
                : `The email did not go out${result.emailError ? `: ${result.emailError}` : ''}. Send the link below yourself.`}
            </div>
            {result.url && (
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-lg border border-slate-200 p-3 break-all text-xs text-slate-600">
                  {result.url}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(result.url);
                    setCopied(true);
                  }}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-[#7C4DFF] hover:bg-[#6a3de8] text-white font-medium rounded-lg"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col min-h-0 flex-1">
            {/* X1: the BODY scrolls, not the whole panel — a footer that
                scrolls out of reach on a short viewport is a form she
                cannot submit. */}
            <div className="space-y-5 overflow-y-auto flex-1 pr-1">
            <PartnerRecipientPicker
              value={recipient}
              onChange={setRecipient}
              label="Ask for a review from"
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Link expires after
              </label>
              <select
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF]"
              >
                {EXPIRY_CHOICES.map((c) => (
                  <option key={c.hours} value={c.hours}>{c.label}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                When the link expires it stops working and the reviewer sees a
                notice — the deed itself is unaffected.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Note (optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF]"
                placeholder="Anything they should look at in particular"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            </div>

            <div className="flex gap-3 pt-5 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !recipient?.email}
                className="flex-1 px-4 py-3 bg-[#7C4DFF] hover:bg-[#6a3de8] text-white font-medium rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Send the review request
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
