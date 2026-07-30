/**
 * Ticket R — builder resume: map a saved deed row (+ its metadata) back
 * into a hydrated DeedBuilderState.
 *
 * DOCTRINE-CRITICAL: resume must restore the officer's recorded decisions,
 * never fabricate them. A field confirmed-from-county-records resumes as
 * confirmed with that source and timestamp (from metadata.provenance); an
 * accepted DTT/vesting proposal resumes as its recorded LegalChoiceRecord.
 * Where a legacy draft lacks provenance for a field, the field resumes as
 * a CANDIDATE requiring re-confirmation — fail toward re-asking, never
 * toward auto-confirmed. Resume must not launder unconfirmed data.
 */
import type {
  DTTData,
  DeedBuilderState,
  FieldSource,
  LegalChoiceRecord,
  PropertyProvenance,
  Sourced,
} from '@/types/builder';

interface ProvenanceEntry {
  source?: string;
  confirmed_at?: string | null;
  code_section?: string;
  basis?: string;
}

export interface ResumeResult {
  state: DeedBuilderState;
  /** Fields the row/metadata cannot reconstruct — reported, never silent. */
  gaps: string[];
}

const KNOWN_SOURCES: FieldSource[] = ['sitex', 'google', 'user', 'titlepoint', 'ai_suggested'];

function asSource(raw: string | undefined): FieldSource {
  return KNOWN_SOURCES.includes(raw as FieldSource) ? (raw as FieldSource) : 'sitex';
}

/**
 * Restore one field's Sourced wrapper from a recorded provenance entry.
 * No entry, or an entry without a confirmation timestamp → candidate
 * (re-confirmation required at the gate).
 */
function restoreSourced(value: string, entry?: ProvenanceEntry): Sourced<string> {
  if (entry && entry.confirmed_at) {
    return {
      value,
      source: asSource(entry.source),
      status: 'confirmed',
      confirmedAt: entry.confirmed_at,
    };
  }
  return { value, source: asSource(entry?.source), status: 'candidate' };
}

function restoreLegalChoice(entry?: ProvenanceEntry): LegalChoiceRecord | undefined {
  // A legal choice is only ever recorded as confirmed; an entry without a
  // timestamp is not a decision and must NOT resurrect as one.
  if (!entry || !entry.confirmed_at) return undefined;
  return {
    source: asSource(entry.source),
    status: 'confirmed',
    confirmedAt: entry.confirmed_at,
    ...(entry.code_section ? { codeSection: entry.code_section } : {}),
    ...(entry.basis ? { basis: entry.basis } : {}),
  };
}

/** Best-effort split of "street, city, ST zip" (the shape the builder saves). */
function parseAddress(full: string): { address: string; city: string; state: string; zip: string } {
  const parts = full.split(',').map((p) => p.trim());
  if (parts.length >= 3) {
    const tail = parts[parts.length - 1].match(/^([A-Z]{2})\s+([\d-]+)$/);
    if (tail) {
      return {
        address: parts.slice(0, parts.length - 2).join(', '),
        city: parts[parts.length - 2],
        state: tail[1],
        zip: tail[2],
      };
    }
  }
  return { address: full, city: '', state: 'CA', zip: '' };
}

