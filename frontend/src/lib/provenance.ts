/**
 * Generation-time confirmation gate over the material sourced data fields:
 * apn, legalDescription, owner (property.provenance) and grantor
 * (state.grantorProvenance). A field still in 'candidate' status blocks
 * generation until the officer confirms it — nothing unconfirmed may enter
 * the immutable stored PDF. Legal choices (vesting, transfer tax) gate at
 * the point of decision, not here.
 */
import type { DeedBuilderState, PropertyProvenance, Sourced } from '@/types/builder';

export type MaterialFieldKey = 'apn' | 'legalDescription' | 'owner' | 'grantor';

export interface CandidateField {
  key: MaterialFieldKey;
  label: string;
  field: Sourced<string>;
}

export const MATERIAL_FIELD_LABELS: Record<MaterialFieldKey, string> = {
  apn: 'APN',
  legalDescription: 'Legal Description',
  owner: 'Current Owner (per county records)',
  grantor: 'Grantor Name',
};

const PROPERTY_KEYS: Array<keyof PropertyProvenance> = ['apn', 'legalDescription', 'owner'];

/**
 * Provenance for one property field. Values without a stamp were loaded
 * from SiteX before provenance existed — treated as unconfirmed candidates,
 * matching PropertySection's provenanceFor backfill. Empty fields have
 * nothing to confirm and return null.
 */
export function propertyFieldProvenance(
  state: DeedBuilderState,
  key: keyof PropertyProvenance,
): Sourced<string> | null {
  const bare = (state.property?.[key] ?? '') as string;
  if (!bare.trim()) return null;
  const stamped = state.property?.provenance?.[key];
  if (stamped) return { ...stamped, value: bare };
  return { value: bare, source: 'sitex', status: 'candidate' };
}

/**
 * Provenance for the grantor. Unstamped non-empty values only occur via the
 * SiteX owner prefill path (typing always stamps): equal to property.owner
 * means SiteX candidate; anything else predates stamping and is treated as
 * user-entered (confirmed on entry, per the provenance rule).
 */
export function grantorFieldProvenance(state: DeedBuilderState): Sourced<string> | null {
  const bare = state.grantor?.trim() ?? '';
  if (!bare) return null;
  if (state.grantorProvenance) return { ...state.grantorProvenance, value: state.grantor };
  if (state.property?.owner && state.grantor === state.property.owner) {
    return { value: state.grantor, source: 'sitex', status: 'candidate' };
  }
  return { value: state.grantor, source: 'user', status: 'confirmed' };
}

function materialFieldProvenance(
  state: DeedBuilderState,
  key: MaterialFieldKey,
): Sourced<string> | null {
  return key === 'grantor'
    ? grantorFieldProvenance(state)
    : propertyFieldProvenance(state, key);
}

/** Every material field still awaiting confirmation. Empty array = gate open. */
export function collectCandidateFields(state: DeedBuilderState): CandidateField[] {
  const keys: MaterialFieldKey[] = [...PROPERTY_KEYS, 'grantor'];
  const candidates: CandidateField[] = [];
  for (const key of keys) {
    const field = materialFieldProvenance(state, key);
    if (field && field.status === 'candidate') {
      candidates.push({ key, label: MATERIAL_FIELD_LABELS[key], field });
    }
  }
  return candidates;
}

/**
 * Snapshot of who-confirmed-what-when for the generation payload; persisted
 * into deeds.metadata.provenance next to the stored PDF's hash.
 */
export interface ProvenanceEntry {
  source: string;
  confirmed_at: string | null;
  code_section?: string;
  basis?: string;
}

export function buildProvenancePayload(
  state: DeedBuilderState,
): Record<string, ProvenanceEntry> {
  const payload: Record<string, ProvenanceEntry> = {};
  const keys: MaterialFieldKey[] = [...PROPERTY_KEYS, 'grantor'];
  for (const key of keys) {
    const field = materialFieldProvenance(state, key);
    if (field) {
      payload[key] = { source: field.source, confirmed_at: field.confirmedAt ?? null };
    }
  }
  // Legal-choice record (Ticket TT): the officer's transfer-tax instruction,
  // with the code section and basis exactly as shown when they decided.
  if (state.dttDecision) {
    payload.dtt = {
      source: state.dttDecision.source,
      confirmed_at: state.dttDecision.confirmedAt ?? null,
      ...(state.dttDecision.codeSection ? { code_section: state.dttDecision.codeSection } : {}),
      ...(state.dttDecision.basis ? { basis: state.dttDecision.basis } : {}),
    };
  }
  // Vesting legal-choice record (vesting sibling of Ticket TT).
  if (state.vestingDecision) {
    payload.vesting = {
      source: state.vestingDecision.source,
      confirmed_at: state.vestingDecision.confirmedAt ?? null,
      ...(state.vestingDecision.basis ? { basis: state.vestingDecision.basis } : {}),
    };
  }
  return payload;
}

/**
 * Recorder-preflight overrides (Ticket V): id -> {overridden_at}. Included in
 * the generation payload beside the field/legal-choice records so the stored
 * deed carries the officer's explicit acknowledgments.
 */
export function buildPreflightOverridesPayload(
  state: DeedBuilderState,
): Record<string, { overridden_at: string }> | null {
  const overrides = state.preflightOverrides;
  if (!overrides || Object.keys(overrides).length === 0) return null;
  const out: Record<string, { overridden_at: string }> = {};
  for (const [id, ts] of Object.entries(overrides)) {
    out[id] = { overridden_at: ts };
  }
  return out;
}
