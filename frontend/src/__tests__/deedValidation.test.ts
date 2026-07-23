/**
 * Tests for the two-stage pre-generate validation (Ticket V).
 * Each check must be triggerable in isolation.
 */
import { describe, expect, it } from '@jest/globals';
import {
  evaluateRecorderPreflight,
  evaluateSubstantive,
  unresolvedPreflight,
} from '@/lib/deedValidation';
import { buildPreflightOverridesPayload } from '@/lib/provenance';
import type { DeedBuilderState, PropertyData } from '@/types/builder';

const property: PropertyData = {
  address: '123 Main St', city: 'Los Angeles', county: 'Los Angeles',
  state: 'CA', zip: '90001', apn: '1234-567-890',
  legalDescription: 'LOT 1', owner: 'JOHN DOE',
};

const complete = (overrides: Partial<DeedBuilderState> = {}): DeedBuilderState => ({
  deedType: 'grant-deed',
  property,
  grantor: 'JOHN DOE',
  grantee: 'MARY JONES',
  vesting: 'a single woman',
  dtt: {
    isExempt: false, exemptReason: '', transferValue: '500,000',
    calculatedAmount: '550.00', basis: 'full_value', areaType: 'city', cityName: 'Los Angeles',
  },
  dttDecision: { source: 'user', status: 'confirmed', confirmedAt: '2026-07-23T00:00:00Z' },
  requestedBy: 'Acme Escrow',
  returnTo: 'grantee',
  ...overrides,
});

const failing = (id: string, checks: { id: string; ok: boolean }[]) =>
  checks.filter((c) => !c.ok).map((c) => c.id).includes(id);

describe('substantive readiness — each check triggers in isolation', () => {
  it('fully complete state passes every substantive check', () => {
    expect(evaluateSubstantive(complete()).every((c) => c.ok)).toBe(true);
  });

  it.each([
    ['grantor_present', { grantor: '' }],
    ['grantee_present', { grantee: '' }],
    ['legal_description_present', { property: { ...property, legalDescription: '' } }],
    ['vesting_stated', { vesting: '' }],
    ['dtt_decided', { dtt: null, dttDecision: undefined }],
  ] as const)('%s fails alone', (id, override) => {
    const results = evaluateSubstantive(complete(override as Partial<DeedBuilderState>));
    expect(failing(id, results)).toBe(true);
    expect(results.filter((c) => !c.ok)).toHaveLength(1);
  });

  it('surfaces the TT pending-decision state on dtt_decided', () => {
    const results = evaluateSubstantive(complete({
      deedType: 'interspousal-transfer',   // triggers the suggestion
      dttDecision: undefined,
    }));
    const dtt = results.find((c) => c.id === 'dtt_decided')!;
    expect(dtt.ok).toBe(false);
    expect(dtt.detail).toContain('awaiting your decision');
    expect(dtt.detail).toContain('will not be applied unless you accept');
  });

  it('legacy drafts: complete DTT with no record and no pending suggestion counts as decided', () => {
    const results = evaluateSubstantive(complete({ dttDecision: undefined }));
    expect(results.find((c) => c.id === 'dtt_decided')!.ok).toBe(true);
  });
});

describe('recorder preflight — formatting class, never legal sufficiency', () => {
  it('complete state passes all preflight checks', () => {
    expect(evaluateRecorderPreflight(complete()).every((c) => c.ok)).toBe(true);
  });

  it.each([
    ['apn_present', { property: { ...property, apn: '' } }],
    ['county_set', { property: { ...property, county: '' } }],
    ['return_address', { returnTo: '', requestedBy: '' }],
  ] as const)('%s fails alone', (id, override) => {
    const results = evaluateRecorderPreflight(complete(override as Partial<DeedBuilderState>));
    expect(failing(id, results)).toBe(true);
    expect(results.filter((c) => !c.ok)).toHaveLength(1);
  });

  it('static template facts (acknowledgment page, page setup) always pass', () => {
    const results = evaluateRecorderPreflight(complete({ property: null }));
    expect(results.find((c) => c.id === 'acknowledgment_page')!.ok).toBe(true);
    expect(results.find((c) => c.id === 'page_setup')!.ok).toBe(true);
  });
});

describe('overrides', () => {
  it('an override resolves a failing preflight item', () => {
    const s = complete({ property: { ...property, apn: '' } });
    expect(unresolvedPreflight(s).map((c) => c.id)).toEqual(['apn_present']);
    const overridden = { ...s, preflightOverrides: { apn_present: '2026-07-23T09:00:00Z' } };
    expect(unresolvedPreflight(overridden)).toHaveLength(0);
  });

  it('override is recorded in the payload with its timestamp', () => {
    const payload = buildPreflightOverridesPayload(complete({
      preflightOverrides: { apn_present: '2026-07-23T09:00:00Z' },
    }));
    expect(payload).toEqual({ apn_present: { overridden_at: '2026-07-23T09:00:00Z' } });
  });

  it('no overrides -> nothing recorded', () => {
    expect(buildPreflightOverridesPayload(complete())).toBeNull();
  });
});
