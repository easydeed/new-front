/**
 * SIGNUP1, RENDERED — the branch-guarded halves.
 *
 * The rules next door are called directly, which is the right shape for
 * a rule. What a called rule cannot show is whether the SCREEN reaches
 * it: the "Other" follow-ups, the interest field and the state fact are
 * all conditional JSX, and a conditional that never fires passes every
 * string-presence check ever written.
 *
 * Third file in this suite to make that argument, and the last time it
 * needs making: the technique is now what we reach for when a pin's
 * subject is a branch.
 *
 * NOTE on `jest`: from the GLOBAL, so babel hoists `jest.mock` above the
 * imports. An imported one leaves the module under test to load first
 * and capture the real dependencies — and the symptom is a silent empty
 * render, which looks exactly like a test with nothing to say.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, beforeEach } from '@jest/globals';
import type { jest as JestObject } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import '@testing-library/jest-dom/jest-globals';

/** File-local: a global declaration collides with the ambient `jest`
 *  namespace and knocks `describe`/`it` out of other suites. */
declare const jest: typeof JestObject;

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/register',
  useSearchParams: () => new URLSearchParams(),
}));

import RegisterPage from '@/app/register/page';

beforeEach(() => {
  (global as any).fetch = jest.fn(async () => ({
    ok: true, status: 200, json: async () => ({ access_token: 't' }),
  })) as any;
});

describe('the state is stated, not asked', () => {
  it('California is on the screen as a fact', () => {
    render(<RegisterPage />);
    expect(screen.getByText('California')).toBeInTheDocument();
    expect(screen.getByText(/serves California today/)).toBeInTheDocument();
  });

  it('and there is no state control to choose from', () => {
    /** THE PIN THIS FILE EXISTS FOR — a source check can see the list
     *  is gone; only a render can see nothing replaced it. */
    render(<RegisterPage />);
    expect(screen.queryByLabelText(/^State/)).not.toBeInTheDocument();
    expect(screen.queryByText('Select your state')).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Arizona' }))
      .not.toBeInTheDocument();
  });

  it('the interest field is free text and reachable', () => {
    render(<RegisterPage />);
    const field = screen.getByLabelText(/Working outside California/);
    expect(field.tagName).toBe('INPUT');
    expect(screen.getByText(/not taking\s+orders outside California yet/))
      .toBeInTheDocument();
  });
});

describe('"Other" asks what it means', () => {
  it('the role follow-up appears only when Other is chosen', async () => {
    render(<RegisterPage />);
    expect(screen.queryByLabelText(/What is your role/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Professional role/),
                     { target: { value: 'Other' } });
    expect(await screen.findByLabelText(/What is your role/)).toBeInTheDocument();
  });

  it('and the company-type follow-up likewise', async () => {
    render(<RegisterPage />);
    expect(screen.queryByLabelText(/What kind of company/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Company type/),
                     { target: { value: 'Other' } });
    expect(await screen.findByLabelText(/What kind of company/))
      .toBeInTheDocument();
  });

  it('it disappears again when she picks a real answer', async () => {
    render(<RegisterPage />);
    const role = screen.getByLabelText(/Professional role/);
    fireEvent.change(role, { target: { value: 'Other' } });
    await screen.findByLabelText(/What is your role/);
    fireEvent.change(role, { target: { value: 'Escrow Officer' } });
    await waitFor(() => {
      expect(screen.queryByLabelText(/What is your role/)).not.toBeInTheDocument();
    });
  });
});

describe('the asterisks mean something to a machine', () => {
  it('required fields say so', () => {
    render(<RegisterPage />);
    expect(screen.getByLabelText(/Full name/)).toBeRequired();
    expect(screen.getByLabelText(/Professional role/)).toBeRequired();
  });

  it('an optional one does not', () => {
    render(<RegisterPage />);
    expect(screen.getByLabelText(/Phone number/)).not.toBeRequired();
  });
});

describe('an answer arrives before submit', () => {
  it('leaving a short phone explains it, and links the explanation to the field', async () => {
    /**
     * "not-a-phone!!" was accepted, and production holds a nine-digit
     * number. Every mistake used to surface only on submit, all at once,
     * after the work.
     *
     * NOTE the case this drives: NINE DIGITS, not letters. `maskUS`
     * strips non-digits as she types, so pure garbage can no longer be
     * entered through this control at all — `phoneProblem`'s
     * "does not look like a phone number" branch is reachable through
     * the API and through paste, not through typing. Driving the
     * unreachable case here would have tested the mask, not the rule.
     */
    render(<RegisterPage />);
    const phone = screen.getByLabelText(/Phone number/);
    fireEvent.change(phone, { target: { value: '626555013' } });
    fireEvent.blur(phone);

    const problem = await screen.findByRole('alert');
    expect(problem).toHaveTextContent(/has 9/);
    expect(phone).toHaveAttribute('aria-invalid', 'true');
    expect(phone).toHaveAttribute('aria-describedby', 'phone-error');
  });

  it('a half-filled company pair is caught on the way out of it', async () => {
    render(<RegisterPage />);
    const type = screen.getByLabelText(/Company type/);
    fireEvent.change(type, { target: { value: 'Title Company' } });
    fireEvent.blur(type);
    // The complaint lands on the NAME, which is the field that is empty.
    await waitFor(() => {
      expect(screen.getByLabelText(/Company name/))
        .toHaveAttribute('aria-invalid', 'true');
    });
  });

  it('and stays quiet about fields she has not reached yet', async () => {
    // Validating everything on the first blur would answer questions she
    // has not asked, about work she has not done.
    render(<RegisterPage />);
    fireEvent.blur(screen.getByLabelText(/Phone number/));
    await waitFor(() => {
      expect(screen.getByLabelText(/Full name/))
        .not.toHaveAttribute('aria-invalid');
    });
  });
});

describe('the phone is masked while she types', () => {
  it('digits become a readable number', () => {
    render(<RegisterPage />);
    const phone = screen.getByLabelText(/Phone number/) as HTMLInputElement;
    fireEvent.change(phone, { target: { value: '6265550134' } });
    expect(phone.value).toBe('(626) 555-0134');
  });
});
