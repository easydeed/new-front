/**
 * Tests for the transfer-tax legal-choice gate (Ticket TT).
 */
import { describe, expect, it } from '@jest/globals';
import { detectDttSuggestion, isDttSuggestionPending } from '@/lib/dttSuggestions';
import { buildProvenancePayload } from '@/lib/provenance';
import type { DeedBuilderState } from '@/types/builder';

const state = (overrides: Partial<DeedBuilderState> = {}): DeedBuilderState => ({
  deedType: 'grant-deed',
  property: null,
  grantor: '',
  grantee: '',
  vesting: '',
  dtt: null,
  requestedBy: '',
  returnTo: '',
  ...overrides,
});

describe('detectDttSuggestion (deterministic, never guesses)', () => {
  it('interspousal deed type proposes R&T 11927 citing the deed type', () => {
    const s = detectDttSuggestion('interspousal-transfer', 'JOHN DOE', 'JANE DOE');
    expect(s?.codeSection).toBe('R&T 11927');
    expect(s?.explanation).toContain('Interspousal Transfer Deed');
    expect(s?.proposed).toEqual({ isExempt: true, exemptReason: 'R&T 11927' });
  });

  it('transfer to own trust proposes R&T 11930 citing the shared name', () => {
    const s = detectDttSuggestion('grant-deed', 'JOHN SMITH', 'THE SMITH FAMILY TRUST');
    expect(s?.codeSection).toBe('R&T 11930');
    expect(s?.explanation).toContain('SMITH');
    expect(s?.explanation).toContain('THE SMITH FAMILY TRUST');
  });

  it('trust grantee with NO name link yields no suggestion — never guess', () => {
    expect(detectDttSuggestion('grant-deed', 'JOHN SMITH', 'THE WILSON FAMILY TRUST')).toBeNull();
  });

  it('identical grantor/grantee proposes R&T 11911', () => {
    const s = detectDttSuggestion('grant-deed', 'JOHN SMITH', 'JOHN SMITH');
    expect(s?.codeSection).toBe('R&T 11911');
  });

  it('ordinary sale pattern yields no suggestion', () => {
    expect(detectDttSuggestion('grant-deed', 'JOHN SMITH', 'MARY JONES')).toBeNull();
  });
});

describe('isDttSuggestionPending', () => {
  const interspousal = { deedType: 'interspousal-transfer', grantor: 'A B', grantee: 'C D' };

  it('pending when surfaced and undecided', () => {
    expect(isDttSuggestionPending(state(interspousal))).toBe(true);
  });

  it('not pending after acceptance (decision recorded)', () => {
    expect(isDttSuggestionPending(state({
      ...interspousal,
      dttDecision: { source: 'ai_suggested', status: 'confirmed', confirmedAt: 'x', codeSection: 'R&T 11927' },
    }))).toBe(false);
  });

  it('not pending after dismissal', () => {
    expect(isDttSuggestionPending(state({ ...interspousal, dttSuggestionDismissed: true }))).toBe(false);
  });

  it('not pending after manual entry (any manual edit records a user decision)', () => {
    expect(isDttSuggestionPending(state({
      ...interspousal,
      dttDecision: { source: 'user', status: 'confirmed', confirmedAt: 'x' },
    }))).toBe(false);
  });
});

describe('provenance payload carries the legal-choice record', () => {
  it('accepted suggestion records ai_suggested with code section and basis', () => {
    const payload = buildProvenancePayload(state({
      dttDecision: {
        source: 'ai_suggested', status: 'confirmed',
        confirmedAt: '2026-07-23T12:00:00Z',
        codeSection: 'R&T 11927', basis: 'Interspousal transfer …',
      },
    }));
    expect(payload.dtt).toEqual({
      source: 'ai_suggested',
      confirmed_at: '2026-07-23T12:00:00Z',
      code_section: 'R&T 11927',
      basis: 'Interspousal transfer …',
    });
  });

  it('manual entry records source user without code section', () => {
    const payload = buildProvenancePayload(state({
      dttDecision: { source: 'user', status: 'confirmed', confirmedAt: '2026-07-23T12:00:00Z' },
    }));
    expect(payload.dtt).toEqual({ source: 'user', confirmed_at: '2026-07-23T12:00:00Z' });
  });

  it('no decision -> no dtt entry (nothing unauthorized in the record)', () => {
    expect(buildProvenancePayload(state()).dtt).toBeUndefined();
  });
});
