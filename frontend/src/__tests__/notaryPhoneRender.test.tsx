/**
 * NOTARYPHONE1, RENDERED — what the notary actually sees.
 *
 * ═══ WHY THIS FILE AND NOT MORE SOURCE PINS ═══
 *
 * The source pins next door assert that the explanation for a disabled
 * Post button EXISTS IN THE FILE. A probe wrapped it in `{false && (`
 * and all eleven passed: the strings were still there, the sentence was
 * on no screen.
 *
 * That is the same defect for the third time in two days — a
 * string-presence pin cannot tell REACHABLE from PRESENT. The lesson
 * does not transfer by being known; the only thing that catches it is
 * executing the branch, which for a page means rendering it.
 *
 * ═══ AND IT MATTERS MORE HERE THAN ANYWHERE ═══
 *
 * This is the one surface used by somebody who is not our customer, on a
 * phone, with no account and no way to complain to us. A control that is
 * silently unusable here does not generate a support ticket. It
 * generates a signing that never gets booked, and nobody ever learns
 * why.
 *
 * NOTE on `jest`: used from the GLOBAL, not imported from
 * `@jest/globals`. Babel only hoists `jest.mock` above the imports when
 * it sees the global — an imported one leaves the module under test to
 * load first and capture the real dependencies, and the symptom is a
 * silent empty render.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, beforeEach } from '@jest/globals';
import type { jest as JestObject } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import '@testing-library/jest-dom/jest-globals';

/** File-local so it cannot collide with the ambient `jest` namespace —
 *  a global declaration knocks out `describe`/`it` for other suites. */
declare const jest: typeof JestObject;

jest.mock('next/navigation', () => ({
  useParams: () => ({ token: 'tok-1' }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/signing/tok-1',
  useSearchParams: () => new URLSearchParams(),
}));

import SigningTokenPage from '@/app/signing/[token]/page';

/** The notary's package, in the shape `signing_surfaces` asserts. */
const pkg = (over: Record<string, unknown> = {}) => ({
  party_role: 'notary',
  state: 'windows_posted',
  summary: '1 time offered — waiting on 1 more person',
  expires_at: '2026-09-01T00:00:00Z',
  windows: [],
  coordinator: { name: 'Maria Lopez', company: 'Pacific Coast Escrow' },
  property_address: '123 Baseline St',
  county: 'Los Angeles',
  deed_type: 'grant-deed',
  signers: [{ name: 'Jane Doe' }],
  pcor_url: '/signing/tok-1/pcor',
  pdf_url: '/signing/tok-1/pdf',
  ...over,
});

const serve = (body: unknown) => {
  (global as any).fetch = jest.fn(async () => ({
    ok: true, status: 200, json: async () => body,
  })) as any;
};

beforeEach(() => { (global as any).fetch = undefined; });

const notary = async (over: Record<string, unknown> = {}) => {
  serve(pkg(over));
  render(<SigningTokenPage />);
  await screen.findByText(/Add times you are free/);
};

describe('the disabled Post button explains itself', () => {
  it('says what is missing before anything is typed', async () => {
    /** THE PIN THIS FILE EXISTS FOR — the one a source check could not
     *  see, because the sentence was present and unreachable. */
    await notary();
    expect(screen.getByText(/Add a time you are free, then post it/))
      .toBeInTheDocument();
  });

  it('and says something DIFFERENT when a row is half-filled', async () => {
    /**
     * A browser hands back `''` for a half-typed datetime, so a date
     * with no time reads to this code exactly like an empty field. The
     * officer's most likely mistake was indistinguishable from having
     * typed nothing — and the button just greyed out.
     */
    await notary();
    fireEvent.change(screen.getByLabelText('Starts'),
                     { target: { value: '2026-09-01T10:00' } });
    await waitFor(() => {
      expect(screen.getByText(/needs both a start and an end/))
        .toBeInTheDocument();
    });
    expect(screen.queryByText(/Add a time you are free, then post it/))
      .not.toBeInTheDocument();
  });

  it('and goes quiet once the row is complete', async () => {
    await notary();
    fireEvent.change(screen.getByLabelText('Starts'),
                     { target: { value: '2026-09-01T10:00' } });
    fireEvent.change(screen.getByLabelText('Ends'),
                     { target: { value: '2026-09-01T11:00' } });
    await waitFor(() => {
      expect(screen.queryByText(/needs both a start and an end/))
        .not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Post 1 time$/ })).toBeEnabled();
  });
});

describe('every control is reachable by its name', () => {
  it('the start and end are found by label, not by position', async () => {
    // If this passes, a screen reader can tell them apart. Before, both
    // announced as "date and time" and the difference was the order.
    await notary();
    expect(screen.getByLabelText('Starts')).toBeInTheDocument();
    expect(screen.getByLabelText('Ends')).toBeInTheDocument();
  });
});

describe('"Another" can be undone', () => {
  it('a second row appears, and can be removed again', async () => {
    await notary();
    expect(screen.queryByRole('button', { name: /Remove time/ }))
      .not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Another/ }));
    const remove = await screen.findByRole('button', { name: 'Remove time 2' });
    expect(screen.getAllByLabelText(/Starts/)).toHaveLength(2);

    fireEvent.click(remove);
    await waitFor(() => {
      expect(screen.getAllByLabelText(/Starts/)).toHaveLength(1);
    });
  });

  it('the last row has no Remove — zero rows is a form with no way back', async () => {
    await notary();
    expect(screen.queryByRole('button', { name: /Remove time 1/ }))
      .not.toBeInTheDocument();
  });
});

describe('the summary is the server\'s sentence, verbatim', () => {
  it('renders whatever Python composed, including the count', async () => {
    // "1 time offered", not "1 times offered" — and the screen does no
    // arithmetic of its own to get there (§13 rule 3).
    await notary();
    expect(screen.getAllByText(/1 time offered — waiting on 1 more person/).length)
      .toBeGreaterThan(0);
  });
});

describe('a window the notary offered does not claim she agreed to it', () => {
  it('shows nobody has answered when only her implicit row exists', async () => {
    /**
     * The contradiction: "You offered this · 1 agreed" sat directly
     * above "waiting on 1 more person". The 1 was her.
     *
     * The server no longer counts the proposer, so `agreed_by` arrives
     * empty and the screen says so.
     */
    await notary({
      windows: [{ id: 5, label: 'Tue 1 Sep, 10:00 AM', origin: 'notary',
                  declined: false, start: '2026-09-01T10:00:00Z',
                  mine: { answer: 'available', asserted_by: 'Ana Reyes' },
                  agreed_by: [] }],
    });
    expect(screen.getByText(/You offered this · nobody has answered/))
      .toBeInTheDocument();
    expect(screen.queryByText(/1 agreed/)).not.toBeInTheDocument();
  });

  it('and still reports a real agreement when there is one', async () => {
    await notary({
      windows: [{ id: 5, label: 'Tue 1 Sep, 10:00 AM', origin: 'notary',
                  declined: false, start: '2026-09-01T10:00:00Z',
                  mine: { answer: 'available', asserted_by: 'Ana Reyes' },
                  agreed_by: ['Jane Doe'] }],
    });
    expect(screen.getByText(/You offered this · 1 agreed/)).toBeInTheDocument();
  });
});
