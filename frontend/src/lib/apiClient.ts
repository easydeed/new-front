/**
 * X1 — failures are loud, everywhere this client is used.
 *
 * The round-2 audit's P0: a session expired with zero warning and every
 * subsequent action failed in silence (share POST → 401, nothing on
 * screen). Every page did its own fetch with its own (often absent)
 * error handling. This wrapper is the one place failures surface:
 *
 *   - non-2xx  → a toast NAMING the failure (label + status + the
 *                backend's detail string when present), response still
 *                returned so callers keep their own error UI;
 *   - 401      → never silent: session-expired toast, auth cleared,
 *                redirect to /login?expired=1&redirect=<here>, and a
 *                SessionExpiredError thrown so callers stop;
 *   - network  → a toast saying the server was unreachable, rethrown.
 *
 * `silent: true` (autosave-style background calls) suppresses the
 * generic toasts — but a 401 is NEVER silent, that's the whole bug.
 */
import { toast } from 'sonner';
import { getAccessToken, handleUnauthorized } from './session';

export class SessionExpiredError extends Error {
  constructor() {
    super('Session expired');
    this.name = 'SessionExpiredError';
  }
}

export function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';
}

interface ApiFetchOptions {
  /** Human name for the action, used in failure toasts. Defaults to the path. */
  label?: string;
  /** Suppress generic failure toasts (background autosave). 401 is never silent. */
  silent?: boolean;
  /** Skip the Authorization header (public endpoints). */
  noAuth?: boolean;
}

/** Navigation indirection — jsdom can't navigate, so tests stub this. */
export const navigation = {
  goTo(url: string): void {
    window.location.href = url;
  },
  current(): string {
    return window.location.pathname + window.location.search;
  },
};

/**
 * RED-S3: a 401 is a PAUSE, not an ending.
 *
 * This used to toast, wipe storage and redirect — which destroyed
 * whatever the officer was typing, because the builder's state lives in
 * React and the redirect takes the page with it. That is the 4:40
 * Thursday: come back from a phone call, press a button, lose the deed.
 *
 * Now the first move is a silent refresh. If it works she never learns
 * anything happened; the caller retries and the request succeeds. Only
 * when the refresh token is genuinely gone does she see a sign-in
 * screen — and her work is snapshotted BEFORE the navigation that would
 * have destroyed it.
 */
async function handleSessionExpired(): Promise<boolean> {
  const recovered = await handleUnauthorized(navigation.current());
  if (recovered) return true;
  navigation.goTo(`/login?expired=1&redirect=${encodeURIComponent(navigation.current())}`);
  return false;
}

/**
 * Fetch with loud failures. `path` is either an absolute URL or a
 * backend path starting with '/' (prefixed with the API base). Relative
 * same-origin paths ('/api/...') pass through untouched.
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
  opts: ApiFetchOptions = {}
): Promise<Response> {
  const url = path.startsWith('http') || path.startsWith('/api/')
    ? path
    : `${apiBase()}${path}`;
  const label = opts.label || `${(init.method || 'GET').toUpperCase()} ${path}`;

  const withAuth = (): Headers => {
    const h = new Headers(init.headers || {});
    if (!opts.noAuth && !h.has('Authorization')) {
      const token = getAccessToken();
      if (token) h.set('Authorization', `Bearer ${token}`);
    }
    return h;
  };

  let response: Response;
  try {
    response = await fetch(url, { ...init, headers: withAuth() });
  } catch (err) {
    if (!opts.silent) {
      toast.error(`${label}: network error — could not reach the server.`);
    }
    throw err;
  }

  if (response.status === 401) {
    // ONE retry, and only after a successful refresh. A loop here would
    // hammer the login endpoint on a genuinely dead session; retrying
    // without a fresh token would just 401 again.
    const recovered = await handleSessionExpired();
    if (!recovered) throw new SessionExpiredError();
    try {
      response = await fetch(url, { ...init, headers: withAuth() });
    } catch (err) {
      if (!opts.silent) {
        toast.error(`${label}: network error — could not reach the server.`);
      }
      throw err;
    }
    if (response.status === 401) throw new SessionExpiredError();
  }

  if (!response.ok && !opts.silent) {
    const detail = await response
      .clone()
      .json()
      .then((b) => (typeof b?.detail === 'string' ? b.detail : ''))
      .catch(() => '');
    toast.error(`${label} failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`);
  }

  return response;
}
