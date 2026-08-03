/**
 * A4 — the deed-type table the developer docs render.
 *
 * Mirror of backend/services/api_catalog.py, pinned by
 * src/__tests__/apiDocsMirror.test.ts. Documentation that drifts from
 * the API is worse than none: a partner builds against the page, not
 * the source. Same arrangement form_families.py has with the FORMS
 * registry and dtt_rates.py has with dttCalc.ts.
 */

export interface ApiDeedType {
  /** The value sent as `deed_type`. */
  slug: string;
  /** What an escrow officer calls it. */
  label: string;
  /** Vesting handling — the doctrinally interesting column. */
  vesting: 'required' | 'optional' | 'fixed-by-instrument';
  /** Facts the instrument recites about an entity grantor. */
  entityFacts?: string[];
  /** Why, in one sentence, when the instrument decides something. */
  note?: string;
}

export const API_DEED_TYPES: ApiDeedType[] = [
  {
    slug: 'grant_deed',
    label: 'Grant Deed',
    vesting: 'required',
  },
  {
    slug: 'quitclaim_deed',
    label: 'Quitclaim Deed',
    vesting: 'optional',
    note: 'A quitclaim conveys whatever interest the grantor holds, so vesting is optional.',
  },
  {
    slug: 'interspousal_transfer',
    label: 'Interspousal Transfer Deed',
    vesting: 'required',
  },
  {
    slug: 'warranty_deed',
    label: 'Warranty Deed',
    vesting: 'required',
  },
  {
    slug: 'tax_deed',
    label: 'Tax Deed',
    vesting: 'required',
  },
  {
    slug: 'grant_deed_jt',
    label: 'Grant Deed — Joint Tenancy',
    vesting: 'fixed-by-instrument',
    note: 'The instrument states joint tenancy on its face. Send grantee.vesting and the request is rejected — choosing this form is the vesting decision.',
  },
  {
    slug: 'grant_deed_cp_ros',
    label: 'Grant Deed — Community Property with Right of Survivorship',
    vesting: 'fixed-by-instrument',
    note: 'Vesting is fixed by the instrument. Send grantee.vesting and the request is rejected.',
  },
  {
    slug: 'grant_deed_corp',
    label: 'Grant Deed — Corporate Grantor',
    vesting: 'required',
    entityFacts: ['entity_state'],
    note: 'The deed recites the state under whose laws the corporation is organized.',
  },
  {
    slug: 'grant_deed_partnership',
    label: 'Grant Deed — Partnership Grantor',
    vesting: 'required',
    entityFacts: ['entity_state', 'partnership_type'],
    note: 'The deed recites the partnership type and the state under whose laws it is organized.',
  },
];

/** Instrument families the API does not expose, and why. */
export const HELD_FAMILIES = [
  {
    family: 'Affidavits',
    examples: 'Affidavit of Death of Joint Tenant, of Trustee, of Spouse',
  },
  {
    family: 'Declarations',
    examples: 'Homestead Declaration, Certification of Trust, TOD Revocation, Statutory POA',
  },
];
