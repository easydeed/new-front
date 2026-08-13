/**
 * SIGNUP1 — the rules, asked directly.
 *
 * ═══ WHY THEY LEFT THE COMPONENT ═══
 *
 * `validateForm` was forty lines inside a seven-hundred-line page,
 * called from one place, on submit. "Does a company type without a
 * company name fail?" was answerable only by filling in a form and
 * pressing a button — so nobody asked, and the answer was no.
 *
 * ═══ FIFTY OPTIONS, ONE PRODUCT ═══
 *
 * The state dropdown offered fifty. The catalog, the chassis, the DTT
 * rate registry and every county form here are California by
 * construction: 58 California counties, California code sections,
 * California transfer tax. Fifty options is a promise the product breaks
 * the moment somebody in Arizona registers and finds no Arizona forms.
 *
 * Owner-ruled: California, displayed rather than chosen, with an
 * optional free-text interest signal and no dropdown implying we would
 * accept the answer.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';
import {
  OTHER, SERVED_STATE, SERVED_STATE_NAME, companyProblems, fieldProps,
  otherProblems, phoneProblem, registrationPayload, validate,
} from '../lib/registerForm';
import type { RegisterFields } from '../lib/registerForm';

const SRC = path.join(__dirname, '..');
const PAGE = codeOnly(
  fs.readFileSync(path.join(SRC, 'app', 'register', 'page.tsx'), 'utf8'));
const PY = fs.readFileSync(
  path.join(SRC, '..', '..', 'backend', 'routers', 'users_auth.py'), 'utf8');

const ok = (over: Partial<RegisterFields> = {}): RegisterFields => ({
  email: 'jane@example.com', password: 'Passw0rdy', confirmPassword: 'Passw0rdy',
  fullName: 'Jane Doe', role: 'Escrow Officer', roleOther: '',
  companyName: 'Pacific Coast Escrow', companyType: 'Independent Escrow Company',
  companyTypeOther: '', phone: '', interestState: '', agreeTerms: true, ...over,
});

describe('the state is a fact, not a question', () => {
  it('the page states California and offers no list', () => {
    /** THE PIN THIS FILE EXISTS FOR. */
    expect(PAGE).toContain('SERVED_STATE_NAME');
    expect(PAGE).not.toContain('Select your state');
    expect(PAGE).not.toContain('states.map');
  });

  it('and says plainly what we serve', () => {
    expect(PAGE).toContain('serves California today');
  });

  it('the server refuses what the screen stopped offering', () => {
    /**
     * A screen that stops offering a state while the endpoint keeps
     * accepting it is the COSMETIC version of this fix: registration is
     * public, so an API caller could still open an Arizona account this
     * product cannot serve.
     */
    expect(PY).toContain('!= SERVED_STATE');
    expect(PY).toContain('serves California today');
  });

  it('both languages name the same state', () => {
    // Two constants, one fact. The pair that drifts is the pair nobody
    // compares.
    const py = PY.match(/SERVED_STATE = "([A-Z]{2})"/)?.[1];
    expect(py).toBe(SERVED_STATE);
    expect(SERVED_STATE_NAME).toBe('California');
  });

  it('the payload sends the served state, never a form value', () => {
    expect(registrationPayload(ok(), '').state).toBe(SERVED_STATE);
  });
});

