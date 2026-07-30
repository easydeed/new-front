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

export interface FormTypeConfig {
  slug: string;
  /** List/table display label. */
  label: string;
  /** Document title as rendered on the instrument/preview. */
  title: string;
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
}

const DEED_SECTIONS = ['property', 'grantor', 'grantee', 'vesting', 'transferTax', 'recording'];
const AFFIDAVIT_SECTIONS = ['property', 'affidavit', 'recording'];

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
    // Spike flag 4 ruling: passive guidance only. The BOE-502-D itself is
    // Tier B (form-fill pipeline), owner-directed LAST — no form-fill work.
    companionNotice: {
      text: 'Counties commonly require a BOE-502-D (Change in Ownership Statement — Death of Real Property Owner) filed with this affidavit.',
      linkText: 'Get the form from the California BOE',
      href: 'https://www.boe.ca.gov/proptaxes/forms.htm',
    },
  },
};

export function formConfig(slug: string | undefined | null): FormTypeConfig | undefined {
  return slug ? FORM_REGISTRY[slug] : undefined;
}

export function formFamily(slug: string | undefined | null): FormFamily {
  return formConfig(slug)?.family ?? 'deed';
}
