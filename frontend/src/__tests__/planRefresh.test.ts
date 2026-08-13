/**
 * MONEY1 — the billing page after a successful checkout.
 *
 * ═══ WHAT WAS ACTUALLY WRONG ═══
 *
 * Not what the audit reported. The page HAS always fetched
 * `/users/profile` on mount, and the plan badge HAS always been bound to
 * `userProfile.plan` from that call — the audit's experiment forced
 * `localStorage.user_data`, which this page never reads, so it proved
 * the badge is not bound to localStorage rather than that it is bound to
 * nothing. It showed Free because the API said Free.
 *
 * The real defect is narrower and is about WHEN. Stripe redirects to
 * `?success=true` the instant checkout completes; the webhook that
 * upgrades the plan arrives independently over the same seconds. One
 * fetch on mount races that and usually loses, and nothing asks again.
 *
 * So the officer sees Free immediately after paying — which is
 * indistinguishable, from her seat, from a payment that failed.
 *
 * ═══ AND WHAT RETRYING MUST NOT BECOME ═══
 *
 * Asking again is honest. Deciding is not. When the attempts run out
 * this reports that they ran out; it never assumes the upgrade worked
 * and never assumes it failed. Claiming either would be the billing path
 * asserting something it did not observe — the exact class of defect the
 * whole webhook story is made of.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';
import {
  ATTEMPTS, afterAttempt, delayBeforeAttempt, totalWindowMs,
} from '../lib/planRefresh';

const SRC = path.join(__dirname, '..');
const PAGE = codeOnly(
  fs.readFileSync(path.join(SRC, 'app', 'account-settings', 'page.tsx'), 'utf8'));

describe('the retry policy is a rule that can be asked', () => {
  it('tries more than once and stops', () => {
    expect(ATTEMPTS).toBeGreaterThan(1);
    expect(delayBeforeAttempt(0)).toBe(0);          // ask immediately
    expect(delayBeforeAttempt(ATTEMPTS - 1)).not.toBeNull();
    expect(delayBeforeAttempt(ATTEMPTS)).toBeNull(); // and then stops
  });

  it('stays inside a window a person will actually wait', () => {
    // This is somebody watching a screen after paying, not a background
    // job. Long enough to outlast a normal webhook, short enough that
    // "still checking" does not become the resting state.
    expect(totalWindowMs()).toBeGreaterThan(5_000);
    expect(totalWindowMs()).toBeLessThan(30_000);
  });

  it('refuses a nonsense attempt number rather than indexing past the end', () => {
    for (const n of [-1, 1.5, NaN, 99]) {
      expect(delayBeforeAttempt(n)).toBeNull();
    }
  });
});

describe('a CHANGE is the signal, never a guessed plan name', () => {
  it('stops as soon as the plan differs from what it started on', () => {
    expect(afterAttempt(0, 'professional', 'free'))
      .toEqual({ state: 'changed', plan: 'professional' });
  });

  it('does not require the plan to be one it expected', () => {
    /**
     * The page does not know which plan was bought — the officer chose
     * it on Stripe's side. Matching against an expected name would be
     * inventing the answer being waited for, and would sit forever on a
     * founding rate or a plan added later.
     */
    expect(afterAttempt(0, 'enterprise-2027', 'free').state).toBe('changed');
  });

  it('keeps checking while the plan has not moved', () => {
    expect(afterAttempt(0, 'free', 'free')).toEqual({ state: 'checking', attempt: 1 });
  });

  it('treats an unreadable answer as no answer, not as a change', () => {
    // A failed fetch gives undefined. That is not evidence of anything,
    // and reading it as a change would announce an upgrade nobody saw.
    for (const bad of [null, undefined, '', '   ']) {
      expect(afterAttempt(0, bad, 'free').state).toBe('checking');
    }
  });

  it('gives up honestly when the attempts run out', () => {
    expect(afterAttempt(ATTEMPTS - 1, 'free', 'free')).toEqual({ state: 'gave-up' });
  });

  it('never reports success it did not observe', () => {
    /** THE PIN THIS FILE EXISTS FOR. Sweep every attempt with an
     *  unchanged plan: no state anywhere in the sequence claims the
     *  upgrade happened. */
    for (let n = 0; n < ATTEMPTS + 3; n++) {
      expect(afterAttempt(n, 'free', 'free').state).not.toBe('changed');
    }
  });
});

describe('the page uses the rule, and says only what it knows', () => {
  it('asks the API on mount — a page that never asks cannot be right', () => {
    expect(PAGE).toContain('fetchUserProfile()');
    expect(PAGE).toContain('/users/profile');
  });

  it('reads the checkout return and calls the policy', () => {
    expect(PAGE).toContain('params?.get("success")');
    expect(PAGE).toContain('afterAttempt(');
    expect(PAGE).toContain('delayBeforeAttempt(');
  });

  it('asks again when she comes back to the tab', () => {
    expect(PAGE).toContain('visibilitychange');
    expect(PAGE).toContain('silent: true');
  });

  it('distinguishes the three things it can honestly say', () => {
    // Payment observed + plan changed; payment observed + still waiting;
    // payment observed + we stopped waiting. Never "upgrade failed",
    // which it has no way to know.
    expect(PAGE).toContain('your plan is now');
    expect(PAGE).toContain('Confirming your new plan');
    expect(PAGE).toContain('has not updated yet');
    expect(PAGE).not.toMatch(/payment failed|upgrade failed/i);
  });

  it('names the delay as ours rather than blaming the card', () => {
    // Stripe redirected, so the card worked. Saying anything that reads
    // as a card problem would send her to her bank over our latency.
    expect(PAGE).toContain('rather than a\n                        problem with your card');
  });

  it('keeps the Suspense boundary useSearchParams requires', () => {
    // Without it Next fails the BUILD, not the render — so jest and tsc
    // both stay green while the deploy does not. Fourth time this wave.
    expect(PAGE).toContain('<Suspense');
  });
});
