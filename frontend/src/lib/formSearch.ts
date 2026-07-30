/**
 * CAT1 — the picker's translation layer: situation → instrument.
 *
 * Escrow officers think in situations ("the husband died", "seller is an
 * LLC"), not form names. Search matches the registry's labels,
 * descriptions, and per-type keyword aliases; browse groups by desk
 * taxonomy. ORGANIZATION ONLY — nothing here ranks by "what you probably
 * want" or recommends an instrument: choosing the instrument is the
 * officer's legal decision (Flag-3 doctrine).
 */
import {
  FORM_REGISTRY,
  FormTypeConfig,
  SITUATION_GROUP_ORDER,
  SituationGroup,
} from '@/lib/formRegistry';

const norm = (s: string) => s.toLowerCase().trim();

/** One haystack per type: label + description + keywords. */
function haystack(f: FormTypeConfig): string {
  return norm([f.label, f.description, ...f.keywords].join(' '));
}

/**
 * Substring + simple fuzzy: every whitespace-separated query token must
 * appear as a substring of the type's haystack, OR prefix some word in
 * it ("corp" → "corporation"). Order-preserving char-subsequence fuzz is
 * deliberately NOT used — near-miss matches on legal instruments invite
 * wrong picks; a miss should read as a miss.
 */
export function matchesForm(f: FormTypeConfig, query: string): boolean {
  const q = norm(query);
  if (!q) return true;
  const hay = haystack(f);
  const words = hay.split(/[^a-z0-9§.-]+/);
  return q.split(/\s+/).every(
    (token) => hay.includes(token) || words.some((w) => w.startsWith(token))
  );
}

/**
 * All matching types, registry order (stable, no relevance ranking —
 * organization, not recommendation). Enter in the picker selects the
 * first, which is simply the catalog's first match.
 */
export function searchForms(query: string): FormTypeConfig[] {
  return Object.values(FORM_REGISTRY).filter((f) => matchesForm(f, query));
}

/** Browse groups in desk-frequency order; every type appears exactly once. */
export function groupedForms(): Array<{ group: SituationGroup; forms: FormTypeConfig[] }> {
  return SITUATION_GROUP_ORDER.map((group) => ({
    group,
    forms: Object.values(FORM_REGISTRY).filter((f) => f.situationGroup === group),
  })).filter((g) => g.forms.length > 0);
}
