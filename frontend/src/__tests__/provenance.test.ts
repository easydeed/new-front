/**
 * Tests for the generation-time confirmation gate helpers (Ticket B).
 */
import { describe, expect, it } from '@jest/globals';
import {
  buildProvenancePayload,
  collectCandidateFields,
  grantorFieldProvenance,
  propertyFieldProvenance,
} from '@/lib/provenance';
import type { DeedBuilderState, PropertyData } from '@/types/builder';

const baseProperty: PropertyData = {
  address: '123 Main St, Los Angeles, CA 90001',
  city: 'Los Angeles',
  county: 'Los Angeles',
  state: 'CA',
  zip: '90001',
  apn: '1234-567-890',
  legalDescription: 'LOT 1, BLOCK 2, TRACT 3456',
  owner: 'JOHN DOE',
};

const baseState = (overrides: Partial<DeedBuilderState> = {}): DeedBuilderState => ({
  deedType: 'grant-deed',
  property: baseProperty,
  grantor: '',
  grantee: '',
  vesting: '',
  dtt: null,
  requestedBy: '',
  returnTo: '',
  ...overrides,
});

describe('collectCandidateFields', () => {
  it('treats unstamped SiteX-loaded property fields as candidates (backfill rule)', () => {
    const candidates = collectCandidateFields(baseState());
    const keys = candidates.map((c) => c.key);
    expect(keys).toEqual(expect.arrayContaining(['apn', 'legalDescription', 'owner']));
  });

  it('flags a SiteX-prefilled grantor as a candidate', () => {
    const state = baseState({ grantor: 'JOHN DOE' }); // equals property.owner, no stamp
    const keys = collectCandidateFields(state).map((c) => c.key);
    expect(keys).toContain('grantor');
  });

  it('passes a user-typed grantor without the panel', () => {
    const state = baseState({
      grantor: 'SOMEONE ELSE',
      grantorProvenance: {
        value: 'SOMEONE ELSE',
        source: 'user',
        status: 'confirmed',
        confirmedAt: '2026-07-23T00:00:00Z',
      },
    });
    expect(collectCandidateFields(state).map((c) => c.key)).not.toContain('grantor');
  });

  it('opens the gate when every material field is confirmed', () => {
    const confirmedAt = '2026-07-23T00:00:00Z';
    const state = baseState({
      grantor: 'JOHN DOE',
      grantorProvenance: { value: 'JOHN DOE', source: 'sitex', status: 'confirmed', confirmedAt },
      property: {
        ...baseProperty,
        provenance: {
          apn: { value: baseProperty.apn, source: 'sitex', status: 'confirmed', confirmedAt },
          legalDescription: { value: baseProperty.legalDescription, source: 'sitex', status: 'confirmed', confirmedAt },
          owner: { value: 'JOHN DOE', source: 'sitex', status: 'confirmed', confirmedAt },
        },
      },
    });
    expect(collectCandidateFields(state)).toHaveLength(0);
  });

  it('skips empty fields — nothing to confirm', () => {
    const state = baseState({
      property: { ...baseProperty, apn: '', legalDescription: '', owner: undefined },
    });
    expect(collectCandidateFields(state)).toHaveLength(0);
  });

  it('handles a state with no property at all', () => {
    expect(collectCandidateFields(baseState({ property: null }))).toHaveLength(0);
  });
});

describe('field provenance accessors', () => {
  it('prefers the stamped provenance but syncs the bare value', () => {
    const state = baseState({
      property: {
        ...baseProperty,
        apn: '9999-999-999', // bare value edited after stamping
        provenance: {
          apn: { value: '1234-567-890', source: 'sitex', status: 'confirmed', confirmedAt: 'x' },
        },
      },
    });
    expect(propertyFieldProvenance(state, 'apn')).toMatchObject({
      value: '9999-999-999',
      status: 'confirmed',
    });
  });

  it('marks an unstamped grantor differing from the owner as user-confirmed', () => {
    const state = baseState({ grantor: 'TYPED BEFORE STAMPING' });
    expect(grantorFieldProvenance(state)).toMatchObject({ source: 'user', status: 'confirmed' });
  });
});

describe('buildProvenancePayload', () => {
  it('emits source + confirmed_at per material field', () => {
    const confirmedAt = '2026-07-23T01:02:03Z';
    const state = baseState({
      grantor: 'JOHN DOE',
      grantorProvenance: { value: 'JOHN DOE', source: 'sitex', status: 'confirmed', confirmedAt },
    });
    const payload = buildProvenancePayload(state);
    expect(payload.grantor).toEqual({ source: 'sitex', confirmed_at: confirmedAt });
    expect(payload.apn).toEqual({ source: 'sitex', confirmed_at: null });
    expect(Object.keys(payload).sort()).toEqual(['apn', 'grantor', 'legalDescription', 'owner']);
  });
});