export function hydrateStateFromDeedRow(row: Record<string, any>): ResumeResult {
  const gaps: string[] = [];
  const meta: Record<string, any> =
    typeof row.metadata === 'string' ? JSON.parse(row.metadata || '{}') : row.metadata || {};
  const prov: Record<string, ProvenanceEntry> = meta.provenance || {};

  if (!meta.provenance) {
    gaps.push('No recorded provenance (legacy draft) — sourced fields resume as candidates requiring re-confirmation');
  }

  // ── Property ───────────────────────────────────────────────────
  // Persistence follow-up: city/state/zip and the county-records owner are
  // stored in metadata at save; the address-string parse remains only as
  // the fallback for drafts saved before that change.
  const parsed = parseAddress(row.property_address || '');
  const city = meta.property_city || parsed.city;
  const stateCode = meta.property_state || parsed.state;
  const zip = meta.property_zip || parsed.zip;
  if (!city) {
    gaps.push('Property city/state/zip were not saved with this draft — could not parse them from the address');
  }
  const owner: string | undefined = meta.current_owner || undefined;
  if (!owner) {
    gaps.push('Current-owner (county records) value was not saved with this draft — owner prefill not restored');
  }
  const propertyProvenance: PropertyProvenance = {};
  if (row.apn) propertyProvenance.apn = restoreSourced(row.apn, prov.apn);
  if (row.legal_description) {
    propertyProvenance.legalDescription = restoreSourced(row.legal_description, prov.legalDescription);
  }
  if (owner) propertyProvenance.owner = restoreSourced(owner, prov.owner);

  // ── DTT (metadata stores the raw generate-payload shape) ───────
  let dtt: DTTData | null = null;
  if (meta.dtt) {
    dtt = {
      isExempt: !!meta.dtt.is_exempt,
      exemptReason: meta.dtt.exemption_reason || '',
      transferValue: String(meta.dtt.transfer_value ?? ''),
      calculatedAmount: String(meta.dtt.calculated_amount ?? ''),
      basis: meta.dtt.basis === 'less_liens' ? 'less_liens' : 'full_value',
      areaType: meta.dtt.area_type === 'city' ? 'city' : 'unincorporated',
      cityName: meta.dtt.city_name || '',
    };
  }

  // ── Mail-to: dict means the grantee-at-property block ──────────
  const returnTo =
    meta.return_to && typeof meta.return_to === 'object' ? 'grantee' : '';

  const state: DeedBuilderState = {
    deedType: row.deed_type || 'grant-deed',
    property: {
      address: parsed.address,
      city,
      county: row.county || '',
      state: stateCode,
      zip,
      apn: row.apn || '',
      legalDescription: row.legal_description || '',
      ...(owner ? { owner } : {}),
      provenance: propertyProvenance,
    },
    grantor: row.grantor_name || '',
    grantorProvenance: row.grantor_name
      ? restoreSourced(row.grantor_name, prov.grantor)
      : undefined,
    grantee: row.grantee_name || '',
    vesting: row.vesting || '',
    dtt,
    dttDecision: restoreLegalChoice(prov.dtt),
    vestingDecision: restoreLegalChoice(prov.vesting),
    preflightOverrides:
      prov.preflight_overrides && typeof prov.preflight_overrides === 'object'
        ? Object.fromEntries(
            Object.entries(prov.preflight_overrides as Record<string, any>).map(
              ([id, v]) => [id, (v as any)?.overridden_at ?? String(v)]
            )
          )
        : undefined,
    requestedBy: row.requested_by || '',
    requestedByAddress: meta.requested_by_address || '',
    affidavit: meta.affidavit || row.parties
      ? {
          // Declaration family: the single party lives in the parties
          // JSONB column (parties migration), not metadata.affidavit.
          declarantName: (row.parties && row.parties.declarant) || '',
          affiantName: meta.affidavit?.affiant_name || '',
          decedentName: meta.affidavit?.decedent_name || '',
          jtDeedDate: meta.affidavit?.jt_deed_date || '',
          jtDeedGrantor: meta.affidavit?.jt_deed_grantor || '',
          jtDeedGrantees: meta.affidavit?.jt_deed_grantees || '',
          deathDate: meta.affidavit?.death_date || '',
          deathPlace: meta.affidavit?.death_place || '',
          deedDate: meta.affidavit?.deed_date || '',
          deedGrantor: meta.affidavit?.deed_grantor || '',
          trustDate: meta.affidavit?.trust_date || '',
          trustors: meta.affidavit?.trustors || '',
          recordingDate: meta.affidavit?.recording_date || '',
          instrumentNo: meta.affidavit?.instrument_no || '',
        }
      : undefined,
    returnTo,
    titleOrderNo: meta.title_order_no || '',
    escrowNo: meta.escrow_no || '',
  };

  return { state, gaps };
}
