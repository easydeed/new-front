/**
 * How long to keep asking whether the plan has changed.
 *
 * ═══ WHY THIS IS A RULE AND NOT A LOOP IN THE PAGE ═══
 *
 * Stripe redirects to `?success=true` the instant checkout completes.
 * The webhook that upgrades the plan arrives INDEPENDENTLY, over the
 * same few seconds. So a page that fetches once on return races the
 * upgrade and usually loses, and the officer sees Free immediately after
 * paying — which looks exactly like a payment that failed.
 *
 * Retrying is the honest answer to a race we do not control. But a retry
 * policy is a decision with a wrong answer in both directions: too few
 * and she still sees Free, too many and the page hammers the API while
 * telling her nothing.
 *
 * As a `setTimeout` chain inside a component, the only available pin
 * asserts that some numbers appear in the source. Called, a test can ask
 * what it does on attempt four and read the answer.
 *
 * ═══ AND WHAT IT MUST NEVER DO ═══
 *
 * Retrying is ASKING AGAIN. It is not deciding. When the attempts run
 * out this reports that they ran out — it does not assume the upgrade
 * worked, and it does not assume it failed. The page says the payment
 * went through (Stripe redirected, so that much is observed) and that
 * the plan has not caught up yet.
 *
 * Claiming either outcome would be the billing path asserting something
 * it did not observe, which is the class of defect the whole webhook
 * story is made of.
 */

/** Back off, but stay inside the window an officer will actually wait. */
const SCHEDULE_MS = [0, 1500, 3000, 5000, 8000] as const;

export const ATTEMPTS = SCHEDULE_MS.length;

/**
 * How long to wait before attempt `n` (0-indexed), or null when there
 * are no attempts left.
 */
export function delayBeforeAttempt(n: number): number | null {
  if (!Number.isInteger(n) || n < 0 || n >= SCHEDULE_MS.length) return null;
  return SCHEDULE_MS[n];
}

/** Total time the page will keep asking. Kept short deliberately: this
 *  is a person watching a screen after paying, not a background job. */
export function totalWindowMs(): number {
  return SCHEDULE_MS.reduce((a, b) => a + b, 0);
}

export type PlanWatch =
  | { state: 'checking'; attempt: number }
  | { state: 'changed'; plan: string }
  | { state: 'gave-up' };

/**
 * What to do after an attempt that returned `plan`.
 *
 * `startedOn` is the plan the page was showing when it began watching.
 * A CHANGE is the signal — not a match against an expected plan name,
 * because the page does not know which plan was bought and guessing one
 * would be inventing the answer it is waiting for.
 */
export function afterAttempt(
  attempt: number,
  plan: string | null | undefined,
  startedOn: string | null | undefined,
): PlanWatch {
  const now = (plan || '').trim();
  const before = (startedOn || '').trim();
  if (now && now !== before) return { state: 'changed', plan: now };
  const next = attempt + 1;
  return delayBeforeAttempt(next) === null
    ? { state: 'gave-up' }
    : { state: 'checking', attempt: next };
}
