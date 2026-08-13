/**
 * The deed page, RENDERED — because reading the source cannot tell
 * REACHABLE from PRESENT.
 *
 * ═══ THE PROBE THAT MADE THIS FILE ═══
 *
 * The matter-section pins asserted that `data-testid="matter"` and
 * `detail.matter.documents.map` APPEAR IN THE SOURCE. A mutation probe
 * changed the guard to `{false && detail.matter && (` — the section
 * gone from every screen, the strings all still there — and all 31 pins
 * passed.
 *
 * That is the SIXTH sighting of this class, and it landed on the pin
 * protecting the ruling that records the fifth. The ledger's own
 * conclusion is the point: **the lesson does not transfer by being
 * known.** Knowing that a string-presence pin cannot see a dead branch
 * did not stop me writing three more of them an hour later.
 *
 * The only thing that catches it is executing the branch. For a service
 * that means calling the function; for a page it means rendering it.
 * jsdom and Testing Library were already installed and — until this
 * file — entirely unused: every test in this suite reads source text.
 *
 * ═══ AND ONE TRAP WORTH THE COMMENT ═══
 *
 * `jest` is used from the GLOBAL here rather than imported from
 * `@jest/globals`, which every other file in this suite does. Babel only
 * hoists `jest.mock` calls above the imports when it sees the global; an
 * imported `jest` leaves them in place, so the module under test loads
 * FIRST and captures the real dependencies.
 *
 * The symptom is silent: the page rendered an empty string, no error, no
 * warning — because the real `useRequireAuth` found no token and
 * returned `checked: false`. Which is this file's own subject arriving
 * one level up: a test that produces nothing looks exactly like a test
 * with nothing to say.
 *
 * ═══ WHAT THIS FILE IS FOR, AND WHAT IT IS NOT ═══
 *
 * It asks what an officer SEES for a given payload. It is not a
 * replacement for the source pins next door — those assert rules about
 * how the code is written (no state vocabulary, sentences rendered
 * verbatim), which rendering cannot check. These two are complements:
 * one proves the rule is stated, the other proves it is reached.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, beforeEach } from '@jest/globals';
import type { jest as JestObject } from '@jest/globals';

/**
 * The global `jest`, typed FILE-LOCALLY.
 *
 * `@types/jest` is not installed, so TS sees only a `jest` NAMESPACE and
 * refuses it as a value. Declaring `var jest` in a global .d.ts fixes
 * this file and breaks others: it conflicts with the ambient namespace
 * `@testing-library/jest-dom` contributes, TS drops that declaration
 * file, and `integration/fault-injection.test.ts` — which calls
 * `describe`/`it`/`expect` as globals with no imports — gained 13 errors.
 *
 * Measured, not guessed: 88 → 101 with the global declaration, 88
 * without. A file-local shadow satisfies this file and is invisible to
 * the rest of the program.
 */
declare const jest: typeof JestObject;

/** The mock's own type, borrowed from the same place. */
type Mock = ReturnType<typeof JestObject.fn>;
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
// BOTH entries, deliberately.
//
// `/jest-globals` augments the `expect` imported from `@jest/globals`,
// which is what this file uses. The bare entry carries the AMBIENT
// declarations that other suites in this repo lean on — dropping it
// added 13 tsc errors in `integration/fault-injection.test.ts`, which
// calls `describe`/`it`/`expect` as globals and has no imports at all.
//
// A test file is part of the type-checked program. Changing what it
// pulls in changes what every other file can see.
import '@testing-library/jest-dom';
import '@testing-library/jest-dom/jest-globals';

