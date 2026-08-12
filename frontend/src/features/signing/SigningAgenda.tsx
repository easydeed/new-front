'use client';

/**
 * Every signing, across every file — the agenda, as a component.
 *
 * ═══ AN AGENDA, NOT A MONTH GRID (owner-accepted cut) ═══
 *
 * A list sorted by date answers "what is coming up and what is stuck"
 * completely. The grid is the attractive version of the same facts, it
 * cost a day, and no workflow depended on it.
 *
 * ═══ THE STUCK SIGNAL LEADS ═══
 *
 * Which is the whole design. A booked signing needs nothing from her; a
 * request nobody has answered in five days needs a phone call, and it is
 * invisible on a date-sorted list because its date has not happened yet.
 * So stuck items are counted at the top and marked in the row, and the
 * amber that marks them is BRAND2's "unconfirmed / needs a human", which
 * is what this is — not decoration borrowed for emphasis.
 *
 * ═══ WHY IT IS A COMPONENT NOW ═══
 *
 * The Requests merge folded reviews and signings into one page, and
 * `/signings` became a permanent alias. This was the agenda's page; it
 * is now the signings half of `/requests`, unchanged.
 *
 * Unchanged is the point. The merged page renders TWO ROW SHAPES and
 * must: a review is a row in a table of recipients and responses, a
 * signing is a card with a notary, a set of times and an expandable
 * detail. They were briefly the same shape — signings were squeezed into
 * the reviews table's eight columns, filling five of them honestly, and
 * offering a button to "Open in Signings" that this merge would have
 * left pointing at nothing.
 *
 * Read-only aggregation apart from cancellation. No availability engine,
 * and no date formatting for a scheduling state: every such time shown
 * is the server's own label, rendered in the REQUEST's timezone.
 */

import { useEffect, useState } from 'react';
import { AlertCircle, CalendarClock, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { SessionExpiredError, apiFetch } from '@/lib/apiClient';
import { cancelWarning } from '@/lib/signingCopy';
import {
  SigningSummary, STATE_LABEL, groupSignings, isStuck,
} from './signingSummary';

/** What `GET /signing-requests/v2/{id}` returns for one signing. */
type Detail = {
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

export function SigningAgenda({
  rows,
  error,
  staleAfterDays,
  focusId,
  onChanged,
}: {
  rows: SigningSummary[];
  /** The signings half failing must not blank the reviews half. The
   *  merged page owns the fetch and hands the failure down. */
  error: string | null;
  /** The threshold travels with the queue payload, so the sentence
   *  explaining the amber banner can say the number without knowing it. */
  staleAfterDays: number | null;
  /** `?kind=signings&focus=<id>` opens that signing. A notification about
   *  one signing should be able to point at that signing. */
  focusId: number | null;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState<number | null>(focusId);
  const groups = groupSignings(rows);
  const stuck = rows.filter(isStuck);

  const section = (title: string, items: SigningSummary[], dimmed = false) =>
    items.length > 0 && (
      <>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mt-8 mb-3 first:mt-0">
          {title}
        </h2>
        <div className={`space-y-3 ${dimmed ? 'opacity-70' : ''}`}>
          {items.map((r) => (
            <SigningRow key={r.id} row={r} open={open === r.id}
                        onToggle={() => setOpen(open === r.id ? null : r.id)}
                        onCancelled={onChanged} />
          ))}
        </div>
      </>
    );

  return (
    <div>
      {stuck.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-semibold text-amber-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {stuck.length} {stuck.length === 1 ? 'signing has' : 'signings have'} gone quiet
          </p>
          <p className="text-sm text-amber-800 mt-1">
            No movement in {staleAfterDays ?? 5} days or more. Nothing has expired —
            these are worth a phone call.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {!error && rows.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <CalendarClock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600">No signings arranged yet.</p>
        </div>
      )}

      {section('Booked', groups.booked)}
      {section('Being arranged', groups.arranging)}
      {section('Closed', groups.closed, true)}
    </div>
  );
}

/**
 * FLOW1 item 4 — THE CARD OPENS THE SIGNING.
 *
 * It used to `router.push('/past-deeds')`. Every card. So pressing the
 * row for a signing that had gone quiet took her to a list of deeds with
 * no indication of which one she had just been looking at — the one
 * gesture on this page threw away the only context the page had.
 *
 * There is no officer-facing route for a single signing (`/deeds/{id}`
 * and its neighbours all 404 — ledgered as DEEDDETAIL), so the row
 * EXPANDS rather than navigating: same page, same scroll position, and
 * the detail comes from `GET /signing-requests/v2/{id}`, which already
 * returns the participants, their links, whether each has opened theirs,
 * and every window with who is still outstanding on it.
 */
function SigningRow({ row, open, onToggle, onCancelled }: {
  row: SigningSummary;
  open: boolean;
  onToggle: () => void;
  /* A cancelled request moves from the agenda to the closed list, and
     the grouping is the server's — so the list is re-read rather than
     patched here. Same reason the summary is never composed locally. */
  onCancelled: () => void;
}) {
  const stuck = isStuck(row);
  const booked = row.state === 'booked';
  const age = row.days_waiting;

  return (
    <div className={`bg-white rounded-xl border ${stuck ? 'border-amber-300' : 'border-slate-200'}`}>
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="w-full text-left p-4 hover:bg-slate-50 rounded-xl transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-medium text-slate-900 truncate">
              {row.property_address || `Deed #${row.deed_id}`}
            </p>
            <p className="text-sm text-slate-500 truncate">
              {row.notary_name || 'No notary named'} · {row.signers} signer{row.signers === 1 ? '' : 's'}
            </p>
            {/* The server's sentence, verbatim — this screen never composes
                its own account of a scheduling state (§13 rule 3). */}
            <p className="text-sm text-slate-600 mt-2">{row.summary}</p>
            {/* FLOW1 item 4: THE DATES ARE ON THE ROW. The subtitle
                claimed an order and nothing on screen carried a date to
                justify it. A booked signing shows when; one being
                arranged shows how long she has been waiting, which is
                the fact it actually has. */}
            <p className="text-xs text-slate-400 mt-1">
              {booked && row.booked_at
                ? `Booked for ${new Date(row.booked_at).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                    hour: 'numeric', minute: '2-digit',
                  })}`
                : age === null
                  ? 'Requested — date unknown'
                  : age === 0
                    ? 'Requested today'
                    : `Requested ${age} day${age === 1 ? '' : 's'} ago`}
            </p>
          </div>
          <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            stuck ? 'bg-amber-100 text-amber-800'
            : booked ? 'bg-slate-100 text-slate-700'
            : 'bg-slate-50 text-slate-600'
          }`}>
            {stuck ? <AlertCircle className="w-3.5 h-3.5" />
              : booked ? <CheckCircle2 className="w-3.5 h-3.5" />
              : <Clock className="w-3.5 h-3.5" />}
            {stuck ? 'Gone quiet' : STATE_LABEL[row.state] || row.state}
          </span>
        </div>
      </button>
      {open && <SigningDetail requestId={row.id} onCancelled={onCancelled} />}
    </div>
  );
}

/** The detail, fetched when she opens it. */
function SigningDetail({ requestId, onCancelled }: {
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
