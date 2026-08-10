'use client';

/**
 * NOTARY2 — the token page. One route, two audiences, two designs.
 *
 * ═══ THE SIGNER VIEW IS THE ONLY SCREEN A NON-PROFESSIONAL EVER SEES ═══
 *
 * A buyer opens it on a phone, from a text their escrow officer
 * forwarded, about their own house. They did not sign up for anything and
 * have never heard of us. Four constraints follow, and they are owner-set:
 *
 *  - PLAIN LANGUAGE. "Signing", not "notarial execution". "A notary will
 *    meet you", not "the notarial act will be performed".
 *  - THE OFFICER LEADS, NOT US. Her name and company are the first thing
 *    on the page. We are the mechanism; she is the person this buyer
 *    trusts, and a product that puts its own logo above her name is
 *    borrowing her relationship.
 *  - MOBILE FIRST. Full-width tap targets, one column, no table.
 *  - ONE OBVIOUS ACTION. Pick a time. Everything else is secondary.
 *
 * ═══ THE NOTARY VIEW IS PROFESSIONAL-FACING ═══
 *
 * Dense is fine — she does this all day and reads it between
 * appointments, on a phone. The package, the property, the parties by
 * name, and posting her availability in as few taps as possible.
 *
 * ═══ WHAT NEITHER VIEW DOES ═══
 *
 * Compose its own sentence about the state. `summary` is written by the
 * server (§13 rule 3) and rendered verbatim, so "booked" cannot drift
 * into "the signing will happen" on a screen nobody rechecked. And every
 * time shown is the server's label, rendered in the REQUEST's timezone —
 * this file never formats a date, because a second formatter is a second
 * chance to print the wrong hour.
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  AlertCircle, CalendarClock, Check, Clock, Download, FileText, Loader2, MapPin, Plus, Users, X,
} from 'lucide-react';

const API = () => process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';

type Person = { name: string | null; company: string | null };
type Window = {
  id: number; label: string; start: string; mine?: string | null;
  origin?: string; declined?: boolean; agreed_by?: string[];
};

type Package = {
  party_role: 'signer' | 'notary';
  state: string;
  summary: string;
  expires_at: string | null;
  windows: Window[];
  coordinator: Person;
  // signer only
  property_street?: string;
  notary?: Person;
  can_propose?: boolean;
  proposals_remaining?: number;
  // notary only
  property_address?: string;
  county?: string;
  deed_type?: string;
  signers?: Array<{ name: string }>;
  pcor_url?: string;
  pdf_url?: string;
};

export default function SigningTokenPage() {
  const token = useParams().token as string;
  const [pkg, setPkg] = useState<Package | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | 'propose' | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API()}/signing/${token}`);
      if (!r.ok) {
        setError(
          r.status === 410 ? 'This link has expired. Whoever sent it can send a new one.'
          : r.status === 403 ? 'This link has been withdrawn.'
          : r.status === 404 ? 'This link is not valid.'
          : 'We could not load this right now. Please try again.',
        );
        return;
      }
      setPkg(await r.json());
      setError(null);
    } catch {
      setError('We could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const post = async (path: string, body: unknown, marker: number | 'propose') => {
    setBusy(marker);
    try {
      const r = await fetch(`${API()}/signing/${token}${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setError(data.detail || 'That did not go through.'); return; }
      // Re-read rather than patching locally: the summary sentence is the
      // server's to write, and a locally-composed one is the drift this
      // design exists to prevent.
      setPkg(data);
      setError(null);
    } catch {
      setError('We could not reach the server.');
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-20 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p>Loading…</p>
        </div>
      </Shell>
    );
  }

  if (error && !pkg) {
    return (
      <Shell>
        <div className="text-center py-16">
          <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-700">{error}</p>
        </div>
      </Shell>
    );
  }

  if (!pkg) return null;
  return pkg.party_role === 'notary'
    ? <NotaryView pkg={pkg} busy={busy} post={post} error={error} />
    : <SignerView pkg={pkg} busy={busy} post={post} error={error} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-lg mx-auto px-4 py-8 sm:py-12">{children}</main>
      <footer className="max-w-lg mx-auto px-4 pb-10 text-center">
        {/* We are the mechanism, not the brand in front of her client. */}
        <p className="text-xs text-slate-400">Scheduling by DeedPro</p>
      </footer>
    </div>
  );
}

/* ── Signer ─────────────────────────────────────────────────────── */