describe('the interest signal is recorded, and promises nothing', () => {
  it('travels as its own field', () => {
    expect(registrationPayload(ok({ interestState: ' Arizona ' }), '').interest_state)
      .toBe('Arizona');
  });

  it('blank stays null rather than becoming an empty string', () => {
    expect(registrationPayload(ok(), '').interest_state).toBeNull();
  });

  it('the copy makes no commitment', () => {
    /**
     * LEGAL1: a sentence like "we will let you know" would make this a
     * consent, and a consent we cannot honour is what that ticket
     * deleted. This records a fact she volunteered; it does not ask
     * permission to contact her.
     */
    expect(PAGE).toContain('not taking\n                  orders outside California yet');
    expect(PAGE).not.toMatch(/we.{0,12}(will|'ll) (let you know|notify|email|contact)/i);
  });

  it('and it is not a dropdown', () => {
    const at = PAGE.indexOf('interestState');
    const block = PAGE.slice(at - 200, at + 400);
    expect(block).not.toContain('<select');
  });
});

describe('the phone is checked, not merely typed into', () => {
  it('accepts nothing, because it is optional', () => {
    expect(phoneProblem('')).toBeNull();
    expect(phoneProblem('   ')).toBeNull();
  });

  it('rejects the audited case', () => {
    // "not-a-phone!!" was accepted.
    expect(phoneProblem('not-a-phone!!')).toMatch(/does not look like/);
  });

  it('counts the digits, which is how a nine-digit number got in', () => {
    expect(phoneProblem('(626) 555-013')).toMatch(/has 9/);
    expect(phoneProblem('626-555-0134')).toBeNull();
  });

  it('accepts a leading country code', () => {
    expect(phoneProblem('+1 (626) 555-0134')).toBeNull();
  });

  it('the page masks as she types, with the lib the partner screens use', () => {
    // Not a second implementation. PARTNER2 built this in both
    // languages with a shared corpus; registration never called it.
    expect(PAGE).toContain('maskUS(e.target.value)');
    expect(PAGE).toContain('inputMode="tel"');
  });

  it('and the server normalizes again at the write', () => {
    // A rule only the browser enforces is a rule the API does not have.
    expect(PY).toContain('normalize_phone(clean_profile_text(user.phone))');
  });
});

describe('the company pair is checked both ways', () => {
  it('a type with no name fails', () => {
    expect(companyProblems({ companyName: '', companyType: 'Title Company',
                             companyTypeOther: '' }).companyName).toBeTruthy();
  });

  it('a name with no type fails', () => {
    expect(companyProblems({ companyName: 'Acme', companyType: '',
                             companyTypeOther: '' }).companyType).toBeTruthy();
  });

  it('neither is still fine — the pair is optional, its halves are not', () => {
    expect(companyProblems({ companyName: '', companyType: '',
                             companyTypeOther: '' })).toEqual({});
  });

  it('both is fine', () => {
    expect(companyProblems({ companyName: 'Acme', companyType: 'Law Firm',
                             companyTypeOther: '' })).toEqual({});
  });
});

describe('"Other" is not an answer', () => {
  it('a role of Other must say what it is', () => {
    expect(otherProblems({ role: OTHER, roleOther: '' }).roleOther).toBeTruthy();
    expect(otherProblems({ role: OTHER, roleOther: 'Notary' })).toEqual({});
  });

  it('a company type of Other must too', () => {
    expect(companyProblems({ companyName: 'Acme', companyType: OTHER,
                             companyTypeOther: '' }).companyTypeOther).toBeTruthy();
  });

  it('and the free text REPLACES the literal rather than sitting beside it', () => {
    /**
     * The product recorded a professional role of literally "Other", for
     * a column the deed face and the admin console both read. Storing
     * both would be two columns disagreeing about one fact.
     */
    const payload = registrationPayload(
      ok({ role: OTHER, roleOther: ' Notary ', companyType: OTHER,
           companyTypeOther: ' Lender ' }), '');
    expect(payload.role).toBe('Notary');
    expect(payload.job_title).toBe('Notary');
    expect(payload.company_type).toBe('Lender');
  });

  it('sends the professional role under BOTH names, for one release', () => {
    /**
     * ROLE1 step 3 — `job_title` is the name that means what it holds.
     * `role` rides along because this frontend (Vercel) and the API
     * (Render) deploy separately: for the length of one deploy one is
     * new and the other is not, and registration is the front door.
     *
     * An old server reads `role` and ignores the rest; a new one prefers
     * `job_title`. Both directions are covered only if both are sent —
     * dropping either half is what makes a deploy window a lost signup.
     */
    const payload = registrationPayload(ok({ role: 'Escrow Officer' }), '');
    expect(payload.job_title).toBe('Escrow Officer');
    expect(payload.role).toBe('Escrow Officer');
  });
});

describe('the asterisks stop being decoration', () => {
  it('a required field says so to a machine, not just in red', () => {
    /**
     * No `required`, no `aria-required`, no `aria-invalid`, no
     * `aria-describedby`. A screen-reader user could not learn which
     * fields were mandatory before submitting, and afterwards could not
     * learn which had failed — the error was a coloured paragraph with
     * no relationship to its input.
     */
    expect(fieldProps('fullName', undefined, true)).toEqual({
      id: 'fullName', name: 'fullName', required: true, 'aria-required': true,
      'aria-invalid': undefined, 'aria-describedby': undefined,
    });
  });

  it('a failing field points at its own explanation', () => {
    expect(fieldProps('email', 'Email is required')).toMatchObject({
      'aria-invalid': true, 'aria-describedby': 'email-error',
    });
  });

  it('and the page wires every field through the one helper', () => {
    // Eleven fields hand-wired is eleven chances to omit one, and the
    // omitted one is invisible to everybody who can see.
    const wired = (PAGE.match(/\{\.\.\.fieldProps\(/g) || []).length;
    expect(wired).toBeGreaterThanOrEqual(7);
    // Every error paragraph carries the id its input points at.
    for (const name of ['fullName', 'role', 'phone', 'companyName', 'companyType']) {
      expect(PAGE).toContain(`id="${name}-error"`);
    }
  });

  it('errors are announced, not merely coloured', () => {
    expect((PAGE.match(/role="alert"/g) || []).length).toBeGreaterThanOrEqual(5);
  });
});

describe('validation does not wait for submit', () => {
  it('the page answers as she leaves a field', () => {
    expect(PAGE).toContain('const blur = (name: string)');
    expect((PAGE.match(/onBlur=\{\(\) => blur\(/g) || []).length)
      .toBeGreaterThanOrEqual(6);
  });

  it('but only about fields she has finished', () => {
    // Validating every keystroke tells somebody their email is invalid
    // while they are typing the @ — true, useless, and it reads as the
    // product arguing with them.
    expect(PAGE).toContain('.filter(([k]) => next[k])');
  });
});

describe('the whole form, end to end', () => {
  it('a good registration has nothing to say', () => {
    expect(validate(ok())).toEqual({});
  });

  it('and every rule is reachable from the one entry point', () => {
    expect(validate(ok({ phone: 'nope' })).phone).toBeTruthy();
    expect(validate(ok({ companyType: '' })).companyType).toBeTruthy();
    expect(validate(ok({ role: OTHER })).roleOther).toBeTruthy();
    expect(validate(ok({ agreeTerms: false })).agreeTerms).toBeTruthy();
  });
});
