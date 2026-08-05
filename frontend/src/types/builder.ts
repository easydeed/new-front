/**
 * Field-level provenance wrapper. Every value that originates from an external
 * source (SiteX, Google, TitlePoint) or the user carries where it came from and
 * whether the escrow officer has confirmed it. The system suggests; the officer
 * confirms; we record the confirmation. AI/auto-fill never silently writes a
 * confirmed legal value.
 */
/**
 * T-6 added 'prelim': a value read deterministically out of an uploaded
 * preliminary title report. Deliberately NOT 'ai_suggested' — a labelled
 * pattern match is not a suggestion, and mislabelling it would smuggle in
 * the LLM ruling that has not been made.
 */
export type FieldSource =
  | 'sitex' | 'google' | 'user' | 'titlepoint' | 'prelim' | 'ai_suggested';
export type FieldStatus = 'candidate' | 'confirmed';

/**
 * Record of a LEGAL CHOICE (e.g. the DTT exemption). The rule differs from
 * data fields: a legal choice is never auto-applied and never exists in
 * 'candidate' state inside the deed. The AI may propose; the field stays
 * unset until the escrow officer explicitly accepts; acceptance IS the
 * authorized instruction, recorded with the code section and basis shown.
 */
export interface LegalChoiceRecord {
  source: FieldSource;       // 'ai_suggested' (accepted proposal) | 'user' (manual entry)
  status: 'confirmed';       // legal choices are only ever recorded as confirmed
  confirmedAt: string;       // ISO timestamp of the officer's action
  codeSection?: string;      // e.g. 'R&T 11927' — the section proposed/accepted
  basis?: string;            // the plain-English basis shown to the officer
}

export interface Sourced<T> {
  value: T;
  source: FieldSource;
  status: FieldStatus;
  confirmedAt?: string; // ISO timestamp, set when status becomes 'confirmed'
}

/**
 * Doctrine A — an INTERPRETATION offered for acceptance.
 *
 * Deliberately not a Sourced<string>: 'proposed' is not a FieldStatus, so
 * nothing in the confirmation model (collectCandidateFields, the gate
 * modal, propertyCandidatesRemaining) can pick this up and offer it beside
 * an APN. A characterization must never be confirmable by the affordance
 * built for transcriptions — that is the whole defect H1 §2.2 legislates
 * and RED0 found from the inside.
 *
 * Acceptance produces a LegalChoiceRecord, exactly as the AI vesting
 * proposal does. Until then the value is displayed and applied nowhere.
 */
export interface VestingProposal {
  value: string;
  source: FieldSource;
  status: 'proposed';
  /** Whose reading it is, and which question it answers (H1 §2.3). */
  basis: string;
}

/**
 * Doctrine A — what a mixed-content owner string decomposed into.
 *
 * `verbatim` is audit-only: a bare string, not a Sourced<>, because
 * nothing that lacks the shape of a confirmable field can be confirmed by
 * accident. `needsReview` set means we could not split the string and
 * NEITHER half is offered — the officer types both.
 */
export interface OwnerSplit {
  verbatim: string;
  mixedContent: boolean;
  vestingProposal?: VestingProposal;
  needsReview?: string;
}

/**
 * Provenance for the SiteX-sourced PropertyData fields covered by Ticket #1.
 * Kept alongside the bare values so the deed PDF/generation path (which reads
 * property.apn etc.) is unchanged by this ticket.
 */
export interface PropertyProvenance {
  apn?: Sourced<string>;
  legalDescription?: Sourced<string>;
  owner?: Sourced<string>;
}

export interface PropertyData {
  address: string;
  city: string;
  county: string;
  state: string;
  zip: string;
  apn: string;
  legalDescription: string;
  owner?: string;
  /**
   * Provenance for apn / legalDescription / owner. Optional so existing callers
   * and the generation payload continue to work against the bare value fields.
   */
  provenance?: PropertyProvenance;
  /**
   * Doctrine A: what the county record's owner string decomposed into.
   * `owner` above carries the PARTIES only; the vesting characterization
   * that arrived welded to them lives here as a proposal and reaches the
   * deed only through the officer's acceptance.
   */
  ownerSplit?: OwnerSplit;
}

