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
export type FormFamily = 'deed' | 'affidavit';

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
const AFFIDAVIT_SECTIONS = ['property', 'affidavit', 'recording'];

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
};

export function formConfig(slug: string | undefined | null): FormTypeConfig | undefined {
  return slug ? FORM_REGISTRY[slug] : undefined;
}

export function formFamily(slug: string | undefined | null): FormFamily {
  return formConfig(slug)?.family ?? 'deed';
}
