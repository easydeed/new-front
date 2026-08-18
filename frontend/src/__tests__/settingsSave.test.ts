/**
 * SETTINGS1 — the save that reported success without asking anybody.
 *
 * ═══ THE DEFECT, IN THREE LINES ═══
 *
 *     const handleSave = () => { toast.success("Profile saved!") }
 *
 * No request. A SUCCESS TOAST. Not a missing confirmation — a fabricated
 * one, on the single screen where somebody is deliberately entrusting us
 * with their details. That is why nine fields vanished on every reload
 * with nobody suspecting a bug: the product had told her it worked.
 *
 * Invariant #4 in its purest form. A failure that announces itself is a
 * bad afternoon; a failure that announces SUCCESS is a user who stops
 * checking.
 *
 * ═══ AND THERE WAS NOWHERE TO SEND IT ═══
 *
 * `ProfilePatch` accepted `default_county` and `onboarding_completed`
 * and nothing else. "Wire the button to the endpoint" named an endpoint
 * that could not take the data. The patch surface had to come first.
 *
 * ═══ AND THE FORM WAS READING KEYS THE SERVER NEVER SENT ═══
 *
 * Six of nine: `first_name`, `last_name`, `company`, `street_address`,
 * `city`, `zip_code`. The server sends `full_name` and `company_name`,
 * and never had an address in that shape. A missing key is `undefined`,
 * `undefined` renders blank, and the page showed somebody their own
 * account with their name and company missing — which reads as "we lost
 * your data".
 *
 * FLOW1 item 0's defect in its FOURTH habitat.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';

const SRC = path.join(__dirname, '..');
const read = (...p: string[]) => codeOnly(fs.readFileSync(path.join(SRC, ...p), 'utf8'));
const SETTINGS = read('app', 'account-settings', 'page.tsx');
const SAVE_MODULE = codeOnly(
  fs.readFileSync(path.join(SRC, 'lib', 'profileSave.ts'), 'utf8'));
const ONBOARDING = read('app', 'onboarding', 'page.tsx');

describe('Save Changes issues a request', () => {
  it('actually calls the profile endpoint', () => {
    /* The whole ticket. A button that reports an outcome it never
       requested is the defect; this is its absence.

       ASSERTED AGAINST THE MODULE, not against this page. The request
       moved to `lib/profileSave.ts` when onboarding and settings stopped
       having two of it — pinning `method: "PATCH"` HERE was pinning
       where the code lives rather than that the button issues a request,
       and it went red on a refactor that fixed a bug (§14.1.1). */
    expect(SETTINGS).toContain('saveProfile(formData)');
    expect(SAVE_MODULE).toContain("method: 'PATCH'");
    expect(SAVE_MODULE).toContain('/users/profile');
  });

  it('never announces success before the response', () => {
    /**
     * The pin that would have caught the original. `toast.success` must
     * not be reachable without a completed request — so it appears only
     * AFTER the `!response.ok` throw, never before the fetch.
     */
    const handler = SETTINGS.slice(SETTINGS.indexOf('const handleSave'));
    const body = handler.slice(0, handler.indexOf('const field'));
    const saveAt = body.indexOf('await saveProfile');
    const success = body.indexOf('toast.success');
    expect(saveAt).toBeGreaterThan(-1);
    expect(success).toBeGreaterThan(saveAt);
    // And the module throws rather than returning a verdict the caller
    // could ignore — which is what makes the ordering above sufficient.
    expect(SAVE_MODULE).toContain('throw new ProfileSaveError');
  });

  it('a failed save is visible, and says why', () => {
    // §4: the reason travels. "Something went wrong" sends her to
    // support with nothing; the server's detail sends her to the cause.
    expect(SAVE_MODULE).toContain('detail');
    expect(SETTINGS).toContain('toast.error');
    expect(SETTINGS).toContain('setError(message)');
  });

  it('re-reads the profile rather than trusting what it sent', () => {
    // The server normalises whitespace and upper-cases the state, so
    // what she sees after saving is what is STORED, not what she typed.
    expect(SETTINGS).toContain('onSaved()');
  });
});

describe('the form reads the names the server actually sends', () => {
  it('holds no key the profile payload does not carry', () => {
    const form = SETTINGS.slice(SETTINGS.indexOf('function ProfileTab'));
    for (const dead of ['first_name', 'last_name', 'street_address',
                        'zip_code', 'formData.city']) {
      expect(form).not.toContain(dead);
    }
  });

  it('uses full_name and company_name', () => {
    expect(SETTINGS).toContain('full_name');
    expect(SETTINGS).toContain('company_name');
  });

  it('keeps ONE name field rather than splitting it', () => {
    /**
     * Owner-ruled. The server has `full_name`; the form showed First and
     * Last. Splitting a name to satisfy a form is a data-model decision
     * made backwards — and Recording Requested By prints a name AS
     * WRITTEN, not as parsed.
     */
    expect(SETTINGS).not.toMatch(/>First Name</);
    expect(SETTINGS).not.toMatch(/>Last Name</);
  });

  it('has ONE address field, backed by the column that already existed', () => {
    // `user_profiles.business_address` was in the schema the whole time.
    // The three-field section was built against columns that never
    // existed anywhere — the form invented its own storage.
    expect(SETTINGS).toContain('business_address');
    expect(SETTINGS).not.toMatch(/>Street Address</);
    expect(SETTINGS).not.toMatch(/>ZIP Code</);
  });

  it('does not offer to edit the login identity', () => {
    // Showing email as editable and then not saving it would be the
    // same lie in a smaller place.
    expect(SETTINGS).toContain('readOnly');
  });
});

describe('skipping onboarding may leave, but may not lie', () => {
  it('retries before giving up', () => {
    // The first action anybody takes in the product, against a service
    // that cold-starts. One attempt is a coin flip.
    /* The retry moved to `lib/profileSave.ts` so that settings got it
       too — it had none, and DASH-FIX #1 then pointed a first-run
       action at that page. Pinned where it lives, and its BEHAVIOUR is
       pinned in `profileSave.test.ts` against the function itself. */
    expect(ONBOARDING).toContain('saveProfile(');
    expect(SAVE_MODULE).toMatch(/const WAITS = \[0, \d+\]/);
  });

  it('tells her when the skip was not recorded', () => {
    /**
     * THE TRAP LOOP. This used to swallow the failure entirely:
     * `onboarding_completed` stayed false, the dashboard gate re-fired,
     * and she was returned to onboarding forever with no indication
     * why.
     *
     * Worse than a lost field — a lost field is noticed once; a loop is
     * noticed every time and explains itself never.
     */
    expect(ONBOARDING).toContain('setSkipNotice(true)');
    expect(ONBOARDING).toContain('you may be asked');
  });

  it('still leaves, because skip means leave', () => {
    // Holding her hostage to our own 503 would be a second failure on
    // top of the first.
    const skip = ONBOARDING.slice(ONBOARDING.indexOf('const handleSkip'));
    expect(skip.slice(0, skip.indexOf('\n  const '))).toContain('router.push("/dashboard")');
  });

  it('the county step keeps its own honest failure', () => {
    // It always had one — it throws, catches, shows the error and does
    // NOT navigate. The audit's observation was the skip path.
    expect(ONBOARDING).toContain("Couldn't save your county");
  });
});
