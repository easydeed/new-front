/**
 * LEGAL1 — registration collects nothing it cannot honour, and the
 * browser is told this is a new account.
 *
 * ═══ THE CONSENT WITH NO LIFECYCLE ═══
 *
 * `subscribe` was captured at registration and written to `users`, and
 * then appeared NOWHERE ELSE across 119 endpoints: not in any response,
 * not on `/users/profile`, not in admin search or export. `ProfilePatch`
 * accepts only `default_county` and `onboarding_completed`. There was no
 * unsubscribe endpoint and no email-preferences endpoint — while
 * `/admin/emails` and `/admin/emails/stats` both exist.
 *
 * So the consent was unreadable, unmodifiable by the person who gave it,
 * unproducible by support, and had no opt-out path. Mailing a list whose
 * consent cannot be produced and which offers no way out is a CAN-SPAM
 * problem, not a UX gap.
 *
 * Owner-ruled: stop collecting it. **Collecting consent we cannot honour
 * is worse than not collecting it** — it manufactures a record that
 * looks like permission and cannot function as one.
 *
 * The lifecycle gets built when there is a real reason to mail anyone,
 * and then all of it at once: stored, readable on the profile, patchable
 * by the user, a real unsubscribe path, and a List-Unsubscribe header on
 * any non-transactional send. This pin is what stops half of it
 * reappearing.
 *
 * ═══ AND THE BROWSER FILLING A PASSWORD NOBODY CHOSE ═══
 *
 * Without `autocomplete="new-password"`, Chrome does not recognise the
 * form as registration, reads a password field, and offers a saved
 * credential. The audit caught it exactly: eight dots and a "Good"
 * strength bar present before a single keystroke, with Confirm empty.
 *
 * Somebody can create an account with a password they never chose and do
 * not know they reused — and the strength meter tells them it is good.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';

const SRC = path.join(__dirname, '..');
const REGISTER = fs.readFileSync(
  path.join(SRC, 'app', 'register', 'page.tsx'), 'utf8');
const CODE = codeOnly(REGISTER);

describe('registration does not collect a consent it cannot honour', () => {
  it('has no marketing-consent checkbox', () => {
    expect(CODE).not.toContain('id="subscribe"');
    expect(CODE).not.toContain('name="subscribe"');
  });

  it('does not hold it in form state or send it', () => {
    // The checkbox going while the field stays would be the worst of
    // both: still collected, now without even asking.
    expect(CODE).not.toContain('subscribe:');
    expect(CODE).not.toContain('formData.subscribe');
  });

  it('does not offer the wording either', () => {
    expect(CODE).not.toMatch(/product updates and tips/i);
  });
});

describe('the browser is told this is a NEW password', () => {
  it('both password fields carry autocomplete="new-password"', () => {
    /**
     * THE PIN THIS FILE EXISTS FOR, and it counts rather than merely
     * finding one: the defect is per-FIELD, and a form where Confirm
     * carries the attribute and Password does not is the exact failure
     * the audit photographed.
     *
     * Counted against the PASSWORD INPUTS, not against `type="password"`
     * — the fields use a show/hide toggle, so their type is
     * `{showPassword ? "text" : "password"}` and a literal match finds
     * zero. The first draft of this pin asserted the literal and failed
     * on correct code, which is its own small lesson: an assertion about
     * markup has to match the markup that exists.
     */
    const inputs = CODE.match(/\? "text" : "password"/g) || [];
    expect(inputs.length).toBe(2);
    // One per input, and no more — a stray third would mean the
    // attribute landed somewhere it does not belong.
    const attrs = CODE.match(/^\s*autoComplete="new-password"$/gm) || [];
    expect(attrs.length).toBe(2);
  });

  it('never says current-password on the registration form', () => {
    // `current-password` is the value that ASKS for the saved credential.
    expect(CODE).not.toContain('current-password');
  });

  it('the attribute sits on the password inputs, not merely in the file', () => {
    // A string-presence check would pass with both attributes on the
    // email field. Anchor each to its own input.
    for (const name of ['password', 'confirmPassword']) {
      const at = CODE.indexOf(`name="${name}"`);
      expect(at).toBeGreaterThan(-1);
      const window = CODE.slice(at, at + 400);
      expect(window).toContain('autoComplete="new-password"');
    }
  });
});

describe('the rest of the form autofills the things it should', () => {
  it('names the fields a browser can helpfully fill', () => {
    // Helping with an address and a company is good. Helping with a
    // password is the bug — the difference is that these cannot be
    // wrong without the person noticing.
    for (const value of ['email', 'name', 'organization', 'tel']) {
      expect(CODE).toContain(`autoComplete="${value}"`);
    }
  });
});
