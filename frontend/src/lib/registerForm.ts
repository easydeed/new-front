/**
 * SIGNUP1 — what the registration form accepts, and how it says no.
 *
 * ═══ WHY THE RULES LEFT THE COMPONENT ═══
 *
 * They were a 40-line `validateForm` inside a 700-line page, called from
 * one place, on submit. Nothing could ask them a question. "Does a
 * company type without a company name fail?" was answerable only by
 * filling in a form and pressing a button.
 *
 * Called, a test can ask.
 *
 * ═══ THE STATE IS A FACT, NOT A CHOICE ═══
 *
 * The form offered fifty states. The catalog, the chassis, the DTT rate
 * registry and every county form in this product are CALIFORNIA by
 * construction — 58 California counties, California code sections,
 * California transfer tax. Fifty options is a promise the product breaks
 * the moment somebody in Arizona registers and finds no Arizona forms.
 *
 * Owner-ruled: California, displayed rather than chosen. An optional
 * free-text "which state are you in?" records an interest signal for
 * later — but no dropdown, because a dropdown implies we would accept
 * the answer.
 *
 * And the signal is READABLE (it reaches admin) rather than write-only.
 * LEGAL1's ruling is the precedent: collecting something nobody can
 * produce manufactures a record that looks like information and cannot
 * function as one. That was `subscribe`, and it cost a ticket to undo.
 */

/** The one state this product serves. Not a default — the value. */
export const SERVED_STATE = 'CA';
export const SERVED_STATE_NAME = 'California';

/** The literal a "pick one" list uses to mean "none of these". */
export const OTHER = 'Other';

export interface RegisterFields {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  role: string;
  roleOther: string;
  companyName: string;
  companyType: string;
  companyTypeOther: string;
  phone: string;
  interestState: string;
  agreeTerms: boolean;
}

/** Field name → the sentence shown under it. Empty object = accepted. */
export type FieldErrors = Partial<Record<keyof RegisterFields, string>>;

/**
 * Is this a plausible US phone number?
 *
 * Deliberately thin. It asks whether ten digits are present, and nothing
 * about whether the line is assigned or reachable — `services/phone.py`
 * makes the same refusal for the same reason. What it catches is the
 * audited case: "not-a-phone!!" was accepted, and production holds a
 * nine-digit number nobody can call.
 *
 * Optional stays optional: blank passes. A phone we do not have is not
 * a phone we got wrong.
 */
export function phoneProblem(value: string): string | null {
  const raw = (value || '').trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (!/\d/.test(raw)) return 'That does not look like a phone number.';
  const national = digits.length === 11 && digits.startsWith('1')
    ? digits.slice(1) : digits;
  if (national.length !== 10) {
    return `A US phone number has 10 digits — this one has ${national.length}.`;
  }
  return null;
}

/**
 * The company pair, checked BOTH WAYS.
 *
 * A type without a name is a company we cannot print on a deed face; a
 * name without a type is a company we cannot categorise. Each was
 * separately optional and neither implied the other, so both halves of
 * the pair could be half-filled and the form was happy.
 */
export function companyProblems(f: Pick<RegisterFields,
  'companyName' | 'companyType' | 'companyTypeOther'>): FieldErrors {
  const name = (f.companyName || '').trim();
  const type = (f.companyType || '').trim();
  const out: FieldErrors = {};
  if (type && !name) {
    out.companyName = 'Add the company name, or clear the company type.';
  }
  if (name && !type) {
    out.companyType = 'Choose a company type, or clear the company name.';
  }
  if (type === OTHER && !(f.companyTypeOther || '').trim()) {
    out.companyTypeOther = 'Tell us what kind of company it is.';
  }
  return out;
}

/**
 * "Other" is not an answer.
 *
 * Both lists ended in it and neither asked what it meant, so the product
 * recorded a professional role of literally "Other" — for a column the
 * deed face and the admin console both read.
 */
export function otherProblems(f: Pick<RegisterFields, 'role' | 'roleOther'>): FieldErrors {
  if (f.role === OTHER && !(f.roleOther || '').trim()) {
    return { roleOther: 'Tell us your role.' };
  }
  return {};
}

