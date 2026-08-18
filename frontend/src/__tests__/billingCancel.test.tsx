/**
 * PILOT1 — cancelling is a control the officer can find.
 *
 * ═══ THE PREMISE THAT WAS WRONG, AND WHAT WAS ACTUALLY BROKEN ═══
 *
 * The ticket said `/payments/create-portal-session` "exists with no UI
 * entry point anywhere". It has two — "Manage Payment Methods" and "View
 * Billing History", both in the Billing tab, both calling it. The
 * endpoint has been reachable the whole time.
 *
 * Three real defects sat behind that:
 *
 *  1. **Nothing said CANCEL.** The homepage promises "cancel anytime".
 *     The officer acting on that promise had to already know that
 *     Stripe's portal is where cancelling happens, and that a button
 *     labelled "Manage Payment Methods" leads there.
 *
 *  2. **Every control was gated on `users.plan`** — a denormalised copy
 *     of Stripe's state written by the webhook. Stale, and the customer
 *     with a card on file is shown "No payment method on file" and has
 *     no exit at all. The cancel control is deliberately ungated: it
 *     asks Stripe and reports Stripe's answer.
 *
 *  3. **The API's reason was thrown away.** `throw new Error("Failed to
 *     create portal session")` on any non-2xx, so the one informative
 *     answer — 404, no billing record — arrived as a generic failure
 *     (§4).
 *
 * ═══ WHAT IS PINNED, AND WHAT DELIBERATELY IS NOT ═══
 *
 * The PROPERTIES: a control whose accessible name says cancel; that it
 * renders for a free-plan profile too; that each failure mode produces
 * its own sentence. NOT the wording of the copy, and NOT any claim about
 * WHEN access ends after cancelling — that is Stripe portal
 * configuration this repository cannot see, and a pin asserting it would
 * be a pin on a guess.
 */
import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'fs';
import { join } from 'path';

import { codeOnly } from '../test-support/sourceText';
import {
  BillingPortalError, NO_BILLING, PORTAL_PATH, UNREACHABLE, openBillingPortal,
} from '../lib/billingPortal';

const SRC = join(__dirname, '..');
const SETTINGS = join(SRC, 'app', 'account-settings', 'page.tsx');
const read = (p: string) => codeOnly(readFileSync(p, 'utf8'));

jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

// Typed loosely on purpose: `jest.fn()` from @jest/globals infers a
// zero-argument mock, so `mockRejectedValue(new TypeError(...))` is a
// type error rather than a test failure — and the tsc baseline only
// goes down.
const fetchMock = jest.fn() as jest.Mock<any>;

beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
  window.localStorage.setItem('access_token', 'test-token');
});
afterEach(() => { jest.clearAllMocks(); });

function answer(status: number, body: unknown) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    headers: new Headers(),
  } as unknown as Response);
}

describe('opening the portal', () => {
  it('returns the URL Stripe gave us', async () => {
    fetchMock.mockReturnValue(answer(200, { url: 'https://billing.stripe.com/s/abc' }));
    await expect(openBillingPortal()).resolves.toBe('https://billing.stripe.com/s/abc');
    expect(String(fetchMock.mock.calls[0][0])).toContain(PORTAL_PATH);
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('POST');
  });

  it('says there is no billing record, in the API\'s own terms', async () => {
    /** The 404 is the informative answer, and it was the one being
     *  flattened into "Failed to create portal session". */
    fetchMock.mockReturnValue(answer(404, { detail: 'No billing information found' }));
    await expect(openBillingPortal()).rejects.toMatchObject({
      message: NO_BILLING, noBilling: true,
    });
  });

  it('passes the API\'s reason through on any other refusal', async () => {
    fetchMock.mockReturnValue(answer(400, { detail: 'Stripe error: no such customer' }));
    await expect(openBillingPortal()).rejects.toThrow('Stripe error: no such customer');
  });

  it('names the status when the API gives no reason at all', async () => {
    fetchMock.mockReturnValue(answer(500, {}));
    await expect(openBillingPortal()).rejects.toThrow(/500/);
  });

  it('does not report success it did not get', async () => {
    /** §4. A 200 carrying no URL is a failure, and navigating to
     *  `undefined` would be the officer's version of it. */
    fetchMock.mockReturnValue(answer(200, {}));
    await expect(openBillingPortal()).rejects.toThrow(/no portal link/);
  });

  it('says the server was unreachable rather than "failed to fetch"', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(openBillingPortal()).rejects.toThrow(UNREACHABLE);
  });

  it('lets a session expiry pass through untouched', async () => {
    /** RED-S3: a 401 is a pause the client already handles — turning it
     *  into a billing error here would hide the re-auth. */
    const expired = new Error('Session expired');
    expired.name = 'SessionExpiredError';
    fetchMock.mockRejectedValue(expired);
    await expect(openBillingPortal()).rejects.toThrow('Session expired');
    await expect(openBillingPortal()).rejects.not.toBeInstanceOf(BillingPortalError);
  });
});

