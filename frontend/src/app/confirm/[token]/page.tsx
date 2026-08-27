'use client';

/**
 * API-CONFIRM — the third consumer-adjacent token surface.
 *
 * A named person opens a link the integrator delivered, sees the deed
 * as it will print, and approves or rejects. Nothing around the
 * document adds a fact the document does not already print: no APN,
 * address, or party list as chrome. Correction is reject-with-reason.
 * This is not a builder, and it is not `/approve/[token]`.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle, Clock, FileText, Loader2, MessageSquare, XCircle } from 'lucide-react';

const API = () => process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';

type Reason = { id: string; label: string };
type Package = {
  deed_type: string | null;
  expires_at: string | null;
  state: 'pending_confirmation' | 'completed' | 'rejected' | 'expired' | string;
  preview_url: string | null;
  approver: { name: string | null; role: string | null };
  can_approve: boolean;
  can_reject: boolean;
  reject_reasons: Reason[];
};

function detailMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'detail' in data) {
    const detail = (data as { detail: unknown }).detail;
    if (typeof detail === 'string') return detail;
    if (detail && typeof detail === 'object' && 'message' in detail) {
      return String((detail as { message: unknown }).message);
    }
  }
  return fallback;
}

export default function ConfirmDeedPage() {
  const params = useParams();
  const token = params.token as string;

  const [pack, setPack] = useState<Package | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const [comment, setComment] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`${API()}/confirm/${token}`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(detailMessage(data, 'This confirmation link is not valid.'));
          return;
        }
        setPack(data);
      } catch {
        setError('Unable to connect to the server.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const approve = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`${API()}/confirm/${token}/approve`, { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(detailMessage(data, 'Approval failed.'));
        return;
      }
      setDone('approved');
    } catch {
      setError('Unable to connect to the server.');
    } finally {
      setSubmitting(false);
    }
  };

  const reject = async () => {
    if (issues.length === 0 && !comment.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`${API()}/confirm/${token}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issues, comment: comment.trim() || null }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(detailMessage(data, 'Rejection failed.'));
        return;
      }
      setDone('rejected');
    } catch {
      setError('Unable to connect to the server.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-[#7C4DFF]" />
      </div>
    );
  }

  if (error && !pack) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <XCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <h1 className="text-xl font-bold text-slate-800">Link unavailable</h1>
          <p className="mt-2 text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
          {done === 'approved' ? (
            <CheckCircle className="mx-auto mb-3 h-10 w-10 text-green-600" />
          ) : (
            <MessageSquare className="mx-auto mb-3 h-10 w-10 text-amber-600" />
          )}
          <h1 className="text-xl font-bold text-slate-800">
            {done === 'approved' ? 'Deed approved' : 'Returned for correction'}
          </h1>
          <p className="mt-2 text-slate-600">
            {done === 'approved'
              ? 'The integrator can now download the stored PDF. The record shows who approved and when.'
              : 'The integrator has the reason. They will correct the facts in their system and submit again.'}
          </p>
        </div>
      </div>
    );
  }

  const greeting = pack?.approver?.name
    ? `${pack.approver.name}${pack.approver.role ? `, ${pack.approver.role}` : ''}`
    : 'Approver';
  const previewSrc = pack?.preview_url ? `${API()}${pack.preview_url}` : null;
  const pending = pack?.can_approve && pack?.state === 'pending_confirmation';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#7C4DFF]">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800">Confirm this deed</h1>
              <p className="text-sm text-slate-500">{greeting}</p>
            </div>
          </div>
          {pack?.expires_at && (
            <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-800">
              <Clock className="h-4 w-4" />
              Expires {new Date(pack.expires_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <p className="text-slate-600">
          Review the document as it will print. DeedPro does not confirm the facts —
          you do. Approve it, or send it back with a reason. Changes are made in the
          system that submitted them.
        </p>
        {pack?.deed_type && (
          <p className="text-sm font-medium text-slate-700">
            Instrument: <span className="font-semibold">{pack.deed_type.replace(/_/g, ' ')}</span>
          </p>
        )}

        {pack?.state !== 'pending_confirmation' && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-slate-700">
            This draft is <strong>{pack?.state?.replace(/_/g, ' ')}</strong> and cannot be changed here.
          </div>
        )}

        {previewSrc ? (
          <iframe
            title="Rendered deed preview"
            src={previewSrc}
            className="h-[80vh] w-full rounded-xl border border-slate-200 bg-white"
          />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
            The rendered deed is no longer available to preview.
          </div>
        )}

        {error && (
          <p className="text-red-600" role="alert">{error}</p>
        )}

        {pending && !showReject && (
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={approve}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
              Approve
            </button>
            <button
              type="button"
              onClick={() => setShowReject(true)}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 py-3 font-medium text-slate-700 hover:bg-white"
            >
              <MessageSquare className="h-5 w-5" />
              This is not the deed
            </button>
          </div>
        )}

        {pending && showReject && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="font-bold text-slate-800">What is wrong?</h2>
            <div className="space-y-2">
              {(pack?.reject_reasons || []).map((reason) => (
                <label key={reason.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={issues.includes(reason.id)}
                    onChange={(event) => {
                      setIssues(event.target.checked
                        ? [...issues, reason.id]
                        : issues.filter((id) => id !== reason.id));
                    }}
                  />
                  <span className="text-sm text-slate-700">{reason.label}</span>
                </label>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Optional detail for the integrator"
              className="w-full rounded-lg border border-slate-300 p-3 text-sm"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={reject}
                disabled={submitting || (issues.length === 0 && !comment.trim())}
                className="rounded-lg bg-amber-600 px-4 py-2 font-medium text-white disabled:opacity-50"
              >
                Send back
              </button>
              <button
                type="button"
                onClick={() => setShowReject(false)}
                className="rounded-lg px-4 py-2 text-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