// The page pulls in a sidebar, a partners provider and two modals; none
// of them is what these tests are about, and all of them fetch. Stubbed
// to the smallest thing that still lets the page mount.
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: '7' }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/deeds/7',
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock('@/components/Sidebar', () => ({
  __esModule: true, default: () => <nav data-testid="sidebar" />,
}));
jest.mock('@/hooks/useRequireAuth', () => ({
  useRequireAuth: () => ({ checked: true }),
}));
jest.mock('@/features/partners/PartnersContext', () => ({
  PartnersProvider: ({ children }: any) => <>{children}</>,
  usePartners: () => ({ partners: [], loading: false, error: null,
                        create: jest.fn(), refresh: jest.fn() }),
}));
jest.mock('@/features/signing/ShareForReviewModal', () => ({
  ShareForReviewModal: () => <div data-testid="share-modal" />,
}));
jest.mock('@/features/signing/RequestSigningModal', () => ({
  RequestSigningModal: () => <div data-testid="signing-modal" />,
}));
jest.mock('@/features/signing/SigningDetail', () => ({
  SigningDetail: () => <div data-testid="signing-panel" />,
}));

jest.mock('@/lib/apiClient', () => ({
  apiFetch: jest.fn(),
  SessionExpiredError: class SessionExpiredError extends Error {},
}));

import DeedPage from '@/app/deeds/[id]/page';
import { apiFetch as rawApiFetch } from '@/lib/apiClient';

const apiFetch = rawApiFetch as unknown as Mock;

/** A payload in the shape `services/deed_page.py` asserts. */
const payload = (over: Record<string, unknown> = {}) => ({
  deed_id: 7,
  disqualified: null,
  state: {
    state: 'ready', headline: 'Generated',
    sentence: 'The instrument exists and has not been sent to anyone.',
    next_action: { kind: 'share_for_review', label: 'Send for review' },
    secondary_action: { kind: 'request_signing', label: 'Request signing' },
    signing_request_id: null, asserted_at: null,
  },
  activity: [],
  matter: {
    key: { kind: 'escrow_no', value: 'ESC-789' },
    documents: [{ id: 12, deed_type: 'grant-deed', status: 'completed',
                  property_address: '9 Other St', parties: ['Jane Doe'] }],
  },
  instrument: { deed_type: 'grant-deed', property_address: '123 Baseline St',
                county: 'Los Angeles', apn: '1234-567-890',
                completed_at: '2026-08-01T00:00:00Z', available: true },
  on_the_document: [{ role: 'Grantor', name: 'Jane Doe' },
                    { role: 'Grantee', name: 'John Roe' }],
  working_on_it: [],
  ...over,
});

const serve = (body: unknown) => {
  apiFetch.mockReset();
  apiFetch.mockResolvedValue({ ok: true, json: async () => body });
};

beforeEach(() => { apiFetch.mockReset(); });

describe('the matter section is actually on the screen', () => {
  it('renders the file and its other documents', async () => {
    /** THE PIN THIS FILE EXISTS FOR — owner-ruled to stay, and a source
     *  pin could not tell "rendered" from "written down". */
    serve(payload());
    render(<DeedPage />);
    expect(await screen.findByTestId('matter')).toBeInTheDocument();
    expect(screen.getByText(/ESC-789/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /#12/ }))
      .toHaveAttribute('href', '/deeds/12');
  });

  it('and is absent only when the deed is on no file', async () => {
    serve(payload({ matter: null }));
    render(<DeedPage />);
    await screen.findByTestId('state');
    expect(screen.queryByTestId('matter')).not.toBeInTheDocument();
  });
});

describe('the ready state offers both actions, ranked', () => {
  it('both buttons are on the screen', async () => {
    serve(payload());
    render(<DeedPage />);
    expect(await screen.findByRole('button', { name: /Send for review/ }))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Request signing/ }))
      .toBeInTheDocument();
  });

  it('a state with no secondary shows exactly one', async () => {
    serve(payload({
      state: { ...payload().state, state: 'in_review', headline: 'Out for review',
               sentence: 'Sent for review. No answer yet.',
               next_action: { kind: 'share_for_review', label: 'See who has it' },
               secondary_action: null },
    }));
    render(<DeedPage />);
    await screen.findByTestId('state');
    expect(screen.queryByTestId('secondary-action')).not.toBeInTheDocument();
  });
});

