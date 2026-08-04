/**
 * T-2 — the substring defect, killed and pinned.
 *
 * These are the collision pairs that were live in production. Each is a
 * real California place whose name CONTAINS a rated place's name, and
 * each was charged the containing place's rate by
 * `cityLower.includes(known)`:
 *
 *   South San Francisco  → San Francisco's $7.50/$1,000  (different county)
 *   East Los Angeles     → City of LA's  $4.50/$1,000    (UNINCORPORATED)
 *   Lake Los Angeles     → City of LA's  $4.50/$1,000    (UNINCORPORATED)
 *   West Sacramento      → Sacramento's rate             (different county)
 *   South Pasadena       → Pasadena's rate
 *
 * On a $1,000,000 transfer, South San Francisco alone was $7,500 of
 * invented tax on a legal declaration.
 */
import { describe, expect, it } from '@jest/globals';
import { cityDttRate, isIncorporated, lookupJurisdiction, PLACES } from '@/lib/jurisdictions';
import { computeDttBreakdown } from '@/lib/dttCalc';

const ONE_MILLION = {
  isExempt: false, exemptReason: '', transferValue: '1000000',
  calculatedAmount: '', basis: 'full_value' as const, areaType: 'city' as const,
};

describe('T-2 — substring collisions cannot happen', () => {
  const COLLISIONS: Array<[string, string]> = [
    ['South San Francisco', 'San Francisco'],
    ['East Los Angeles', 'Los Angeles'],
    ['Lake Los Angeles', 'Los Angeles'],
    ['West Sacramento', 'Sacramento'],
    ['South Pasadena', 'Pasadena'],
  ];

  for (const [place, contained] of COLLISIONS) {
    it(`"${place}" resolves independently of "${contained}"`, () => {
      const victim = cityDttRate(place);
      const container = cityDttRate(contained);
      // T-2a: Pasadena is now a verified ZERO (owner sign-off closed the
      // LA set at five cities), so this pair no longer has a positive
      // rate to inherit. The pin stays anyway — it guards the MECHANISM,
      // and a future rate change to any container must not leak sideways.
      if (container.state === 'rated') {
        expect(victim.state === 'rated'
          && victim.ratePer1000 === container.ratePer1000).toBe(false);
      }
      // Each is resolved from its own row, never by containment.
      expect(['unknown', 'none', 'rated', 'tiered']).toContain(victim.state);
    });
  }

  it('South San Francisco no longer produces $7,500 of city tax on $1M', () => {
    const b = computeDttBreakdown({ ...ONE_MILLION, cityName: 'South San Francisco' })!;
    expect(b.city).toBeNull();
    expect(b.cityRateUnknown).toBe(true);
    expect(b.unknownPlace).toBe('South San Francisco');
    // And the county portion — the part we DO know — is unaffected.
    expect(b.county).toBe('1100.00');
  });

  it('the City of San Francisco still is charged $7,500 on $1M', () => {
    // The fix must not have been "stop charging anyone".
    const b = computeDttBreakdown({ ...ONE_MILLION, cityName: 'San Francisco' })!;
    expect(b.city).toBe('7500.00');
  });

  it('unincorporated East Los Angeles is a MEASURED zero, not an unknown', () => {
    const b = computeDttBreakdown({ ...ONE_MILLION, cityName: 'East Los Angeles' })!;
    expect(b.city).toBeNull();
    expect(b.cityRateUnknown).toBeUndefined();
    expect(isIncorporated('East Los Angeles')).toBe(false);
  });
});

describe('T-2 — unknown is never rendered as a rate', () => {
  it('a place we do not hold comes back unknown, not zero', () => {
    const r = cityDttRate('Fresno');
    expect(r.state).toBe('unknown');
  });

  it('an unknown place surfaces to the officer instead of computing', () => {
    const b = computeDttBreakdown({ ...ONE_MILLION, cityName: 'Fresno' })!;
    expect(b.cityRateUnknown).toBe(true);
    expect(b.city).toBeNull();
  });

  it('a known-zero and an unknown are distinguishable', () => {
    expect(cityDttRate('East Los Angeles').state).toBe('none');
    expect(cityDttRate('Fresno').state).toBe('unknown');
  });

  it('matching is exact — no leading/trailing or case tricks', () => {
    expect(cityDttRate('  los ANGELES ').state).toBe('rated');
    expect(cityDttRate('Los Angeles City').state).toBe('unknown');
    expect(cityDttRate('LosAngeles').state).toBe('unknown');
  });

  it('normalization never strips direction words', () => {
    // "South"/"West" ARE the difference between two different cities.
    expect(lookupJurisdiction('South San Francisco').known).toBe(true);
    const a = lookupJurisdiction('South San Francisco');
    const b = lookupJurisdiction('San Francisco');
    expect(a.known && b.known && a.jurisdiction.county).not.toBe(
      b.known ? b.jurisdiction.county : null);
  });
});

