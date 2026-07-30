/**
 * FORMS registry — ONE entry per instrument type (owner-approved before
 * wave 1, so type #7 costs what type #2 costs).
 *
 * The spike proved the chassis generalizes but left type facts scattered
 * (labels here, titles there, family branches in validation). This
 * registry is the single source: adding a Tier-A sibling means one entry
 * here + a template + (usually) an existing section list.
 *
 * What a config CANNOT do: add legal choices. Anything beyond furniture +
 * officer-supplied facts still requires the decision-gate treatment and a
 * doctrine pass — the registry deliberately has no field for "auto-apply".
 */

export type NotarialCertificate = 'acknowledgment' | 'jurat';
/**
 * deed        — two-party conveyance: acknowledgment + DTT declaration.
 * affidavit   — sworn statement: jurat, no DTT; parties aliased onto the
 *               grantor/grantee columns (decedent/affiant).
 * declaration — single-party acknowledged instrument (homestead declarant,
 *               certifying trustee): acknowledgment, no DTT; parties live
 *               in the deeds.parties JSONB column (owner-ledgered
 *               migration), not the grantor/grantee pair.
 */
export type FormFamily = 'deed' | 'affidavit' | 'declaration';

export interface CompanionNotice {
  /** Passive guidance ONLY — never a block, never form-fill work. */
  text: string;
  linkText: string;
  href: string;
}

/**
 * One officer-typed fact input on an affidavit-family form. These are DATA
 * descriptors (label/placeholder/grouping) for the shared AffidavitSection —
 * a field spec can describe an input, never decide a legal question.
 */
export interface AffidavitFieldSpec {
  /** AffidavitFacts key (camelCase; serialized snake_case in metadata). */
  key: string;
  label: string;
  placeholder: string;
  uppercase?: boolean;
  hint?: string;
  /** Group heading rendered when it differs from the previous field's. */
  group?: string;
}

export interface FormTypeConfig {
  slug: string;
  /** List/table display label. */
  label: string;
  /** Document title as rendered on the instrument/preview. */
  title: string;
  /** Reference-faithful subtitle line(s) under the title, when the blank
      form carries one (e.g. the CP w/ROS affidavit's qualifier lines). */
  subtitle?: string;
  /** Card copy on the type-selection page. */
  description: string;
  popular: boolean;
  family: FormFamily;
  /** Ordered builder sections for this type. */
  sections: string[];
  /** Which notarial certificate the template includes (informational —
      templates own their includes; pinned in backend tests). */
  notarial: NotarialCertificate;
  /** Whether the instrument carries a documentary-transfer-tax block. */
  hasDtt: boolean;
  /** Success-page companion-filing guidance (owner ruling, spike flag 4). */
  companionNotice?: CompanionNotice;
  /** Officer-typed fact inputs (affidavit family only) — drives the shared
      AffidavitSection so a sibling form is registry data + a template. */
  affidavitFields?: AffidavitFieldSpec[];
}

const DEED_SECTIONS = ['property', 'grantor', 'grantee', 'vesting', 'transferTax', 'recording'];
/* Fixed-vesting deed variants (wave 1 #3/#4): the vesting phrase is printed
   on the instrument's face as furniture — choosing the form IS the vesting
   decision (Flag-3 precedent), so there is no vesting input. Everything
   else, including the full transfer-tax decision gate, is unchanged. */
const FIXED_VESTING_DEED_SECTIONS = ['property', 'grantor', 'grantee', 'transferTax', 'recording'];
/* The 'affidavit' section id names the shared TYPED-FACTS section — every
   non-deed family (sworn affidavits AND acknowledged declarations) uses it
   for its officer-typed instrument facts. */
const AFFIDAVIT_SECTIONS = ['property', 'affidavit', 'recording'];
const DECLARATION_SECTIONS = ['property', 'affidavit', 'recording'];
/* Property-less: the certification of trust describes a TRUST, not a
   parcel — no property search, no APN, no legal description. */
const PROPERTYLESS_DECLARATION_SECTIONS = ['affidavit', 'recording'];

/* Spike flag 4 ruling (applies to every affidavit-of-death variant):
   passive guidance only. The BOE-502-D itself is Tier B (form-fill
   pipeline), owner-directed LAST — no form-fill work. */
