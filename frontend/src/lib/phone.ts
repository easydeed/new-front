/**
 * PARTNER2 — US phone masking on input, normalized on the wire.
 *
 * ═══ THE SPLIT THAT MATTERS ═══
 *
 * What she TYPES gets formatted as she types: (626) 555-0134. What gets
 * STORED is +16265550134. Those are different jobs and conflating them
 * is how a phone column ends up holding eleven punctuation styles that
 * no search can match — which is today's state: `partners.phone` is a
 * free-text VARCHAR(50) and the partners screen searches it as a
 * substring, so a partner saved as "626-555-0134" is invisible to
 * somebody typing "(626) 555".
 *
 * Storage is E.164 because it is the format that is a FACT rather than a
 * presentation: one number, one representation, comparable and
 * dial-able. Display is regional because that is how a person reads it.
 *
 * ═══ WHAT THIS DOES NOT DO ═══
 *
 * It does not validate that a number is reachable, assigned, or a
 * landline, and it does not reject numbers it cannot parse — an
 * unparseable value is kept VERBATIM rather than discarded. An officer
 * typing an extension, a UK number, or "ask for Dana" has given us
 * information, and silently dropping it to keep a column tidy would be
 * the product deciding it knows better. Formatting applies to things
 * that look like US numbers; everything else passes through untouched.
 */

/** Digits only, no country code assumptions. */
function digits(value: string): string {
  return (value || '').replace(/\D/g, '');
}

/**
 * Does this look like a US number we can safely reformat?
 * 10 digits, or 11 beginning with 1. Anything else is left alone.
 */
export function looksUS(value: string): boolean {
  const d = digits(value);
  return d.length === 10 || (d.length === 11 && d.startsWith('1'));
}

/** The ten significant digits, or '' if this is not a US-shaped number. */
function tenDigits(value: string): string {
  const d = digits(value);
  if (d.length === 10) return d;
  if (d.length === 11 && d.startsWith('1')) return d.slice(1);
  return '';
}

/**
 * AS-TYPED masking. Called on every keystroke, so it must be stable
 * under its own output — `maskUS(maskUS(x)) === maskUS(x)` — or the
 * cursor fights the user.
 *
 * Partial input formats progressively: "626" → "(626) ", "6265" →
 * "(626) 5". Past ten digits it stops adding punctuation rather than
 * mangling an international number somebody is halfway through typing.
 */
export function maskUS(value: string): string {
  const raw = value || '';
  const d = digits(raw);

  // A leading + means the officer is typing an international number.
  // Hands off entirely — this function has nothing useful to say about it.
  if (raw.trim().startsWith('+')) return raw;

  // More than a US number's worth of digits: stop formatting rather than
  // guess. Better a plain string than a wrong shape.
  if (d.length > 11) return raw;

  const body = d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
  const prefix = d.length === 11 && d.startsWith('1') ? '1 ' : '';

  if (body.length === 0) return raw.replace(/[^\d+() .-]/g, '');
  if (body.length <= 3) {
    // Only wrap the area code once it is complete — wrapping a single
    // digit as "(6" jumps the cursor past a paren the user did not type.
    return body.length === 3 ? `${prefix}(${body}) ` : `${prefix}${body}`;
  }
  if (body.length <= 6) return `${prefix}(${body.slice(0, 3)}) ${body.slice(3)}`;
  return `${prefix}(${body.slice(0, 3)}) ${body.slice(3, 6)}-${body.slice(6, 10)}`;
}

/**
 * NORMALIZED for storage. `+1XXXXXXXXXX` for US-shaped input.
 *
 * Anything else is returned trimmed and verbatim: an international
 * number, an extension, a note. We store what she meant; we do not
 * store a truncation of it.
 */
export function normalizePhone(value: string | null | undefined): string {
  const raw = (value || '').trim();
  if (!raw) return '';
  const ten = tenDigits(raw);
  if (!ten) return raw;
  return `+1${ten}`;
}

/**
 * FOR DISPLAY, from whatever is stored. Handles the historical mess:
 * rows written before this ticket hold "626-555-0134", "(626)555-0134",
 * "6265550134" and worse, and all of them should read the same way now.
 */
export function formatPhone(value: string | null | undefined): string {
  const raw = (value || '').trim();
  if (!raw) return '';
  const ten = tenDigits(raw);
  if (!ten) return raw;
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}

/**
 * A search-comparable form. The partners screen matches on this so that
 * "6265550134", "(626) 555-0134" and "626-555" all find the same row —
 * the substring search over raw text could not, which is the bug this
 * pair of functions exists to close.
 */
export function phoneSearchKey(value: string | null | undefined): string {
  // The TEN significant digits for a US-shaped number, all digits
  // otherwise. Returning every digit — the first draft — keyed a stored
  // `+16265550134` to `16265550134` and a typed `6265550134` to itself.
  // Substring matching still worked, so the screen looked correct while
  // equality quietly said no.
  const raw = value || '';
  return tenDigits(raw) || digits(raw);
}
