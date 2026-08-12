'use client';

/**
 * NOTARY2 Part D — every signing, across every file.
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
 * Read-only aggregation. No new state, no availability engine, and no
 * date formatting in this file: every time shown is the server's own
 * label, rendered in the REQUEST's timezone.
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { AlertCircle, CalendarClock, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { SessionExpiredError, apiFetch } from '@/lib/apiClient';
import { cancelWarning } from '@/lib/signingCopy';

type Row = {
  id: number;
  deed_id: number;
  property_address: string | null;
  deed_type: string | null;
  notary_name: string | null;
  state: string;
  summary: string;
  booked_at: string | null;
  booked_by: string | null;
  /** FLOW1 item 4: WHEN SHE ASKED. See the note on ageInDays below for
   * what this replaced and why the replacement matters. */
  created_at: string | null;
  /** DASH1: the server decides how long is too long, and whether this
   * one has crossed it. See the note on the deleted constant below. */
  days_waiting: number | null;
  stale: boolean;
  expires_at: string | null;
  signers: number;
  /** CANCEL1: is this one still waiting on somebody. The server decides
   * — see the note on the deleted terminal-state list below. */
  live: boolean;
};

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

/**
 * DASH1 — `STUCK_AFTER_DAYS = 5` USED TO LIVE HERE, and it is gone.
 *
 * The dashboard needed the same judgement — "has this gone quiet?" — and
 * writing a second threshold in Python beside this one in TypeScript is
 * exactly how the partner category list came to have four divergent
 * copies and how `phoneSearchKey` came to be right in one language and
 * wrong in the other.
 *
 * So the number lives in `backend/services/officer_queue.py`, the server
 * sends `stale` and `days_waiting` per row, and this screen renders what
 * it is told. The threshold still travels with the payload, so the
 * sentence explaining the amber banner can say it without knowing it.
 */

/**
 * FLOW1 item 4 → DASH1: THE AGE IS READ, AND SO IS THE VERDICT.
 *
 * FLOW1 stopped this screen reconstructing a request's age as
 * `expires_at minus 21 days` — a copy of the server's expiry default,
 * retyped as a bare number in another language. DASH1 finishes the job:
 * the server now sends `days_waiting` AND `stale`, so the screen no
 * longer holds an opinion about how long is too long either.
 *
 * Both halves are the same lesson. A fact the screen shows and the
 * server never sent gets inferred; a judgement the screen makes and the
 * server also makes gets made twice, differently.
 */
function isStuck(r: Row): boolean {
  return r.stale;
}

const STATE_LABEL: Record<string, string> = {
  requested: 'Waiting on the notary',
  windows_posted: 'Waiting on signers',
  partially_agreed: 'Part-agreed',
  booked: 'Booked',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

/**
 * `useSearchParams()` opts a page out of static prerendering unless it
 * sits under a Suspense boundary — Next fails the BUILD, not the render,
 * so jest and tsc both stayed green while `next build` did not. Same
 * boundary the admin and success pages already use.
 */
export default function SigningsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 p-6 md:p-10">
          <div className="max-w-4xl mx-auto flex items-center gap-3 text-slate-500 py-16 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading…
          </div>
        </main>
      </div>
    }>
      <SigningsAgenda />
    </Suspense>
  );
}

