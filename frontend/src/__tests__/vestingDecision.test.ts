/**
 * Vesting legal-choice recording (vesting sibling of Ticket TT).
 */
import { describe, expect, it } from '@jest/globals';
import { getVestingSuggestion } from '@/lib/ai-helpers';
import { buildProvenancePayload } from '@/lib/provenance';
import type { DeedBuilderState } from '@/types/builder';

const state = (overrides: Partial<DeedBuilderState> = {}): DeedBuilderState => ({
  deedType: 'grant-deed', property: null, grantor: '', grantee: '',
  vesting: '', dtt: null, requestedBy: '', returnTo: '', ...overrides,
});

describe('vesting suggestion detection stays deterministic and non-applying', () => {
  it('trust grantee proposes trustee vesting with a reason', () => {
    const s = getVestingSuggestion('THE SMITH FAMILY TRUST', 1, 'grant-deed');
    expect(s?.value).toContain('Trustee');
    expect(s?.reason).toBeTruthy();
  });

  it('empty grantee proposes nothing', () => {
    expect(getVestingSuggestion('', 0, 'grant-deed')).toBeNull();
  });
});

describe('provenance payload carries the vesting legal-choice record', () => {
  it('accepted suggestion records ai_suggested with the basis shown', () => {
    const payload = buildProvenancePayload(state({
      vesting: 'as Trustee(s) of the SMITH FAMILY TRUST',
      vestingDecision: {
        source: 'ai_suggested', status: 'confirmed',
        confirmedAt: '2026-07-23T12:00:00Z', basis: 'Grantee appears to be a trust',
      },
    }));
    expect(payload.vesting).toEqual({
      source: 'ai_suggested',
      confirmed_at: '2026-07-23T12:00:00Z',
      basis: 'Grantee appears to be a trust',
    });
  });

  it('manual selection records source user', () => {
    const payload = buildProvenancePayload(state({
      vesting: 'a single woman',
      vestingDecision: { source: 'user', status: 'confirmed', confirmedAt: '2026-07-23T12:00:00Z' },
    }));
    expect(payload.vesting).toEqual({ source: 'user', confirmed_at: '2026-07-23T12:00:00Z' });
  });

  it('no decision -> no vesting entry', () => {
    expect(buildProvenancePayload(state({ vesting: 'a single woman' })).vesting).toBeUndefined();
  });
});
