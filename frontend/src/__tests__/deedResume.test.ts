/**
 * Ticket R — resume must restore the officer's recorded decisions, never
 * fabricate them. These tests pin the doctrine clause: confirmed fields
 * resume confirmed WITH their recorded source and timestamp; fields
 * without recorded provenance resume as candidates (the gate re-asks);
 * legal choices only resurrect from a recorded, timestamped decision.
 */
import { describe, expect, it } from '@jest/globals';
import { hydrateStateFromDeedRow } from '../lib/deedResume';

const FULL_ROW = {
  id: 83,
  deed_type: 'grant-deed',
  property_address: '1358 5TH ST, Santa Monica, CA 90401',
  apn: '4290-012-034',
  county: 'Los Angeles',
  legal_description: 'LOT 7, BLOCK B, TRACT 1234',
  grantor_name: 'JOHN A. DOE',
  grantee_name: 'ROBERT C. ROE',
  vesting: 'a single man',
  requested_by: 'Pacific Coast Escrow',
  status: 'draft',
  metadata: {
    title_order_no: 'TO-1',
    escrow_no: 'ESC-2',
    property_city: 'Santa Monica',
    property_state: 'CA',
    property_zip: '90401',
    current_owner: 'JOHN A. DOE',
    return_to: { name: 'ROBERT C. ROE', address1: '1358 5TH ST', city: 'Santa Monica', state: 'CA', zip: '90401' },
    dtt: {
      transfer_value: '500000', is_exempt: false, exemption_reason: '',
      basis: 'full_value', area_type: 'city', city_name: 'Santa Monica',
      calculated_amount: '550.00',
    },
    provenance: {
      apn: { source: 'sitex', confirmed_at: '2026-07-28T20:00:00Z' },
      legalDescription: { source: 'sitex', confirmed_at: '2026-07-28T20:01:00Z' },
      owner: { source: 'sitex', confirmed_at: '2026-07-28T20:01:30Z' },
      grantor: { source: 'sitex', confirmed_at: '2026-07-28T20:02:00Z' },
      dtt: { source: 'ai_suggested', confirmed_at: '2026-07-28T20:03:00Z', code_section: 'R&T 11911', basis: 'Gift' },
      vesting: { source: 'user', confirmed_at: '2026-07-28T20:04:00Z' },
      preflight_overrides: { 'legal-short': { overridden_at: '2026-07-28T20:05:00Z' } },
    },
  },
};

describe('resume restores recorded decisions', () => {
  const { state, gaps } = hydrateStateFromDeedRow(FULL_ROW);

  it('rebuilds the core fields', () => {
    expect(state.deedType).toBe('grant-deed');
    expect(state.property?.address).toBe('1358 5TH ST');
    expect(state.property?.city).toBe('Santa Monica');
    expect(state.property?.zip).toBe('90401');
    expect(state.property?.county).toBe('Los Angeles');
    expect(state.grantor).toBe('JOHN A. DOE');
    expect(state.grantee).toBe('ROBERT C. ROE');
    expect(state.titleOrderNo).toBe('TO-1');
    expect(state.returnTo).toBe('grantee');
  });

  it('confirmed fields resume confirmed with their recorded source + timestamp', () => {
    expect(state.property?.provenance?.apn).toEqual({
      value: '4290-012-034', source: 'sitex', status: 'confirmed',
      confirmedAt: '2026-07-28T20:00:00Z',
    });
    expect(state.grantorProvenance?.status).toBe('confirmed');
    expect(state.grantorProvenance?.confirmedAt).toBe('2026-07-28T20:02:00Z');
  });

  it('legal choices resurrect as their recorded LegalChoiceRecord', () => {
    expect(state.dttDecision).toEqual({
      source: 'ai_suggested', status: 'confirmed',
      confirmedAt: '2026-07-28T20:03:00Z', codeSection: 'R&T 11911', basis: 'Gift',
    });
    expect(state.vestingDecision?.confirmedAt).toBe('2026-07-28T20:04:00Z');
  });

  it('restores the DTT data and preflight overrides', () => {
    expect(state.dtt?.cityName).toBe('Santa Monica');
    expect(state.dtt?.areaType).toBe('city');
    expect(state.dtt?.transferValue).toBe('500000');
    expect(state.preflightOverrides).toEqual({ 'legal-short': '2026-07-28T20:05:00Z' });
  });

  it('restores the persisted city/zip and county-owner with provenance', () => {
    // Persistence follow-up: these come from metadata, not address parsing.
    expect(state.property?.owner).toBe('JOHN A. DOE');
    expect(state.property?.provenance?.owner?.status).toBe('confirmed');
    expect(state.property?.provenance?.owner?.confirmedAt).toBe('2026-07-28T20:01:30Z');
    expect(gaps.some((g) => g.includes('Current-owner'))).toBe(false);
  });
});

describe('drafts saved before the persistence follow-up fall back honestly', () => {
  const oldRow = {
    ...FULL_ROW,
    metadata: { ...FULL_ROW.metadata },
  } as any;
  delete oldRow.metadata.property_city;
  delete oldRow.metadata.property_state;
  delete oldRow.metadata.property_zip;
  delete oldRow.metadata.current_owner;
  const { state, gaps } = hydrateStateFromDeedRow(oldRow);

  it('parses city/state/zip from the address string as fallback', () => {
    expect(state.property?.city).toBe('Santa Monica');
    expect(state.property?.zip).toBe('90401');
  });

  it('reports the unsaved owner as an explicit gap', () => {
    expect(state.property?.owner).toBeUndefined();
    expect(gaps.some((g) => g.includes('Current-owner'))).toBe(true);
  });
});

describe('legacy drafts fail toward re-asking, never auto-confirmed', () => {
  const legacy = { ...FULL_ROW, metadata: { dtt: FULL_ROW.metadata.dtt } };
  const { state, gaps } = hydrateStateFromDeedRow(legacy);

  it('sourced fields resume as candidates', () => {
    expect(state.property?.provenance?.apn?.status).toBe('candidate');
    expect(state.property?.provenance?.legalDescription?.status).toBe('candidate');
    expect(state.grantorProvenance?.status).toBe('candidate');
  });

  it('no legal-choice records are fabricated', () => {
    expect(state.dttDecision).toBeUndefined();
    expect(state.vestingDecision).toBeUndefined();
  });

  it('the missing provenance is reported, not silent', () => {
    expect(gaps.some((g) => g.includes('legacy draft'))).toBe(true);
  });
});

describe('a provenance entry without a timestamp is not a confirmation', () => {
  const row = {
    ...FULL_ROW,
    metadata: {
      provenance: {
        apn: { source: 'sitex', confirmed_at: null },
        dtt: { source: 'ai_suggested', confirmed_at: null },
      },
    },
  };
  const { state } = hydrateStateFromDeedRow(row);

  it('field resumes as candidate; legal choice does not resurrect', () => {
    expect(state.property?.provenance?.apn?.status).toBe('candidate');
    expect(state.dttDecision).toBeUndefined();
  });
});