const BOE_502D_NOTICE: CompanionNotice = {
  text: 'Counties commonly require a BOE-502-D (Change in Ownership Statement — Death of Real Property Owner) filed with this affidavit.',
  linkText: 'Get the form from the California BOE',
  href: 'https://www.boe.ca.gov/proptaxes/forms.htm',
};

/* Common affidavit facts: every death-affidavit swears WHO and identifies
   the recorded instrument the decedent held title under. */
const AFFIANT_FIELD: AffidavitFieldSpec = {
  key: 'affiantName',
  label: 'Affiant (person swearing the statement)',
  placeholder: 'JANE B. DOE',
  uppercase: true,
  hint: 'Signs before a notary.',
};
const DECEDENT_FIELD: AffidavitFieldSpec = {
  key: 'decedentName',
  label: 'Decedent',
  placeholder: 'JOHN A. DOE',
  uppercase: true,
  hint: 'As named on the certified copy of the Certificate of Death.',
};
const RECORDING_REF_FIELDS = (group: string): AffidavitFieldSpec[] => [
  { key: 'recordingDate', label: 'Recorded on', placeholder: 'June 15, 2015', group },
  {
    key: 'instrumentNo',
    label: 'Instrument No.',
    placeholder: '2015-0654321',
    group,
    hint: 'From the recorded instrument — this is how the recorder ties the documents.',
  },
];

