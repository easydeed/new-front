/**
 * Saving the profile, in one place, with the tolerance the first-run
 * flow already had and the settings form never did.
 *
 * ═══ THE REPORT ═══
 *
 * "In my new user. I tried to set county and it said failed to fetch."
 *
 * `Failed to fetch` is not a sentence anybody in this product wrote. It
 * is the browser's own `TypeError` for a request that never completed —
 * DNS, connection refused, CORS, or a server that did not answer — and
 * `account-settings` was surfacing `err.message` verbatim into the error
 * box and the toast.
 *
 * ═══ TWO DEFECTS, AND THE SECOND IS MINE ═══
 *
 * ONE. `onboarding/page.tsx` wrapped its save in a two-attempt retry,
 * added because this API sleeps and the first request after a quiet
 * period can simply not arrive. `account-settings/page.tsx` had a single
 * bare `fetch`. Same endpoint, same payload, one of them tolerant of a
 * cold start and the other not — and neither knew the other existed.
 *
 * TWO. DASH-FIX #1 pointed the day-one checklist's "Set county" at
 * account-settings, because that is where the form belongs. That is
 * still right, and it moved a FIRST-RUN action onto the page WITHOUT the
 * first-run tolerance — which is exactly the population that meets a
 * sleeping server, because a brand-new account is the one nobody has
 * warmed up. The routing was correct and the consequence was not
 * checked.
 *
 * ═══ WHAT THIS DOES AND DELIBERATELY DOES NOT DO ═══
 *
 * It retries a request that never completed. It does NOT retry one the
 * server answered: a 400 or a 422 is a decision, and asking again is how
 * a client turns a refusal into a race. A 5xx is likewise left alone —
 * the server spoke, and this module does not have an opinion about what
 * it meant.
 *
 * And it never reports success it did not get (§4). The retry exists to
 * survive a sleeping server, not to make a failure look like a save.
 */

const API = () => process.env.NEXT_PUBLIC_API_URL
  || 'https://deedpro-main-api.onrender.com';

/**
 * The waits between attempts, in milliseconds.
 *
 * Two attempts, from onboarding's own ladder. Not more: a person is
 * watching a spinner, and a third attempt buys a small chance of success
 * at the cost of a page that appears to have hung.
 */
const WAITS = [0, 1200];

/**
 * A network-level failure, in words a person can act on.
 *
 * The browser says "Failed to fetch" and means "the request did not
 * arrive". She cannot do anything with the first sentence and can with
 * the second.
 */
export const UNREACHABLE =
  'Could not reach the server — your changes were not saved. Please try again.';

export class ProfileSaveError extends Error {
  /** True when the request never completed, as opposed to being refused. */
  readonly unreachable: boolean;
  constructor(message: string, unreachable = false) {
    super(message);
    this.name = 'ProfileSaveError';
    this.unreachable = unreachable;
  }
}

/**
 * PATCH /users/profile, retried only when nothing arrived.
 *
 * Throws `ProfileSaveError` on every failure, so no caller has to decide
 * what a `TypeError` from `fetch` means.
 */
export async function saveProfile(patch: Record<string, unknown>): Promise<void> {
  let unreachable: ProfileSaveError | null = null;

  for (const wait of WAITS) {
    if (wait) await new Promise((r) => setTimeout(r, wait));
    let response: Response;
    try {
      response = await fetch(`${API()}/users/profile`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patch),
      });
    } catch {
      // NOTHING ARRIVED. This is the only case worth trying again, and
      // it is the case the browser describes as "Failed to fetch".
      unreachable = new ProfileSaveError(UNREACHABLE, true);
      continue;
    }

    if (response.ok) return;

    // THE SERVER ANSWERED, so this is a decision rather than an absence.
    // Returned immediately without a second attempt: asking again after
    // a refusal is how a client turns a "no" into a race.
    const body = await response.json().catch(() => ({}));
    throw new ProfileSaveError(
      (body as { detail?: string }).detail || `Save failed (${response.status})`);
  }

  throw unreachable ?? new ProfileSaveError(UNREACHABLE, true);
}
