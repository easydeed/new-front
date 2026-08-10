/**
 * PARTNER2 — one registry, one phone rule, and pins against the copies.
 *
 * ═══ WHAT WENT WRONG BEFORE, WHICH IS WHY THESE EXIST ═══
 *
 * The partner category list had been copied into five files and had
 * diverged twice:
 *
 *  - the partners screen offered four categories; the builder's
 *    AddPartnerModal offered six. A partner added in the builder arrived
 *    on the partners screen as a category the edit dropdown could not
 *    represent, and rendered as "Other".
 *  - QuickAddPartnerModal had a third list in which `realtor` was a
 *    CATEGORY, while everywhere else `realtor` is a role belonging to
 *    `real_estate`. One word, two positions in the model.
 *
 * PARTNER1 aligned the first two by hand and said so; hand-alignment has
 * a shelf life, and this is what replaces it. The pin below sweeps for
 * category keys appearing as literals in any surface — the copies are
 * the defect, so the pin is against copying rather than against any
 * particular wrong list.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';
import {
  ALL_ROLE_KEYS,
  CATEGORY_KEYS,
  PARTNER_CATEGORIES,
  categoryLabel,
  defaultRoleFor,
  roleBelongsTo,
  roleLabel,
  rolesFor,
} from '../lib/partnerRegistry';
import { formatPhone, maskUS, normalizePhone, phoneSearchKey } from '../lib/phone';

const SRC = path.join(__dirname, '..');
const read = (...p: string[]) => fs.readFileSync(path.join(SRC, ...p), 'utf8');

/** The corpus the BACKEND suite also reads — same referee, two languages. */
const CASES = JSON.parse(
  fs.readFileSync(
    path.join(SRC, '..', '..', 'backend', 'services', 'phone_cases.json'),
    'utf8',
  ),
).cases as Array<{ why: string; input: string; stored: string; display: string }>;

/** Every partner-facing surface. If a sixth appears it belongs here. */
const SURFACES = [
  ['app', 'partners', 'page.tsx'],
  ['components', 'modals', 'AddPartnerModal.tsx'],
  ['features', 'partners', 'QuickAddPartnerModal.tsx'],
];

