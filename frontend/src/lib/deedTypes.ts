/**
 * U3 — one place for deed-type naming; since the FORMS registry landed,
 * the labels derive from it (registry = single source of type facts).
 */
import { FORM_REGISTRY } from '@/lib/formRegistry';

export const DEED_LABELS: Record<string, string> = Object.fromEntries(
  Object.values(FORM_REGISTRY).map((f) => [f.slug, f.label])
);

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