function SignerView({ pkg, busy, post, error }: {
  pkg: Package; busy: number | 'propose' | null; error: string | null;
  post: (p: string, b: unknown, m: number | 'propose') => void;
}) {
  const [proposing, setProposing] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const booked = pkg.state === 'booked';
  const who = pkg.coordinator.name || 'Your escrow officer';

  return (
    <Shell>
      {/* The officer leads. Her name is the first thing on the page,
          because she is who this person trusts. */}
      <header className="mb-6">
        <p className="text-sm text-slate-500">A message from</p>
        <h1 className="text-xl font-bold text-slate-900">{who}</h1>
        {pkg.coordinator.company && (
          <p className="text-sm text-slate-600">{pkg.coordinator.company}</p>
        )}
      </header>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">
          {booked ? 'Your signing is set' : 'When can you sign?'}
        </h2>
        <p className="text-slate-600 text-sm mb-4">
          {booked
            ? 'Here is the time everyone agreed on.'
            : 'Pick any time below that works for you. A notary will meet you to witness the signing.'}
        </p>

        {pkg.property_street && (
          <p className="flex items-start gap-2 text-sm text-slate-700 mb-4">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            {pkg.property_street}
          </p>
        )}
        {pkg.notary?.name && (
          <p className="flex items-start gap-2 text-sm text-slate-700 mb-5">
            <Users className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              {pkg.notary.name} will be your notary
              {pkg.notary.company ? <span className="text-slate-500"> · {pkg.notary.company}</span> : null}
            </span>
          </p>
        )}

        {pkg.windows.length === 0 && !booked && (
          <p className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
            No times have been offered yet. {who} will let you know when there are some.
          </p>
        )}

        <div className="space-y-2">
          {pkg.windows.map((w) => {
            const chosen = w.mine === 'available';
            return (
              <button
                key={w.id}
                disabled={busy !== null || booked}
                onClick={() => post('/answer', { window_id: w.id, answer: chosen ? 'unavailable' : 'available' }, w.id)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-4 rounded-xl border text-left transition-colors disabled:opacity-60 ${
                  chosen ? 'border-[#7C4DFF] bg-purple-50' : 'border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="font-medium text-slate-800">{w.label}</span>
                {busy === w.id
                  ? <Loader2 className="w-5 h-5 animate-spin shrink-0 text-slate-400" />
                  : chosen ? <Check className="w-5 h-5 text-[#7C4DFF] shrink-0" /> : null}
              </button>
            );
          })}
        </div>

        {/* The server's sentence, verbatim. */}
        <p className="text-sm text-slate-600 mt-5 pt-4 border-t border-slate-200">{pkg.summary}</p>

        {!booked && pkg.can_propose && (
          proposing ? (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-slate-600">Suggest a time instead:</p>
              <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)}
                     className="w-full px-3 py-3 border border-slate-300 rounded-lg" />
              <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)}
                     className="w-full px-3 py-3 border border-slate-300 rounded-lg" />
              <div className="flex gap-2">
                <button onClick={() => setProposing(false)}
                        className="flex-1 px-4 py-3 border border-slate-300 rounded-lg text-slate-700">
                  Cancel
                </button>
                <button
                  disabled={!start || !end || busy !== null}
                  onClick={() => post('/propose', { start: withOffset(start), end: withOffset(end) }, 'propose')}
                  className="flex-1 px-4 py-3 bg-[#7C4DFF] text-white rounded-lg font-medium disabled:opacity-50">
                  {busy === 'propose' ? 'Sending…' : 'Suggest it'}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                {pkg.notary?.name || 'The notary'} has to agree to it — you will hear back.
              </p>
            </div>
          ) : (
            <button onClick={() => setProposing(true)}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm text-[#7C4DFF] hover:underline">
              <Plus className="w-4 h-4" /> None of these work — suggest a time
            </button>
          )
        )}

        {error && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {error}
          </p>
        )}
      </div>

      <p className="text-xs text-slate-500 mt-4 text-center">
        Questions about the paperwork? Ask {who}.
      </p>
    </Shell>
  );
}

/* ── Notary ─────────────────────────────────────────────────────── */

