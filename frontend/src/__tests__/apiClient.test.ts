/**
 * X1 — the loud-failure client, behavior-pinned.
 *
 * The audited P0: a session expired silently and every later action
 * failed with zero UI response. apiFetch is the one place failures
 * surface; these tests pin the three behaviors that make silence
 * impossible: non-2xx toasts naming the failure, 401 always becomes the
 * session-expired state (toast + cleared auth + redirect + thrown
 * SessionExpiredError), and `silent` mutes generic noise but NEVER 401.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const toastError = jest.fn();
jest.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    dismiss: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { apiFetch, SessionExpiredError, navigation } = require('../lib/apiClient');
// require, not import: the sonner mock factory closes over `toastError`,
// which is declared below the imports — a static import of session pulls
// sonner in before that binding exists.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { discardSnapshot, peekSnapshot, registerSnapshotProvider } = require('../lib/session');

let redirectedTo = '';

function mockResponse(status: number, body: unknown = {}): Response {
  const resp = {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    clone: () => resp,
  };
  return resp as unknown as Response;
}

beforeEach(() => {
  toastError.mockClear();
  localStorage.clear();
  localStorage.setItem('access_token', 'tok-123');
  redirectedTo = '';
  // jsdom can't navigate — stub the client's navigation indirection.
  navigation.goTo = (url: string) => { redirectedTo = url; };
  navigation.current = () => '/past-deeds';
});

describe('X1 — apiFetch loud failures', () => {
  it('attaches the session token and passes 2xx through quietly', async () => {
    let seenAuth: string | null = null;
    global.fetch = jest.fn(async (_url: any, init: any) => {
      seenAuth = new Headers(init.headers).get('Authorization');
      return mockResponse(200, { fine: true });
    }) as any;

    const res = await apiFetch('/deeds', {}, { label: 'Loading deeds' });
    expect(res.ok).toBe(true);
    expect(seenAuth).toBe('Bearer tok-123');
    expect(toastError).not.toHaveBeenCalled();
  });

  it('non-2xx surfaces a toast naming the action, status, and backend detail', async () => {
    global.fetch = jest.fn(async () => mockResponse(500, { detail: 'db exploded' })) as any;

    const res = await apiFetch('/deeds', {}, { label: 'Loading deeds' });
    expect(res.status).toBe(500);
    expect(toastError).toHaveBeenCalledTimes(1);
    const msg = String(toastError.mock.calls[0][0]);
    expect(msg).toContain('Loading deeds');
    expect(msg).toContain('500');
    expect(msg).toContain('db exploded');
  });

  it('401 with NO refresh token is still the session-expired state', async () => {
    /**
     * RED-S3 changed the copy, and the change is the point. It used to
     * say "your session has expired — please sign in again", which is
     * true and useless: it tells an officer mid-deed that her work is
     * gone. It now promises the resume, because the resume now exists.
     *
     * Everything else this pinned still holds: auth cleared, redirect
     * carrying the return path, SessionExpiredError thrown so callers
     * stop.
     */
    global.fetch = jest.fn(async () => mockResponse(401, { detail: 'Could not validate credentials' })) as any;

    await expect(apiFetch('/shared-deeds', { method: 'POST' })).rejects.toBeInstanceOf(
      SessionExpiredError
    );
    expect(toastError).toHaveBeenCalled();
    expect(String(toastError.mock.calls[0][0])).toMatch(/session expired/i);
    expect(String(toastError.mock.calls[0][0])).toMatch(/back exactly where you were/i);
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(redirectedTo).toContain('/login?expired=1');
    expect(redirectedTo).toContain(encodeURIComponent('/past-deeds'));
  });

  it('RED-S3 — a 401 with a live refresh token is INVISIBLE to the officer', async () => {
    /**
     * THE Thursday, at the client. She presses a button at 4:55, the
     * access token is stale, and she must never find out: refresh,
     * retry, succeed. No toast, no redirect, no lost work.
     */
    localStorage.setItem('refresh_token', 'good-refresh');
    let call = 0;
    global.fetch = jest.fn(async (url: any) => {
      const u = String(url);
      if (u.includes('/users/refresh-token')) {
        return mockResponse(200, { access_token: 'fresh', refresh_token: 'rotated' });
      }
      call += 1;
      return call === 1 ? mockResponse(401) : mockResponse(200, { ok: true });
    }) as any;

    const res = await apiFetch('/deeds');
    expect(res.status).toBe(200);
    expect(redirectedTo).toBe('');
    expect(toastError).not.toHaveBeenCalled();
    expect(localStorage.getItem('access_token')).toBe('fresh');
    expect(localStorage.getItem('refresh_token')).toBe('rotated');
  });

  it('RED-S3 — her work is PRESERVED before the redirect, not after', async () => {
    /**
     * Order is the whole thing. Once the route changes, the React state
     * holding her deed is gone and no later step can recover it. So the
     * snapshot must be taken while the page still exists.
     */
    registerSnapshotProvider(() => ({ route: '/deed-builder', state: { apn: '4290-012-034' } }));
    global.fetch = jest.fn(async () => mockResponse(401)) as any;

    await expect(apiFetch('/deeds')).rejects.toBeInstanceOf(SessionExpiredError);

    const snap = peekSnapshot();
    expect(snap).not.toBeNull();
    expect((snap!.state as any).apn).toBe('4290-012-034');
    registerSnapshotProvider(null);
    discardSnapshot();
  });

  it('RED-S3 — a dead refresh token does not loop', async () => {
    localStorage.setItem('refresh_token', 'dead');
    let refreshCalls = 0;
    global.fetch = jest.fn(async (url: any) => {
      if (String(url).includes('/users/refresh-token')) {
        refreshCalls += 1;
        return mockResponse(401, { detail: 'This session has ended.' });
      }
      return mockResponse(401);
    }) as any;

    await expect(apiFetch('/deeds')).rejects.toBeInstanceOf(SessionExpiredError);
    expect(refreshCalls).toBe(1);
    expect(redirectedTo).toContain('/login?expired=1');
  });

  it('silent mutes generic failures but NEVER a 401', async () => {
    global.fetch = jest.fn(async () => mockResponse(500, { detail: 'boom' })) as any;
    await apiFetch('/api/deeds/draft', { method: 'POST' }, { silent: true });
    expect(toastError).not.toHaveBeenCalled();

    global.fetch = jest.fn(async () => mockResponse(401)) as any;
    await expect(
      apiFetch('/api/deeds/draft', { method: 'POST' }, { silent: true })
    ).rejects.toBeInstanceOf(SessionExpiredError);
    expect(toastError).toHaveBeenCalled();
    expect(redirectedTo).toContain('/login?expired=1');
  });

  it('network failure is loud and rethrown', async () => {
    global.fetch = jest.fn(async () => {
      throw new TypeError('fetch failed');
    }) as any;

    await expect(apiFetch('/deeds', {}, { label: 'Loading deeds' })).rejects.toThrow('fetch failed');
    expect(String(toastError.mock.calls[0][0])).toContain('network error');
  });
});