export interface DTTData {
  isExempt: boolean;
  exemptReason: string;
  transferValue: string;
  calculatedAmount: string;
  basis: 'full_value' | 'less_liens';
  areaType: 'city' | 'unincorporated';
  cityName?: string;
}

export interface AffidavitFacts {
  /* Common to every affidavit-of-death variant: who swears, who died, and
     the recording reference of the instrument under which the decedent
     held title (how the recorder ties the documents together). */
  affiantName: string;
  decedentName: string;
  recordingDate: string;
  instrumentNo: string;
  /* JT variant — the joint-tenancy deed being cleared. */
  jtDeedDate?: string;
  jtDeedGrantor?: string;
  jtDeedGrantees?: string;
  /* CP w/ROS (spouse) variant — death particulars + the CP deed. */
  deathDate?: string;
  deathPlace?: string;
  deedDate?: string;
  deedGrantor?: string;
  /* Trustee variant — the declaration of trust. */
  trustDate?: string;
  trustors?: string;
  /* Declaration family (homestead): the declarant(s). Persisted to the
     deeds.parties JSONB column, not metadata.affidavit. */
  declarantName?: string;
  /* Homestead — Spouses variant: the second declared owner. */
  declarant2Name?: string;
  /* Homestead — Abandonment: the prior declaration being abandoned
     (executed-by + dates identify the recorded instrument). */
  priorDeclarant?: string;
  declarationDate?: string;
  /* Certification of trust (Prob C §18100.5) — typed transcriptions of
     the trust instrument. The form's initial lines and checkboxes stay
     BLANK for the trustee's hand (owner ruling: execution acts). */
  trustName?: string;
  settlors?: string;
  trustees?: string;
  revocability?: string;
  revokerName?: string;
  signerCount?: string;
  signerNames?: string;
  titleVesting?: string;
  /* TOD revocation (Prob C §5600): the revoking grantor — record
     identification only; the statutory form is signed AND printed by the
     grantor at notarization (execution act; nothing pre-prints). */
  revokingGrantor?: string;
  /* Entity grant deeds (wave 2 #6): typed facts completing the entity-
     grantor recital — state of organization, and the partnership's kind
     (general/limited) on the partnership form. */
  entityState?: string;
  partnershipType?: string;
  /* Statutory POA (Prob C §4401, wave 2 #7): the ONLY typed facts — the
     statute's blanks are "(your name and address)" and the appointee(s).
     Every other mark (power initials, special instructions, the
     separately/jointly word, the incapacity strike) is the PRINCIPAL's
     execution act and renders blank/verbatim, never pre-completed. */
  principalName?: string;
  agentNames?: string;
  /* Substitution of Trustee (wave 2 #8): the deed of trust is identified
     by its original parties + recording reference; the undersigned
     beneficiary substitutes the new trustee. */
  originalTrustor?: string;
  originalTrustee?: string;
  originalBeneficiary?: string;
  newTrustee?: string;
}

export interface DeedBuilderState {
  deedType: string;
  property: PropertyData | null;
  grantor: string;
  /**
   * Provenance for the grantor name, mirroring property.provenance: SiteX
   * prefill arrives as a candidate the officer confirms; manual entry is
   * user-sourced and confirmed on entry. Optional so the bare grantor value
   * and the generation payload keep working unchanged.
   */
  grantorProvenance?: Sourced<string>;
  grantee: string;
  vesting: string;
  dtt: DTTData | null;
  /** The officer's recorded transfer-tax instruction (Ticket TT). */
  dttDecision?: LegalChoiceRecord;
  /** The officer's recorded vesting instruction (vesting sibling ticket). */
  vestingDecision?: LegalChoiceRecord;
  /** Officer dismissed the pending DTT suggestion (reject leaves manual entry). */
  dttSuggestionDismissed?: boolean;
  /**
   * Recorder-preflight warnings the officer explicitly overrode, id -> ISO
   * timestamp of the override (Ticket V). Recorded in metadata like other
   * confirmations.
   */
  preflightOverrides?: Record<string, string>;
  /** FORMS-SPIKE: affidavit-of-death facts (affidavit-death-jt type). */
  affidavit?: AffidavitFacts;
  requestedBy: string;
  /** D2: the requesting party's mailing address (one line, optional). */
  requestedByAddress?: string;
  returnTo: string;
  titleOrderNo?: string;
  escrowNo?: string;
}