describe('PARTNER2 — the registry is the single source', () => {
  it('carries the seven categories, each with at least one role', () => {
    expect(PARTNER_CATEGORIES.length).toBe(7);
    for (const c of PARTNER_CATEGORIES) {
      expect(c.roles.length).toBeGreaterThan(0);
      expect(c.label).toBeTruthy();
      expect(c.pluralLabel).toBeTruthy();
    }
  });

  it('notary is a category and notary_public is one of its roles', () => {
    expect(CATEGORY_KEYS).toContain('notary');
    expect(rolesFor('notary').map((r) => r.key)).toEqual(
      expect.arrayContaining(['notary_public', 'mobile_notary']),
    );
  });

  it('realtor is a ROLE of real_estate, never a category', () => {
    // The QuickAddPartnerModal divergence, pinned so it cannot return.
    expect(CATEGORY_KEYS).not.toContain('realtor');
    expect(rolesFor('real_estate').map((r) => r.key)).toContain('realtor');
  });

  it('category keys are unique and role keys are unique within a category', () => {
    expect(new Set(CATEGORY_KEYS).size).toBe(CATEGORY_KEYS.length);
    for (const c of PARTNER_CATEGORIES) {
      const keys = c.roles.map((r) => r.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('no surface hard-codes its own category list', () => {
    // The PROPERTY: a category key appearing as a string literal in a
    // surface means that surface is keeping its own copy. Deriving from
    // the registry produces no literals at all.
    //
    // `title_company` is exempt as a single-value DEFAULT — several
    // surfaces seed a new partner with it, which is a starting value and
    // not a list. A default is one decision; a list is a copy.
    const EXEMPT = new Set(['title_company', 'other']);
    const offenders: string[] = [];
    for (const surface of SURFACES) {
      const code = codeOnly(read(...surface));
      const found = CATEGORY_KEYS.filter(
        (k) => !EXEMPT.has(k) && (code.includes(`'${k}'`) || code.includes(`"${k}"`)),
      );
      if (found.length) offenders.push(`${surface.join('/')} → ${found.join(', ')}`);
    }
    expect(offenders).toEqual([]);
  });

  it('every surface imports the registry', () => {
    for (const surface of SURFACES) {
      expect(read(...surface)).toContain('partnerRegistry');
    }
  });
});

describe('PARTNER2 — the registry is UI metadata and nothing more', () => {
  it('carries no field that could decide anything', () => {
    // The same constraint the FORMS registry lives under (§1). A registry
    // that grew a default, an auto-apply, a fee or a characterization of
    // what a partner may DO would be making a choice on somebody's
    // behalf. Comments stripped first — the doctrine note ABOUT
    // auto-apply must not trip the scan for auto-apply.
    const src = codeOnly(read('lib', 'partnerRegistry.ts'));
    expect(src).not.toMatch(/auto[_-]?apply/i);
    expect(src).not.toMatch(/\blicens/i);
    expect(src).not.toMatch(/\bauthorit/i);
    expect(src).not.toMatch(/\bpermitted\b/i);
    expect(src).not.toMatch(/\bfee\b/i);

    const allowed = new Set(['key', 'label', 'pluralLabel', 'roles']);
    for (const c of PARTNER_CATEGORIES) {
      for (const field of Object.keys(c)) expect(allowed.has(field)).toBe(true);
      for (const r of c.roles) {
        expect(Object.keys(r).sort()).toEqual(['key', 'label']);
      }
    }
  });
});

describe('PARTNER2 — roles derive from category', () => {
  it('each category defaults to its first role', () => {
    for (const c of PARTNER_CATEGORIES) {
      expect(defaultRoleFor(c.key)).toBe(c.roles[0].key);
    }
  });

  it('roleBelongsTo answers honestly across categories', () => {
    expect(roleBelongsTo('notary', 'notary_public')).toBe(true);
    expect(roleBelongsTo('notary', 'loan_officer')).toBe(false);
    expect(roleBelongsTo(undefined, 'anything')).toBe(false);
  });

  it('an unknown key is displayed, not silently relabelled', () => {
    // A partner filed under a category we later remove should read as
    // what the officer chose, not as though she chose nothing.
    expect(categoryLabel('escrow_company')).toBe('Escrow Company');
    expect(categoryLabel('legacy_thing')).toBe('Legacy Thing');
    expect(roleLabel('legacy_role')).toBe('Legacy Role');
  });

  it('a stored role stays readable after a re-categorisation', () => {
    // ALL_ROLE_KEYS is the validation set, not one category's list —
    // moving a partner between categories must not make their recorded
    // role unreadable.
    expect(ALL_ROLE_KEYS).toContain('loan_officer');
    expect(ALL_ROLE_KEYS).toContain('notary_public');
  });
});

describe('PARTNER2 — the phone rule, against the shared corpus', () => {
  it('normalizes every case as the corpus says', () => {
    for (const c of CASES) expect(normalizePhone(c.input)).toBe(c.stored);
  });

  it('displays every case as the corpus says', () => {
    for (const c of CASES) expect(formatPhone(c.stored)).toBe(c.display);
  });

  it('normalizing is idempotent', () => {
    for (const c of CASES) {
      const once = normalizePhone(c.input);
      expect(normalizePhone(once)).toBe(once);
    }
  });

  it('unparseable input survives verbatim', () => {
    for (const raw of ['ask for Dana', '+44 20 7946 0958', '(626) 555-0134 x220']) {
      expect(normalizePhone(raw)).toBe(raw.trim());
    }
  });

  it('search finds the row however either side was typed', () => {
    const stored = normalizePhone('626-555-0134');
    expect(phoneSearchKey(stored)).toContain(phoneSearchKey('(626) 555'));
  });
});

describe('PARTNER2 — masking as she types', () => {
  it('formats progressively without jumping ahead of her', () => {
    expect(maskUS('6')).toBe('6');
    expect(maskUS('62')).toBe('62');
    // The paren appears only once the area code is complete — wrapping a
    // single digit as "(6" pushes the cursor past a character she did
    // not type.
    expect(maskUS('626')).toBe('(626) ');
    expect(maskUS('6265')).toBe('(626) 5');
    expect(maskUS('626555')).toBe('(626) 555');
    expect(maskUS('6265550134')).toBe('(626) 555-0134');
  });

  it('is stable under its own output', () => {
    // Called on every keystroke against its own previous result. A mask
    // that is not idempotent fights the cursor.
    for (const input of ['626', '6265', '626555', '6265550134', '16265550134']) {
      const once = maskUS(input);
      expect(maskUS(once)).toBe(once);
    }
  });

  it('keeps its hands off an international number', () => {
    expect(maskUS('+44 20 7946 0958')).toBe('+44 20 7946 0958');
  });

  it('stops formatting rather than mangling something too long', () => {
    expect(maskUS('12345678901234')).toBe('12345678901234');
  });
});
