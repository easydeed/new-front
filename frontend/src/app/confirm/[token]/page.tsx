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
  /* TRY-7. The preview opens in a NEW TAB, so this page is never
     unloaded and the approver returns to it exactly as they left it —
     no reload, no lost scroll position, no re-fetch. That is the
     cheapest way to satisfy "the returning state shows the controls
     without re-scrolling": nothing scrolled. */
  const [openedPreview, setOpenedPreview] = useState(false);
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

        {/* ═══ TRY-7 — THE PREVIEW, AND WHY IT FORKS AT 1024px ═══
            (owner-ruled 2026-09-22)

            The `h-[80vh]` iframe below is kept for laptops, where it is
            genuinely the right surface. Beneath 1024px it is replaced by
            an explicit step that hands the PDF to the device's own
            viewer.

            THE ARGUMENT IS LEGIBILITY, NOT LAYOUT. A US Letter page
            fitted to a 390px viewport renders 10pt body text at roughly
            4pt effective. Any fix must therefore solve ZOOM, not just
            display — and a phone's built-in PDF viewer already has a
            competent zoom UI, which a component in this file would be
            rebuilding badly. The alternative considered was rasterising
            the PDF to page images; that is a new dependency in a stack
            that has no rasteriser at all (`pypdf` cannot render,
            `weasyprint` only goes HTML→PDF), and the server-side
            candidate is AGPL — a licensing decision, not a dependency
            choice.

            ═══ THE OPTION THAT WAS REFUSED, RECORDED HERE BECAUSE THIS
                IS WHERE IT WILL BE PROPOSED AGAIN ═══

            We already hold the HTML: `render_deed_html()` produces
            exactly what WeasyPrint turns into the PDF. Serving THAT to
            the phone is nearly free, reflows to any width, and needs no
            dependency. **It is the obvious fix and it breaks the
            model.**

            Approval PROMOTES the previewed PDF bytes. `draft_sha256`
            exists to bind the approver's name to those exact bytes, and
            the auditor artifact reports their hash. Show reflowed HTML
            while promoting PDF bytes and the approver has read one
            artifact and approved another — which does not weaken the
            binding, it makes it **a fiction**, while every pin around it
            stays green.

            An HTML preview would be a different rendering of the same
            facts. The whole product rests on the approver seeing the
            document AS IT WILL PRINT. Do not do this. */}
        {previewSrc ? (
          <>
            <iframe
              title="Rendered deed preview"
              src={previewSrc}
              className="hidden h-[80vh] w-full rounded-xl border border-slate-200 bg-white lg:block"
            />

            {/* ═══ AN ESCAPE HATCH THE EMBEDDED VIEWER CANNOT SWALLOW ═══
             *
             * A live walkthrough reported "no deed at desktop width". The
             * DIAGNOSIS attached to it — that the card above carries
             * `lg:hidden` and nothing replaces it — is wrong: the iframe
             * carries `lg:block` and does replace it, measured at 1024px
             * and 1536px with the real page against a real preview
             * response. The deed renders.
             *
             * The OBSERVATION still deserves an answer, because the two
             * are different claims (§14.35). An `<iframe>` pointed at a
             * PDF renders nothing, silently, whenever the browser
             * declines to display it inline — an extension, a hardened
             * profile, a viewer Safari will not embed cross-origin. The
             * frame stays 992x720 and empty, the approve button sits
             * right below it, and NOTHING ON THE PAGE TELLS THE APPROVER
             * THE DOCUMENT IS MISSING RATHER THAN BLANK.
             *
             * That is the failure worth closing, and it is closable
             * without knowing which browser did it: there is always a
             * link out. The phone card below is the same affordance for
             * the same reason, so this is the desktop half of a rule the
             * page already follows rather than a new idea. */}
            <p className="hidden text-sm text-slate-500 lg:block">
              Not seeing the document above?{' '}
              <a
                href={previewSrc}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpenedPreview(true)}
                className="font-medium text-[#7C4DFF] underline underline-offset-2 hover:text-[#6a3ff0]"
              >
                Open it in a new tab
              </a>{' '}
              — some browsers will not display a PDF inline. Approve or send it
              back using the buttons below either way.
            </p>

            <div className="rounded-xl border border-slate-200 bg-white p-6 lg:hidden">
              <h2 className="text-base font-bold text-slate-800">
                Read the deed before you approve it
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                It opens in your phone&apos;s own PDF viewer, where you can zoom and
                read the legal description properly. Come back to this page to
                approve or send it back — the buttons are just below.
              </p>
              <a
                href={previewSrc}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpenedPreview(true)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#7C4DFF] px-5 py-3 font-medium text-white hover:bg-[#6a3ff0]"
              >
                <FileText className="h-5 w-5" />
                Open the deed
              </a>
              {openedPreview && (
                /* Says only that the document was OPENED. It does not say
                   it was read — the same bound ENGINE1 put on
                   `draft_sha256`, which shows the bytes were fetched and
                   proves nothing about a human reading them. */
                <p className="mt-3 text-sm text-slate-500">
                  Opened in a new tab. Approve or send back below.
                </p>
              )}
            </div>
          </>
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