function NotaryView({ pkg, busy, post, error }: {
  pkg: Package; busy: number | 'propose' | null; error: string | null;
  post: (p: string, b: unknown, m: number | 'propose') => void;
}) {
  const [rows, setRows] = useState<Array<{ start: string; end: string }>>([{ start: '', end: '' }]);
  const [posting, setPosting] = useState(false);
  const complete = rows.filter((r) => r.start && r.end);

  const submit = async () => {
    setPosting(true);
    await post('/windows', {
      windows: complete.map((r) => ({ start: withOffset(r.start), end: withOffset(r.end) })),
    }, 'propose');
    setRows([{ start: '', end: '' }]);
    setPosting(false);
  };

  return (
    <Shell>
      <header className="mb-5">
        <h1 className="text-xl font-bold text-slate-900">Signing request</h1>
        <p className="text-sm text-slate-600">
          From {pkg.coordinator.name}
          {pkg.coordinator.company ? ` · ${pkg.coordinator.company}` : ''}
        </p>
      </header>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
          <dt className="text-slate-500">Property</dt>
          <dd className="text-slate-800 font-medium">{pkg.property_address}</dd>
          <dt className="text-slate-500">County</dt><dd className="text-slate-800">{pkg.county}</dd>
          <dt className="text-slate-500">Document</dt><dd className="text-slate-800">{pkg.deed_type}</dd>
          <dt className="text-slate-500">Signers</dt>
          <dd className="text-slate-800">{(pkg.signers || []).map((s) => s.name).join(', ')}</dd>
        </dl>
        <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100">
          <a href={`${API()}${pkg.pdf_url}`} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-1.5 text-sm text-[#7C4DFF] hover:underline">
            <FileText className="w-4 h-4" /> The document
          </a>
          <a href={`${API()}${pkg.pcor_url}.pdf`} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-1.5 text-sm text-[#7C4DFF] hover:underline">
            <Download className="w-4 h-4" /> PCOR
          </a>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-1">
          <CalendarClock className="w-5 h-5 text-[#7C4DFF]" /> Times
        </h2>
        <p className="text-sm text-slate-600 mb-4">{pkg.summary}</p>

        <div className="space-y-2 mb-5">
          {pkg.windows.map((w) => (
            <div key={w.id}
                 className={`rounded-lg border p-3 ${w.declined ? 'border-slate-200 bg-slate-50 opacity-60' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{w.label}</p>
                  <p className="text-xs text-slate-500">
                    {w.origin === 'signer_proposal' ? 'Suggested by a signer' : 'You offered this'}
                    {w.agreed_by?.length ? ` · ${w.agreed_by.length} agreed` : ' · nobody has answered'}
                  </p>
                </div>
                {w.origin === 'signer_proposal' && !w.declined && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => post('/answer', { window_id: w.id, answer: 'available' }, w.id)}
                            disabled={busy !== null}
                            className="px-2.5 py-1.5 text-xs bg-[#7C4DFF] text-white rounded-md disabled:opacity-50">
                      {busy === w.id ? '…' : 'I can do it'}
                    </button>
                    <button onClick={() => post(`/decline/${w.id}`, {}, w.id)}
                            disabled={busy !== null}
                            className="px-2.5 py-1.5 text-xs border border-slate-300 text-slate-600 rounded-md">
                      No
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {pkg.state !== 'booked' && (
          <>
            <p className="text-sm font-medium text-slate-700 mb-2">Add times you are free</p>
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={i} className="grid grid-cols-2 gap-2">
                  <input type="datetime-local" value={r.start}
                         onChange={(e) => setRows((p) => p.map((x, n) => n === i ? { ...x, start: e.target.value } : x))}
                         className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm" />
                  <input type="datetime-local" value={r.end}
                         onChange={(e) => setRows((p) => p.map((x, n) => n === i ? { ...x, end: e.target.value } : x))}
                         className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm" />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => setRows((p) => [...p, { start: '', end: '' }])}
                      className="px-3 py-2 text-sm text-[#7C4DFF] hover:underline inline-flex items-center gap-1">
                <Plus className="w-4 h-4" /> Another
              </button>
              <button onClick={submit} disabled={!complete.length || posting}
                      className="flex-1 px-4 py-2.5 bg-[#7C4DFF] text-white rounded-lg font-medium disabled:opacity-50">
                {posting ? 'Posting…' : `Post ${complete.length || ''} time${complete.length === 1 ? '' : 's'}`}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-start gap-1.5">
              <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Posting a time says you are free then — you do not need to confirm it again.
            </p>
          </>
        )}

        {error && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{error}</p>
        )}
      </div>
    </Shell>
  );
}

/**
 * "2026-08-12T10:00" (local, from datetime-local) → with the browser's
 * UTC offset. The server REFUSES a naive time (#149's parse_window) —
 * deliberately, because guessing a zone is how a calendar entry lands
 * eight hours out. This is where the offset comes from.
 */
function withOffset(local: string): string {
  const parsed = new Date(local);
  if (Number.isNaN(parsed.getTime())) return local;
  const minutes = -parsed.getTimezoneOffset();
  const sign = minutes >= 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${local}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}
