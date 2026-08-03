/**
 * A2 — the DTT rate tables must agree across the wire.
 *
 * The partner API carried its own city-rate table that disagreed with
 * this calculator: San Francisco $3.75 there vs $7.50 here, plus cities
 * priced on one side and absent from the other. Whichever surface a
 * caller happened to use decided what their deed declared — and these
 * numbers go onto a recorded instrument as a tax declaration.
 *
 * Same arrangement formRegistry.test.ts has with form_families.py: the
 * Python mirror is read here and pinned against this file's values.
 */
import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';

import { CITIES_WITH_OWN_DTT, computeDttBreakdown } from '@/lib/dttCalc';

const py = fs.readFileSync(
  path.join(__dirname, '..', '..', '..', 'backend', 'services', 'dtt_rates.py'),
  'utf8'
);

describe('DTT rates — one source across the wire', () => {
  it('every city with its own DTT appears in the backend mirror', () => {
    for (const city of CITIES_WITH_OWN_DTT) {
      expect(py).toContain(`"${city}"`);
    }
  });

  it('the backend list has no cities this one lacks', () => {
    const block = py.match(/CITIES_WITH_OWN_DTT = \[([\s\S]*?)\]/);
    expect(block).not.toBeNull();
    const backendCities = [...block![1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    expect(backendCities).toEqual(CITIES_WITH_OWN_DTT);
  });

  it('the county rate matches', () => {
    expect(py).toContain('COUNTY_RATE_PER_1000 = 1.10');
    // ...and this file still computes with it.
    const breakdown = computeDttBreakdown({
      transferValue: '500000', isExempt: false, areaType: 'unincorporated',
      cityName: '', basis: 'full_value', exemptionReason: '', calculatedAmount: '',
    } as never);
    expect(breakdown?.county).toBe('550.00');
  });

  it('the city rates that differ from the default match', () => {
    expect(py).toContain('"los angeles": 4.50');
    expect(py).toContain('"san francisco": 7.50');
    expect(py).toContain('"oakland": 15.00');
    expect(py).toContain('DEFAULT_CITY_RATE_PER_1000 = 2.20');
  });

  it('a city with no DTT of its own is charged nothing on both sides', () => {
    const breakdown = computeDttBreakdown({
      transferValue: '500000', isExempt: false, areaType: 'city',
      cityName: 'Fresno', basis: 'full_value', exemptionReason: '', calculatedAmount: '',
    } as never);
    expect(breakdown?.city).toBeNull();
    // The backend returns None for the same reason, not 0.0 — "levies
    // none" and "levies one, and it is zero" are different claims.
    expect(py).toContain('None when the city levies no transfer tax of its own');
  });
});