export const FORM_REGISTRY: Record<string, FormTypeConfig> = {
  'grant-deed': {
    slug: 'grant-deed',
    label: 'Grant Deed',
    title: 'GRANT DEED',
    description: 'Standard transfer of property ownership with implied warranties',
    popular: true,
    family: 'deed',
    sections: DEED_SECTIONS,
    notarial: 'acknowledgment',
    hasDtt: true,
  },
  'quitclaim-deed': {
    slug: 'quitclaim-deed',
    label: 'Quitclaim Deed',
    title: 'QUITCLAIM DEED',
    description: 'Transfer ownership without warranties — commonly used between family members',
    popular: true,
    family: 'deed',
    sections: DEED_SECTIONS,
    notarial: 'acknowledgment',
    hasDtt: true,
  },
  'interspousal-transfer': {
    slug: 'interspousal-transfer',
    label: 'Interspousal Transfer Deed',
    title: 'INTERSPOUSAL TRANSFER DEED',
    description: 'Transfer between spouses — exempt from documentary transfer tax',
    popular: true,
    family: 'deed',
    sections: DEED_SECTIONS,
    notarial: 'acknowledgment',
    hasDtt: true,
  },
  'warranty-deed': {
    slug: 'warranty-deed',
    label: 'Warranty Deed',
    title: 'WARRANTY DEED',
    description: 'Provides the strongest buyer protections with full title guarantees',
    popular: false,
    family: 'deed',
    sections: DEED_SECTIONS,
    notarial: 'acknowledgment',
    hasDtt: true,
  },
  'tax-deed': {
    slug: 'tax-deed',
    label: 'Tax Deed',
    title: 'TAX DEED',
    description: 'Transfer resulting from tax sale — typically used by government entities',
    popular: false,
    family: 'deed',
    sections: DEED_SECTIONS,
    notarial: 'acknowledgment',
    hasDtt: true,
  },
  // Wave 1 form #3 — reference: PCT blank form #28 (Deed-JointTenancy).
  'grant-deed-jt': {
    slug: 'grant-deed-jt',
    label: 'Grant Deed — Joint Tenancy',
    title: 'JOINT TENANCY GRANT DEED',
    description: 'Grant deed conveying to two or more grantees as joint tenants — vesting printed on the face of the form',
    popular: false,
    family: 'deed',
    sections: FIXED_VESTING_DEED_SECTIONS,
    notarial: 'acknowledgment',
    hasDtt: true,
  },
  // Wave 1 form #4 — reference: PCT blank form #21 (Deed-CPSurvivorship).
  'grant-deed-cp-ros': {
    slug: 'grant-deed-cp-ros',
    label: 'Grant Deed — Community Property w/ Right of Survivorship',
    title: 'GRANT DEED',
    subtitle: 'Community Property with Right of Survivorship',
    description: 'Grant deed conveying to spouses as community property with right of survivorship — vesting printed on the face of the form',
    popular: false,
    family: 'deed',
    sections: FIXED_VESTING_DEED_SECTIONS,
    notarial: 'acknowledgment',
    hasDtt: true,
  },
  // Wave 2 form #6 — TWO references implement the one owner-named form
  // ("Corporation/Partnership as Grantor"): PCT #22 (Deed-Corporation)
  // and #29 (Deed-Partnership). Entity recitals are Flag-3 furniture;
  // state-of-organization / partnership-type are typed officer facts;
  // signature capacity lines ("By/And", "General Partner") are furniture
  // verified from the references. Full deed chassis incl. the DTT gate.
  'grant-deed-corp': {
    slug: 'grant-deed-corp',
    label: 'Corporation Grant Deed',
    title: 'CORPORATION GRANT DEED',
    description: 'Grant deed with a corporation as grantor — officers sign in capacity; full transfer-tax declaration',
    popular: false,
    family: 'deed',
    sections: DEED_SECTIONS,
    notarial: 'acknowledgment',
    hasDtt: true,
  },
  'grant-deed-partnership': {
    slug: 'grant-deed-partnership',
    label: 'Partnership Grant Deed',
    title: 'PARTNERSHIP GRANT DEED',
    description: 'Grant deed with a partnership as grantor — general partners sign in capacity; full transfer-tax declaration',
    popular: false,
    family: 'deed',
    sections: DEED_SECTIONS,
    notarial: 'acknowledgment',
    hasDtt: true,
  },
  'affidavit-death-jt': {
    slug: 'affidavit-death-jt',
    label: 'Affidavit — Death of Joint Tenant',
    title: 'AFFIDAVIT — DEATH OF JOINT TENANT',
    description: 'Clears a deceased joint tenant from title — sworn statement with jurat, death certificate attached',
    popular: false,
    family: 'affidavit',
    sections: AFFIDAVIT_SECTIONS,
    notarial: 'jurat',
    hasDtt: false,
    companionNotice: BOE_502D_NOTICE,
    affidavitFields: [
      { ...AFFIANT_FIELD, hint: 'Usually the surviving joint tenant. Signs before a notary.' },
      DECEDENT_FIELD,
      { key: 'jtDeedDate', label: 'Deed date', placeholder: 'June 1, 2015', group: 'The joint-tenancy deed being cleared' },
      { key: 'jtDeedGrantor', label: 'Executed by (grantor on that deed)', placeholder: 'ROBERT SELLER', uppercase: true, group: 'The joint-tenancy deed being cleared' },
      { key: 'jtDeedGrantees', label: 'To (grantees, as joint tenants)', placeholder: 'JOHN A. DOE AND JANE B. DOE', uppercase: true, group: 'The joint-tenancy deed being cleared' },
      ...RECORDING_REF_FIELDS('The joint-tenancy deed being cleared'),
    ],
  },
  // Wave 1 form #1 — reference: PCT blank form #3 (Aff_Death-CP_Rt_Surv).
  'affidavit-death-cp-spouse': {
    slug: 'affidavit-death-cp-spouse',
    label: 'Affidavit — Death of Spouse (CP w/ Right of Survivorship)',
    title: 'AFFIDAVIT OF DEATH',
    subtitle: 'Community Property with Right of Survivorship — Spouse',
    description: 'Clears a deceased spouse from community-property-with-survivorship title — sworn statement with jurat, death certificate attached',
    popular: false,
    family: 'affidavit',
    sections: AFFIDAVIT_SECTIONS,
    notarial: 'jurat',
    hasDtt: false,
    companionNotice: BOE_502D_NOTICE,
    affidavitFields: [
      { ...AFFIANT_FIELD, hint: 'The surviving spouse. Signs before a notary.' },
      DECEDENT_FIELD,
      { key: 'deathDate', label: 'Date of death', placeholder: 'March 3, 2026', group: 'Death particulars' },
      { key: 'deathPlace', label: 'Place of death', placeholder: 'Los Angeles, California', group: 'Death particulars' },
      { key: 'deedDate', label: 'Deed date', placeholder: 'June 1, 2015', group: 'The community-property deed being cleared' },
      { key: 'deedGrantor', label: 'Executed by (grantor on that deed)', placeholder: 'ROBERT SELLER', uppercase: true, group: 'The community-property deed being cleared' },
      ...RECORDING_REF_FIELDS('The community-property deed being cleared'),
    ],
  },
  // Wave 1 form #2 — reference: PCT blank form #7 (Aff_Death-Trustee).
  'affidavit-death-trustee': {
    slug: 'affidavit-death-trustee',
    label: 'Affidavit — Death of Trustee',
    title: 'AFFIDAVIT — DEATH OF TRUSTEE',
    description: 'Clears a deceased trustee from title held in trust — sworn by the surviving or successor trustee, death certificate attached',
    popular: false,
    family: 'affidavit',
    sections: AFFIDAVIT_SECTIONS,
    notarial: 'jurat',
    hasDtt: false,
    companionNotice: BOE_502D_NOTICE,
    affidavitFields: [
      { ...AFFIANT_FIELD, hint: 'The surviving or successor trustee. Signs before a notary.' },
      { ...DECEDENT_FIELD, hint: 'As named on the death certificate — the trustee whose interest is cleared.' },
      { key: 'trustDate', label: 'Declaration of Trust dated', placeholder: 'January 10, 2010', group: 'The declaration of trust' },
      { key: 'trustors', label: 'Executed by (trustor(s))', placeholder: 'JOHN A. DOE AND JANE B. DOE', uppercase: true, group: 'The declaration of trust' },
      ...RECORDING_REF_FIELDS("The deed by which the trustee acquired title"),
    ],
  },
  // Wave 2 form #2 — reference: PCT blank form #5 (Aff_Death-JT-DomPart).
  // Jurat verified from the reference; the §297 registered-domestic-
  // partnership recital is instrument-defining furniture (Flag-3, same
  // class as the CP-spouse clause 2).
  'affidavit-death-jt-dp': {
    slug: 'affidavit-death-jt-dp',
    label: 'Affidavit — Death of Joint Tenant (Domestic Partner)',
    title: 'AFFIDAVIT — DEATH OF JOINT TENANT',
    subtitle: 'By Surviving Domestic Partner',
    description: 'Clears a deceased joint tenant from title, sworn by the surviving registered domestic partner (Fam C §297) — jurat, death certificate attached',
    popular: false,
    family: 'affidavit',
    sections: AFFIDAVIT_SECTIONS,
    notarial: 'jurat',
    hasDtt: false,
    companionNotice: BOE_502D_NOTICE,
    affidavitFields: [
      { ...AFFIANT_FIELD, hint: 'The surviving registered domestic partner. Signs before a notary.' },
      DECEDENT_FIELD,
      { key: 'deathDate', label: 'Date of death', placeholder: 'March 3, 2026', group: 'Death particulars' },
      { key: 'deathPlace', label: 'Place of death', placeholder: 'Los Angeles, California', group: 'Death particulars' },
      { key: 'deedDate', label: 'Deed date', placeholder: 'June 1, 2015', group: 'The joint-tenancy deed being cleared' },
      { key: 'deedGrantor', label: 'Executed by (grantor on that deed)', placeholder: 'ROBERT SELLER', uppercase: true, group: 'The joint-tenancy deed being cleared' },
      { key: 'jtDeedGrantees', label: 'To (grantees, as joint tenants)', placeholder: 'JOHN A. DOE AND JAMES C. ROE', uppercase: true, group: 'The joint-tenancy deed being cleared' },
      ...RECORDING_REF_FIELDS('The joint-tenancy deed being cleared'),
    ],
  },
  // Wave 2 form #3 — reference: PCT blank form #2 (Aff_Death-CP_Rt_Surv-DomPart).
  'affidavit-death-cp-dp': {
    slug: 'affidavit-death-cp-dp',
    label: 'Affidavit — Death of Domestic Partner (CP w/ Right of Survivorship)',
    title: 'AFFIDAVIT OF DEATH',
    subtitle: 'Community Property with Right of Survivorship — Domestic Partner',
    description: 'Clears a deceased registered domestic partner from community-property-with-survivorship title (Fam C §297) — jurat, death certificate attached',
    popular: false,
    family: 'affidavit',
    sections: AFFIDAVIT_SECTIONS,
    notarial: 'jurat',
    hasDtt: false,
    companionNotice: BOE_502D_NOTICE,
    affidavitFields: [
      { ...AFFIANT_FIELD, hint: 'The surviving registered domestic partner. Signs before a notary.' },
      DECEDENT_FIELD,
      { key: 'deathDate', label: 'Date of death', placeholder: 'March 3, 2026', group: 'Death particulars' },
      { key: 'deathPlace', label: 'Place of death', placeholder: 'Los Angeles, California', group: 'Death particulars' },
      { key: 'deedDate', label: 'Deed date', placeholder: 'June 1, 2015', group: 'The community-property deed being cleared' },
      { key: 'deedGrantor', label: 'Executed by (grantor on that deed)', placeholder: 'ROBERT SELLER', uppercase: true, group: 'The community-property deed being cleared' },
      ...RECORDING_REF_FIELDS('The community-property deed being cleared'),
    ],
  },
  // Wave 1 form #5 — reference: PCT blank form #33 (Homestead_Dec-Indiv).
  // Correction-note family: ACKNOWLEDGED per CCP §704.930, not a jurat.
  'homestead-declaration': {
    slug: 'homestead-declaration',
    label: 'Declaration of Homestead',
    title: 'DECLARATION OF HOMESTEAD',
    subtitle: '(Individual)',
    description: 'Declares a homestead on the owner’s principal dwelling (CCP §704.930) — acknowledged and recorded',
    popular: false,
    family: 'declaration',
    sections: DECLARATION_SECTIONS,
    notarial: 'acknowledgment',
    hasDtt: false,
    affidavitFields: [
      {
        key: 'declarantName',
        label: 'Declarant (owner claiming the homestead)',
        placeholder: 'ROBERT OWNER',
        uppercase: true,
        hint: 'The owner residing in the dwelling. Signs before a notary.',
      },
    ],
  },
  // Wave 2 form #4 — reference: PCT blank form #34 (Homestead_Dec-Spouses).
  // Acknowledgment verified from the reference (CCP §704.930). TWO
  // declarants — a parties-JSONB shape, not a new class ("We are husband
  // and wife" is Flag-3 furniture, the CP-spouse-recital class).
  'homestead-declaration-spouses': {
    slug: 'homestead-declaration-spouses',
    label: 'Declaration of Homestead — Spouses',
    title: 'DECLARATION OF HOMESTEAD',
    subtitle: '(Spouses as Declared Owners)',
    description: 'Spouses declare a homestead on their principal dwelling (CCP §704.930) — acknowledged and recorded',
    popular: false,
    family: 'declaration',
    sections: DECLARATION_SECTIONS,
    notarial: 'acknowledgment',
    hasDtt: false,
    affidavitFields: [
      {
        key: 'declarantName',
        label: 'First declared owner',
        placeholder: 'ROBERT OWNER',
        uppercase: true,
        hint: 'Both spouses sign before a notary.',
      },
      {
        key: 'declarant2Name',
        label: 'Second declared owner (spouse)',
        placeholder: 'MARIA OWNER',
        uppercase: true,
      },
    ],
  },
  // Wave 2 form #5 — reference: PCT blank form #32 (Homestead-Abandon).
  // Acknowledgment verified from the reference; the operative
  // "hereby abandon(s)" recital is instrument-defining furniture (the
  // TOD-revocation operative-statement precedent), and the prior
  // declaration's recording reference is the recorded-instrument class.
  'homestead-abandonment': {
    slug: 'homestead-abandonment',
    label: 'Abandonment of Declared Homestead',
    title: 'DECLARATION OF ABANDONMENT OF DECLARED HOMESTEAD',
    description: 'Abandons a previously recorded homestead declaration — acknowledged; identifies the prior declaration by its recording reference',
    popular: false,
    family: 'declaration',
    sections: DECLARATION_SECTIONS,
    notarial: 'acknowledgment',
    hasDtt: false,
    affidavitFields: [
      {
        key: 'priorDeclarant',
        label: 'Prior declaration executed by',
        placeholder: 'ROBERT OWNER',
        uppercase: true,
        hint: 'As named on the recorded Homestead Declaration being abandoned. Also the abandoning owner.',
        group: 'The recorded declaration being abandoned',
      },
      { key: 'declarationDate', label: 'Executed on', placeholder: 'June 1, 2015', group: 'The recorded declaration being abandoned' },
      ...RECORDING_REF_FIELDS('The recorded declaration being abandoned'),
    ],
  },
  // Wave 1 form #6 — reference: PCT blank form #72 (Trust-Certification).
  // Correction-note family: an ACKNOWLEDGED penalty-of-perjury declaration
  // ("(Acknowledgement must be attached)"), not a jurat. Owner ruling:
  // initial lines and checkboxes are EXECUTION acts — they render blank,
  // always; the builder collects typed transcriptions only.
  'trust-certification': {
    slug: 'trust-certification',
    label: 'Certification of Trust',
    title: 'CERTIFICATION OF TRUST',
    subtitle: 'California Probate Code Section 18100.5',
    description: 'Certifies a trust’s existence and the trustees’ authority (Prob C §18100.5) — acknowledged; no property description',
    popular: false,
    family: 'declaration',
    sections: PROPERTYLESS_DECLARATION_SECTIONS,
    notarial: 'acknowledgment',
    hasDtt: false,
    affidavitFields: [
      { key: 'trustName', label: 'Trust name', placeholder: 'THE DOE FAMILY TRUST', uppercase: true, group: 'The trust' },
      { key: 'trustDate', label: 'Executed on', placeholder: 'January 10, 2010', group: 'The trust' },
      { key: 'settlors', label: 'Settlor(s)', placeholder: 'JOHN A. DOE AND JANE B. DOE', uppercase: true, group: 'The trust' },
      { key: 'trustees', label: 'Currently acting trustee(s)', placeholder: 'JOHN A. DOE AND JANE B. DOE', uppercase: true, group: 'The trust' },
      {
        key: 'revocability',
        label: 'Revocable or irrevocable (as the trust instrument states)',
        placeholder: 'Revocable',
        group: 'Authority',
        hint: 'Typed transcription for the record — the form’s checkboxes stay blank for the trustee’s hand at signing.',
      },
      { key: 'revokerName', label: 'Person who may revoke (if revocable)', placeholder: 'JOHN A. DOE', uppercase: true, group: 'Authority' },
      { key: 'signerCount', label: 'Number of trustees required to sign', placeholder: '1', group: 'Authority' },
      { key: 'signerNames', label: 'Their name(s)', placeholder: 'JOHN A. DOE', uppercase: true, group: 'Authority' },
      {
        key: 'titleVesting',
        label: 'Title to trust assets is to be taken as',
        placeholder: 'JOHN A. DOE AND JANE B. DOE, TRUSTEES OF THE DOE FAMILY TRUST',
        uppercase: true,
        group: 'Authority',
      },
    ],
  },
  // Wave 1 form #7 — the STATUTORY revocation form (Prob C §§5600/5644;
  // PCT's blank mirrors it). Single-party, acknowledged; the DTT/PCOR
  // exemption recitals are pre-printed statutory furniture (no decision
  // gate — R&T §11930 / §480.3 apply categorically). The grantor is named
  // only at signature on the statutory form ("Sign and print your name" —
  // an execution act), so the typed name identifies the record and the
  // Past Deeds row; it never pre-prints on the instrument.
  'tod-revocation': {
    slug: 'tod-revocation',
    label: 'Revocation of Revocable TOD Deed',
    title: 'REVOCATION OF REVOCABLE TRANSFER ON DEATH (TOD) DEED',
    subtitle: '(California Probate Code § 5600)',
    description: 'Revokes a recorded transfer on death deed — statutory form; must be recorded within 60 days of notarization',
    popular: false,
    family: 'declaration',
    sections: DECLARATION_SECTIONS,
    notarial: 'acknowledgment',
    hasDtt: false,
    affidavitFields: [
      {
        key: 'revokingGrantor',
        label: 'Revoking grantor (as named on the recorded TOD deed)',
        placeholder: 'ROBERT OWNER',
        uppercase: true,
        hint: 'Identifies this record and the Past Deeds row. The statutory form itself is signed AND printed by the grantor at notarization — no name pre-prints.',
      },
    ],
  },
  // Wave 2 form #7 — the STATUTORY form (Prob C §4401; PCT #55 mirrors
  // it). Acknowledgment verified from the reference (recordability).
  // Property-less, single-party (the principal). The owner's high-risk
  // flag resolved WITHOUT force: only two typed facts exist (principal,
  // agent(s)); the 14 power initial lines, special-instruction lines,
  // the separately/jointly word-blank, and the incapacity strike are all
  // the principal's execution acts — blank/verbatim, never an input.
  'poa-statutory': {
    slug: 'poa-statutory',
    label: 'Power of Attorney — Uniform Statutory Form',
    title: 'UNIFORM STATUTORY FORM POWER OF ATTORNEY',
    subtitle: '(California Probate Code Section 4401)',
    description: 'The §4401 statutory power of attorney, recordable — the principal initials powers and signs before a notary',
    popular: false,
    family: 'declaration',
    sections: PROPERTYLESS_DECLARATION_SECTIONS,
    notarial: 'acknowledgment',
    hasDtt: false,
    affidavitFields: [
      {
        key: 'principalName',
        label: 'Principal — name and address',
        placeholder: 'ROBERT OWNER, 1358 5TH ST, SANTA MONICA, CA 90401',
        uppercase: true,
        hint: 'The person granting the power. Initials the powers and signs before a notary — those marks stay blank on the generated form.',
      },
      {
        key: 'agentNames',
        label: 'Agent(s) (attorney(s)-in-fact) — name and address of each',
        placeholder: 'JANE B. DOE, 456 ESCROW WAY, LOS ANGELES, CA 90012',
        uppercase: true,
      },
    ],
  },
  // Wave 2 form #8 — reference: PCT blank form #20 (Trust_Deed-
  // Sub_Trustee). Acknowledgment verified from the reference. The
  // WHEREAS/NOW-THEREFORE recitals are instrument-defining furniture
  // (TOD-revocation operative class); the deed of trust is identified by
  // its recording reference (recorded-instrument class); the new trustee
  // is a typed party fact (grantee-name class). Carries an APN but NO
  // legal description — the DOT reference identifies the property.
  'trustee-substitution': {
    slug: 'trustee-substitution',
    label: 'Substitution of Trustee',
    title: 'SUBSTITUTION OF TRUSTEE',
    description: 'The beneficiary under a recorded deed of trust substitutes a new trustee — acknowledged and recorded',
    popular: false,
    family: 'declaration',
    sections: DECLARATION_SECTIONS,
    notarial: 'acknowledgment',
    hasDtt: false,
    affidavitFields: [
      { key: 'originalTrustor', label: 'Original trustor', placeholder: 'JOHN A. DOE', uppercase: true, group: 'The recorded deed of trust' },
      { key: 'originalTrustee', label: 'Original trustee', placeholder: 'FIRST TITLE COMPANY', uppercase: true, group: 'The recorded deed of trust' },
      { key: 'originalBeneficiary', label: 'Original beneficiary (the undersigned)', placeholder: 'ACME LENDING, INC.', uppercase: true, group: 'The recorded deed of trust', hint: 'Signs before a notary.' },
      { key: 'deedDate', label: 'Deed of Trust dated', placeholder: 'June 1, 2015', group: 'The recorded deed of trust' },
      ...RECORDING_REF_FIELDS('The recorded deed of trust'),
      {
        key: 'newTrustee',
        label: 'New trustee substituted',
        placeholder: 'PACIFIC COAST TITLE COMPANY',
        uppercase: true,
        group: 'The substitution',
      },
    ],
  },
};