describe('T-2 — incorporation and taxation are separate facts', () => {
  it('an incorporated city may levy no DTT', () => {
    // The pre-T-2 code called Glendale "unincorporated" because that
    // produced the right tax by accident. Glendale is now an explicit
    // row: incorporated, and verified to levy nothing.
    expect(isIncorporated('Glendale')).toBe(true);
    expect(cityDttRate('Glendale').state).toBe('none');
    expect(isIncorporated('South Pasadena')).toBe(true);
    expect(cityDttRate('South Pasadena').state).toBe('none');
  });

  it('an unknown place asserts neither', () => {
    expect(isIncorporated('Nowhere Township')).toBeNull();
  });
});

describe('T-2 — the registry is the only list', () => {
  it('every rated place carries a positive rate; zeros are affirmative', () => {
    for (const p of PLACES) {
      if (p.dttRatePer1000 !== null) expect(p.dttRatePer1000).toBeGreaterThanOrEqual(0);
    }
  });

  it('LA County carries the PCOR routing datum', () => {
    const la = lookupJurisdiction('Los Angeles');
    expect(la.known).toBe(true);
    expect(la.known && la.jurisdiction.pcorRouting?.office)
      .toContain('Registrar-Recorder');
  });

  it('no source file keeps its own city list any more', () => {
    const fs = require('fs');
    const path = require('path');
    for (const rel of [['lib', 'dttCalc.ts'], ['services', 'propertyPrefill.ts']]) {
      const src: string = fs.readFileSync(path.join(__dirname, '..', ...rel), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      // A literal array of quoted city names is the shape of a fork.
      expect(src).not.toMatch(/=\s*\[\s*\n?\s*["']los angeles["']/i);
    }
  });
});

/**
 * T-2a — OWNER SIGN-OFF. Rates verified against the PCT published chart
 * and an escrow professional's desk experience, 2026-08-04.
 */
describe('T-2a — the verified LA County set', () => {
  const FIVE = ['Los Angeles', 'Santa Monica', 'Culver City', 'Pomona', 'Redondo Beach'];

  it('exactly five LA County cities levy their own DTT', () => {
    const laRated = PLACES
      .filter((p) => p.county === 'Los Angeles'
        && p.dttRatePer1000 !== null && p.dttRatePer1000 > 0)
      .map((p) => p.city);
    expect(laRated.sort()).toEqual([...FIVE].sort());
  });

  it('the corrected rates are the signed-off ones', () => {
    expect(cityDttRate('Santa Monica')).toEqual({ state: 'rated', ratePer1000: 3.00 });
    expect(cityDttRate('Culver City', 1_000_000)).toEqual({ state: 'rated', ratePer1000: 4.50 });
    expect(cityDttRate('Los Angeles')).toEqual({ state: 'rated', ratePer1000: 4.50 });
  });

  it('Long Beach, Inglewood and Pasadena levy NOTHING — the $2.20 was wrong', () => {
    for (const city of ['Long Beach', 'Inglewood', 'Pasadena']) {
      expect(cityDttRate(city).state).toBe('none');
    }
  });

  it('every LA County row is an affirmative fact, never an unknown', () => {
    // The closed-set ruling is what licenses this: "not among the five"
    // is knowledge about the county, not a gap in it.
    for (const p of PLACES.filter((x) => x.county === 'Los Angeles')) {
      expect(p.dttRatePer1000).not.toBeNull();
    }
  });

  it('non-LA counties keep the honest gap', () => {
    // Explicitly NOT resolved by this sign-off, and must not be quietly
    // folded in later.
    expect(cityDttRate('South San Francisco').state).toBe('unknown');
    expect(cityDttRate('Palo Alto').state).toBe('unknown');
  });

  it('every verified rate cites its source', () => {
    for (const p of PLACES.filter((x) => x.county === 'Los Angeles')) {
      expect(p.source).toBeTruthy();
    }
  });
});

describe('T-2a — tiers are FLAGGED, never computed', () => {
  it('a high-value City of LA transfer states no city rate at all', () => {
    const r = cityDttRate('Los Angeles', 6_000_000);
    expect(r.state).toBe('tiered');
    expect(r).not.toHaveProperty('ratePer1000');
    expect(r.state === 'tiered' && r.measure).toBe('Measure ULA');
  });

  it('below the threshold the base rate still applies', () => {
    expect(cityDttRate('Los Angeles', 1_000_000)).toEqual(
      { state: 'rated', ratePer1000: 4.50 });
  });

  it('the breakdown computes NO city portion above the threshold', () => {
    const b = computeDttBreakdown({ ...ONE_MILLION, transferValue: '6000000',
      cityName: 'Los Angeles' })!;
    expect(b.city).toBeNull();
    expect(b.cityTierFlag?.measure).toBe('Measure ULA');
    // The county portion — which does not tier — is still computed.
    expect(b.county).toBe('6600.00');
  });

  it('Culver City tiers from its lowest bracket boundary', () => {
    const r = cityDttRate('Culver City', 2_000_000);
    expect(r.state).toBe('tiered');
    expect(r.state === 'tiered' && r.boundaries).toEqual([1_500_000, 3_000_000, 10_000_000]);
  });

  it('the flag never carries a rate — that is the whole ruling', () => {
    const b = computeDttBreakdown({ ...ONE_MILLION, transferValue: '9000000',
      cityName: 'Santa Monica' })!;
    expect(JSON.stringify(b.cityTierFlag)).not.toMatch(/rate/i);
  });
});