describe('the control on the page', () => {
  /**
   * Rendered rather than grepped. The defect being fixed is one of
   * REACHABILITY — a handler existed and the officer could not find the
   * thing it did — so an assertion that the source mentions "cancel"
   * would restate the bug rather than catch it (§14.1.1).
   */
  async function billingTab(plan: string | undefined) {
    fetchMock.mockImplementation((url: unknown) => {
      if (String(url).includes('/users/profile')) {
        return answer(200, { email: 'officer@example.com', plan });
      }
      return answer(404, { detail: 'No billing information found' });
    });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Page = require('../app/account-settings/page').default;
    render(<Page />);
    const tab = await screen.findByRole('button', { name: /billing/i });
    await userEvent.click(tab);
    return tab;
  }

  it('offers a cancel control, by that name', async () => {
    await billingTab('professional');
    expect(await screen.findByRole('button', { name: /cancel subscription/i }))
      .toBeInTheDocument();
  });

  it('offers it to a FREE profile too, because that column can be stale', async () => {
    /**
     * THE PIN THAT MATTERS. `users.plan` is written by the webhook; if
     * it is wrong, every other billing control disappears and the
     * customer being charged has no way out. This one asks Stripe.
     */
    await billingTab('free');
    expect(await screen.findByRole('button', { name: /cancel subscription/i }))
      .toBeInTheDocument();
  });

  it('shows the reason on the page when the portal will not open', async () => {
    /** A toast that has faded is a failure nobody can re-read. */
    await billingTab('free');
    await userEvent.click(await screen.findByRole('button', { name: /cancel subscription/i }));
    await waitFor(() => {
      expect(screen.getByTestId('portal-error')).toHaveTextContent(/nothing to cancel/i);
    });
  });
});

describe('one place opens the portal', () => {
  it('the page holds no second copy of the call (§14.3)', () => {
    const src = read(SETTINGS);
    expect(src).toContain('openBillingPortal()');
    expect(src).not.toContain('create-portal-session');
  });

  it('and it goes through the client that surfaces failures', () => {
    expect(read(join(SRC, 'lib', 'billingPortal.ts'))).toContain('apiFetch');
  });
});

describe('what the copy does not claim', () => {
  it('never states when access ends after cancelling', () => {
    /**
     * Whether Stripe's portal cancels immediately or at period end is
     * configuration in the Stripe dashboard, which this repository
     * cannot read. "You keep access until the end of the period" is the
     * sentence a customer would rely on and we cannot back — the same
     * shape as every claim the banned-claims gate exists for.
     */
    const src = read(SETTINGS);
    for (const claim of [
      /keep access until/i,
      /end of (the |your )?(current )?(billing )?period/i,
      /immediately cancel/i,
      /no further charges/i,
    ]) {
      expect(src).not.toMatch(claim);
    }
  });
});
