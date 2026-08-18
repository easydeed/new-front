/**
 * DASH-FIX #1 — the recording county has a home she can reach.
 *
 * ═══ THE FINDING ═══
 *
 * The day-one checklist's "Set county" button routed to
 * `/account-settings`, which had no county field. The only open setup
 * step could not be completed from its own call to action, and the only
 * surface in the product that wrote `default_county` was the one-time
 * onboarding flow.
 *
 * ═══ AND IT WAS THE SECOND HOME, HALF-BUILT ═══
 *
 * Not a missing feature so much as an unfinished one. `ProfilePatch` has
 * accepted `default_county` since SETTINGS1, the `user_profiles` upsert
 * writes it, and this form has always PATCHed its whole `formData` to
 * that endpoint. The control was the only piece that was never added —
 * the same shape as SETTINGS1's own finding, where the patch surface had
 * to be built before the button could be wired to anything.
 *
 * Routing to `/onboarding` was refused: it writes `onboarding_completed`
 * and navigates to the builder, so re-entering it to change one field
 * re-runs a completion she did not ask for.
 */
import { describe, expect, it } from '@jest/globals';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { codeOnly } from '../test-support/sourceText';
import { CA_COUNTY_NAMES, COUNTIES } from '../lib/jurisdictions';

const SRC = join(__dirname, '..');
const SETTINGS = join(SRC, 'app', 'account-settings', 'page.tsx');
const ONBOARDING = join(SRC, 'app', 'onboarding', 'page.tsx');
const read = (p: string) => codeOnly(readFileSync(p, 'utf8'));

describe('the county picker', () => {
  it('offers every California county, because she may record in any of them', () => {
    expect(CA_COUNTY_NAMES).toHaveLength(58);
    expect(CA_COUNTY_NAMES).toContain('Los Angeles');
    expect(CA_COUNTY_NAMES).toContain('Yuba');
  });

  it('is not the same set as the counties we hold recorder facts for', () => {
    /**
     * THE PIN THIS FILE EXISTS FOR.
     *
     * The two sets are different and the difference is load-bearing.
     * Driving the picker off `COUNTIES` shrinks it to the handful we have
     * researched; filling `COUNTIES` out to 58 would imply we hold PCOR
     * routing and recorder preferences we do not — a place treated as a
     * string and then reasoned about as though it were knowledge, which
     * is what T-2 was built after.
     *
     * If this assertion ever fails because the sets converged, the
     * question to answer is which of those two things happened.
     */
    expect(Object.keys(COUNTIES).length).toBeLessThan(CA_COUNTY_NAMES.length);
    for (const key of Object.keys(COUNTIES)) {
      expect(CA_COUNTY_NAMES.map((n) => n.toLowerCase())).toContain(key);
    }
  });

  it('is declared once, and no picker carries its own copy', () => {
    /** §14.3 — one DECLARATION, not one screen. It was a local const in
     *  onboarding while onboarding was the only picker. */
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          if (entry !== '__tests__' && entry !== 'node_modules') walk(full);
        } else if (/\.tsx?$/.test(entry)) files.push(full);
      }
    };
    walk(SRC);
    const carriers = files.filter((f) => {
      const src = codeOnly(readFileSync(f, 'utf8'));
      // A county list is recognisable by holding several county names
      // that are not ordinary English — spelling-independent enough to
      // survive a rename of the constant (§14.1).
      return ['Calaveras', 'Tuolumne', 'Siskiyou'].every((n) => src.includes(`'${n}'`)
        || src.includes(`"${n}"`));
    });
    expect(carriers.map((f) => f.replace(SRC, ''))).toEqual(['/lib/jurisdictions.ts']);
  });
});

describe('account settings', () => {
  it('has a recording county control', () => {
    const src = read(SETTINGS);
    expect(src).toContain('default_county');
    expect(src).toContain('CA_COUNTY_NAMES');
    expect(src).toContain('Recording county');
  });

  it('offers "Not set", because not set is a real state', () => {
    /** A select with no blank option silently asserts its first entry —
     *  which would make every officer who never touched this field read
     *  as recording in Alameda. */
    expect(read(SETTINGS)).toContain('<option value="">Not set</option>');
  });

  it('hydrates the county from the profile like every other field', () => {
    /**
     * Caught by tsc, not by a person, and it is the defect this effect
     * exists for: a field added to the form and not to the hydration
     * reads empty once the profile lands, so a county she set displays
     * as "Not set" — and the next save writes that blank back over it.
     */
    const src = read(SETTINGS);
    const start = src.indexOf('if (!userProfile) return');
    // Sliced to the effect's own closing line, NOT to a character count:
    // `codeOnly` blanks comments to spaces to preserve positions, so a
    // fixed window shrinks whenever somebody explains something. The
    // first version of this pin used 600 characters and failed on the
    // comment justifying the very line it was checking for.
    const effect = src.slice(start, src.indexOf('}, [userProfile])', start));
    expect(effect).toContain('default_county: userProfile.default_county');
  });

  it('sends the whole form to the endpoint that already accepted county', () => {
    /* Asserted as "the whole form reaches the save", not as the literal
       `JSON.stringify(formData)` — that string moved into
       `lib/profileSave.ts` when the two save paths converged, and a pin
       quoting it went red on a change that fixed a bug (§14.1.1). */
    expect(read(SETTINGS)).toContain('saveProfile(formData)');
    expect(codeOnly(readFileSync(join(SRC, 'lib', 'profileSave.ts'), 'utf8')))
      .toContain('JSON.stringify(patch)');
  });
});

describe('the checklist button', () => {
  it('points at the page that now holds the field', () => {
    /* Asserted against the STEP, not the page. DASH-SOFTEN moved each
       destination onto its step definition so the page holds no second
       opinion about where "Set county" goes — and this pin, which
       quoted the route string as it appeared in `page.tsx`, went red on
       that move while the property it guards was untouched (§14.1.1). */
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { setupSteps } = require('../features/dashboard/SetupChecklist');
    const county = setupSteps({ deedCount: 0 })
      .find((st: { id: string }) => st.id === 'county');
    expect(county.href).toBe('/account-settings');
    // And NOT the completion flow: re-entering onboarding to change one
    // field re-runs `onboarding_completed` and a navigation she did not
    // ask for.
    expect(county.href).not.toContain('/onboarding');
  });

  it('leaves onboarding importing the shared list rather than its own', () => {
    expect(read(ONBOARDING)).toContain('CA_COUNTY_NAMES');
  });
});
