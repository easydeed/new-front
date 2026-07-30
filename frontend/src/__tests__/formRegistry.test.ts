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
import { FORM_REGISTRY, formConfig, formFamily, hasVestingInput } from '../lib/formRegistry';
import { DEED_LABELS, deedTypeLabel } from '../lib/deedTypes';
import { isAffidavitType } from '../lib/deedValidation';

function readSource(...segments: string[]): string {
  return fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8');
}

const KNOWN_SECTIONS = new Set(['property', 'grantor', 'grantee', 'vesting', 'transferTax', 'recording', 'affidavit']);

describe('FORMS registry — completeness and coherence', () => {
  const entries = Object.values(FORM_REGISTRY);

  it('carries the twelve shipped types', () => {
    expect(entries.length).toBe(12);
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
  });

  it('every entry is internally coherent', () => {
    for (const f of entries) {
      expect(FORM_REGISTRY[f.slug].slug).toBe(f.slug);
      expect(f.label.length).toBeGreaterThan(3);
      expect(f.title.length).toBeGreaterThan(3);
      for (const section of f.sections) {
        expect(KNOWN_SECTIONS.has(section)).toBe(true);
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
    const src = readSource('lib', 'formRegistry.ts')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
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
    expect(readSource('app', 'deed-builder', 'page.tsx')).toContain('FORM_REGISTRY');
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
