import { describe, expect, it } from '@jest/globals';
import { canGenerate, generationHold, HELD_INSTRUMENTS } from '../lib/instrumentAvailability';
import { API_DEED_TYPES } from '../lib/apiDocs';
import { FORM_REGISTRY, INSTRUMENT_COUNT, formConfig } from '../lib/formRegistry';
import { groupedForms, searchForms } from '../lib/formSearch';
import fs from 'fs';
import path from 'path';

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
});
