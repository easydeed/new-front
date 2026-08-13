/**
 * REQUIRED1 — the TypeScript half, read against the same corpus.
 *
 * `backend/services/required_fields.json` is the authority. This suite
 * loads the JSON directly and asserts the reader agrees with it, exactly
 * as `vestingSplit.test.ts` does for `vesting_cases.json` — the point of
 * a corpus is lost if each side's tests only ask its own implementation.
 *
 * The Python suite (`test_required1.py`) asks the same questions of the
 * same file, so a change to one language's answers fails in the other.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import { join } from 'path';

import { isPresent, missingRequired, requirements, typeFlags } from '@/lib/requiredFields';

const CORPUS = JSON.parse(fs.readFileSync(
  join(__dirname, '..', '..', '..', 'backend', 'services', 'required_fields.json'),
  'utf8',
));

describe('the corpus is the authority', () => {
  it('is the file the reader imports, not a copy', () => {
    const src = fs.readFileSync(
      join(process.cwd(), 'src', 'lib', 'requiredFields.ts'), 'utf8');
    expect(src).toContain('backend/services/required_fields.json');
  });

  it('answers with exactly what the corpus declares, family by family', () => {
    for (const [family, def] of Object.entries<any>(CORPUS.families)) {
      // A type with no flags gets the family's list verbatim.
      const ids = requirements(family, '__no_such_type__').map((r) => r.id);
      expect(ids).toEqual(def.required.map((r: any) => r.id));
    }
  });
});

describe('what a conveyance must carry', () => {
  it('states its vesting and declares its transfer tax', () => {
    /**
     * THE RULING. `POST /deeds` accepted an instrument without either;
     * this gate and the partner API both required them. The stricter set
     * won, and it is now one list.
     */
    const ids = requirements('deed', 'grant-deed').map((r) => r.id);
    expect(ids).toContain('vesting_stated');
    expect(ids).toContain('dtt_decided');
  });

  it('does not ask a fixed-vesting form for a vesting', () => {
    /**
     * Flag-3 — the form's title IS the decision, and its template never
     * reads a stored value. Requiring one would demand a field the
     * instrument has nowhere to put.
     */
    for (const deedType of ['grant-deed-jt', 'grant-deed-cp-ros']) {
      const ids = requirements('deed', deedType).map((r) => r.id);
      expect(ids).not.toContain('vesting_stated');
      expect(ids).toContain('dtt_decided');
      expect(typeFlags(deedType).fixed_vesting).toBe(true);
    }
  });
});

describe('a decision already made is not asked again', () => {
  it('counts a declared exemption as an answer', () => {
    /**
     * §1 from the other side: never INFERRING the choice includes never
     * FORGETTING it. A transfer tax declared exempt, or declared on full
     * value, is a decision she made — treating it as absent because the
     * field is falsy would lose an answer and re-ask for it.
     */
    expect(isPresent('dtt', { isExempt: true })).toBe(true);
    expect(isPresent('dtt', { basis: 'full_value' })).toBe(true);
    expect(isPresent('dtt', {})).toBe(false);
    expect(isPresent('dtt', null)).toBe(false);
  });

  it('reads a declaration party out of `parties`', () => {
    expect(isPresent('parties', { declarant: 'JANE ROE' })).toBe(true);
    expect(isPresent('parties', { declarant: '   ' })).toBe(false);
  });
});

describe('what is still missing', () => {
  it('names every unanswered requirement, and nothing else', () => {
    const missing = missingRequired('deed', 'grant-deed', {
      grantor: 'JANE ROE',
      grantee: 'JOHN DOE',
      legal_description: 'LOT 3 BLOCK 2',
      vesting: '',
      dtt: {},
    }).map((r) => r.id);
    expect(missing).toEqual(['vesting_stated', 'dtt_decided']);
  });

  it('separates substance from decision', () => {
    /**
     * The dashboard's hero number needs both populations and the
     * distinction is real, not cosmetic: a blank grantor is a field
     * nobody filled in, an undeclared transfer tax is a legal choice
     * nobody has made. They are absent in different ways.
     */
    const missing = missingRequired('deed', 'grant-deed', {});
    expect(missing.filter((r) => r.population === 'substance').map((r) => r.id))
      .toEqual(['grantor_present', 'grantee_present', 'legal_description_present']);
    expect(missing.filter((r) => r.population === 'decision').map((r) => r.id))
      .toEqual(['vesting_stated', 'dtt_decided']);
  });
});
