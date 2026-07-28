/**
 * U1 — one serializer for generate AND autosave.
 *
 * The resume mapper reads back what buildDeedPayload writes; any field the
 * serializer drops becomes a "not recoverable" confession on resume (how
 * city/state/zip and the county owner went missing pre-#61). These tests
 * pin the payload's completeness so no future draft is saved poorer than
 * a generated deed.
 */
import { describe, expect, it } from '@jest/globals';
import { buildDeedPayload, hasMeaningfulData } from '../lib/deedPayload';
import type { DeedBuilderState } from '../types/builder';

function baseState(overrides: Partial<DeedBuilderState> = {}): DeedBuilderState {
  return {
    deedType: 'grant-deed',
    property: {
      address: '1358 5TH ST',
      city: 'Santa Monica',
      county: 'Los Angeles',
      state: 'CA',
      zip: '90401',
      apn: '4290-012-034',
      legalDescription: 'LOT 7, BLOCK B',
      owner: 'JANE Q. OWNER',
      provenance: {
        apn: { value: '4290-012-034', source: 'sitex', status: 'confirmed', confirmedAt: 't' },
      },
    },
    grantor: 'JOHN A. DOE',
    grantee: 'ROBERT C. ROE',
    vesting: 'a single man',
    dtt: {
      isExempt: false, exemptReason: '', transferValue: '$500,000',
      calculatedAmount: '550.00', basis: 'full_value', areaType: 'city', cityName: 'Santa Monica',
    },
    requestedBy: 'Pacific Coast Escrow',
    returnTo: 'grantee',
    titleOrderNo: 'TO-123',
    escrowNo: 'ESC-456',
    ...overrides,
  };
}

describe('buildDeedPayload completeness (the resume round-trip contract)', () => {
  it('carries every field the resume mapper restores — nothing dropped', () => {
    const p = buildDeedPayload(baseState());
    // The pre-#61 losses, pinned by name:
    expect(p.property_city).toBe('Santa Monica');
    expect(p.property_state).toBe('CA');
    expect(p.property_zip).toBe('90401');
    expect(p.current_owner).toBe('JANE Q. OWNER');
    // The rest of the row:
    expect(p.doc_type).toBe('grant-deed');
    expect(p.county).toBe('Los Angeles');
    expect(p.apn).toBe('4290-012-034');
    expect(p.property_address).toBe('1358 5TH ST');
    expect(p.legal_description).toBe('LOT 7, BLOCK B');
    expect(p.grantors_text).toBe('JOHN A. DOE');
    expect(p.grantees_text).toBe('ROBERT C. ROE');
    expect(p.vesting).toBe('a single man');
    expect(p.requested_by).toBe('Pacific Coast Escrow');
    expect(p.title_order_no).toBe('TO-123');
    expect(p.escrow_no).toBe('ESC-456');
    expect(p.provenance).toBeDefined();
  });

  it('normalizes the transfer value and keeps the full DTT declaration', () => {
    const p = buildDeedPayload(baseState());
    expect(p.dtt).toEqual({
      transfer_value: '500000',
      is_exempt: false,
      exemption_reason: '',
      basis: 'full_value',
      area_type: 'city',
      city_name: 'Santa Monica',
      calculated_amount: '550.00',
    });
  });

  it('grantee mail-to expands to the full address block at the property', () => {
    const p = buildDeedPayload(baseState({ returnTo: 'grantee' }));
    expect(p.return_to).toEqual({
      name: 'ROBERT C. ROE',
      address1: '1358 5TH ST',
      city: 'Santa Monica',
      state: 'CA',
      zip: '90401',
    });
  });

  it('requester mail-to stays name-only', () => {
    const p = buildDeedPayload(baseState({ returnTo: '' }));
    expect(p.return_to).toBe('Pacific Coast Escrow');
  });

  it('an incomplete draft still serializes without throwing (autosave saves partial work)', () => {
    const p = buildDeedPayload({
      deedType: 'grant-deed',
      property: null,
      grantor: '',
      grantee: '',
      vesting: '',
      dtt: null,
      requestedBy: '',
      returnTo: '',
      titleOrderNo: '',
      escrowNo: '',
    });
    expect(p.doc_type).toBe('grant-deed');
    expect(p.property_address).toBe('');
    expect(p.current_owner).toBe('');
  });
});

describe('hasMeaningfulData (when a draft is worth a row)', () => {
  it('an untouched builder mints no rows', () => {
    expect(
      hasMeaningfulData({
        deedType: 'grant-deed',
        property: null,
        grantor: '',
        grantee: '',
        vesting: '',
        dtt: null,
        requestedBy: '',
        returnTo: '',
        titleOrderNo: '',
        escrowNo: '',
      })
    ).toBe(false);
  });

  it('any single entered field makes the draft worth keeping', () => {
    const empty: DeedBuilderState = {
      deedType: 'grant-deed', property: null, grantor: '', grantee: '',
      vesting: '', dtt: null, requestedBy: '', returnTo: '', titleOrderNo: '', escrowNo: '',
    };
    expect(hasMeaningfulData({ ...empty, grantee: 'ROBERT C. ROE' })).toBe(true);
    expect(hasMeaningfulData({ ...empty, requestedBy: 'Escrow Co' })).toBe(true);
    expect(
      hasMeaningfulData({
        ...empty,
        property: {
          address: '1358 5TH ST', city: '', county: '', state: 'CA', zip: '',
          apn: '', legalDescription: '',
        },
      })
    ).toBe(true);
  });
});
