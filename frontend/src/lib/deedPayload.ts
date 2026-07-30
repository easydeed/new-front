/**
 * U1 — ONE serializer for builder state.
 *
 * Generate and autosave must persist the SAME complete payload: the resume
 * mapper (deedResume.ts) reads back what this writes, and every field this
 * drops becomes a "not recoverable" confession on resume (that's how
 * city/state/zip and the county owner went missing pre-#61). Extracted
 * from DeedBuilder.performGenerate verbatim so there is no second,
 * poorer serialization for drafts.
 */
import type { DeedBuilderState } from '@/types/builder';
import {
  buildPreflightOverridesPayload,
  buildProvenancePayload,
} from '@/lib/provenance';
import { formFamily } from '@/lib/formRegistry';

export function buildDeedPayload(genState: DeedBuilderState) {
  // FORMS-SPIKE: for affidavit instruments the deeds row's party columns
  // are display aliases — grantor_name holds the DECEDENT (whose interest
  // clears) and grantee_name the AFFIANT, so Past Deeds rows read
  // sensibly and the backend's critical-field validation applies to the
  // affidavit's real substance. The authoritative facts live in
  // metadata.affidavit. Aliasing is FLAGGED in the spike report.
  const isAffidavit = formFamily(genState.deedType) === 'affidavit';
  const aff = genState.affidavit;
  return {
    doc_type: genState.deedType,
    county: genState.property?.county || '',
    apn: genState.property?.apn || '',
    property_address: genState.property?.address || '',
    property_city: genState.property?.city || '',
    property_state: genState.property?.state || '',
    property_zip: genState.property?.zip || '',
    current_owner: genState.property?.owner || '',
    legal_description: genState.property?.legalDescription || '',
    grantors_text: isAffidavit ? (aff?.decedentName || '') : genState.grantor,
    grantees_text: isAffidavit ? (aff?.affiantName || '') : genState.grantee,
    vesting: genState.vesting,
    requested_by: genState.requestedBy,
    requested_by_address: genState.requestedByAddress || '',
    // Mail-to: when the deed returns to the grantee, it mails to the
    // grantee AT THE PROPERTY (the standard default) — send the full
    // address block so the recorded deed shows where to mail it.
    // Requester-return stays name-only (partner mailing addresses live
    // in the partner record; not yet collected in the builder).
    return_to: genState.returnTo === 'grantee'
      ? {
          name: genState.grantee,
          address1: genState.property?.address || '',
          city: genState.property?.city || '',
          state: genState.property?.state || '',
          zip: genState.property?.zip || '',
        }
      : genState.requestedBy,
    title_order_no: genState.titleOrderNo || '',
    escrow_no: genState.escrowNo || '',
    affidavit: isAffidavit && aff
      ? {
          affiant_name: aff.affiantName || '',
          decedent_name: aff.decedentName || '',
          jt_deed_date: aff.jtDeedDate || '',
          jt_deed_grantor: aff.jtDeedGrantor || '',
          jt_deed_grantees: aff.jtDeedGrantees || '',
          recording_date: aff.recordingDate || '',
          instrument_no: aff.instrumentNo || '',
        }
      : null,
    dtt: {
      transfer_value: genState.dtt?.transferValue?.replace(/[^0-9]/g, '') || '',
      is_exempt: genState.dtt?.isExempt || false,
      exemption_reason: genState.dtt?.exemptReason || '',
      basis: genState.dtt?.basis || 'full_value',
      area_type: genState.dtt?.areaType || 'unincorporated',
      city_name: genState.dtt?.cityName || '',
      calculated_amount: genState.dtt?.calculatedAmount || '',
    },
    // Who-confirmed-what-when, persisted into deeds.metadata.provenance
    // alongside the stored PDF's hash.
    provenance: {
      ...buildProvenancePayload(genState),
      ...(buildPreflightOverridesPayload(genState)
        ? { preflight_overrides: buildPreflightOverridesPayload(genState) }
        : {}),
    },
  };
}

export type DeedPayload = ReturnType<typeof buildDeedPayload>;

/**
 * A draft is worth saving once the officer has entered ANYTHING that would
 * hurt to lose — not before (an untouched builder must not mint rows).
 */
export function hasMeaningfulData(s: DeedBuilderState): boolean {
  return !!(
    s.property?.address ||
    s.grantor?.trim() ||
    s.grantee?.trim() ||
    s.vesting ||
    s.dtt ||
    s.requestedBy?.trim() ||
    s.titleOrderNo?.trim() ||
    s.escrowNo?.trim()
  );
}
