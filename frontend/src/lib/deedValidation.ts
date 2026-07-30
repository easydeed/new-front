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

/** FORMS: instrument families diverge here — affidavits have no
 * grantor/grantee/vesting/DTT; their substance is the sworn facts.
 * Family membership comes from the registry (one entry per type). */
import { formFamily, hasPropertySection, hasVestingInput } from '@/lib/formRegistry';

export function isAffidavitType(deedType: string | undefined): boolean {
  return formFamily(deedType) === 'affidavit';
}

export function isDeclarationType(deedType: string | undefined): boolean {
  return formFamily(deedType) === 'declaration';
}

export function evaluateSubstantive(state: DeedBuilderState): CheckResult[] {
  if (isDeclarationType(state.deedType)) {
    // Declaration family: single-party instruments validate by their real
    // substance. No grantee, no vesting, no DTT (not conveyances).
    if (state.deedType === 'trust-certification') {
      // Property-less (Prob C §18100.5): the substance is the trust and
      // its certifying trustee(s); the other transcriptions may print as
      // the reference's tolerated blanks.
      return [
        {
          id: 'trust_named',
          label: 'Trust named',
          ok: !!state.affidavit?.trustName?.trim(),
          sectionId: 'affidavit',
        },
        {
          id: 'trustees_present',
          label: 'Certifying trustee(s) stated',
          ok: !!state.affidavit?.trustees?.trim(),
          sectionId: 'affidavit',
        },
      ];
    }
    if (state.deedType === 'tod-revocation') {
      // The statutory form names the grantor only at signature; the typed
      // name identifies the record (and the parties column) — plus the
      // affected property's description.
      return [
        {
          id: 'revoking_grantor_named',
          label: 'Revoking grantor named',
          ok: !!state.affidavit?.revokingGrantor?.trim(),
          sectionId: 'affidavit',
        },
        {
          id: 'legal_description_present',
          label: 'Legal description present',
          ok: !!state.property?.legalDescription?.trim(),
          sectionId: 'property',
        },
      ];
    }
    if (state.deedType === 'homestead-declaration-spouses') {
      // Both declared owners, plus the premises.
      return [
        {
          id: 'declarants_present',
          label: 'Both declared owners stated',
          ok: !!state.affidavit?.declarantName?.trim() && !!state.affidavit?.declarant2Name?.trim(),
          sectionId: 'affidavit',
        },
        {
          id: 'legal_description_present',
          label: 'Legal description present',
          ok: !!state.property?.legalDescription?.trim(),
          sectionId: 'property',
        },
      ];
    }
    if (state.deedType === 'homestead-abandonment') {
      // The prior declaration is identified by who executed it and its
      // recording reference (the recorded-instrument class).
      return [
        {
          id: 'prior_declarant_named',
          label: 'Prior declaration executed-by stated',
          ok: !!state.affidavit?.priorDeclarant?.trim(),
          sectionId: 'affidavit',
        },
        {
          id: 'recorded_instrument_reference',
          label: 'Recorded declaration reference',
          ok: !!state.affidavit?.instrumentNo?.trim() && !!state.affidavit?.recordingDate?.trim(),
          detail: 'The recorded declaration is identified by its recording date and instrument number.',
          sectionId: 'affidavit',
        },
        {
          id: 'legal_description_present',
          label: 'Legal description present',
          ok: !!state.property?.legalDescription?.trim(),
          sectionId: 'property',
        },
      ];
    }
    // Homestead (individual): the declarant plus the premises.
    return [
      {
        id: 'declarant_present',
        label: 'Declarant stated',
        ok: !!state.affidavit?.declarantName?.trim(),
        sectionId: 'affidavit',
      },
      {
        id: 'legal_description_present',
        label: 'Legal description present',
        ok: !!state.property?.legalDescription?.trim(),
        sectionId: 'property',
      },
    ];
  }
  if (isAffidavitType(state.deedType)) {
    const aff = state.affidavit;
    return [
      {
        id: 'affiant_present',
        label: 'Affiant stated',
        ok: !!aff?.affiantName?.trim(),
        sectionId: 'affidavit',
      },
      {
        id: 'decedent_present',
        label: 'Decedent stated',
        ok: !!aff?.decedentName?.trim(),
        sectionId: 'affidavit',
      },
      {
        // Common to every affidavit-of-death variant: the recorded
        // instrument the decedent held title under (JT deed, CP deed, or
        // the deed to the trustee) is identified by its recording data.
        id: 'recorded_instrument_reference',
        label: 'Recorded deed reference',
        ok: !!aff?.instrumentNo?.trim() && !!aff?.recordingDate?.trim(),
        detail: 'The recorded deed is identified by its recording date and instrument number.',
        sectionId: 'affidavit',
      },
      {
        id: 'legal_description_present',
        label: 'Legal description present',
        ok: !!state.property?.legalDescription?.trim(),
        sectionId: 'property',
      },
    ];
  }
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
    hasVestingInput(state.deedType)
      ? {
          id: 'vesting_stated',
          label: 'Vesting stated',
          ok: !!state.vesting?.trim(),
          sectionId: 'vesting',
        }
      : {
          // Fixed-vesting variants (JT / CP w/ROS grant deeds): the vesting
          // phrase is printed on the instrument's face — choosing the form
          // IS the vesting decision (Flag-3). Structural fact, like the
          // notarial certificate.
          id: 'vesting_fixed_by_instrument',
          label: 'Vesting fixed by the instrument',
          ok: true,
          detail: 'This form prints its vesting on its face; there is no vesting entry.',
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
    // Property-less instruments (certification of trust) reference no
    // parcel — the APN/county conventions don't apply to them.
    ...(hasPropertySection(state.deedType)
      ? [
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
        ]
      : []),
    {
      id: 'return_address',
      label: 'Return address block',
      ok: !!state.returnTo?.trim() || !!state.requestedBy?.trim(),
      detail: 'The "when recorded mail to" block should identify a recipient.',
      sectionId: 'recording',
    },
    isAffidavitType(state.deedType)
      ? {
          id: 'jurat_included',
          label: 'Jurat (Gov C §8202)',
          ok: true, // the affidavit template includes it; static template fact
          detail: 'Affidavits are sworn statements — a jurat renders automatically.',
        }
      : {
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

// ─────────────────────────────────────────────────────────────────
// U0 (UX audit): ONE TRUTH for section completeness. The header counter
// used to derive "complete" from mere field presence while the generation
// gate derived from confirmation state — so a resumed draft could show
// "6 of 6 sections complete" beside an unconfirmed-field warning. Section
// status now derives from the gate's own primitives: a section holding
// unconfirmed candidate DATA fields or failing substantive checks is not
// complete. (Empty optional fields — e.g. an owner never returned by
// county records — have nothing to confirm and do not tarnish a section:
// the gate ignores them and nothing unconfirmed can reach the PDF.)
// ─────────────────────────────────────────────────────────────────
import { collectCandidateFields } from '@/lib/provenance';

export type SectionStatus = 'complete' | 'warning' | 'empty' | 'error';

const CANDIDATE_SECTION: Record<string, string> = {
  apn: 'property',
  legalDescription: 'property',
  owner: 'property',
  grantor: 'grantor',
};

export interface SectionTruth {
  statuses: Record<string, SectionStatus>;
  completedCount: number;
  totalSections: number;
  /** Sections filled + substantive checks pass — candidates alone don't
   * block the button; the gate modal is their confirm-all affordance. */
  readyForGate: boolean;
  /** Unconfirmed data fields the gate will ask about. */
  pendingConfirmations: number;
}

export function deriveSectionTruth(state: DeedBuilderState): SectionTruth {
  const candidates = collectCandidateFields(state);
  const candidateSections = new Set(candidates.map((c) => CANDIDATE_SECTION[c.key]));
  const failingSections = new Set(
    evaluateSubstantive(state).filter((c) => !c.ok).map((c) => c.sectionId)
  );

  const status = (section: string, filled: boolean, extraWarning = false): SectionStatus => {
    if (!filled) return 'empty';
    if (candidateSections.has(section) || failingSections.has(section) || extraWarning) {
      return 'warning';
    }
    return 'complete';
  };

  if (isAffidavitType(state.deedType) || isDeclarationType(state.deedType)) {
    const aff = state.affidavit;
    // The typed-facts section is complete when its family's substantive
    // facts are present: the declaration's single declarant, or the
    // affidavit's affiant/decedent/recording reference.
    const affFilled = state.deedType === 'trust-certification'
      ? !!(aff?.trustName?.trim() && aff?.trustees?.trim())
      : state.deedType === 'tod-revocation'
        ? !!aff?.revokingGrantor?.trim()
        : state.deedType === 'homestead-declaration-spouses'
          ? !!(aff?.declarantName?.trim() && aff?.declarant2Name?.trim())
          : state.deedType === 'homestead-abandonment'
            ? !!(aff?.priorDeclarant?.trim() && aff?.instrumentNo?.trim() && aff?.recordingDate?.trim())
            : isDeclarationType(state.deedType)
              ? !!aff?.declarantName?.trim()
              : !!(aff?.affiantName?.trim() && aff?.decedentName?.trim() &&
                aff?.instrumentNo?.trim() && aff?.recordingDate?.trim());
    const statuses: Record<string, SectionStatus> = {
      // Property-less instruments (certification of trust) have no
      // property section — the one-truth counter must not count it.
      ...(hasPropertySection(state.deedType)
        ? { property: status('property', !!state.property?.address) }
        : {}),
      affidavit: status('affidavit', affFilled),
      recording: status('recording', !!state.requestedBy?.trim()),
    };
    const values = Object.values(statuses);
    return {
      statuses,
      completedCount: values.filter((s) => s === 'complete').length,
      totalSections: values.length,
      readyForGate: !values.includes('empty') && failingSections.size === 0,
      pendingConfirmations: candidates.length,
    };
  }

  const granteeEchoesGrantor =
    !!state.grantee?.trim() &&
    state.grantee.trim().toUpperCase() === state.grantor?.trim().toUpperCase();

  const statuses: Record<string, SectionStatus> = {
    property: status('property', !!state.property?.address),
    grantor: status('grantor', !!state.grantor?.trim()),
    grantee: status('grantee', !!state.grantee?.trim(), granteeEchoesGrantor),
    // Fixed-vesting variants have no vesting section — its status must not
    // appear in the one-truth counter (a section that cannot be opened can
    // never read "incomplete").
    ...(hasVestingInput(state.deedType)
      ? { vesting: status('vesting', !!state.vesting?.trim()) }
      : {}),
    transferTax: status(
      'transferTax',
      !!(state.dtt?.isExempt && state.dtt?.exemptReason) || !!state.dtt?.transferValue
    ),
    recording: status('recording', !!state.requestedBy?.trim()),
  };

  const values = Object.values(statuses);
  return {
    statuses,
    completedCount: values.filter((s) => s === 'complete').length,
    totalSections: values.length,
    readyForGate: !values.includes('empty') && failingSections.size === 0,
    pendingConfirmations: candidates.length,
  };
}
