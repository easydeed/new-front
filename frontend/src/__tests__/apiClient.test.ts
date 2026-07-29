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

  it('401 is the session-expired state: toast, cleared auth, redirect, thrown error', async () => {
    global.fetch = jest.fn(async () => mockResponse(401, { detail: 'Could not validate credentials' })) as any;

    await expect(apiFetch('/shared-deeds', { method: 'POST' })).rejects.toBeInstanceOf(
      SessionExpiredError
    );
    expect(toastError).toHaveBeenCalled();
    expect(String(toastError.mock.calls[0][0])).toContain('session has expired');
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(redirectedTo).toContain('/login?expired=1');
    expect(redirectedTo).toContain(encodeURIComponent('/past-deeds'));
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