function SigningsAgenda() {
  const router = useRouter();
  const params = useSearchParams();
  const [rows, setRows] = useState<Row[]>([]);
  // The threshold travels with the queue payload, so the sentence
  // explaining the amber banner can say the number without knowing it.
  const [staleAfterDays, setStaleAfterDays] = useState<number | null>(null);
  // FLOW1 item 4: `?focus=<id>` opens that signing. A notification about
  // one signing should be able to point at that signing.
  const [focus, setFocus] = useState<number | null>(() => {
    const raw = params?.get('focus');
    const id = raw ? Number(raw) : NaN;
    return Number.isInteger(id) ? id : null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const r = await apiFetch('/signing-requests/v2', {}, { label: 'Loading signings', silent: true });
      if (r.ok) setRows(await r.json());
    } catch { /* the panel already reported it; the list keeps what it has */ }
  }, []);

  useEffect(() => {
    (async () => {
      // The auth guard. Caught by routeGuards.test.ts, which is the pin
      // doing exactly its job: a new authenticated page rendered its
      // chrome before asking whether anybody was logged in, so a signed
      // -out visitor would have seen an empty Signings screen and a
      // failed request rather than the login page.
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login?redirect=/signings');
        return;
      }
      try {
        const r = await apiFetch('/signing-requests/v2', {}, { label: 'Loading signings' });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || `Failed (${r.status})`);
        setRows(await r.json());
        // Best-effort: the banner degrades to its own wording if this
        // fails, and a failed lookup for a NUMBER IN A SENTENCE must not
        // blank a page full of real signings.
        try {
          const t = await apiFetch('/dashboard/queue', {}, { label: 'Loading your queue', silent: true });
          if (t.ok) setStaleAfterDays((await t.json())?.thresholds?.stale_after_days ?? null);
        } catch { /* the sentence has a fallback; the list does not need one */ }
      } catch (err) {
        if (err instanceof SessionExpiredError) return;
        setError(err instanceof Error ? err.message : 'Could not load your signings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stuck = useMemo(() => rows.filter(isStuck), [rows]);

  /**
   * FLOW1 item 4 — "SOONEST FIRST" WAS HALF TRUE, WHICH IS THE BAD HALF.
   *
   * The server orders by `COALESCE(booked_at, expires_at)`. For a booked
   * signing that is the signing's time. For an unbooked one it is when
   * the LINK DIES — a fact with no relationship to when anybody will
   * meet. So two facts shared one sort key, and the subtitle described
   * the result as a schedule.
   *
   * That is T-5's ruling one layer up: orthogonal facts must not share
   * one column. A booked signing has a date; a request being arranged
   * does not have one yet, and inventing an order for it out of its
   * expiry is how a screen ends up claiming to be a calendar.
   *
   * So they are separated and each is sorted by the fact it actually
   * has — booked by when, in progress by how long she has been waiting,
   * oldest first, because the oldest is the one that needs a call. The
   * subtitle now says exactly this instead of "soonest first".
   */
  const bookedRows = useMemo(
    () => rows
      .filter((r) => r.state === 'booked')
      .sort((a, b) => (a.booked_at || '').localeCompare(b.booked_at || '')),
    [rows]);
  const arranging = useMemo(
    () => rows
      .filter((r) => r.live && r.state !== 'booked')
      // Oldest first: longest-waiting is the one worth chasing.
      .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || '')),
    [rows]);
  const closed = useMemo(
    /* CANCEL1 — `['cancelled', 'expired']` USED TO LIVE HERE.
       It is the same disease as the deleted STUCK_AFTER_DAYS above, one
       layer up: which states are OVER is a fact about the state
       vocabulary, and the vocabulary is `services/signing_loop.py`. A
       list here is that judgement copied, and the copy is what gets
       missed the day a seventh state is added. The server sends `live`. */
    () => rows.filter((r) => !r.live), [rows]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Signings</h1>
          <p className="text-slate-600 mb-2">
            Booked signings first, soonest first. Then the ones still being
            arranged, longest-waiting first — those are the ones to chase.
          </p>
          {/* FLOW1 item 3 — THE TWO TRACKERS KNOW ABOUT EACH OTHER.
              Reviews live in `deed_shares` and signings in
              `signing_requests`, and until now neither screen mentioned
              the other: the page named for sharing showed one of the two
              things she shares, and this one showed the other, with zero
              cross-references between them. */}
          <p className="text-sm text-slate-500 mb-6">
            Sent a deed out for review instead?{' '}
            <button
              type="button"
              onClick={() => router.push('/shared-deeds')}
              className="font-medium text-[#7C4DFF] hover:underline"
            >
              Shared Deeds
            </button>{' '}
            tracks those.
          </p>

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

          {loading && (
            <div className="flex items-center gap-3 text-slate-500 py-16 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading…
            </div>
          )}

          {error && !loading && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
          )}

          {!loading && !error && rows.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
              <CalendarClock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No signings yet.</p>
              <button onClick={() => router.push('/past-deeds')}
                      className="mt-4 px-5 py-2.5 bg-[#7C4DFF] hover:bg-[#6a3de8] text-white rounded-lg font-medium">
                Go to your deeds
              </button>
            </div>
          )}

          {bookedRows.length > 0 && (
            <>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Booked
              </h2>
              <div className="space-y-3">
                {bookedRows.map((r) => (
                  <SigningRow key={r.id} row={r} open={focus === r.id}
                              onToggle={() => setFocus(focus === r.id ? null : r.id)}
                              onCancelled={reload} />
                ))}
              </div>
            </>
          )}

          {arranging.length > 0 && (
            <>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mt-8 mb-3">
                Being arranged
              </h2>
              <div className="space-y-3">
                {arranging.map((r) => (
                  <SigningRow key={r.id} row={r} open={focus === r.id}
                              onToggle={() => setFocus(focus === r.id ? null : r.id)}
                              onCancelled={reload} />
                ))}
              </div>
            </>
          )}

          {closed.length > 0 && (
            <>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mt-8 mb-3">
                Closed
              </h2>
              <div className="space-y-3 opacity-70">
                {closed.map((r) => (
                  <SigningRow key={r.id} row={r} open={focus === r.id}
                              onToggle={() => setFocus(focus === r.id ? null : r.id)}
                              onCancelled={reload} />
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * FLOW1 item 4 — THE CARD OPENS THE SIGNING.
 *
 * It used to `router.push('/past-deeds')`. Every card. So pressing the
 * row for a signing that has gone quiet took her to a list of deeds with
 * no indication of which one she had just been looking at — the one
 * gesture on this page threw away the only context the page had.
 *
 * There is no officer-facing route for a single signing (`/deeds/{id}`
 * and its neighbours all 404 — ledgered as DEEDDETAIL), so the row
 * EXPANDS rather than navigating: same page, same scroll position, and
 * the detail comes from `GET /signing-requests/v2/{id}`, which already
 * returns the participants, their links, whether each has opened theirs,
 * and every window with who is still outstanding on it.
 *
 * `?focus=<id>` makes it linkable, so a notification can point at the
 * signing it is about rather than at the list.
 */
function SigningRow({ row, open, onToggle, onCancelled }: {
  row: Row;
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
            {/* FLOW1 item 4: THE DATES ARE ON THE ROW NOW. The subtitle
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

/** The detail, fetched when she opens it. Read-only: this ticket links
 * the card to its signing; it does not move the officer's actions here. */
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
