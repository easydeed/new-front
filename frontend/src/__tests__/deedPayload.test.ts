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

  it('requester mail-to now carries its address, unparsed', () => {
    /**
     * SUPERSEDED, DELIBERATELY — this pin used to read "requester mail-to
     * stays name-only" and asserted a bare string. That was accurate and
     * it was the DEFECT: "When Recorded, Return To" printed a name with
     * nowhere to send it, because the backend widens a bare string to
     * `{name}` and no more.
     *
     * The address was never missing. PARTNER1 put it in
     * `requestedByAddress` — typed by the officer or auto-filled from the
     * partner record — and it has been reaching the backend as
     * `requested_by_address` ever since. It was one composition away from
     * the block that needed it, behind a comment reading "not yet
     * collected in the builder" that had been false for months.
     *
     * Rewritten rather than deleted (§14.12): a reversed ruling should
     * read as a reversal, not as a test that quietly disappeared.
     *
     * UNPARSED, owner-ruled: one officer-typed line in, one line out.
     * Splitting it into city/state/zip means guessing at a human-typed
     * string, and a WRONG city on a mail-to block is worse than an absent
     * one — it looks filled rather than incomplete.
     */
    const p = buildDeedPayload(baseState({
      returnTo: '',
      requestedByAddress: '456 Escrow Way, Los Angeles, CA 90012',
    }));
    expect(p.return_to).toEqual({
      name: 'Pacific Coast Escrow',
      address1: '456 Escrow Way, Los Angeles, CA 90012',
    });
    // And it carries NO city key — `deedResume` distinguishes the two
    // mail-to choices by that key's presence, so adding one here would
    // silently flip resumed requester drafts to "Grantee".
    expect(p.return_to).not.toHaveProperty('city');
  });

  it('a requester with no address on file still sends the name', () => {
    // The partner record may genuinely hold no address. The block must not
    // break — the TEMPLATE draws a visible rule for the missing lines, so
    // the officer sees a gap rather than a finished-looking block.
    const p = buildDeedPayload(baseState({ returnTo: '' }));
    expect(p.return_to).toEqual({ name: 'Pacific Coast Escrow', address1: '' });
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