export function formConfig(slug: string | undefined | null): FormTypeConfig | undefined {
  return slug ? FORM_REGISTRY[slug] : undefined;
}

export function formFamily(slug: string | undefined | null): FormFamily {
  return formConfig(slug)?.family ?? 'deed';
}

/** Non-deed families (affidavit, declaration) collect their instrument
 * facts in the shared typed-facts section (section id 'affidavit'). */
export function usesFactsSection(slug: string | undefined | null): boolean {
  return formFamily(slug) !== 'deed';
}

/** Declaration-family instruments have ONE party — stored in the
 * deeds.parties JSONB column, never the grantor/grantee pair. */
export function isSinglePartyType(slug: string | undefined | null): boolean {
  return formFamily(slug) === 'declaration';
}

/** Whether the form ties to a parcel (property search, APN, legal
 * description). The certification of trust does not. */
export function hasPropertySection(slug: string | undefined | null): boolean {
  const cfg = formConfig(slug);
  return cfg ? cfg.sections.includes('property') : true;
}

/**
 * Whether the officer supplies vesting text for this type. Fixed-vesting
 * instruments (JT / CP w/ROS grant deeds) print their vesting phrase as
 * form furniture in the TEMPLATE — the registry carries no vesting value,
 * only the absence of the input. Unknown slugs default to the standard
 * deed behavior (officer-typed vesting).
 */
export function hasVestingInput(slug: string | undefined | null): boolean {
  const cfg = formConfig(slug);
  return cfg ? cfg.sections.includes('vesting') : true;
}
