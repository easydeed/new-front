'use client';

/**
 * TRY Stage 3 — `/try`, the live API demonstration.
 *
 * Three acts, about ninety seconds: break it on purpose, confirm a deed
 * with your own name and phone, then try to make the receipt lie.
 *
 * ═══ WHAT "REAL" MEANS HERE, STATED EXACTLY (owner-ruled) ═══
 *
 * The browser posts to `/try/deed`, a server-side route that holds the
 * demo key. That route runs the REAL validation, the REAL handler, the
 * REAL database write and the REAL render — but NOT the partner route's
 * HTTP auth path, because the request never crosses a network as a
 * partner request.
 *
 * So the hero says **"every button runs the real API code against the
 * sandbox"**, not "sends a real request", and the console labels its
 * payload as **the request the partner API receives** rather than
 * implying this browser sent `POST /api/v1/deeds` with an
 * `Authorization` header. On a page whose whole argument is that nothing
 * is faked, the opening sentence cannot be the one inaccurate claim on
 * it.
 *
 * ═══ COLOUR IS DOCTRINE, NOT DECORATION ═══
 *
 * Amber means UNCONFIRMED EXTERNAL DATA AWAITING A HUMAN — the pending
 * draft, and nothing else on this page. **Failure is red. Absence is
 * grey.** So a rate limit is red (a refusal) and an expired draft is
 * grey (a thing that is gone), and neither borrows the colour that means
 * "a person still has to look at this".
 *
 * Every status is a GLYPH PLUS A WORD, never colour alone.
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { API_DEED_TYPES } from '@/lib/apiDocs';
import { LogoLockup } from '@/components/brand/Logo';
import ApiInquiryForm from '../developers/ApiInquiryForm';
/* @paulmillr/qr — MIT OR Apache-2.0, zero dependencies, +7 kB measured
   on this route's First Load JS (10.2→16.8 kB route, 113→120 kB first
   load). The registry's `unpackedSize` reads 343 KB, ~50x the shipped
   cost, which is why the number was BUILT rather than read.

   Renders `urls.confirmation` ON THIS PAGE ONLY. The standing rule is
   untouched: no recorded page and no PDF carries a QR, a verification
   URL, or a document id. */
import encodeQR from '@paulmillr/qr';

const API = () =>
  process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';

/* ── The traps ───────────────────────────────────────────────────────
 *
 * TRY-3: the ids match the server's `TRAPS`, and every label that names
 * an instrument DERIVES it from the catalog. The expected messages are
 * deliberately absent — the page renders whatever the API returns, so a
 * reworded refusal updates the demo instead of contradicting it. */
const FIXED_VESTING = API_DEED_TYPES.find((t) => t.vesting === 'fixed-by-instrument');
const ENTITY_TYPE = API_DEED_TYPES.find((t) => (t.entityFacts?.length ?? 0) > 0);

type TrapId =
  | 'vesting_on_fixed_instrument'
  | 'no_vesting'
  | 'entity_state_missing'
  | 'no_transfer_tax'
  | 'out_of_state';

const TRAPS: Array<{ id: TrapId; label: string; sub: string }> = [
  {
    id: 'vesting_on_fixed_instrument',
    label: 'Vesting clause on a fixed-vesting deed',
    sub: `deed_type → ${FIXED_VESTING?.slug ?? '—'}`,
  },
  { id: 'no_vesting', label: 'Grant deed with no vesting at all', sub: 'drop grantee.vesting' },
  {
    id: 'entity_state_missing',
    label: 'Corporate grantor, no organizing state',
    sub: `deed_type → ${ENTITY_TYPE?.slug ?? '—'}`,
  },
  { id: 'no_transfer_tax', label: 'Remove the transfer-tax declaration', sub: 'drop transfer_tax' },
  { id: 'out_of_state', label: 'A parcel outside California', sub: 'property.state → "NV"' },
];

/* Trap 4's refusal is `Field required` — a framework string carrying no
 * doctrine, unlike the other four. OWNER-RULED to keep it, with a gloss
 * carrying REQUIRED1's lesson, and NOT paired with the vesting traps. */
const GLOSS: Record<TrapId, string> = {
  vesting_on_fixed_instrument:
    'The instrument states its vesting on its own face, so choosing it IS the vesting decision. Accepting a second answer and dropping it would silently discard a legal input.',
  no_vesting:
    'The opposite refusal from the same rule: a plain grant deed has no vesting unless someone states one. Neither is a preference we hold — both are what the instrument decides.',
  entity_state_missing:
    'The deed recites the state under whose laws the entity is organized, mid-sentence. Absent, it prints a blank line inside a granting clause — a defective instrument, not a partial one.',
  /* The ticket identifier that used to open this sentence named nothing
   * a prospect could look up. The doctrine it referred to is the
   * sentence itself, so the label carried no meaning outward — it was a
   * note to the next developer sitting in a string the customer reads.
   * The banned-claims gate now derives its ticket families from the
   * ledger rather than a hand-typed list, and catches this one. */
  no_transfer_tax:
    'The endpoint that PRINTS is where legal decisions are enforced, which is why the API refuses this and the browser wizard is the more permissive surface. A deed cannot generate without a transfer-tax declaration.',
  out_of_state:
    'California only, and the API says so at the boundary rather than rendering a document against templates measured to the wrong state.',
};

