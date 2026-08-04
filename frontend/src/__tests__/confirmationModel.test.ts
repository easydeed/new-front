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

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

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
    const src = stripComments(
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
    const layout = stripComments(readSource('app', 'layout.tsx'));
    expect(layout).toContain('closeButton');
    expect(layout).toContain('<ToastRouteDismiss />');
  });

  it('ToastRouteDismiss dismisses on pathname change only — never on mount', () => {
    const src = stripComments(readSource('components', 'ToastRouteDismiss.tsx'));
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
   * T-0 CHANGED THIS PIN DELIBERATELY. Worth reading, because the pin was
   * doing its job and was still wrong.
   *
   * U2.3's intent is right and survives intact: telling an officer the
   * document is immutable, without telling them what to do about it, is a
   * dead end on the one screen where they are deciding whether to press
   * the button. The copy must carry a path forward.
   *
   * What U2.3 could not know is that the path it pinned did not exist.
   * "Generate a corrected deed — the record keeps both" describes
   * SUPERSESSION, and `deeds` has no lineage: no superseded_by, no status
   * beyond draft/completed/deleted, nothing relating the two rows. Both
   * deeds are kept, so the sentence is half true, and the half that is
   * false is the word "corrected" — it promises a recorded relationship.
   *
   * So the pin now asserts the INTENT (a path forward is offered) rather
   * than the SPELLING of a specific promise. T-5 builds the lineage; when
   * it exists, the stronger sentence can come back and this pin can go
   * back to naming it.
   */
  it('the gate modal tells the officer what to do about immutability', () => {
    const src = readSource('features', 'builder', 'DeedBuilder.tsx');
    expect(src).toContain('stored immutably');
    // A path forward, stated in terms of what is true today.
    expect(src).toMatch(/cannot be edited/i);
    expect(src).toMatch(/make any changes now/i);
  });

  it('and does not describe a correction the record cannot show', () => {
    const src = readSource('features', 'builder', 'DeedBuilder.tsx')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src).not.toContain('Generate a corrected deed');
    expect(src).not.toContain('the record keeps both');
  });
});

describe('U2.4 — no placeholder that reads as an entered value', () => {
  it('Transfer Value hints with words, not a plausible dollar amount', () => {
    const src = stripComments(
      readSource('components', 'builder', 'sections', 'TransferTaxSection.tsx')
    );
    expect(src).not.toMatch(/placeholder="[\d,.]+"/);
    // And the city input no longer previews the REAL city as a placeholder.
    expect(src).not.toContain('placeholder={city');
  });
});
