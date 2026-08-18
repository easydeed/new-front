/**
 * Opening the billing portal — the one place, and the one place that
 * turns its failures into English.
 *
 * ═══ THE FINDING, WHICH IS NOT THE ONE THE TICKET EXPECTED ═══
 *
 * The ticket said `/payments/create-portal-session` "exists with no UI
 * entry point anywhere". **It has two**, both in the Billing tab:
 * "Manage Payment Methods" and "View Billing History". The endpoint is
 * reachable and always has been.
 *
 * What is missing is narrower and worse: **nothing anywhere says
 * CANCEL.** The homepage promises "cancel anytime"; an officer who wants
 * to act on that promise arrives at a Billing tab offering to manage her
 * payment methods and view her invoices. She has to know that Stripe's
 * portal is where cancelling lives, and that one of those two buttons
 * leads to it. That is not one click, and it is not a claim we can back.
 *
 * ═══ THE SECOND DEFECT: A GATE THAT CAN HIDE THE ONLY EXIT ═══
 *
 * Both buttons render only when `currentPlan !== 'free'`, i.e. only when
 * the `users.plan` COLUMN says she is paying. That column is written by
 * the webhook. If it is stale, or unset, or the pilot subscription is
 * provisioned in a way that does not update it, then a customer WITH A
 * CARD ON FILE sees "No payment method on file" and no way out at all —
 * a cancel path whose visibility depends on the accuracy of a
 * denormalised copy of Stripe's state.
 *
 * So the cancel control is NOT gated on that column. It is always
 * rendered, it asks Stripe, and Stripe's answer is what the officer is
 * told — including "no billing information found", which is the honest
 * answer for an account that genuinely has no subscription.
 *
 * ═══ AND THE THIRD: THE REASON WAS BEING THROWN AWAY ═══
 *
 * The old handler did `throw new Error("Failed to create portal session")`
 * on any non-2xx, discarding the API's `detail` — so a 404 saying "No
 * billing information found" reached the officer as a generic failure.
 * §4: an error is never swallowed, and the API's own sentence is better
 * than ours in every case where it exists.
 */
import { apiFetch } from './apiClient';

export const PORTAL_PATH = '/payments/create-portal-session';

/** Nothing here asserts what CANCELLING does — see `portalCopy`. */
export class BillingPortalError extends Error {
  /** True when the API says this account has no billing relationship. */
  readonly noBilling: boolean;

  constructor(message: string, noBilling = false) {
    super(message);
    this.name = 'BillingPortalError';
    this.noBilling = noBilling;
  }
}

export const UNREACHABLE =
  'Could not reach the server, so the billing portal did not open. Please try again.';

/**
 * The sentence shown when the API says there is no billing relationship.
 *
 * It states OUR RECORD, not her situation: "we have no subscription on
 * file for this account" is checkable and true, where "you have no
 * subscription" would be a claim about the world made from one row.
 */
export const NO_BILLING =
  'Stripe has no billing record for this account, so there is nothing to '
  + 'cancel. If you believe you are being charged, contact us before '
  + 'cancelling anywhere else.';

/**
 * Open Stripe's billing portal for the signed-in officer.
 *
 * Returns the URL rather than navigating, so the caller decides — and so
 * this is testable without a browser that can navigate.
 */
export async function openBillingPortal(): Promise<string> {
  let response: Response;
  try {
    response = await apiFetch(PORTAL_PATH, { method: 'POST' },
      { label: 'Open billing portal', silent: true });
  } catch (err) {
    // apiClient rethrows network failures and SessionExpiredError. A
    // session expiry has already redirected; anything else is the server
    // not answering, and saying so is better than "failed to fetch".
    if (err instanceof Error && err.name === 'SessionExpiredError') throw err;
    throw new BillingPortalError(UNREACHABLE);
  }

  if (!response.ok) {
    const detail = await readDetail(response);
    if (response.status === 404) throw new BillingPortalError(NO_BILLING, true);
    throw new BillingPortalError(detail
      || `The billing portal could not be opened (error ${response.status}).`);
  }

  const data = await response.json().catch(() => ({}));
  if (!data?.url) {
    // A 200 with no URL is a success we did not get (§4).
    throw new BillingPortalError(
      'The server accepted the request but returned no portal link.');
  }
  return data.url as string;
}

async function readDetail(response: Response): Promise<string> {
  try {
    const body = await response.json();
    const detail = body?.detail;
    return typeof detail === 'string' ? detail : '';
  } catch {
    return '';
  }
}
