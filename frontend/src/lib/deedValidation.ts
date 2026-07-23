/**
 * Two-stage pre-generate validation (Ticket V).
 *
 * Stage 1 — SUBSTANTIVE READINESS: is the document complete as a document
 * (parties, legal description, transfer-tax decision, vesting)? Failures
 * block generation like unconfirmed data.
 *
 * Stage 2 — RECORDER PREFLIGHT (CA / LA County formatting conventions):
 * will the recorder's intake likely accept the formatting? Failures are
 * warnings the officer may explicitly override; overrides are recorded in
 * metadata like other confirmations.
 *
 * Doctrine: never conflate recorder acceptance with legal sufficiency.
 * Copy in this module must not imply legal validity — these are
 * completeness and formatting checks, not legal advice.
 */
import type { DeedBuilderState } from '@/types/builder';
import { isDttSuggestionPending } from '@/lib/dttSuggestions';

export interface CheckResult {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
  /** Builder section to open when the officer clicks through to fix it. */
  sectionId?: string;
}

const dttComplete = (state: DeedBuilderState): boolean => {
  const dtt = state.dtt;
  if (!dtt) return false;
  return (dtt.isExempt && !!dtt.exemptReason) || !!dtt.transferValue;
};

export function evaluateSubstantive(state: DeedBuilderState): CheckResult[] {
  const pending = isDttSuggestionPending(state);
  // Decided = a recorded instruction exists, or (legacy drafts predating the
  // decision record) the section is complete with no suggestion pending.
  const dttDecided = !!state.dttDecision || (dttComplete(state) && !pending);
  return [
    {
      id: 'grantor_present',
      label: 'Grantor stated',
      ok: !!state.grantor?.trim(),
      sectionId: 'grantor',
    },
    {
      id: 'grantee_present',
      label: 'Grantee stated',
      ok: !!state.grantee?.trim(),
      sectionId: 'grantee',
    },
    {
      id: 'legal_description_present',
      label: 'Legal description present',
      ok: !!state.property?.legalDescription?.trim(),
      sectionId: 'property',
    },
    {
      id: 'vesting_stated',
      label: 'Vesting stated',
      ok: !!state.vesting?.trim(),
      sectionId: 'vesting',
    },
    {
      id: 'dtt_decided',
      label: 'Transfer tax decided',
      ok: dttDecided,
      detail: pending
        ? 'A suggested exemption is awaiting your decision. It will not be applied unless you accept it.'
        : dttDecided ? undefined : 'Enter the transfer-tax treatment or exemption.',
      sectionId: 'transferTax',
    },
  ];
}

export function evaluateRecorderPreflight(state: DeedBuilderState): CheckResult[] {
  return [
    {
      id: 'apn_present',
      label: 'APN present',
      ok: !!state.property?.apn?.trim(),
      detail: 'Recorder intake conventions expect an Assessor’s Parcel Number.',
      sectionId: 'property',
    },
    {
      id: 'county_set',
      label: 'County set',
      ok: !!state.property?.county?.trim(),
      sectionId: 'property',
    },
    {
      id: 'return_address',
      label: 'Return address block',
      ok: !!state.returnTo?.trim() || !!state.requestedBy?.trim(),
      detail: 'The "when recorded mail to" block should identify a recipient.',
      sectionId: 'recording',
    },
    {
      id: 'acknowledgment_page',
      label: 'Acknowledgment page (CC §1189)',
      ok: true, // included by every deed template (Ticket N); static template fact
      detail: 'Included automatically in the generated document.',
    },
    {
      id: 'page_setup',
      label: 'Page size and recorder box',
      ok: true, // letter size + recorder-box margins are fixed in the templates
      detail: 'Letter size with recorder-box clearance per template.',
    },
  ];
}

/** Preflight failures that the officer has not explicitly overridden. */
export function unresolvedPreflight(
  state: DeedBuilderState,
): CheckResult[] {
  const overrides = state.preflightOverrides ?? {};
  return evaluateRecorderPreflight(state).filter((c) => !c.ok && !overrides[c.id]);
}
