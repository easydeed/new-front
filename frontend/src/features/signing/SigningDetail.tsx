'use client';

/**
 * One signing, in full — participants, times on the table, and Cancel.
 *
 * ═══ WHY IT MOVED OUT OF THE AGENDA ═══
 *
 * It was the agenda row's expanding panel. The ruling collapsed that
 * panel to a link: the tracker's job is scanning what has gone quiet
 * across every file, which is a cross-deed question, and a panel that
 * opens one signing in place answers a different question in the middle
 * of it.
 *
 * The named cost was accepted deliberately — cancelling goes from one
 * click to navigate-plus-click. What was NOT acceptable was cancelling
 * ceasing to exist, so the panel MOVED rather than closed. The deed page
 * renders this same component; there is no second implementation, which
 * is the only reason moving it is safe.
 */

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { SessionExpiredError, apiFetch } from '@/lib/apiClient';
import { cancelWarning } from '@/lib/signingCopy';

export type Detail = {
  state: string;
  summary: string;
  property_address: string | null;
  booked_at: string | null;
  cancelled_at: string | null;
  participants: Array<{
    id: number;
    party_role: string;
    name: string | null;
    viewed_at: string | null;
    revoked: boolean;
  }>;
  windows: Array<{
    id: number;
    label: string;
    declined: boolean;
    waiting_on: string[];
  }>;
};

/** The detail, fetched when she opens it. */
export function SigningDetail({ requestId, onCancelled }: {
  requestId: number;
  onCancelled: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const cancel = async () => {
    setCancelling(true);
    setError(null);
    try {
      const r = await apiFetch(`/signing-requests/v2/${requestId}/cancel`, { method: 'POST' },
                               { label: 'Cancelling this signing' });
      if (!r.ok) {
        throw new Error((await r.json().catch(() => ({}))).detail || `Failed (${r.status})`);
      }
      setDetail(await r.json());
      setConfirming(false);
      onCancelled();
    } catch (err) {
      if (err instanceof SessionExpiredError) return;
      // §4: a cancellation that did not happen must not look like one
      // that did. The panel says so and the request stays live.
      setError(err instanceof Error ? err.message : 'Could not cancel this signing');
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await apiFetch(`/signing-requests/v2/${requestId}`, {},
                                 { label: 'Loading this signing' });
        if (!r.ok) {
          throw new Error((await r.json().catch(() => ({}))).detail || `Failed (${r.status})`);
        }
        setDetail(await r.json());
      } catch (err) {
        if (err instanceof SessionExpiredError) return;
        // §4: a detail we could not load says so. An empty panel would
        // read as "this signing has no participants".
        setError(err instanceof Error ? err.message : 'Could not load this signing');
      } finally {
        setLoading(false);
      }
    })();
  }, [requestId]);

  return (
    <div className="border-t border-slate-100 p-4">
      {loading && (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading this signing…
        </p>
      )}
      {error && !loading && (
        <p className="text-sm text-red-700">{error}</p>
      )}
      {detail && !loading && !error && (
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
              Who is involved
            </h3>
            <ul className="space-y-1.5">
              {detail.participants.map((p) => (
                <li key={p.id} className="text-sm text-slate-700 flex flex-wrap gap-x-2">
                  <span className="font-medium">{p.name || 'Unnamed'}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500">{p.party_role}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500">
                    {p.revoked ? 'Link revoked'
                      : p.viewed_at ? 'Opened their link'
                      : 'Has not opened their link'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
              Times on the table
            </h3>
            {detail.windows.length === 0 ? (
              <p className="text-sm text-slate-500">No times posted yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {detail.windows.map((w) => (
                  <li key={w.id} className="text-sm text-slate-700">
                    {/* window_label() wrote this, in the request's own
                        timezone. This screen formats no signing time. */}
                    <span className={w.declined ? 'line-through text-slate-400' : ''}>{w.label}</span>
                    {w.declined && <span className="ml-2 text-xs text-slate-400">declined</span>}
                    {!w.declined && w.waiting_on.length > 0 && (
                      <span className="ml-2 text-xs text-amber-700">
                        waiting on {w.waiting_on.join(', ')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* CANCEL1 item 1 — the panel was read-only, with zero
              interactive elements, on a feature whose recipient side has
              always rendered "This link has been withdrawn." The state
              existed, the endpoint existed, and no officer surface could
              produce either. */}
          {detail.cancelled_at ? (
            <p className="text-sm text-slate-500 border-t border-slate-100 pt-4">
              {/* Never deleted — a cancelled request that HAD a booked
                  time still had one (T-5). It stays visible, and says so. */}
              {detail.summary}
            </p>
          ) : (
            <div className="border-t border-slate-100 pt-4">
              {!confirming ? (
                <button
                  onClick={() => setConfirming(true)}
                  className="text-sm font-medium text-red-700 hover:text-red-900 hover:underline"
                >
                  Cancel this signing request
                </button>
              ) : (
                <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-900">
                    {cancelWarning(detail, detail.participants
                      .filter((p) => !p.revoked)
                      .map((p) => p.name || p.party_role))}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={cancel}
                      disabled={cancelling}
                      className="px-3 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {cancelling ? 'Cancelling…' : 'Cancel the signing'}
                    </button>
                    <button
                      onClick={() => setConfirming(false)}
                      disabled={cancelling}
                      className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-white disabled:opacity-60"
                    >
                      Keep it
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
