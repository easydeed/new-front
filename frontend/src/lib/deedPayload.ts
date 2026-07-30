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
import type { AffidavitFacts, DeedBuilderState } from '@/types/builder';
import {
  buildPreflightOverridesPayload,
  buildProvenancePayload,
} from '@/lib/provenance';
import { formFamily, isSinglePartyType } from '@/lib/formRegistry';

/**
 * metadata.affidavit — the typed-facts bucket shared by the affidavit and
 * declaration families. Superset of every variant's snake_case keys (each
 * template reads only the keys its recital carries); null when the form
 * has no typed facts or none are filled (a homestead whose only fact —
 * the declarant — rides in `parties` must not mint an all-empty block).
 */
function buildFactsBlock(aff: AffidavitFacts | undefined) {
  if (!aff) return null;
  const block = {
    affiant_name: aff.affiantName || '',
    decedent_name: aff.decedentName || '',
    jt_deed_date: aff.jtDeedDate || '',
    jt_deed_grantor: aff.jtDeedGrantor || '',
    jt_deed_grantees: aff.jtDeedGrantees || '',
    death_date: aff.deathDate || '',
    death_place: aff.deathPlace || '',
    deed_date: aff.deedDate || '',
    deed_grantor: aff.deedGrantor || '',
    trust_date: aff.trustDate || '',
    trustors: aff.trustors || '',
    recording_date: aff.recordingDate || '',
    instrument_no: aff.instrumentNo || '',
    trust_name: aff.trustName || '',
    settlors: aff.settlors || '',
    trustees: aff.trustees || '',
    revocability: aff.revocability || '',
    revoker_name: aff.revokerName || '',
    signer_count: aff.signerCount || '',
    signer_names: aff.signerNames || '',
    title_vesting: aff.titleVesting || '',
  };
  return Object.values(block).some((v) => v) ? block : null;
}

export function buildDeedPayload(genState: DeedBuilderState) {
  // FORMS-SPIKE: for affidavit instruments the deeds row's party columns
  // are display aliases — grantor_name holds the DECEDENT (whose interest
  // clears) and grantee_name the AFFIANT, so Past Deeds rows read
  // sensibly and the backend's critical-field validation applies to the
  // affidavit's real substance. The authoritative facts live in
  // metadata.affidavit. Aliasing is FLAGGED in the spike report.
  const isAffidavit = formFamily(genState.deedType) === 'affidavit';
  // Declaration family (parties migration): the single party rides in the
  // deeds.parties JSONB column — grantor/grantee stay legitimately empty.
  const isSingleParty = isSinglePartyType(genState.deedType);
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
    grantors_text: isSingleParty ? '' : isAffidavit ? (aff?.decedentName || '') : genState.grantor,
    grantees_text: isSingleParty ? '' : isAffidavit ? (aff?.affiantName || '') : genState.grantee,
    // The single party by role: the homestead's declarant, or the trust
    // certification's certifying trustee(s).
    parties: isSingleParty
      ? genState.deedType === 'trust-certification'
        ? { trustee: aff?.trustees || '' }
        : { declarant: aff?.declarantName || '' }
      : null,
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
    affidavit: buildFactsBlock(isAffidavit || isSingleParty ? aff : undefined),
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
    s.escrowNo?.trim() ||
    // Typed instrument facts (affidavit/declaration families) are work
    // worth keeping too — a declarant name alone must autosave.
    Object.values(s.affidavit ?? {}).some((v) => v?.trim())
  );
}
