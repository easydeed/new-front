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
  /**
   * T-2 REWROTE FOUR OF THESE PINS DELIBERATELY, and the reason is the
   * lesson this codebase keeps relearning: they guarded a SPELLING.
   *
   * They matched literal text in dtt_rates.py — `CITIES_WITH_OWN_DTT = [`
   * followed by quoted names, `"los angeles": 4.50`, and a docstring
   * sentence. All four broke when the rates moved into the jurisdictions
   * registry and dtt_rates.py began DERIVING its lists from it, even
   * though the property they existed to protect — the two sides declare
   * the same tax — became strictly better guarded (the registry mirror
   * below compares city, county, incorporation AND rate, element for
   * element, and distinguishes null from zero).
   *
   * Worse, the old shape could not have caught the fork that actually
   * existed. It compared the two files it knew about while a third list
   * lived in propertyPrefill.ts, disagreeing with both, deciding whether
   * a Long Beach property was charged city tax at all.
   *
   * So these assert the property through the computation itself: same
   * input, same declared tax, on both sides of the wire.
   */
  it('every rated city agrees on both sides of the wire', () => {
    // Derived from the registry on the TS side; parsed from the mirrored
    // registry on the Python side. No literal list on either.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PLACES } = require('@/lib/jurisdictions');
    const pyReg = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'backend', 'services', 'jurisdictions.py'),
      'utf8'
    );
    for (const city of CITIES_WITH_OWN_DTT) {
      const entry = PLACES.find(
        (p: { city: string }) => p.city.toLowerCase() === city);
      expect(entry).toBeDefined();
      expect(pyReg).toContain(`Place("${entry.city}"`);
    }
  });

  it('the backend rates no city this one does not', () => {
    const pyReg = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'backend', 'services', 'jurisdictions.py'),
      'utf8'
    );
    const pyRated = [...pyReg.matchAll(
      /Place\("([^"]+)",\s*"[^"]+",\s*(?:True|False),\s*([\d.]+)\)/g
    )].filter((m) => parseFloat(m[2]) > 0).map((m) => m[1].toLowerCase());
    expect(pyRated.sort()).toEqual([...CITIES_WITH_OWN_DTT].sort());
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

  it('the distinctive city rates still compute identically on both sides', () => {
    // Rates asserted through the registry rather than through a hardcoded
    // dict literal that no longer exists.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { cityDttRate } = require('@/lib/jurisdictions');
    for (const [city, rate] of [
      ['Los Angeles', 4.5], ['San Francisco', 7.5], ['Oakland', 15.0],
      ['Pasadena', 2.2],
    ] as Array<[string, number]>) {
      const r = cityDttRate(city);
      expect(r.state).toBe('rated');
      expect(r.ratePer1000).toBe(rate);
    }
  });

  it('an UNRATED city is surfaced, not silently charged nothing', () => {
    // T-2 changed this behaviour deliberately. Fresno used to contribute
    // $0 and read as complete; we have never held a Fresno rate, so the
    // $0 was invented. It is now an explicit unknown on both sides.
    const breakdown = computeDttBreakdown({
      transferValue: '500000', isExempt: false, areaType: 'city',
      cityName: 'Fresno', basis: 'full_value', exemptionReason: '', calculatedAmount: '',
    } as never);
    expect(breakdown?.city).toBeNull();
    expect(breakdown?.cityRateUnknown).toBe(true);
    const pyReg = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'backend', 'services', 'jurisdictions.py'),
      'utf8'
    );
    expect(pyReg).toContain('we do not know. Callers must ASK, never assume');
  });
});

/**
 * T-2 — the mirror widens to the REGISTRY, because that is where the
 * rates moved and because the old pin could not have caught the fork that
 * actually existed.
 *
 * A2 pinned dttCalc.ts against dtt_rates.py and declared the fork dead.
 * It was not: services/propertyPrefill.ts kept a THIRD list, with a
 * different 27 cities, and nothing compared it to anything. The pin
 * guarded the two files it knew about. So this block asserts the property
 * that actually matters — one registry, mirrored element for element —
 * and jurisdictions.test.ts separately forbids any file from growing its
 * own city array again.
 */
describe('T-2 — the jurisdictions registry is mirrored element for element', () => {
  const pyReg = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'backend', 'services', 'jurisdictions.py'),
    'utf8'
  );

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PLACES } = require('@/lib/jurisdictions');

  const pyPlaces = [...pyReg.matchAll(
    /Place\("([^"]+)",\s*"([^"]+)",\s*(True|False),\s*([\d.]+|None)\)/g
  )].map((m) => ({
    city: m[1],
    county: m[2],
    incorporated: m[3] === 'True',
    dttRatePer1000: m[4] === 'None' ? null : parseFloat(m[4]),
  }));

  it('both registries hold the same places in the same order', () => {
    expect(pyPlaces.map((p) => p.city)).toEqual(
      PLACES.map((p: { city: string }) => p.city));
  });

  it('every place agrees on county, incorporation AND rate', () => {
    // Rate is the one that reaches a legal declaration; county and
    // incorporation are what make the rate lookup correct in the first
    // place, so all three are pinned.
    expect(pyPlaces).toEqual(PLACES.map((p: Record<string, unknown>) => ({
      city: p.city,
      county: p.county,
      incorporated: p.incorporated,
      dttRatePer1000: p.dttRatePer1000,
    })));
  });

  it('null-vs-zero survives the crossing', () => {
    // The distinction the whole ticket turns on. If the mirror flattened
    // `null` to `0` on either side, an unknown rate would silently become
    // "this city levies nothing" on that surface only.
    const unknowns = pyPlaces.filter((p) => p.dttRatePer1000 === null).map((p) => p.city);
    const zeros = pyPlaces.filter((p) => p.dttRatePer1000 === 0).map((p) => p.city);
    expect(unknowns.length).toBeGreaterThan(0);
    expect(zeros).toContain('East Los Angeles');
    expect(unknowns).not.toContain('East Los Angeles');
  });

  it('the backend refuses to guess for a place it does not hold', () => {
    expect(pyReg).toContain('def city_dtt_rate');
    expect(pyReg).toMatch(/CityRate\("unknown"/);
  });
});
