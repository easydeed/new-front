/**
 * The profile save, tested as a function rather than as a source file.
 *
 * ═══ THE REPORT THAT PRODUCED IT ═══
 *
 * "In my new user. I tried to set county and it said failed to fetch."
 *
 * `Failed to fetch` is the browser's own TypeError for a request that
 * never completed, surfaced verbatim into the error box and the toast.
 * Onboarding had a two-attempt retry for exactly that — this API sleeps
 * — and account-settings had a bare `fetch`. Same endpoint, same
 * payload, one tolerant of a cold start and the other not.
 *
 * And DASH-FIX #1 had just pointed the day-one checklist's "Set county"
 * at the intolerant one, which is the page a BRAND-NEW account reaches
 * first and therefore the population most certain to meet a sleeping
 * server. The routing was right; its consequence was not checked.
 *
 * ═══ WHY THESE ARE BEHAVIOURAL ═══
 *
 * The pins that guarded this before asserted `method: "PATCH"` and
 * `await fetch` appeared in the settings page — the implementation's
 * LOCATION, not the button's behaviour — so they went red on a refactor
 * that fixed a bug and could never have said whether a retry retried the
 * right things. §14.1.1. Now it is a function, so it gets called.
 */
import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';

import { saveProfile, ProfileSaveError, UNREACHABLE } from '../lib/profileSave';

const ok = () => ({ ok: true } as Response);
const refused = (status: number, detail?: string) => ({
  ok: false, status, json: async () => (detail ? { detail } : {}),
} as unknown as Response);

/* `any` deliberately: @jest/globals types a bare `jest.fn()` as taking
   `never`, so every `mockResolvedValue` below became a type error and
   the tsc baseline rose by nine. The alternative is a full signature
   for `fetch` in a file whose subject is not `fetch`'s type. */
let fetchMock: any;

beforeEach(() => {
  jest.useFakeTimers();
  fetchMock = jest.fn();
  (global as any).fetch = fetchMock;
  (global as any).localStorage = { getItem: () => 'tok' };
});
afterEach(() => { jest.useRealTimers(); });

/**
 * Runs `p` to completion, letting the retry's timer fire, and returns
 * the OUTCOME rather than re-throwing.
 *
 * Written this way because the first version used
 * `expect(settle(p)).rejects`, which attaches its handler after the
 * promise has already rejected — six tests failed as unhandled
 * rejections while the code under test was correct. The helper now
 * attaches before advancing the clock, and hands back a value the
 * assertions can read plainly.
 */
async function run(p: Promise<void>): Promise<{ error?: any }> {
  const settled = p.then(() => ({}), (error) => ({ error }));
  await jest.advanceTimersByTimeAsync(5000);
  return settled;
}

describe('a request that never arrived is tried again', () => {
  it('succeeds on the second attempt when the first never lands', async () => {
    /** THE PIN THIS FILE EXISTS FOR. A sleeping server answers the
     *  second time, and the officer sees a save rather than a browser
     *  error string. */
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
             .mockResolvedValueOnce(ok());
    expect(await run(saveProfile({ default_county: 'Los Angeles' }))).toEqual({});
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up in words somebody wrote, never the browser\'s', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { error } = await run(saveProfile({}));
    expect(error.message).toBe(UNREACHABLE);
    expect(error.unreachable).toBe(true);
    expect(UNREACHABLE).not.toMatch(/failed to fetch/i);
  });
});

describe('a request the server answered is a decision, not an absence', () => {
  it('does NOT retry a refusal', async () => {
    /**
     * The half that matters as much as the retry. Asking again after a
     * 400 is how a client turns a "no" into a race — and on this
     * endpoint a second attempt would re-send a patch the server has
     * already rejected once.
     */
    fetchMock.mockResolvedValue(refused(400, 'State must be two letters'));
    const { error } = await run(saveProfile({ state: 'Californiaa' }));
    expect(error.message).toBe('State must be two letters');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry a 5xx either, because the server still spoke', async () => {
    fetchMock.mockResolvedValue(refused(500));
    const { error } = await run(saveProfile({}));
    expect(error.message).toMatch(/500/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('carries the server\'s reason rather than replacing it', async () => {
    /** §4 — the reason travels. "Something went wrong" sends her to
     *  support with nothing. */
    fetchMock.mockResolvedValue(refused(422, 'That county is not in California'));
    const { error } = await run(saveProfile({}));
    expect(error.message).toBe('That county is not in California');
  });

  it('marks a refusal as reachable, so no caller mistakes it for a network fault',
    async () => {
      fetchMock.mockResolvedValue(refused(400, 'nope'));
      const { error } = await run(saveProfile({}));
      expect(error).toBeInstanceOf(ProfileSaveError);
      expect(error.unreachable).toBe(false);
    });
});

describe('it never reports a save it did not get', () => {
  it('resolves only on a 2xx', async () => {
    /** §4, and the ticket SETTINGS1 was originally about: that handler
     *  used to toast success unconditionally. */
    fetchMock.mockResolvedValue(ok());
    expect(await run(saveProfile({}))).toEqual({});
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(refused(403, 'no'));
    expect((await run(saveProfile({}))).error).toBeDefined();
  });
});
