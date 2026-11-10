import { describe, expect, it } from '@jest/globals';
import { canGenerate, generationHold, HELD_INSTRUMENTS } from '../lib/instrumentAvailability';
import { API_DEED_TYPES } from '../lib/apiDocs';
import { FORM_REGISTRY, INSTRUMENT_COUNT, formConfig } from '../lib/formRegistry';
import { groupedForms, searchForms } from '../lib/formSearch';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import ignore from 'ignore';

describe('owner-approved tax-deed hold', () => {
  it.each(['tax-deed', 'tax_deed', ' TAX_DEED ', 'tax-deed-ca', 'tax_deed_ca'])('holds %s from the shared policy', (slug) => {
    expect(canGenerate(slug)).toBe(false);
    expect(generationHold(slug)?.reason).toBe(HELD_INSTRUMENTS[0].reason);
  });

  it('keeps historical labels but does not offer or count held generation', () => {
    expect(formConfig('tax-deed')?.label).toBe('Tax Deed');
    expect(API_DEED_TYPES).toHaveLength(8);
    expect(API_DEED_TYPES.some((t) => t.slug === 'tax_deed')).toBe(false);
    expect(INSTRUMENT_COUNT).toBe(Object.values(FORM_REGISTRY).filter((f) => canGenerate(f.slug)).length);
    expect(searchForms('tax deed').some((f) => f.slug === 'tax-deed')).toBe(false);
    expect(groupedForms().flatMap((g) => g.forms).some((f) => f.slug === 'tax-deed')).toBe(false);
  });

  it('both language readers use one corpus; builder and docs consume the shared reason', () => {
    const root = path.resolve(__dirname, '../..');
    const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');
    expect(read('src/lib/instrumentAvailability.ts')).toContain('backend/services/instrument_availability.json');
    expect(read('../backend/services/instrument_availability.py')).toContain('with_suffix(".json")');
    expect(read('src/app/deed-builder/page.tsx')).toContain('hold.reason');
    expect(read('src/app/deed-builder/[type]/page.tsx')).toContain('generationHold(type)');
    expect(read('src/app/developers/page.tsx')).toContain('hold.reason');
    expect(read('src/app/confirm/[token]/page.tsx')).toContain('generationHold(pack.deed_type)');
  });

  it('packages exactly the shared policy from the tracked backend for Vercel', () => {
    const root = path.resolve(__dirname, '../../..');
    const rules = fs.readFileSync(path.join(root, '.vercelignore'), 'utf8');
    const excluded = ignore().add(rules);
    const backendFiles = execFileSync('git', ['ls-files', '-z', '--', 'backend/'], { cwd: root })
      .toString().split('\0').filter(Boolean);
    expect(backendFiles.length).toBeGreaterThan(0);
    expect(backendFiles.filter((file) => !excluded.ignores(file)))
      .toEqual(['backend/services/instrument_availability.json']);
    expect(JSON.parse(fs.readFileSync(path.join(root, 'backend/services/instrument_availability.json'), 'utf8')))
      .toHaveProperty('held.tax-deed');
  });

  it.each([
    'backend/.env', 'backend/services/.env', 'backend/services/private/nested.json',
    'backend/services/instrument_availability.py', 'backend/routers/api_deeds.py',
    '.env', 'venv/private.json', '__pycache__/private.pyc', 'scripts/private.py',
    'templates/private.html', 'private.log',
  ])('keeps excluded deployment material out: %s', (file) => {
    const rules = fs.readFileSync(path.resolve(__dirname, '../../../.vercelignore'), 'utf8');
    expect(ignore().add(rules).ignores(file)).toBe(true);
  });

  it('detects removal of the policy packaging exception', () => {
    const rules = fs.readFileSync(path.resolve(__dirname, '../../../.vercelignore'), 'utf8');
    const withoutException = rules.replace(/^!backend\/services\/instrument_availability\.json\r?\n/m, '');
    expect(withoutException).not.toBe(rules);
    expect(ignore().add(withoutException).ignores('backend/services/instrument_availability.json')).toBe(true);
  });
});
