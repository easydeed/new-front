/**
 * U3 — one place for deed-type naming. The builder header already showed
 * "Grant Deed" while Past Deeds rows showed the raw slug ("grant-deed");
 * both now read from here.
 */
export const DEED_LABELS: Record<string, string> = {
  'grant-deed': 'Grant Deed',
  'quitclaim-deed': 'Quitclaim Deed',
  'interspousal-transfer': 'Interspousal Transfer Deed',
  'warranty-deed': 'Warranty Deed',
  'tax-deed': 'Tax Deed',
};

/** Slug → display label; unknown slugs title-case rather than leak raw. */
export function deedTypeLabel(slug: string | undefined | null): string {
  if (!slug) return 'Deed';
  const known = DEED_LABELS[slug];
  if (known) return known;
  return slug
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}
