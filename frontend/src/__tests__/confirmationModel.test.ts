/**
 * U2 — one confirmation model + on-page truth, pinned.
 *
 * 1. Inline confirmation as county data lands is THE model: the Property
 *    accordion holds until every present county-record field is confirmed
 *    (advancing past unconfirmed cards is what made APN/Legal "surprise
 *    gates at the finish line"), and the gate modal never re-asks a field
 *    confirmed inline.
 * 2. No immortal toasts: every toast dismissable, none survives a route
 *    change, and "Draft restored" can only fire from the resume path.
 * 3. Immutability copy carries the correction path (accurate today: a
 *    corrected deed is a new row, both retained).
 * 4. No placeholder that reads as an entered value.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { collectCandidateFields, propertyCandidatesRemaining } from '../lib/provenance';
import type { DeedBuilderState, PropertyData } from '../types/builder';
import { codeOnly } from '../test-support/sourceText';


function readSource(...segments: string[]): string {
  return fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8');
}

function propertyFixture(overrides: Partial<PropertyData> = {}): PropertyData {
  return {
    address: '1358 5TH ST',
    city: 'Santa Monica',
    county: 'Los Angeles',
    state: 'CA',
    zip: '90401',
    apn: '4290-012-034',
    legalDescription: 'LOT 7, BLOCK B',
    owner: 'JANE Q. OWNER',
    provenance: {
      apn: { value: '4290-012-034', source: 'sitex', status: 'candidate' },
      legalDescription: { value: 'LOT 7, BLOCK B', source: 'sitex', status: 'candidate' },
      owner: { value: 'JANE Q. OWNER', source: 'sitex', status: 'candidate' },
    },
    ...overrides,
  };
}

describe('U2.1 — the accordion holds until present county fields are confirmed', () => {
  it('fresh county data leaves all present fields as remaining candidates', () => {
    expect(propertyCandidatesRemaining(propertyFixture()).sort()).toEqual(
      ['apn', 'legalDescription', 'owner'].sort()
    );
  });

  it('confirming fields empties the list one by one — the last one advances', () => {
    const p = propertyFixture();
    p.provenance!.apn = { ...p.provenance!.apn!, status: 'confirmed', confirmedAt: 't' };
    p.provenance!.owner = { ...p.provenance!.owner!, status: 'confirmed', confirmedAt: 't' };
    expect(propertyCandidatesRemaining(p)).toEqual(['legalDescription']);
    p.provenance!.legalDescription = {
      ...p.provenance!.legalDescription!, status: 'confirmed', confirmedAt: 't',
    };
    expect(propertyCandidatesRemaining(p)).toEqual([]);
  });

  it('EMPTY fields have nothing to confirm and never hold the accordion (U0 rule)', () => {
    const p = propertyFixture({ owner: '', apn: '' });
    expect(propertyCandidatesRemaining(p)).toEqual(['legalDescription']);
  });

  it('a field without a provenance stamp is still a candidate (legacy data fails toward re-asking)', () => {
    const p = propertyFixture({ provenance: {} });
    expect(propertyCandidatesRemaining(p).length).toBe(3);
  });

  it('PropertySection guards every auto-advance with the remaining-candidates check', () => {
    const src = codeOnly(
      readSource('components', 'builder', 'sections', 'PropertySection.tsx')
    );
    // Both fetch-success paths and the confirm/edit path advance only
    // through the guard — no unconditional onComplete() after data lands.
    const guarded = (src.match(/propertyCandidatesRemaining\((?:propertyData|next)\)\.length === 0\) onComplete\(\)/g) || []).length;
    expect(guarded).toBe(3);
    expect(src).not.toMatch(/onChange\(propertyData\)\s*\n\s*onComplete\(\)/);
  });
});

describe('U2.1 — the gate modal never re-asks a field confirmed inline', () => {
  it('a confirmed field is absent from the modal list; unconfirmed siblings remain', () => {
    const state: DeedBuilderState = {
      deedType: 'grant-deed',
      property: propertyFixture(),
      grantor: '',
      grantee: '',
      vesting: '',
      dtt: null,
      requestedBy: '',
      returnTo: '',
      titleOrderNo: '',
      escrowNo: '',
    };
    state.property!.provenance!.apn = {
      value: '4290-012-034', source: 'sitex', status: 'confirmed', confirmedAt: 't',
    };
    const keys = collectCandidateFields(state).map((c) => c.key);
    expect(keys).not.toContain('apn');
    expect(keys).toContain('legalDescription');
    expect(keys).toContain('owner');
  });
});

describe('U2.2 — no immortal toasts', () => {
  it('the Toaster renders close buttons and the route-dismiss sentinel is mounted', () => {
    const layout = codeOnly(readSource('app', 'layout.tsx'));
    expect(layout).toContain('closeButton');
    expect(layout).toContain('<ToastRouteDismiss />');
  });

  it('ToastRouteDismiss dismisses on pathname change only — never on mount', () => {
    const src = codeOnly(readSource('components', 'ToastRouteDismiss.tsx'));
    expect(src).toContain('toast.dismiss()');
    expect(src).toContain('previous.current !== pathname');
  });

  it('"Draft restored" fires only inside the resume-gated effect', () => {
    const src = readSource('features', 'builder', 'DeedBuilder.tsx');
    const gate = src.indexOf('if (!resumeDeedId) return;');
    const restored = src.indexOf('Draft restored');
    const effectEnd = src.indexOf('}, [resumeDeedId]);');
    expect(gate).toBeGreaterThan(-1);
    expect(restored).toBeGreaterThan(gate);
    expect(restored).toBeLessThan(effectEnd);
    // And nowhere else.
    expect(src.indexOf('Draft restored', effectEnd)).toBe(-1);
  });
});

describe('U2.3 — immutability copy carries the correction path', () => {
  /**
   * FULL CIRCLE, and worth reading as one story.
   *
   * U2.3 originally asserted three strings, "Generate a corrected deed"
   * and "the record keeps both" among them. Its INTENT was right: telling
   * an officer a document is immutable, without telling them what to do
   * about it, is a dead end on the one screen where they decide whether
   * to press the button.
   *
   * T-0 discovered the path it pinned did not exist — `deeds` had no
   * lineage, so "corrected" promised a relationship nothing recorded.
   * The pin was rewritten to assert the INTENT (a path forward is
   * offered) rather than the SPELLING of one promise, and a negative
   * assertion kept the false version from returning by accident.
   *
   * T-5 built the lineage. The sentence is true now, so the negative
   * assertion retires with the condition that justified it, and the pin
   * names the path again — plus the clause T-0's absence taught us to
   * add: a correction is a NEW INSTRUMENT.
   */
  it('the gate modal tells the officer what to do about immutability', () => {
    const src = readSource('features', 'builder', 'DeedBuilder.tsx');
    expect(src).toContain('stored immutably');
    expect(src).toMatch(/cannot be edited/i);
    expect(src).toMatch(/corrected deed/i);
    expect(src).toMatch(/record keeps\s*\n?\s*both/i);
  });

  it('and does not let "corrected" imply the original was un-recorded', () => {
    // The whole point of lineage over editing: both documents exist, the
    // relationship is recorded, and the correction still has to be signed.
    const src = readSource('features', 'builder', 'DeedBuilder.tsx');
    expect(src).toMatch(/new instrument/i);
    expect(src).toMatch(/own signing and notarisation/i);
  });
});

describe('U2.4 — no placeholder that reads as an entered value', () => {
  it('Transfer Value hints with words, not a plausible dollar amount', () => {
    const src = codeOnly(
      readSource('components', 'builder', 'sections', 'TransferTaxSection.tsx')
    );
    expect(src).not.toMatch(/placeholder="[\d,.]+"/);
    // And the city input no longer previews the REAL city as a placeholder.
    expect(src).not.toContain('placeholder={city');
  });
});
