/**
 * UX2 item 1 — the screen renders the verdict, it does not reach one.
 *
 * ═══ THE DEFECT ═══
 *
 * An exact autocomplete pick — "1358 5th Street, Coronado, CA" — came
 * back as 76 candidates, the chosen address not first, and the only
 * advice on screen was "refine search for fewer results". There was
 * nothing left to refine: the search WAS the address.
 *
 * APN, legal description and vested owner all descend from whichever row
 * gets clicked, so a wrong row produces a complete, plausible,
 * confidently wrong deed out of a real county record — with the
 * officer's confirmation on every field.
 *
 * ═══ WHAT THIS FILE PINS, AND WHAT IT DELIBERATELY DOES NOT ═══
 *
 * The comparison "is this the same address" lives in ONE place —
 * `backend/services/address_match.py` — and the tests that hold it are in
 * Python, where it runs. Standing rule: when a new surface needs an
 * existing judgement, the answer is never a second copy.
 *
 * So this file pins the SCREEN's half: it renders what it is told, it
 * says who chose the parcel, it drops nothing, and it holds no opinion
 * about street suffixes. The last of those is a pin, not an omission —
 * see `it holds no address-matching logic of its own`.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';
import { mapSiteXResponse, readSelection } from '../lib/sitexProperty';
import { ownerLine, unitLabel } from '../components/builder/sections/PropertySection';

const SECTION = path.join(__dirname, '..', 'components', 'builder', 'sections', 'PropertySection.tsx');
const source = () => codeOnly(fs.readFileSync(SECTION, 'utf8'));

describe('who chose the parcel', () => {
  it('carries the server’s basis through to the deed record', () => {
    const property = mapSiteXResponse(
      { address: '1358 5TH ST', apn: '537-101-02' },
      '1358 5th Street',
      { basis: 'exact_address_match', matched_address: '1358 5TH ST', alternative_count: 75 },
    );
    expect(property.parcelSelection).toEqual({
      basis: 'exact_address_match',
      matchedAddress: '1358 5TH ST',
      alternativeCount: 75,
    });
  });

  it('keeps a server match and an officer’s pick apart', () => {
    expect(readSelection({ basis: 'officer_choice' })?.basis).toBe('officer_choice');
    expect(readSelection({ basis: 'only_county_match' })?.basis).toBe('only_county_match');
  });

  it('drops a basis it does not recognise instead of defaulting', () => {
    /**
     * Both available defaults are lies: calling a server match an
     * officer's choice launders it, and calling an officer's choice a
     * server match slanders it. Doctrine §13.2 exists to keep those two
     * apart, so an unreadable answer becomes no answer.
     */
    expect(readSelection({ basis: 'best_guess' })).toBeUndefined();
    expect(readSelection({})).toBeUndefined();
    expect(readSelection(undefined)).toBeUndefined();
  });

  it('records nothing when the server said nothing', () => {
    const property = mapSiteXResponse({ address: '1358 5TH ST' }, 'fallback');
    expect(property.parcelSelection).toBeUndefined();
  });
});

describe('a candidate row shows what tells it apart', () => {
  it('renders the unit, which is the only difference in a building', () => {
    expect(unitLabel({ unit_type: 'UNIT', unit_number: '3B' })).toBe('UNIT 3B');
    expect(unitLabel({ unit_number: '12' })).toBe('Unit 12');
  });

  it('renders nothing rather than an empty designator', () => {
    expect(unitLabel({ unit_type: 'UNIT', unit_number: '' })).toBe('');
    expect(unitLabel({})).toBe('');
  });

  it('says WHY an owner line is blank, using the server’s reason', () => {
    expect(ownerLine({
      address: 'x', apn: 'a', fips: 'f',
      owner_status: 'absent_from_record',
      owner_reason: 'No owner name in the county record for this parcel',
    })).toContain('county record');
  });

  it('never calls a record gap "unavailable"', () => {
    /**
     * Invariant #4 in a data field. "Owner unavailable" was three
     * situations wearing one label — a gap in the county record, a parcel
     * that never matched, and a county service that is down — and only
     * one of them is the officer's to act on.
     */
    const blank = ownerLine({ address: 'x', apn: 'a', fips: 'f' });
    expect(blank.toLowerCase()).not.toContain('unavailable');
    expect(blank.length).toBeGreaterThan(0);

    expect(source()).not.toContain('Owner unavailable');
    expect(source()).not.toContain('Property type unavailable');
  });

  it('prefers the owner name when there is one', () => {
    expect(ownerLine({
      address: 'x', apn: 'a', fips: 'f', owner: 'SMITH, JANE',
      owner_reason: 'should not be used',
    })).toBe('SMITH, JANE');
  });
});

describe('the list drops nothing', () => {
  it('renders every candidate it was given', () => {
    /**
     * The old list rendered `matches.slice(0, 25)` of 76 and advised
     * "refine search" — so a parcel the county ranked 40th was not on the
     * page at all, and no amount of refining could reach it because the
     * search was already the exact address.
     */
    const src = source();
    expect(src).not.toMatch(/\.slice\(0,\s*25\)/);
    expect(src).not.toContain('refine search');
  });

  it('holds no address-matching logic of its own', () => {
    /**
     * THE ONE-COPY PIN. The server decides whether a candidate is the
     * address the officer chose; the screen renders the answer. A street
     * suffix table over here would be a second opinion about which
     * property a deed describes — and the two copies would drift, as four
     * copies of the partner categories already did.
     */
    const src = source();
    for (const token of ['BOULEVARD', 'AVENUE', 'normalizeStreet', 'sameAddress']) {
      expect(src).not.toContain(token);
    }
  });
});