type ApiError = { code?: string; message?: string; details?: Array<{ field?: string; message?: string }> };
type TryResult = { request: unknown; status_code: number; response: Record<string, unknown> };

const WARM_CEILING_SECONDS = 45;
const POLL_MS = 3000;

function tokenFrom(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/\/confirm\/([^/?#]+)/);
  return m ? m[1] : null;
}

function mmss(total: number): string {
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = Math.floor(total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/* `useSearchParams` opts a route into client-side rendering, and Next
 * refuses to prerender the page unless it sits inside a Suspense
 * boundary. The presenter flag is the only thing that needs it, so the
 * whole demo lives in the inner component and the default export is the
 * boundary — found by `next build`, which fails loudly on this rather
 * than shipping a route that cannot prerender. */
function TryDemo() {
  const search = useSearchParams();
  const presenter = search?.get('presenter') === '1';

  const [ready, setReady] = useState(false);
  const [warmStart] = useState(() => Date.now());
  const [warmElapsed, setWarmElapsed] = useState(0);
  const [skipped, setSkipped] = useState(false);

  const [trap, setTrap] = useState<TrapId>('vesting_on_fixed_instrument');
  const [refusal, setRefusal] = useState<ApiError | null>(null);
  const [sentRequest, setSentRequest] = useState<unknown>(null);
  const [trapsFired, setTrapsFired] = useState<Set<TrapId>>(new Set());

  const [approverName, setApproverName] = useState('');
  const [approverRole, setApproverRole] = useState('escrow officer');
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [polls, setPolls] = useState(0);
  const [phone, setPhone] = useState<'pending' | 'completed' | 'rejected' | 'expired'>('pending');

  const [artifact, setArtifact] = useState<Record<string, unknown> | null>(null);
  /* The STATUS is part of the result, not decoration around it. The
   * panel reads it; nothing on this page types a status code. */
  const [tamper, setTamper] = useState<{ status: number; error: ApiError | null } | null>(null);

  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ kind: 'network' | 'rate' | 'gone' | 'other'; text: string; retryAfter?: number } | null>(null);

  const [clock, setClock] = useState(0);
  const [running, setRunning] = useState(presenter);

  const warmed = ready || skipped;
  const act2Open = presenter || trapsFired.size > 0;
  const act3Open = presenter || phone === 'completed';

  /* The refusal this act demonstrates is `DRAFT_MISMATCH` specifically.
   * A 409 on its own is NOT it — `NOT_PENDING` is also a 409, and the
   * tester's report was a page showing 409 with `DRAFT_MISMATCH`
   * nowhere on it. Matching the status alone would read the shape of
   * the answer instead of the answer. */
  const tamperRefused = tamper?.status === 409 && tamper.error?.code === 'DRAFT_MISMATCH';

  /* ── Readiness ──────────────────────────────────────────────────────
   * Derived from a stored timestamp each tick rather than decremented,
   * because a decrementing counter drifts and can freeze — and a frozen
   * counter that locks the page is worse than no counter. */
  useEffect(() => {
    let live = true;
    const tick = async () => {
      if (!live) return;
      setWarmElapsed(Math.floor((Date.now() - warmStart) / 1000));
      try {
        const r = await fetch(`${API()}/ready`);
        const d = await r.json().catch(() => ({}));
        if (live && d?.ready) setReady(true);
      } catch {
        /* keep counting; the ceiling below is the give-up */
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [warmStart]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setClock((c) => c + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const warmExhausted = !warmed && warmElapsed >= WARM_CEILING_SECONDS;

  /* ── The one call the browser makes ────────────────────────────────
   * Two fields. The payload is built server-side from the fixed sample;
   * this page cannot submit facts of its own. */
  const callTry = useCallback(
    async (trapId: TrapId | null, variant: string | null = null): Promise<TryResult | null> => {
      setFailure(null);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      try {
        const r = await fetch(`${API()}/try/deed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trap_id: trapId, approver_name: approverName, variant }),
          signal: controller.signal,
        });
        const d = await r.json().catch(() => ({}));
        if (r.status === 429) {
          const retry = Number(r.headers.get('Retry-After') || 0);
          setFailure({
            kind: 'rate',
            text: 'The sandbox is shared, and it is rate limited per address. One visitor can limit the next — that is a real property of a demo key, not a fault on your side.',
            retryAfter: retry || undefined,
          });
          return null;
        }
        if (!r.ok && r.status !== 200) {
          setFailure({ kind: 'other', text: d?.detail?.message || 'The sandbox refused this request.' });
          return null;
        }
        return d as TryResult;
      } catch {
        setFailure({
          kind: 'network',
          text: `The request did not come back within 20 seconds. We cannot tell whether it reached us — if a draft was created, it will expire on its own.`,
        });
        return null;
      } finally {
        clearTimeout(timeout);
      }
    },
    [approverName],
  );

  const fireTrap = async () => {
    setBusy('trap');
    const res = await callTry(trap);
    setBusy(null);
    if (!res) return;
    setSentRequest(res.request);
    const detail = (res.response as { detail?: ApiError })?.detail;
    setRefusal(detail ?? { message: 'The sandbox accepted this request — the trap did not fire.' });
    setTrapsFired((prev) => new Set(prev).add(trap));
  };

  const sendValid = async () => {
    setBusy('valid');
    const res = await callTry(null);
    setBusy(null);
    if (!res) return;
    setSentRequest(res.request);
    setDraft(res.response);
    setPolls(0);
    setPhone('pending');
  };

  const confirmationUrl =
    ((draft as { data?: { urls?: { confirmation?: string } } })?.data?.urls?.confirmation) ?? null;
  const token = tokenFrom(confirmationUrl);

  /* ── Polling ────────────────────────────────────────────────────────
   * Against the PUBLIC `/confirm/{token}`, not `GET /api/v1/deeds/{id}`
   * as the handoff drew it: that endpoint needs an API key, and this
   * browser deliberately has none. `/confirm/{token}` is the same state
   * the phone changes, is token-authenticated, and is real. The footer
   * line says which endpoint is polled, so the page does not imply the
   * partner-API poll it cannot perform.
   *
   * There are no webhooks. Nothing here may imply a push channel. */
  useEffect(() => {
    if (!token || phone !== 'pending') return;
    let live = true;

    const pollOnce = async () => {
      if (!live) return;
      try {
        const r = await fetch(`${API()}/confirm/${token}`);
        const d = await r.json().catch(() => ({}));
        setPolls((n) => n + 1);
        if (!live) return;
        if (d?.state === 'completed') setPhone('completed');
        else if (d?.state === 'rejected') setPhone('rejected');
        else if (d?.state === 'expired') setPhone('expired');
      } catch {
        /* a failed poll is not a state change; keep counting attempts */
      }
    };

    const id = setInterval(pollOnce, POLL_MS);

    /* ═══ THE SEQUENCE THIS ACT ACTUALLY ASKS FOR ═══
     *
     * Switch to your phone, approve, come back. The tab is HIDDEN for
     * the middle step, which is exactly when the browser clamps this
     * interval — so the prospect returned to a page that could sit on
     * `pending_confirmation` for up to a minute after they had already
     * approved, and the demo looked broken at its own climax.
     *
     * Polling faster would not fix it and could not: the throttle is
     * the browser's. Asking once, immediately, on the way back is the
     * move that matches what the visitor did. */
    const onVisible = () => {
      if (document.visibilityState === 'visible') pollOnce();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      live = false;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [token, phone]);

  useEffect(() => {
    if (phone !== 'completed' || !token || artifact) return;
    (async () => {
      try {
        const r = await fetch(`${API()}/confirm/${token}/artifact`);
        if (r.ok) setArtifact(await r.json());
      } catch {
        /* the artifact panel stays empty rather than inventing one */
      }
    })();
  }, [phone, token, artifact]);

  /* ── Act 3, the tamper ─────────────────────────────────────────────
   * TRY-4: re-approving the deed just confirmed returns NOT_PENDING,
   * because the state check runs before the hash comparison. Reaching
   * DRAFT_MISMATCH needs a SECOND pending draft approved with the
   * FIRST draft's hash. Nothing is edited — drafts are immutable. */
  /* ── Act 3: the tamper ──────────────────────────────────────────────
   *
   * Draft B is the `second_draft` VARIANT, not a repeat of the sample.
   *
   * It used to be a repeat, and that made the whole act a lie. WeasyPrint
   * renders identical HTML to identical bytes, so draft B hashed exactly
   * as draft A did, `DRAFT_MISMATCH` could not fire, and the approval
   * SUCCEEDED — promoting a second deed while this panel displayed a
   * hardcoded `409` and the words "Refused — see below". The guard was
   * never shown a tamper; the page invented the refusal.
   *
   * So: a draft that genuinely differs, and every word below derived
   * from the response. No status literal anywhere on this page. */
  const runTamper = async () => {
    const firstHash = (artifact as { pdf_sha256?: string })?.pdf_sha256;
    if (!firstHash) return;
    setBusy('tamper');
    const second = await callTry(null, 'second_draft');
    if (!second) {
      setBusy(null);
      return;
    }
    const secondToken = tokenFrom(
      ((second.response as { data?: { urls?: { confirmation?: string } } })?.data?.urls?.confirmation),
    );
    if (!secondToken) {
      setBusy(null);
      return;
    }
    try {
      const r = await fetch(`${API()}/confirm/${secondToken}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_sha256: firstHash }),
      });
      const d = await r.json().catch(() => ({}));
      setTamper({ status: r.status, error: (d as { detail?: ApiError })?.detail ?? null });
    } catch {
      setFailure({ kind: 'network', text: 'The tamper request did not come back.' });
    } finally {
      setBusy(null);
    }
  };

  const resetDemo = () => {
    setRefusal(null); setSentRequest(null); setTrapsFired(new Set());
    setDraft(null); setPolls(0); setPhone('pending'); setArtifact(null);
    setTamper(null); setFailure(null); setClock(0);
  };

  /* The close counts WHAT THE PROSPECT ACTUALLY DID. Never "four traps
   * refused" as a literal — a visitor who fired one trap and left would
   * be told a story about a session they did not have. */
  const closeLine = useMemo(() => {
    const parts: string[] = [];
    const n = trapsFired.size;
    if (n === 0) parts.push('You have not fired a trap yet');
    else parts.push(`${n} trap${n === 1 ? '' : 's'} refused`);
    if (phone === 'completed') parts.push('one deed confirmed by name');
    if (tamperRefused) parts.push('one receipt that would not take a false hash');
    return `${parts.join(', ')}.`;
  }, [trapsFired, phone, tamperRefused]);

  return (
    <main className="min-h-screen bg-white text-[#1F2B37]">
      {/* ── 1. Sticky nav ── */}
      <nav className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-gray-200 bg-white/95 px-6 backdrop-blur">
        <Link href="/"><LogoLockup size={30} /></Link>
        <div className="flex items-center gap-3">
          <Link href="/developers" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Read the docs
          </Link>
          <a href="#request-access" className="rounded-lg bg-[#7C4DFF] px-4 py-2 text-sm font-bold text-white hover:bg-[#6a3ff0]">
            Request access
          </a>
        </div>
      </nav>

      {/* ── 2. Presenter strip — the timer stays, the script line does not ──
          OWNER-RULED: stage directions are visible to anyone watching a
          shared or turned-around screen and read as a performance when
          seen. The TIMER stays because the hero promises "about ninety
          seconds" and a visible clock corroborates that claim in front of
          the prospect rather than exposing machinery. The script lines
          live outside this repository. */}
      {presenter && (
        <div className="flex flex-wrap items-center gap-5 border-b border-[#262A33] bg-[#12141A] px-6 py-3.5">
          <span className="rounded-md border border-[#A78BFA]/30 bg-[#A78BFA]/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[#C4B5FD]">
            Presenter mode
          </span>
          <span className="font-mono text-2xl font-bold tracking-tight text-white">{mmss(clock)}</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setRunning((r) => !r)}
              className="rounded-lg border border-gray-600 bg-[#0B0D11] px-3.5 py-2 text-[13px] font-semibold text-gray-200">
              {running ? 'Pause' : 'Start'}
            </button>
            <button type="button" onClick={resetDemo}
              className="rounded-lg border border-gray-600 bg-[#0B0D11] px-3.5 py-2 text-[13px] font-semibold text-gray-200">
              Reset demo
            </button>
          </div>
          <span className="text-[13px] text-gray-500">Acts unlocked · sandbox pre-warmed</span>
        </div>
      )}

      {/* ── 3. Hero + sandbox status ── */}
      <section className="border-b border-gray-200 px-6 pb-10 pt-14">
        <div className="mx-auto max-w-7xl">
          <div className="mb-3.5 text-[13px] font-bold uppercase tracking-[0.14em] text-[#7C4DFF]">
            Live sandbox · /try
          </div>
          <h1 className="max-w-4xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-[52px]">
            Try to get a bad deed past us.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-gray-600">
            Every button on this page <strong>runs the real API code against the DeedPro sandbox</strong> — the
            same validation, the same handler, the same render. You will break it on purpose, then confirm a
            deed with your own name and phone, then try to make the receipt lie. About ninety seconds.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            {warmed ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3.5 py-1.5 text-[13px] font-semibold text-green-800">
                <span aria-hidden>✓</span> Sandbox ready
              </span>
            ) : warmExhausted ? (
              /* FAILURE IS RED. Not amber — amber means a human still has
                 to look at something, and nobody can look this into
                 working. And the countdown does NOT restart. */
              <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5 text-[13px] font-semibold text-red-800">
                <span aria-hidden>✕</span> Sandbox did not come up
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-100 px-3.5 py-1.5 text-[13px] font-semibold text-gray-600">
                <span aria-hidden>◔</span> Sandbox warming
              </span>
            )}
            <span className="text-[13.5px] text-gray-500">
              {warmed
                ? 'Test key held server-side · every request below runs real code'
                : warmExhausted
                  ? 'This is our infrastructure, not your connection. Nothing below will work until it wakes.'
                  : `Cold containers take up to 30 seconds to wake. ${Math.max(0, WARM_CEILING_SECONDS - warmElapsed)}s remaining — nothing is hidden behind a spinner.`}
            </span>
            {!warmed && (
              <button type="button" onClick={() => setSkipped(true)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12.5px] font-semibold text-gray-600 hover:bg-gray-50">
                Skip the wait
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── 4. Act rail ── */}
      <section className="border-b border-gray-200 bg-[#F8F8FB]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-gray-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            { n: 'ACT 01', t: 'Break it on purpose', s: trapsFired.size ? 'Refused — as designed' : 'Waiting for you' },
            /* "Ready" described a draft that did not exist — the act was
             * unlocked, nothing had been sent. The rail reports the state
             * of the WORK, not the state of the accordion. */
            { n: 'ACT 02', t: 'You confirm it', s: phone === 'completed' ? `Confirmed by ${approverName || 'you'}` : draft ? 'Draft awaiting your confirmation' : act2Open ? 'Unlocked — no draft sent yet' : 'Locked until a trap fires' },
            /* Derived, like everything else about this act. It used to
             * announce a refusal, with a typed status code, whatever
             * came back — including the 200 that actually did. */
            { n: 'ACT 03', t: 'The receipt', s: tamper ? (tamperRefused ? `${tamper.status} — refused` : `${tamper.status} — guard did not fire`) : artifact ? 'Artifact issued' : 'Locked until confirmation' },
          ].map((a) => (
            <div key={a.n} className="px-5 py-4">
              <div className="font-mono text-[11px] font-bold tracking-widest text-gray-400">{a.n}</div>
              <div className="text-[15px] font-bold text-[#14161A]">{a.t}</div>
              <div className="text-[13px] text-gray-500">{a.s}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Shared failure surface ── */}
      {failure && (
        <div className="mx-auto max-w-7xl px-6 pt-6">
          <div className={`rounded-xl border p-5 ${failure.kind === 'gone' ? 'border-gray-200 bg-gray-50' : 'border-red-200 bg-red-50'}`}>
            <div className={`flex items-center gap-2 text-sm font-bold ${failure.kind === 'gone' ? 'text-gray-700' : 'text-red-800'}`}>
              <span aria-hidden>{failure.kind === 'gone' ? '—' : '✕'}</span>
              {failure.kind === 'rate' ? 'Rate limited' : failure.kind === 'network' ? 'The request did not come back' : failure.kind === 'gone' ? 'No longer available' : 'Refused'}
            </div>
            <p className="mt-1.5 text-sm text-gray-700">{failure.text}</p>
            {failure.retryAfter ? (
              <p className="mt-1 font-mono text-xs text-gray-600">Retry-After: {failure.retryAfter}s</p>
            ) : null}
          </div>
        </div>
      )}

      {/* ── 5. Act 1 ── */}
      <section id="act-1" className="border-b border-gray-200 px-6 py-14">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 max-w-3xl">
            <div className="text-[12.5px] font-bold uppercase tracking-[0.14em] text-[#7C4DFF]">Act one</div>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#14161A]">Break it on purpose</h2>
            <p className="mt-3 text-base leading-relaxed text-gray-600">
              The console is loaded with a valid grant deed. Pick a trap; it rewrites the request and sends it.
              These are the mistakes an integration makes in month one — the question is whether they fail in
              your tests or at the counter.
            </p>
          </div>

          {/* `min-w-0` ON EVERY GRID CHILD.
           *
           * A grid item defaults to `min-width: auto`, which means it
           * will not shrink below its own content. Below `lg` these
           * grids are one column, so a wide child — a JSON console, a
           * 64-character hash — pushed the DOCUMENT wider than the
           * viewport instead of wrapping inside it.
           *
           * Measured on production at a 400px viewport: clean on load,
           * clean after the 422, then 567px once the 201 draft panel
           * rendered and 642px with the artifact and tamper panels too.
           *
           * THE SHAPE, NOT THE INSTANCE: these responsive rules were
           * written and checked against the EMPTY page, where every
           * child is narrow and nothing can overflow. The page only
           * breaks once it has content, which is a state no one looks
           * at while writing layout. The pin at the foot of
           * `tryPage.test.ts` holds all three panels rendered. */}
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="min-w-0 overflow-hidden rounded-2xl bg-[#12141A]">
              <div className="flex items-center justify-between border-b border-[#262A33] px-5 py-3.5">
                <span className="font-mono text-xs text-gray-400">the request the partner API receives</span>
                <span className="font-mono text-[11px] text-gray-500">POST /api/v1/deeds</span>
              </div>
              <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words px-5 py-4 font-mono text-[12.5px] leading-relaxed text-gray-300">
{sentRequest ? JSON.stringify(sentRequest, null, 2) : 'Pick a trap and send it — the exact request the API received appears here, beside what it answered.'}
              </pre>
              <div className="border-t border-[#262A33] px-5 py-3.5">
                <button type="button" onClick={fireTrap} disabled={!warmed || busy !== null}
                  className="rounded-lg bg-[#7C4DFF] px-4.5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400">
                  {busy === 'trap' ? 'Sending…' : 'Send this request'}
                </button>
                <p className="mt-2 text-[12.5px] text-gray-500">
                  {warmed ? 'Runs the real API code against the sandbox — nothing is stubbed.' : 'Disabled until the sandbox is up.'}
                </p>
              </div>
            </div>

            <div>
              <div className="text-[12.5px] font-bold uppercase tracking-widest text-gray-500">The traps</div>
              <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                {TRAPS.map((t) => (
                  <button key={t.id} type="button" onClick={() => { setTrap(t.id); setRefusal(null); }}
                    className={`rounded-xl border-[1.5px] p-3.5 text-left transition-colors ${trap === t.id ? 'border-[#7C4DFF] bg-[#F5F3FF]' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <div className="text-sm font-bold text-[#14161A]">{t.label}</div>
                    <div className="font-mono text-[12.5px] text-gray-500">{t.sub}</div>
                  </button>
                ))}
              </div>

              <div className={`mt-4 min-h-[150px] rounded-2xl border p-5 ${refusal ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-[#FCFCFD]'}`}>
                {refusal ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="rounded border border-red-300 bg-red-100 px-2 py-0.5 font-mono text-xs font-bold text-red-800">422</span>
                      <span className="font-mono text-[12.5px] text-gray-500">{refusal.code}</span>
                    </div>
                    {/* The hero. Rendered verbatim and never truncated —
                        and since Stage 1 it is the doctrine SENTENCE
                        rather than a field path wrapped in framework
                        output. */}
                    <p className="mt-3.5 text-lg font-semibold leading-snug text-[#14161A]">{refusal.message}</p>
                    <p className="mt-3 text-sm leading-relaxed text-gray-600">{GLOSS[trap]}</p>
                    {refusal.details?.length ? (
                      <div className="mt-4 border-t border-gray-200 pt-3">
                        {/* A FIELD PATH, not a section heading. `uppercase
                            tracking-wider` rendered it "DETAIL.DETAILS[]",
                            which is not a key any response contains and not
                            a path an integrator can look up — the styling
                            made a literal into a label. Mono, as written. */}
                        <div className="font-mono text-[11.5px] text-gray-400">detail.details[]</div>
                        {refusal.details.map((d, i) => (
                          <div key={i} className="mt-1 font-mono text-[12.5px]">
                            <span className="text-[#7C4DFF]">{d.field}</span>{' '}
                            <span className="text-gray-600">{d.message}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-gray-400">
                    Pick a trap, send the request, and the refusal lands here — the reason first, the envelope under it.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Act 2 ── */}
      <section id="act-2" className={`border-b border-gray-200 bg-[#F8F8FB] px-6 py-14 ${act2Open ? '' : 'opacity-55'}`}>
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 max-w-3xl">
            <div className="text-[12.5px] font-bold uppercase tracking-[0.14em] text-[#7C4DFF]">Act two</div>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#14161A]">You confirm it</h2>
            <p className="mt-3 text-base leading-relaxed text-gray-600">
              Send the valid request and no PDF exists yet — you get a draft, a status, and a confirmation URL.
              Put your own name on it, open the link on your phone, and read the deed as it will print.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 space-y-5">
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="text-[12.5px] font-bold uppercase tracking-widest text-gray-500">Who is confirming</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block text-[13px] font-medium">
                    approver.name
                    <input value={approverName} onChange={(e) => setApproverName(e.target.value)}
                      placeholder="Your name"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14.5px]" />
                  </label>
                  <label className="block text-[13px] font-medium">
                    approver.role
                    <input value={approverRole} onChange={(e) => setApproverRole(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14.5px]" />
                  </label>
                </div>
                <p className="mt-2.5 text-[13.5px] text-gray-500">
                  Both are required by the shipped contract. The token authenticates; DeedPro does not verify the
                  person. What gets recorded is who you said it was.
                </p>
                <button type="button" onClick={sendValid} disabled={!warmed || !act2Open || busy !== null || !!draft}
                  className="mt-4 rounded-lg bg-[#7C4DFF] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500">
                  {busy === 'valid' ? 'Sending…' : 'Send the valid request'}
                </button>
                <p className="mt-2 text-[12.5px] text-gray-500">
                  {!act2Open ? 'Fire a trap in Act 1 first — the sequence is the argument.'
                    : draft ? 'No PDF exists yet. urls.pdf is null.'
                      : 'Same payload, no trap. Returns a draft, not a document.'}
                </p>
              </div>

              {draft && (
                <div className="overflow-hidden rounded-2xl bg-[#12141A]">
                  <div className="flex items-center justify-between border-b border-[#262A33] px-5 py-3">
                    {/* ═══ TWO TIMES IN ONE PANEL, AND THEY MUST SAY SO ═══
                     *
                     * The body below is the 201 AS RETURNED. It is never
                     * re-fetched, because the poll asks `/confirm/{token}`,
                     * which answers a different shape. The badge is the
                     * draft's state NOW.
                     *
                     * Unlabelled, that read as one object: a green
                     * "completed" sitting over JSON whose own `status`
                     * field still said `pending_confirmation`. The badge
                     * was right, the body was right, and together they
                     * contradicted each other.
                     *
                     * The one fix NOT taken: rewriting `status` inside the
                     * body. That would mean showing the reader a response
                     * the API never sent, on the page whose whole argument
                     * is that nothing on it is faked. */}
                    <span className="font-mono text-[11.5px] text-gray-400">
                      201 · response.data <span className="text-gray-500">— as returned</span>
                    </span>
                    {phone === 'completed' ? (
                      <span className="rounded border border-green-500/35 bg-green-500/10 px-2 py-0.5 font-mono text-xs text-green-300">
                        draft is now ✓ completed
                      </span>
                    ) : (
                      /* AMBER, and this is the ONLY amber on the page:
                         an unconfirmed draft awaiting a human is exactly
                         what the colour means. */
                      <span className="rounded border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 font-mono text-xs text-amber-300">
                        ◷ pending_confirmation
                      </span>
                    )}
                  </div>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words px-5 py-4 font-mono text-[12.5px] leading-relaxed text-gray-300">
{JSON.stringify(draft, null, 2)}
                  </pre>
                  <div className="border-t border-[#262A33] px-5 py-3 font-mono text-[12px] text-gray-400">
                    {/* "every 3s" was a claim about something THE BROWSER
                        CONTROLS. A hidden tab has its timers clamped —
                        the HTML spec requires at least 1s, and Chrome
                        drops to roughly once a minute after five minutes
                        hidden — so the sentence was false exactly when a
                        prospect had switched away to use their phone,
                        which is the moment this act asks them to.
                        Naming it turns a slow demo into an explained
                        one; asserting the interval made the page's own
                        instrument the thing that was faked. */}
                    {phone === 'completed'
                      ? `✓ Stopped polling after ${polls} attempt(s). No webhooks exist — this is a poll, and the page says so.`
                      : `↻ Polling GET /confirm/{token} · attempt ${polls}. Browsers slow this down in a background tab. No webhooks — this is a poll, not a push.`}
                  </div>
                </div>
              )}

              {phone === 'completed' && (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
                  <div className="text-[15px] font-bold text-green-900">
                    <span aria-hidden>✓</span> The PDF now exists — and it did not a moment ago.
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-700">
                    Approval promoted the bytes you read on your phone. It did not re-render them: the document
                    you saw and the document we store are the same object, which is why there is only ever one hash.
                  </p>
                </div>
              )}

              {phone === 'rejected' && (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-700">
                  <span aria-hidden>—</span> Returned for correction. The integrator corrects the facts in their
                  system and submits again with a new Idempotency-Key.
                </div>
              )}
              {phone === 'expired' && (
                /* ABSENCE IS GREY. An expired draft is a thing that is
                   gone, not a thing awaiting a person. */
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-700">
                  <span aria-hidden>—</span> This draft has expired and is gone. Send the valid request again to
                  create a fresh one.
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="text-[12.5px] font-bold uppercase tracking-widest text-gray-500">On your phone</div>
                {confirmationUrl ? (
                  <>
                    {/* THE QR IS FOR A SCREEN SOMEBODY ELSE IS LOOKING AT.
                        On a shared call it is the only clean path from the
                        presenter's screen to the prospect's phone; pasting
                        a long URL into chat mid-demo is the fumble this
                        page exists to avoid.

                        Hidden below `sm` because a QR on the device you
                        are already holding is useless — there the button
                        below is the whole answer.

                        `dangerouslySetInnerHTML` is safe here and it was
                        CHECKED rather than assumed: the encoder emits only
                        <svg> and <rect>, and the input text never reaches
                        the markup — it is encoded into the matrix. Probed
                        with a script-tag payload; nothing echoed. */}
                    <div
                      aria-hidden
                      className="mx-auto mt-3 hidden w-[168px] rounded-lg border border-gray-200 bg-white p-2 sm:block [&>svg]:h-full [&>svg]:w-full"
                      dangerouslySetInnerHTML={{ __html: encodeQR(confirmationUrl, 'svg') }}
                    />
                    <p className="mt-2 hidden text-center text-[13px] text-gray-500 sm:block">
                      Scan it with your phone.
                    </p>
                    <a href={confirmationUrl} target="_blank" rel="noopener noreferrer"
                      className="mt-3 block rounded-lg bg-[#14161A] px-4 py-3 text-center text-sm font-bold text-white">
                      Open the confirmation link ↗
                    </a>
                    <p className="mt-2.5 break-all font-mono text-[12.5px] text-gray-500">{confirmationUrl}</p>
                    <p className="mt-2 text-[13px] text-gray-500">
                      Open it on a phone to read the deed and approve it. This page keeps polling while you do —
                      come back here for the receipt.
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-gray-400">
                    The confirmation URL appears here once a draft exists.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. Act 3 ── */}
      <section id="act-3" className={`border-b border-gray-200 px-6 py-14 ${act3Open ? '' : 'opacity-55'}`}>
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 max-w-3xl">
            <div className="text-[12.5px] font-bold uppercase tracking-[0.14em] text-[#7C4DFF]">Act three</div>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#14161A]">
              The receipt, and an attempt to make it lie
            </h2>
            <p className="mt-3 text-base leading-relaxed text-gray-600">
              This is the artifact you hand a risk team. Then: a second draft is created, and we confirm it using
              the <em className="not-italic font-semibold">first</em> draft&apos;s hash. Drafts are immutable —
              nothing is edited. The hash simply does not match the bytes we hold.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5">
              <div className="font-mono text-xs text-gray-500">GET /confirm/{'{token}'}/artifact</div>
              {artifact ? (
                <dl className="mt-3 divide-y divide-gray-100">
                  {Object.entries(artifact).map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[180px_minmax(0,1fr)] gap-3 py-2.5">
                      <dt className="font-mono text-[12.5px] text-[#6D3BF0]">{k}</dt>
                      <dd className="break-all text-[13.5px] text-[#14161A]">
                        {k === 'declarations' && Array.isArray(v)
                          ? <ul className="space-y-1.5 text-gray-600">{v.map((d, i) => <li key={i}>— {String(d)}</li>)}</ul>
                          : k === 'sha256_recorded_at_approval'
                            ? <>{String(v)} <span className="text-gray-500">(same fact, recorded at approval)</span></>
                            : k === 'license_claimed' && !v
                              ? <span className="text-gray-500">null — never verified by DeedPro</span>
                              : String(v)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-3 text-sm text-gray-400">The artifact appears here once a deed is confirmed.</p>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="text-sm leading-relaxed text-gray-600">
                We create a second draft — same parties — and POST its approval carrying{' '}
                <code className="font-mono text-[13px]">draft_sha256</code> from the deed you already confirmed.
                A client that hashed one document cannot put a name on another.
              </p>
              <button type="button" onClick={runTamper} disabled={!artifact || busy !== null || !!tamper}
                className="mt-4 rounded-lg bg-[#14161A] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500">
                {tamper ? 'Sent — see below' : busy === 'tamper' ? 'Sending…' : "Confirm draft B with draft A's hash"}
              </button>

              {tamper && (tamperRefused ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-red-300 bg-red-100 px-2 py-0.5 font-mono text-xs font-bold text-red-800">{tamper.status}</span>
                    <span className="font-mono text-[12.5px] text-gray-500">{tamper.error?.code}</span>
                  </div>
                  <p className="mt-2.5 text-[15px] font-semibold text-[#14161A]">{tamper.error?.message}</p>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">
                    The comparison happens before the promotion, so the second draft is still{' '}
                    <strong>pending_confirmation</strong> — a mismatch never stores bytes nobody saw. Your receipt
                    from Act 2 is untouched.
                  </p>
                </div>
              ) : (
                /* NOT styled as a refusal. A guard that did not fire is a
                 * failure of this demo's central claim, and dressing it in
                 * the red panel is how the last version came to display a
                 * refusal that never happened. Grey, and it says so. */
                <div className="mt-4 rounded-xl border border-gray-300 bg-gray-50 p-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-gray-400 bg-gray-100 px-2 py-0.5 font-mono text-xs font-bold text-gray-700">{tamper.status}</span>
                    <span className="font-mono text-[12.5px] text-gray-500">{tamper.error?.code ?? 'no error code'}</span>
                  </div>
                  <p className="mt-2.5 text-[15px] font-semibold text-[#14161A]">
                    The guard did not fire. This demonstration failed.
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">
                    {tamper.error?.message
                      ? <>The API answered <span className="font-mono text-[13px]">{tamper.status}</span> with{' '}
                         <span className="font-mono text-[13px]">{tamper.error.code}</span> — not the mismatch refusal
                         this step exists to show. </>
                      : <>Draft B was approved while carrying draft A&rsquo;s hash. </>}
                    We would rather show you that than a refusal we did not receive. Please tell us &mdash; this is
                    the one thing on this page that must not be reported by the page itself.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. Close ── */}
      <section id="request-access" className="bg-[#12141A] px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <div>
            <h2 className="text-3xl font-bold leading-tight text-white">You just ran the whole integration.</h2>
            {/* Counts what actually happened. Never a literal claim about
                a session the visitor did not have. */}
            <p className="mt-4 text-base leading-relaxed text-gray-400">
              {closeLine} The next step is a key of your own — three fields, no account. We issue keys after a
              short conversation about what you are building.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-[13.5px] text-gray-500">
              <span>{API_DEED_TYPES.length} deed-family instruments</span>
              <span className="text-gray-700">·</span>
              <span>Sample data only, watermarked</span>
              <span className="text-gray-700">·</span>
              <Link href="/trust" className="font-medium text-[#C4B5FD] hover:underline">What we do not have</Link>
            </div>
          </div>
          <div className="rounded-2xl border border-[#262A33] bg-[#0B0D11] p-6">
            <ApiInquiryForm />
          </div>
        </div>
      </section>

      {/* ── 9. Footer disclaimer ── */}
      <footer className="border-t border-gray-200 bg-[#F8F8FB] px-6 py-7">
        <div className="mx-auto max-w-7xl space-y-3 text-[13px] leading-relaxed text-gray-500">
          <p>
            Sample data only. A fixed, fictional property and fictional parties; no property lookup runs on this
            page. Every PDF rendered here is watermarked SAMPLE — NOT FOR RECORDING.
          </p>
          <p>
            DeedPro is software, not a law firm. It prepares documents at the direction of the professional using
            it and does not provide legal advice or legal determinations.
          </p>
        </div>
      </footer>
    </main>
  );
}

export default function TryPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white" />}>
      <TryDemo />
    </Suspense>
  );
}
