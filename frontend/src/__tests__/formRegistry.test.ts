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
import { FORM_REGISTRY, formConfig, formFamily } from '../lib/formRegistry';
import { DEED_LABELS, deedTypeLabel } from '../lib/deedTypes';
import { isAffidavitType } from '../lib/deedValidation';

function readSource(...segments: string[]): string {
  return fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8');
}

const KNOWN_SECTIONS = new Set(['property', 'grantor', 'grantee', 'vesting', 'transferTax', 'recording', 'affidavit']);

describe('FORMS registry — completeness and coherence', () => {
  const entries = Object.values(FORM_REGISTRY);

  it('carries the six shipped types', () => {
    expect(entries.length).toBe(6);
    expect(formConfig('affidavit-death-jt')?.family).toBe('affidavit');
  });

  it('every entry is internally coherent', () => {
    for (const f of entries) {
      expect(FORM_REGISTRY[f.slug].slug).toBe(f.slug);
      expect(f.label.length).toBeGreaterThan(3);
      expect(f.title.length).toBeGreaterThan(3);
      for (const section of f.sections) {
        expect(KNOWN_SECTIONS.has(section)).toBe(true);
      }
      // Doctrine coupling: sworn instruments carry a jurat, deed family
      // an acknowledgment; only deed family declares DTT.
      if (f.family === 'affidavit') {
        expect(f.notarial).toBe('jurat');
        expect(f.hasDtt).toBe(false);
        expect(f.sections).toContain('affidavit');
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

  it('the selection page and preview read the registry', () => {
    expect(readSource('app', 'deed-builder', 'page.tsx')).toContain('FORM_REGISTRY');
    const preview = readSource('components', 'builder', 'PreviewPanel.tsx');
    expect(preview).toContain("formConfig(state.deedType)?.title");
    expect(preview).toContain("formFamily(state.deedType)");
  });
});

describe('FORMS flag-4 ruling — the companion notice is passive guidance', () => {
  it('the affidavit carries the BOE-502-D notice with the state link', () => {
    const notice = formConfig('affidavit-death-jt')?.companionNotice;
    expect(notice).toBeDefined();
    expect(notice!.text).toContain('BOE-502-D');
    expect(notice!.href).toContain('boe.ca.gov');
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
