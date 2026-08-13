/**
 * VERIFY-CHECK, RENDERED — what the officer is actually told.
 *
 * ═══ WHY RENDERED ═══
 *
 * The whole ticket is a sentence appearing on a screen. A source pin
 * that `EmailVerificationNotice` is imported by the dashboard would pass
 * against a version behind `{false && (` — which is the defect this
 * suite has now caught six times, and the reason for the standing rule:
 * for a page the fix is rendering.
 *
 * ═══ AND THE THREE STATES ARE EASY TO GET WRONG ═══
 *
 * `verified` arrives from `/users/profile` and is UNDEFINED while that
 * request is in flight. A component that treats undefined as "not
 * verified" flashes an accusation at every verified user on every page
 * load — telling somebody something untrue, briefly, which is still
 * telling them something untrue.
 *
 * NOTE on `jest`: from the GLOBAL, not `@jest/globals` — Babel only
 * hoists `jest.mock` above the imports when it sees the global.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, beforeEach } from '@jest/globals';
import type { jest as JestObject } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import '@testing-library/jest-dom/jest-globals';

declare const jest: typeof JestObject;

import EmailVerificationNotice from '@/features/account/EmailVerificationNotice';

const calls: Array<{ url: string; init?: any }> = [];

const serve = (ok: boolean) => {
  (global as any).fetch = jest.fn(async (url: string, init?: any) => {
    calls.push({ url: String(url), init });
    return { ok, status: ok ? 200 : 500, json: async () => ({ detail: 'nope' }) };
  }) as any;
};

beforeEach(() => { calls.length = 0; serve(true); });

describe('what it says, and when it says nothing', () => {
  it('asks when the address is unconfirmed', () => {
    render(<EmailVerificationNotice verified={false} email="jamie@firm.test" />);
    expect(screen.getByText(/not confirmed yet/)).toBeInTheDocument();
    expect(screen.getByText('jamie@firm.test')).toBeInTheDocument();
  });

  it('says nothing at all once confirmed', () => {
    const { container } = render(
      <EmailVerificationNotice verified email="jamie@firm.test" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('says nothing while the profile is still loading', () => {
    /**
     * `verified` is undefined until /users/profile answers. Treating
     * that as false accuses every verified user on every page load.
     */
    const { container } = render(
      <EmailVerificationNotice email="jamie@firm.test" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('withholds nothing, and does not pretend to', () => {
    /**
     * THE PIN THIS FILE EXISTS FOR. Nothing in the product is gated on
     * verification — owner-ruled, because every existing account is
     * unverified and a gate would lock out the customer base.
     *
     * So the copy must not imply otherwise. "Verify to continue", "to
     * unlock", "required" and "restricted" are all sentences that would
     * be false the moment they rendered.
     */
    render(<EmailVerificationNotice verified={false} email="jamie@firm.test" />);
    const text = document.body.textContent || '';
    for (const claim of [/to continue/i, /unlock/i, /required/i,
                         /restricted/i, /before you can/i]) {
      expect(text).not.toMatch(claim);
    }
  });
});

describe('sending it again', () => {
  it('asks the server for a fresh link', async () => {
    render(<EmailVerificationNotice verified={false} email="jamie@firm.test" />);
    fireEvent.click(screen.getByText(/Send it again/));
    await waitFor(() => {
      const post = calls.find((c) => c.init?.method === 'POST');
      expect(post).toBeDefined();
      expect(post!.url).toContain('/users/verify-email/request');
      expect(JSON.parse(post!.init.body).email).toBe('jamie@firm.test');
    });
    expect(await screen.findByTestId('verify-sent')).toBeInTheDocument();
  });

  it('says so when the send fails', async () => {
    /** §4 — a send that did not happen must never look like one that
     *  did. This is the whole reason the endpoint returns a reason. */
    serve(false);
    render(<EmailVerificationNotice verified={false} email="jamie@firm.test" />);
    fireEvent.click(screen.getByText(/Send it again/));
    expect(await screen.findByTestId('verify-problem')).toBeInTheDocument();
    expect(screen.queryByTestId('verify-sent')).not.toBeInTheDocument();
  });
});