const EMAIL = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/** Every rule, in one callable place. */
export function validate(f: RegisterFields): FieldErrors {
  const out: FieldErrors = {};

  if (!f.email) out.email = 'Email is required';
  else if (!EMAIL.test(f.email)) out.email = 'Please enter a valid email address';

  if (!f.password) out.password = 'Password is required';
  else if (f.password.length < 8) out.password = 'Password must be at least 8 characters long';
  else if (!/(?=.*[a-z])/.test(f.password)) out.password = 'Password must contain at least one lowercase letter';
  else if (!/(?=.*[A-Z])/.test(f.password)) out.password = 'Password must contain at least one uppercase letter';
  else if (!/(?=.*\d)/.test(f.password)) out.password = 'Password must contain at least one number';

  if (!f.confirmPassword) out.confirmPassword = 'Please confirm your password';
  else if (f.password !== f.confirmPassword) out.confirmPassword = 'Passwords do not match';

  if (!f.fullName?.trim()) out.fullName = 'Full name is required';
  if (!f.role) out.role = 'Role is required';
  if (!f.agreeTerms) out.agreeTerms = 'You must agree to the terms and conditions';

  const phone = phoneProblem(f.phone);
  if (phone) out.phone = phone;

  return { ...out, ...companyProblems(f), ...otherProblems(f) };
}

/**
 * What actually goes to the server.
 *
 * `state` is not read from the form because the form does not ask. An
 * "Other" role or company type resolves to what she typed — the free
 * text IS the answer, and storing the literal "Other" beside it would be
 * two columns disagreeing about one fact.
 *
 * ═══ ONE NAME NOW ═══
 *
 * `job_title` is what the column is called and what the server takes.
 * The paired `role` came out on 2026-08-13, once a server preferring
 * `job_title` had been live through a deploy — the removal trigger this
 * comment carried, fired rather than forgotten.
 */
export function registrationPayload(f: RegisterFields, normalizedPhone: string) {
  const role = f.role === OTHER ? f.roleOther.trim() : f.role;
  const companyType = f.companyType === OTHER
    ? f.companyTypeOther.trim() : f.companyType;
  return {
    email: f.email,
    password: f.password,
    confirm_password: f.confirmPassword,
    full_name: f.fullName,
    job_title: role,
    company_name: f.companyName || null,
    company_type: companyType || null,
    phone: normalizedPhone || null,
    state: SERVED_STATE,
    interest_state: f.interestState?.trim() || null,
    agree_terms: f.agreeTerms,
  };
}

/**
 * The accessibility wiring for one field, in one place.
 *
 * The red asterisks were decoration: no `required`, no `aria-required`,
 * no `aria-invalid`, no `aria-describedby`. A screen-reader user could
 * not learn which fields were mandatory before submitting, and after
 * submitting could not learn which one had failed — the error sentence
 * was a coloured paragraph with no relationship to the input.
 *
 * Returned as props rather than written per field because eleven fields
 * hand-wired is eleven chances to omit one, and the omitted one is
 * invisible to everybody who can see.
 */
/**
 * Fields that fail TOGETHER, so touching one surfaces both.
 *
 * The company pair is one fact in two inputs: leaving the type filled
 * and the name empty raises an error on the NAME, which she has not
 * touched. A "show errors for touched fields" filter hides it — she gets
 * a silent form that refuses to submit, which is worse than the missing
 * check was.
 *
 * A rule about a PAIR cannot be surfaced by a rule about one field.
 */
export const PAIRED: Record<string, string[]> = {
  companyName: ['companyType', 'companyTypeOther'],
  companyType: ['companyName', 'companyTypeOther'],
  companyTypeOther: ['companyName', 'companyType'],
  role: ['roleOther'],
  roleOther: ['role'],
};

/** Which field names to reveal once `name` has been left. */
export function revealedBy(name: string): string[] {
  return [name, ...(PAIRED[name] || [])];
}

export function fieldProps(
  name: string, error: string | undefined, required = false,
): Record<string, string | boolean | undefined> {
  return {
    id: name,
    name,
    ...(required ? { required: true, 'aria-required': true } : {}),
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${name}-error` : undefined,
  };
}
