/**
 * Session continuity — RED-S3.
 *
 * ═══ THE THURSDAY ═══
 *
 * An escrow officer opens a deed at 4:20 on a Thursday. The phone goes,
 * a buyer is in the lobby, a lender will not send the payoff. She comes
 * back at 4:55 and presses a button.
 *
 * What used to happen: 401 → toast → localStorage wiped → redirect to
 * /login. Everything she had typed lived in React state and went with
 * the page. She retyped it, or she stopped using the product.
 *
 * Nobody at an escrow desk is "in" an app for thirty uninterrupted
 * minutes. The 30-minute token was not the bug — SHORT TOKENS ARE
 * CORRECT — the bug was that expiry was treated as an ending.
 *
 * ═══ FOUR STEPS, IN ORDER ═══
 *
 *   PAUSE    a 401 is not a logout. Hold the failed request.
 *   PRESERVE snapshot whatever the officer is working on, BEFORE any
 *            navigation can destroy it.
 *   RE-AUTH  silently if the refresh token is still good — she never
 *            learns anything happened. Only if that fails does she see a
 *            sign-in screen.
 *   RESUME   restore the snapshot and replay the request she made.
 *
 * The first three quarters of that are invisible when it works, which is
 * the point. She should find out her session expired by not finding out.
 */
import { toast } from 'sonner';

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';
const SNAPSHOT_KEY = 'deedpro.session.snapshot';

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_KEY) || localStorage.getItem('token');
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function storeTokens(access: string | null, refresh?: string | null): void {
  try {
    if (access) localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  } catch {
    /* storage unavailable — the caller still has the token in memory */
  }
}

export function clearTokens(): void {
  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem('token'); // pre-AuthManager fossil key (G1)
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem('user_data');
  } catch {
    /* nothing to clear */
  }
}

/* ── PRESERVE ─────────────────────────────────────────────────────── */

type SnapshotProvider = () => { route: string; state: unknown } | null;

let provider: SnapshotProvider | null = null;

/**
 * Whatever screen holds unsaved work registers here.
 *
 * A callback rather than a store subscription on purpose: preserving is
 * only ever needed at one instant — the moment before we navigate away —
 * and asking then is simpler to reason about than keeping a mirror of
 * the builder permanently in sync with itself.
 */
export function registerSnapshotProvider(fn: SnapshotProvider | null): void {
  provider = fn;
}

export function captureSnapshot(): void {
  if (!provider) return;
  try {
    const snap = provider();
    if (!snap) return;
    localStorage.setItem(
      SNAPSHOT_KEY,
      JSON.stringify({ ...snap, at: new Date().toISOString() })
    );
  } catch {
    /* a snapshot we cannot write must not stop the sign-in redirect —
       failing to save her work is bad; trapping her on a dead page is
       worse */
  }
}

export function takeSnapshot(): { route: string; state: unknown; at: string } | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    localStorage.removeItem(SNAPSHOT_KEY); // consumed exactly once
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function peekSnapshot(): { route: string; state: unknown; at: string } | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function discardSnapshot(): void {
  try {
    localStorage.removeItem(SNAPSHOT_KEY);
  } catch {
    /* nothing to discard */
  }
}

/* ── RE-AUTH ──────────────────────────────────────────────────────── */

let inFlight: Promise<boolean> | null = null;

/**
 * Exchange the refresh token for a new pair. At most one at a time.
 *
 * Single-flight matters more than it looks: a builder screen can fire
 * several requests at once, and without this each 401 would spend the
 * refresh token separately. The second exchange would present an
 * already-rotated token, the backend would correctly read that as a
 * REPLAY, and it would kill the whole family — logging her out for
 * being efficient.
 */
export async function refreshSession(): Promise<boolean> {
  if (inFlight) return inFlight;

  const refresh = getRefreshToken();
  if (!refresh) return false;

  inFlight = (async () => {
    try {
      const base =
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
        '';
      const res = await fetch(`${base}/users/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (!res.ok) return false;
      const body = await res.json();
      if (!body?.access_token) return false;
      storeTokens(body.access_token, body.refresh_token);
      return true;
    } catch {
      return false;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/* ── The whole sequence ───────────────────────────────────────────── */

/**
 * Called when a request comes back 401.
 *
 * Returns true if the caller should RETRY — meaning the officer never
 * needs to know this happened.
 */
export async function handleUnauthorized(currentRoute: string): Promise<boolean> {
  if (await refreshSession()) return true;

  // Refresh failed: the session is genuinely over. Preserve BEFORE
  // navigating — once the route changes, the React state holding her
  // work is gone and no later step can get it back.
  captureSnapshot();
  clearTokens();
  toast.error(
    'Your session expired. Sign in and we will put you back exactly where you were.',
    { id: 'session-expired', duration: 10000 }
  );
  return false;
}

export const SESSION_SNAPSHOT_KEY = SNAPSHOT_KEY;
