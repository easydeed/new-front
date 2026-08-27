/**
 * FORMS registry — one entry per instrument type, pinned.
 *
 * The registry is the single source of type facts (labels, titles,
 * sections, family, notarial certificate, DTT, companion guidance). The
 * consumers derive from it, so adding a Tier-A sibling is one entry +
 * one template — and a config can never smuggle in a legal choice (there
 * is deliberately no field for one).
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { FORM_REGISTRY, INSTRUMENT_COUNT, SITUATION_GROUP_ORDER, formConfig, formFamily, hasVestingInput } from '../lib/formRegistry';
import { DEED_LABELS, deedTypeLabel } from '../lib/deedTypes';
import { isAffidavitType } from '../lib/deedValidation';
import { codeOnly } from '../test-support/sourceText';

function readSource(...segments: string[]): string {
  return fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8');
}

const KNOWN_SECTIONS = new Set(['property', 'grantor', 'grantee', 'vesting', 'transferTax', 'recording', 'affidavit']);

describe('FORMS registry — completeness and coherence', () => {
  const entries = Object.values(FORM_REGISTRY);

  it('carries the twenty-one shipped types', () => {
    expect(entries.length).toBe(21);
    // Wave 2 #8 — substitution of trustee (acknowledged; APN but no
    // legal description — the DOT reference identifies the property):
    expect(formConfig('trustee-substitution')?.family).toBe('declaration');
    expect(formConfig('trustee-substitution')?.sections).toContain('property');
    // Wave 2 #7 — the statutory POA (acknowledged, property-less,
    // single-party; only two typed facts by design):
    expect(formConfig('poa-statutory')?.family).toBe('declaration');
    expect(formConfig('poa-statutory')?.sections).not.toContain('property');
    expect((formConfig('poa-statutory')?.affidavitFields ?? []).length).toBe(2);
    // Wave 2 #6 — entity grantors (two references, one owner-named form):
    expect(formConfig('grant-deed-corp')?.family).toBe('deed');
    expect(formConfig('grant-deed-partnership')?.family).toBe('deed');
    // Wave 2 #4/#5 — homestead pair (acknowledgment verified from the
    // references; spouses = two declarants in parties JSONB):
    expect(formConfig('homestead-declaration-spouses')?.family).toBe('declaration');
    expect(formConfig('homestead-abandonment')?.family).toBe('declaration');
    // Wave 2 #2/#3 — domestic-partner affidavit variants (jurat verified
    // from the references; §297 recital is Flag-3 furniture):
    expect(formConfig('affidavit-death-jt-dp')?.family).toBe('affidavit');
    expect(formConfig('affidavit-death-cp-dp')?.family).toBe('affidavit');
    expect(formConfig('affidavit-death-jt')?.family).toBe('affidavit');
    // Wave 1 siblings (owner-ranked #1 and #2):
    expect(formConfig('affidavit-death-cp-spouse')?.family).toBe('affidavit');
    expect(formConfig('affidavit-death-trustee')?.family).toBe('affidavit');
    // Wave 1 deed variants (owner-ranked #3 and #4):
    expect(formConfig('grant-deed-jt')?.family).toBe('deed');
    expect(formConfig('grant-deed-cp-ros')?.family).toBe('deed');
    // Wave 1 #5/#6 — the third family (correction note: ACKNOWLEDGED,
    // single-party; #6 additionally property-less):
    expect(formConfig('homestead-declaration')?.family).toBe('declaration');
    expect(formConfig('trust-certification')?.family).toBe('declaration');
    expect(formConfig('trust-certification')?.sections).not.toContain('property');
    // Wave 1 #7 — the statutory revocation (single-party, parcel-tied):
    expect(formConfig('tod-revocation')?.family).toBe('declaration');
    expect(formConfig('tod-revocation')?.sections).toContain('property');
  });

  it('every entry is internally coherent', () => {
    for (const f of entries) {
      expect(FORM_REGISTRY[f.slug].slug).toBe(f.slug);
      expect(f.label.length).toBeGreaterThan(3);
      expect(f.title.length).toBeGreaterThan(3);
      for (const section of f.sections) {
        expect(KNOWN_SECTIONS.has(section)).toBe(true);
      }
      // CAT1: every entry carries picker metadata — a valid situation
      // group and non-empty lowercase keywords (UI metadata only).
      expect(SITUATION_GROUP_ORDER).toContain(f.situationGroup);
      expect(f.keywords.length).toBeGreaterThan(0);
      for (const k of f.keywords) {
        expect(k).toBe(k.toLowerCase());
        expect(k.trim().length).toBeGreaterThan(0);
      }
      // Doctrine coupling, all three families enforced structurally:
      //   affidavit   → jurat, no DTT (sworn statement)
      //   declaration → acknowledgment, no DTT (single-party, CCP §704.930)
      //   deed        → acknowledgment, DTT (conveyance)
      if (f.family === 'declaration') {
        expect(f.notarial).toBe('acknowledgment');
        expect(f.hasDtt).toBe(false);
        expect(f.sections).toContain('affidavit'); // the shared typed-facts section
        expect(f.sections).not.toContain('vesting');
        expect((f.affidavitFields ?? []).length).toBeGreaterThan(0);
        for (const spec of f.affidavitFields ?? []) {
          expect(Object.keys(spec)).not.toContain('value');
          expect(Object.keys(spec)).not.toContain('default');
        }
      } else if (f.family === 'affidavit') {
        expect(f.notarial).toBe('jurat');
        expect(f.hasDtt).toBe(false);
        expect(f.sections).toContain('affidavit');
        // The shared AffidavitSection renders from these specs — every
        // sworn form must declare its officer-typed facts, always
        // including the common four (who swears, who died, and the
        // recorded instrument's date + number).
        const keys = (f.affidavitFields ?? []).map((s) => s.key);
        for (const common of ['affiantName', 'decedentName', 'recordingDate', 'instrumentNo']) {
          expect(keys).toContain(common);
        }
        // Field specs describe INPUTS (label/placeholder/grouping) — a
        // spec with a value would be a smuggled prefill.
        for (const spec of f.affidavitFields ?? []) {
          expect(Object.keys(spec)).not.toContain('value');
          expect(Object.keys(spec)).not.toContain('default');
        }
      } else {
        expect(f.notarial).toBe('acknowledgment');
        expect(f.hasDtt).toBe(true);
        expect(f.sections).toContain('transferTax');
      }
    }
  });

  it('a registry entry cannot smuggle a legal choice (no auto-apply field)', () => {
    // Strip comments first — the doctrine note ABOUT auto-apply must not
    // trip the scan for auto-apply code (the stripComments lesson).
    const src = codeOnly(readSource('lib', 'formRegistry.ts'));
    expect(src).not.toMatch(/auto[_-]?apply/i);
    for (const f of Object.values(FORM_REGISTRY)) {
      expect(Object.keys(f)).not.toContain('autoApply');
      expect(Object.keys(f)).not.toContain('defaults');
    }
  });
});

describe('FORMS registry — the consumers derive from it', () => {
  it('labels: DEED_LABELS is the registry projection', () => {
    for (const f of Object.values(FORM_REGISTRY)) {
      expect(DEED_LABELS[f.slug]).toBe(f.label);
      expect(deedTypeLabel(f.slug)).toBe(f.label);
    }
  });

  it('family checks route through the registry', () => {
    expect(isAffidavitType('affidavit-death-jt')).toBe(true);
    expect(isAffidavitType('grant-deed')).toBe(false);
    expect(formFamily('unknown-type')).toBe('deed'); // safe default
  });

  it('fixed-vesting variants drop the vesting section; the registry carries no phrase', () => {
    for (const slug of ['grant-deed-jt', 'grant-deed-cp-ros']) {
      expect(hasVestingInput(slug)).toBe(false);
      expect(formConfig(slug)?.hasDtt).toBe(true); // still conveyances: full DTT gate
      // The vesting phrase is TEMPLATE furniture (deedFurniture +
      // chassis-conformance pins) — a registry entry must not carry it,
      // or config would be deciding a legal question.
      expect(JSON.stringify(formConfig(slug))).not.toMatch(/JOINT TENANTS|SURVIVORSHIP the real/);
    }
    expect(hasVestingInput('grant-deed')).toBe(true);
    expect(hasVestingInput('unknown-type')).toBe(true); // safe default
  });

  it('the selection page and preview read the registry', () => {
    // CAT1: the picker reads the registry through the formSearch layer.
    const picker = readSource('app', 'deed-builder', 'page.tsx');
    expect(picker).toContain('formSearch');
    expect(readSource('lib', 'formSearch.ts')).toContain('FORM_REGISTRY');
    const preview = readSource('components', 'builder', 'PreviewPanel.tsx');
    expect(preview).toContain("formConfig(state.deedType)?.title");
    expect(preview).toContain("formFamily(state.deedType)");
  });
});

describe('FORMS registry ↔ backend family map (parties migration)', () => {
  it('every registry entry carries the same family on both sides of the wire', () => {
    // The backend's per-family validation (single-party instruments store
    // parties in JSONB; two-party keep grantor/grantee) reads
    // services/form_families.py — a type whose family differed between
    // the two maps would validate one way and render another.
    const py = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'backend', 'services', 'form_families.py'),
      'utf8'
    );
    for (const f of Object.values(FORM_REGISTRY)) {
      expect(py).toContain(`"${f.slug}": "${f.family}"`);
    }
  });
});

describe('FORMS flag-4 ruling — the companion notice is passive guidance', () => {
  it('every death affidavit carries the BOE-502-D notice with the state link', () => {
    for (const slug of ['affidavit-death-jt', 'affidavit-death-cp-spouse', 'affidavit-death-trustee']) {
      const notice = formConfig(slug)?.companionNotice;
      expect(notice).toBeDefined();
      expect(notice!.text).toContain('BOE-502-D');
      expect(notice!.href).toContain('boe.ca.gov');
    }
  });

  it('the success page renders it as guidance — never a block', () => {
    const src = readSource('app', 'deed-builder', '[type]', 'success', 'success-content.tsx');
    expect(src).toContain('companionNotice');
    expect(src).toContain('rel="noopener noreferrer"');
    // Guidance only: the notice must not gate any action.
    expect(src).not.toMatch(/companionNotice[^}]*disabled/);
  });

  it('deed types carry no companion notice', () => {
    expect(formConfig('grant-deed')?.companionNotice).toBeUndefined();
  });
});

/**
 * ═══ THE MARKETING NUMBER IS THE REGISTRY'S NUMBER ═══
 *
 * HOME2 corrected the homepage from "5 CA instruments" to 21 and the
 * report flagged the result as the least-sure item: 21 was right on the
 * day and pinned to nothing, so the day a 22nd instrument shipped the
 * copy would quietly be wrong again — the same defect, one number later.
 * The owner ruled it a real gap and placed the fix here, with the
 * registry, "so a 22nd instrument either updates the copy or fails".
 *
 * THE MECHANISM IS `INSTRUMENT_COUNT`, not this file. The surfaces derive
 * the number, so nobody has to remember (§14.7 — a note is a thing to
 * remember, and remembering is the faculty that just failed). What is
 * pinned below is that the derivation is still what is happening: the
 * sweep goes red the moment a literal count reappears next to the word
 * "instrument", which is exactly what re-hardcoding looks like.
 *
 * IT FAILS CLOSED. A number near that word must equal the registry's
 * count; anything else — a stale 21, a rounded 20, a hopeful 25 — fails.
 */
