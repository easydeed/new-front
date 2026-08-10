/**
 * PARTNER2 — ONE registry for partner categories and their roles.
 *
 * ═══ WHY THIS FILE EXISTS ═══
 *
 * The category list had been copied into five places and had already
 * diverged twice by the time anybody looked:
 *
 *  - `app/partners/page.tsx` offered four categories; the builder's
 *    `AddPartnerModal` offered six, including `escrow_company` and
 *    `attorney`. A partner added from the builder therefore arrived on
 *    the partners screen as a category the edit dropdown could not
 *    represent, and its chip rendered as "Other". PARTNER1 aligned those
 *    two by hand and said in its note that hand-alignment is a fix with
 *    a shelf life.
 *  - `QuickAddPartnerModal` had a THIRD list, in which `realtor` is a
 *    *category* — while everywhere else `realtor` is a *role* and
 *    `real_estate` is the category. Same word, two positions in the
 *    model, in the same product.
 *  - `features/partners/types.ts` had a fourth, as a union type.
 *
 * The copies are the defect. So there is now one registry, every surface
 * derives from it, and a pin fails if any surface hard-codes its own
 * list. Adding a category is one entry here.
 *
 * ═══ ROLES DERIVE FROM CATEGORY ═══
 *
 * The two lists were independent, which let an officer file a notary as
 * a "loan officer" — not wrong in any way the system could detect, just
 * useless when she later wants her notaries. A role now belongs to a
 * category, so the role dropdown answers the question the category
 * already asked.
 *
 * ═══ UI METADATA ONLY (the doctrine constraint) ═══
 *
 * The same rule the FORMS registry lives under: a registry entry may
 * carry LABELS and OPTIONS and nothing that decides anything. There is
 * deliberately no field here for a default, an auto-apply, a fee, a
 * jurisdiction, or any characterization of what a partner may do — those
 * would be the registry quietly making a choice on somebody's behalf,
 * which is §1's whole subject. Pinned in `partnerRegistry.test.ts`.
 *
 * A partner's category says how the officer FILES them. It says nothing
 * about their authority, their licensure, or what they are permitted to
 * do, and no code may read it as though it did.
 */

export type PartnerCategoryKey =
  | 'title_company'
  | 'escrow_company'
  | 'notary'
  | 'attorney'
  | 'real_estate'
  | 'lender'
  | 'other';

export interface PartnerRoleEntry {
  /** Stored value. snake_case, stable — this is what lands in the column. */
  key: string;
  /** Display only. */
  label: string;
}

export interface PartnerCategoryEntry {
  key: PartnerCategoryKey;
  label: string;
  /** Plural, for counts and section headings. */
  pluralLabel: string;
  /** The roles that belong to this category. First is the default. */
  roles: readonly PartnerRoleEntry[];
}

const OTHER_ROLE: PartnerRoleEntry = { key: 'other', label: 'Other' };

export const PARTNER_CATEGORIES: readonly PartnerCategoryEntry[] = [
  {
    key: 'title_company',
    label: 'Title Company',
    pluralLabel: 'Title Companies',
    roles: [
      { key: 'title_officer', label: 'Title Officer' },
      { key: 'escrow_officer', label: 'Escrow Officer' },
      OTHER_ROLE,
    ],
  },
  {
    key: 'escrow_company',
    label: 'Escrow Company',
    pluralLabel: 'Escrow Companies',
    roles: [
      { key: 'escrow_officer', label: 'Escrow Officer' },
      { key: 'escrow_assistant', label: 'Escrow Assistant' },
      OTHER_ROLE,
    ],
  },
  {
    key: 'notary',
    label: 'Notary',
    pluralLabel: 'Notaries',
    roles: [
      { key: 'notary_public', label: 'Notary Public' },
      { key: 'mobile_notary', label: 'Mobile Notary' },
      OTHER_ROLE,
    ],
  },
  {
    key: 'attorney',
    label: 'Attorney',
    pluralLabel: 'Attorneys',
    roles: [
      { key: 'attorney', label: 'Attorney' },
      { key: 'paralegal', label: 'Paralegal' },
      OTHER_ROLE,
    ],
  },
  {
    key: 'real_estate',
    label: 'Real Estate Office',
    pluralLabel: 'Real Estate',
    roles: [
      { key: 'realtor', label: 'Realtor' },
      { key: 'broker', label: 'Broker' },
      { key: 'transaction_coordinator', label: 'Transaction Coordinator' },
      OTHER_ROLE,
    ],
  },
  {
    key: 'lender',
    label: 'Lender',
    pluralLabel: 'Lenders',
    roles: [
      { key: 'loan_officer', label: 'Loan Officer' },
      { key: 'loan_processor', label: 'Loan Processor' },
      OTHER_ROLE,
    ],
  },
  {
    key: 'other',
    label: 'Other',
    pluralLabel: 'Other',
    roles: [OTHER_ROLE],
  },
] as const;

export const CATEGORY_KEYS: readonly string[] = PARTNER_CATEGORIES.map((c) => c.key);

/** Every role key any category offers, deduplicated. The stored `role`
 * column is validated against THIS rather than against one category's
 * list, because a partner may be re-categorised and the old role should
 * not become unreadable. */
export const ALL_ROLE_KEYS: readonly string[] = Array.from(
  new Set(PARTNER_CATEGORIES.flatMap((c) => c.roles.map((r) => r.key))),
);

export function categoryEntry(key?: string): PartnerCategoryEntry {
  return (
    PARTNER_CATEGORIES.find((c) => c.key === key) ??
    PARTNER_CATEGORIES[PARTNER_CATEGORIES.length - 1]
  );
}

export function categoryLabel(key?: string): string {
  // An unknown key is DISPLAYED, not silently relabelled "Other": a
  // partner filed under a category we later removed should read as what
  // the officer chose, not as though she chose nothing.
  const found = PARTNER_CATEGORIES.find((c) => c.key === key);
  if (found) return found.label;
  return key ? titleCaseKey(key) : 'Other';
}

export function rolesFor(categoryKey?: string): readonly PartnerRoleEntry[] {
  return categoryEntry(categoryKey).roles;
}

export function defaultRoleFor(categoryKey?: string): string {
  return rolesFor(categoryKey)[0].key;
}

export function roleLabel(key?: string): string {
  for (const category of PARTNER_CATEGORIES) {
    const found = category.roles.find((r) => r.key === key);
    if (found) return found.label;
  }
  return key ? titleCaseKey(key) : 'Other';
}

/** Is this role offered by this category? Used to decide whether a
 * category change should reset the role — never to reject a stored one. */
export function roleBelongsTo(categoryKey: string | undefined, roleKey: string | undefined): boolean {
  return !!roleKey && rolesFor(categoryKey).some((r) => r.key === roleKey);
}

function titleCaseKey(key: string): string {
  return key
    .split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}