describe('the disqualification REPLACES the page', () => {
  it('a superseded deed shows the warning and NOTHING else', async () => {
    /**
     * The rule the whole page is organised around, checked the only way
     * that actually proves it: by looking at what is on the screen.
     *
     * A source pin can show the JSX is nested inside a guard. It cannot
     * show that the guard is reached, which is the entire question.
     */
    serve(payload({
      disqualified: {
        kind: 'superseded',
        headline: 'This deed was corrected and replaced.',
        sentence: 'A later deed supersedes this one.',
        go_to_deed_id: 9,
      },
    }));
    render(<DeedPage />);
    expect(await screen.findByTestId('disqualified')).toBeInTheDocument();

    // Every section that could invite work on the wrong document.
    for (const id of ['state', 'activity', 'participants', 'matter', 'instrument']) {
      expect(screen.queryByTestId(id)).not.toBeInTheDocument();
    }
    // And specifically no next action anywhere.
    expect(screen.queryByRole('button', { name: /Send for review/ }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Request signing/ }))
      .not.toBeInTheDocument();
  });

  it('but still offers the way out', async () => {
    serve(payload({
      disqualified: { kind: 'superseded', headline: 'Corrected.',
                      sentence: 'Superseded.', go_to_deed_id: 9 },
    }));
    render(<DeedPage />);
    expect(await screen.findByRole('link', { name: /replacement/ }))
      .toHaveAttribute('href', '/deeds/9');
  });
});

describe('what the officer is told when things are missing', () => {
  it('an empty activity feed says nothing happened, and invents nothing', async () => {
    serve(payload({ activity: [] }));
    render(<DeedPage />);
    expect(await screen.findByText(/Nothing recorded on this deed yet/))
      .toBeInTheDocument();
  });

  it('a draft offers no download link', async () => {
    serve(payload({
      instrument: { ...payload().instrument, available: false, completed_at: null },
    }));
    render(<DeedPage />);
    await screen.findByTestId('instrument');
    expect(screen.getByText(/Not generated yet/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Download$/ }))
      .not.toBeInTheDocument();
  });

  it('a failed load says so rather than showing an empty deed', async () => {
    apiFetch.mockReset();
    apiFetch.mockResolvedValue({
      ok: false, status: 404,
      json: async () => ({ detail: 'Deed not found' }),
    });
    render(<DeedPage />);
    expect(await screen.findByText(/Deed not found/)).toBeInTheDocument();
    expect(screen.queryByTestId('state')).not.toBeInTheDocument();
  });

  it('an unrecognised state is a visible gap, not a confident guess', async () => {
    serve(payload({
      state: { ...payload().state, state: 'recorded_by_county',
               headline: 'Recorded by the county' },
    }));
    render(<DeedPage />);
    await screen.findByTestId('state');
    expect(screen.getByText(/does not recognise yet/)).toBeInTheDocument();
    // And it does NOT print the headline it cannot vouch for.
    expect(screen.queryByText('Recorded by the county')).not.toBeInTheDocument();
  });
});

describe('the participants split, on the screen', () => {
  it('both headings render and the document side carries no control', async () => {
    serve(payload());
    render(<DeedPage />);
    await screen.findByTestId('participants');
    const onDoc = screen.getByTestId('on-the-document');
    expect(onDoc).toHaveTextContent('Jane Doe');
    expect(onDoc.querySelectorAll('button, a')).toHaveLength(0);
  });
});

describe('the page asks once', () => {
  it('one request, to the one endpoint', async () => {
    serve(payload());
    render(<DeedPage />);
    await screen.findByTestId('state');
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    const paths = apiFetch.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(paths).toEqual(['/deeds/7/detail']);
  });
});