describe('the instrument count nobody has to remember', () => {
  it('is derived from the registry rather than asserted beside it', () => {
    expect(INSTRUMENT_COUNT).toBe(Object.keys(FORM_REGISTRY).length);
  });

  const SURFACES = ['app', 'components'];
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (fs.statSync(full).isDirectory()) {
        if (entry !== '__tests__' && entry !== 'node_modules') walk(full);
      } else if (/\.tsx?$/.test(entry)) files.push(full);
    }
  };
  for (const s of SURFACES) walk(path.join(__dirname, '..', s));

  it('the homepage prints the derived value, not a number of its own', () => {
    expect(readSource('app', 'page.tsx')).toContain('INSTRUMENT_COUNT');
  });

  it('pricing imports the registry count instead of mirroring it', () => {
    const pricing = codeOnly(readSource('lib', 'pricing.ts'));
    expect(pricing).toContain("import { INSTRUMENT_COUNT } from './formRegistry'");
    expect(pricing).not.toMatch(/INSTRUMENT_COUNT\s*=\s*\d+/);
  });

  it('no surface states a count of its own', () => {
    // A number RENDERED as text — a quoted numeric string or a bare JSX
    // text node. Class names ("mb-2") and array indexes are not counts
    // and do not match, because the whole quoted value must be digits.
    const RENDERED = /"(\d{1,3})"|'(\d{1,3})'|>\s*(\d{1,3})\s*</g;
    const offenders: string[] = [];
    for (const file of files) {
      const src = codeOnly(fs.readFileSync(file, 'utf8'));
      for (const hit of src.matchAll(/instruments?\b/gi)) {
        const at = hit.index ?? 0;
        const window = src.slice(Math.max(0, at - 180), at + 180);
        for (const m of window.matchAll(RENDERED)) {
          const value = Number(m[1] ?? m[2] ?? m[3]);
          if (value !== INSTRUMENT_COUNT) continue;
          offenders.push(`${file.replace(path.join(__dirname, '..'), '')}: ${m[0]}`);
        }
      }
    }
    // Written as "a literal equal to today's count is a hard-coded
    // count" — the stale case (registry 22, copy 21) is caught by the
    // same sweep from the other side, because 21 near "instruments" is
    // then a number that is not the registry's and the copy is wrong
    // whichever number it is. Both readings point at the same line.
    expect(offenders).toEqual([]);
  });

  it('catches a stale number as well as a re-hardcoded one', () => {
    /**
     * THE PIN'S OWN MUTATION PROBE, kept in the suite rather than run
     * once by hand — the two failure modes §14.1.1 asks for. A pin that
     * only fires on today's value would go quiet on the exact day the
     * count changes, which is the day it is needed.
     */
    const near = (n: number) => `<div>${n}</div><div>CA instruments</div>`;
    const stale = (src: string) => {
      const out: number[] = [];
      for (const hit of src.matchAll(/instruments?\b/gi)) {
        const at = hit.index ?? 0;
        const window = src.slice(Math.max(0, at - 180), at + 180);
        for (const m of window.matchAll(/>\s*(\d{1,3})\s*</g)) out.push(Number(m[1]));
      }
      return out;
    };
    expect(stale(near(INSTRUMENT_COUNT))).toContain(INSTRUMENT_COUNT);
    expect(stale(near(INSTRUMENT_COUNT + 1))).toContain(INSTRUMENT_COUNT + 1);
    expect(stale('<div>CA instruments</div>')).toEqual([]);
  });
});
