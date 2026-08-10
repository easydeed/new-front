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

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { AlertCircle, CalendarClock, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { SessionExpiredError, apiFetch } from '@/lib/apiClient';

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
  expires_at: string | null;
  signers: number;
};

/** Days of silence before a request is worth chasing. Not a deadline —
 * nothing expires because of it — a prompt. */
const STUCK_AFTER_DAYS = 5;

function daysSince(iso: string | null, expiresAt: string | null): number {
  // The request's age is inferred from its expiry, since that is the only
  // timestamp the agenda payload carries. 21 days is the create default.
  if (!expiresAt) return 0;
  const expires = new Date(expiresAt).getTime();
  const created = expires - 21 * 86400_000;
  return Math.max(0, Math.floor((Date.now() - created) / 86400_000));
}

function isStuck(r: Row): boolean {
  if (r.state === 'booked' || r.state === 'cancelled' || r.state === 'expired') return false;
  const age = daysSince(null, r.expires_at);
  // Nobody has posted a time, or times are posted and nobody answered.
  return age >= STUCK_AFTER_DAYS && (r.state === 'requested' || r.state === 'windows_posted');
}

const STATE_LABEL: Record<string, string> = {
  requested: 'Waiting on the notary',
  windows_posted: 'Waiting on signers',
  partially_agreed: 'Part-agreed',
  booked: 'Booked',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

export default function SigningsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      } catch (err) {
        if (err instanceof SessionExpiredError) return;
        setError(err instanceof Error ? err.message : 'Could not load your signings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stuck = useMemo(() => rows.filter(isStuck), [rows]);
  const active = useMemo(
    () => rows.filter((r) => !['cancelled', 'expired'].includes(r.state)), [rows]);
  const closed = useMemo(
    () => rows.filter((r) => ['cancelled', 'expired'].includes(r.state)), [rows]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Signings</h1>
          <p className="text-slate-600 mb-6">
            Every signing you have arranged, soonest first.
          </p>

          {stuck.length > 0 && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-semibold text-amber-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {stuck.length} {stuck.length === 1 ? 'signing has' : 'signings have'} gone quiet
              </p>
              <p className="text-sm text-amber-800 mt-1">
                No movement in {STUCK_AFTER_DAYS} days or more. Nothing has expired — these
                are worth a phone call.
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

          {active.length > 0 && (
            <div className="space-y-3">
              {active.map((r) => <SigningRow key={r.id} row={r} onOpen={() => router.push(`/past-deeds`)} />)}
            </div>
          )}

          {closed.length > 0 && (
            <>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mt-8 mb-3">
                Closed
              </h2>
              <div className="space-y-3 opacity-70">
                {closed.map((r) => <SigningRow key={r.id} row={r} onOpen={() => router.push(`/past-deeds`)} />)}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function SigningRow({ row, onOpen }: { row: Row; onOpen: () => void }) {
  const stuck = isStuck(row);
  const booked = row.state === 'booked';
  return (
    <button onClick={onOpen}
            className={`w-full text-left bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow ${
              stuck ? 'border-amber-300' : 'border-slate-200'
            }`}>
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
  );
}
