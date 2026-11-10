import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { computeDttBreakdown } from '../lib/dttCalc';
import type { DTTData } from '../types/builder';

const corpus: { cases: Array<{ id: string; base: string; county: string }> } = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../../backend/tests/fixtures/county_rounding_cases.json'), 'utf8'),
);

const instruction = (base: string, cityName = ''): DTTData => ({
  transferValue: base, isExempt: false,
  areaType: cityName ? 'city' : 'unincorporated', cityName,
  basis: 'full_value', exemptReason: '', calculatedAmount: '',
});

describe('county increment arithmetic on caller-supplied taxable bases', () => {
  it('shows the increment rather than a continuous-rate label to callers', () => {
    const read = (relative: string) => fs.readFileSync(path.resolve(__dirname, '..', relative), 'utf8');
    const section = read('components/builder/sections/TransferTaxSection.tsx');
    expect(section).toContain('County ($0.55 / $500 or fraction)');
    expect(section).toContain('each $500 increment or fraction of a supplied taxable base');
    expect(read('app/developers/page.tsx')).toContain('$0.55 per $500 increment or fraction');
  });

  it.each(corpus.cases)('$id agrees with the shared expected amount', ({ base, county }) => {
    const result = computeDttBreakdown(instruction(base));
    expect(result?.county).toBe(county);
    expect(result?.city).toBeNull();
    expect(result?.total).toBe(county);
  });

  it('preserves existing zero/explicit-exemption controls and municipal arithmetic', () => {
    expect(computeDttBreakdown(instruction('0'))).toBeNull();
    expect(computeDttBreakdown({ ...instruction('21100'), isExempt: true })).toBeNull();
    const result = computeDttBreakdown(instruction('21100', 'Pomona'));
    expect(result?.county).toBe('23.65');
    expect(result?.city).toBe('46.42');
    expect(result?.total).toBe('70.07');
    expect(computeDttBreakdown(instruction('500000', 'Fresno'))?.cityRateUnknown).toBe(true);
    expect(computeDttBreakdown(instruction('6000000', 'Los Angeles'))?.cityTierFlag).toBeDefined();
  });
});
