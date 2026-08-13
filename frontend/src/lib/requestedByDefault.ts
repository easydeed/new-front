/**
 * Who the Recording Requested By box starts on, and where that came from.
 *
 * ═══ THE FIELD HAD NO DEFAULT, AND ONE SOURCE ═══
 *
 * The control is a `<select>` over the partner rolodex. A returning
 * officer got her last-used partner back from localStorage; a new officer
 * got "Select partner..." and an empty box, with her own company sitting
 * in her profile the whole time.
 *
 * Owner-ruled: the default comes from `users.company_name`. So the
 * officer's own company becomes a REAL OPTION in the list rather than a
 * bare string written into state — a `<select>` whose value matches no
 * `<option>` renders as unselected, which would put a name on the deed
 * that the screen shows as blank. A value the officer cannot see is a
 * value she cannot correct.
 *
 * The owner also ruled against auto-creating a partner record for her own
 * company: a partner is a counterparty, and the rolodex is not a place to
 * file yourself. Hence a synthetic entry that lives only in this list.
 *
 * ═══ THE ORDERING IS PINNED, NOT THE OUTCOME ═══
 *
 * Two signals can fill the box and neither is obviously stronger:
 *
 *   - the last partner she picked — a choice she made, for this exact
 *     field, in this product;
 *   - her own company — a fact about her, and the ruled source.
 *
 * Both orders have a wrong case. Last-partner-wins re-imposes a title
 * company she used once for an unusual deal. Own-company-wins re-imposes
 * her own name on an officer who always records under a partner. There is
 * no rule that is right in both, and picking one quietly is how a
 * tie-break becomes a fact nobody checks.
 *
 * So: LAST-USED PARTNER WINS, own company fills the case that was
 * previously blank — the narrowest reading that satisfies the ruling. The
 * ordering is asserted directly in the tests, so changing it is a
 * decision somebody makes rather than a behaviour that drifts.
 */

/**
 * The synthetic option's id. Deliberately not a UUID shape: partner ids
 * are server-issued UUIDs, so this cannot collide with one, and a
 * `lastPartnerUsed` holding this value is recognisable as ours.
 */
export const OWN_COMPANY_ID = 'own-company';

export interface RequestedByChoice {
  id: string;
  label: string;
  address?: string;
  /** True for the synthetic own-company entry — it is not a partner. */
  own?: boolean;
}

interface PartnerLike {
  id: string;
  label: string;
  address?: string;
}

/** Where a filled value came from. `none` means the box stays empty. */
export type RequestedByOrigin = 'last-partner' | 'own-company' | 'none';

export interface RequestedByDefault {
  value: string;
  origin: RequestedByOrigin;
  /** The address that prints under the name, when the source carries one. */
  address?: string;
}

/**
 * The options the picker offers: the officer's own company first, then
 * her partners.
 *
 * A company that already exists in the rolodex under the same name is NOT
 * offered twice — two identically-labelled options in one select is a
 * control that cannot show which one is chosen.
 */
export function requestedByChoices(
  partners: readonly PartnerLike[],
  companyName: string | null | undefined,
  companyAddress?: string | null,
): RequestedByChoice[] {
  const own = (companyName || '').trim();
  const list: RequestedByChoice[] = partners.map((p) => ({
    id: p.id, label: p.label, address: p.address,
  }));
  if (!own) return list;
  const already = list.some((p) => p.label.trim() === own);
  if (already) return list;
  return [
    { id: OWN_COMPANY_ID, label: own, address: (companyAddress || '').trim() || undefined, own: true },
    ...list,
  ];
}

/**
 * What to start the box on, given the choices and the last one used.
 *
 * `lastUsedId` is whatever localStorage holds — which is to say, an
 * arbitrary string from a place this code does not control. An id that
 * matches nothing yields the own-company default rather than an empty
 * box: a stale id from a deleted partner is exactly the case where the
 * fallback should do its job.
 */
export function defaultRequestedBy(
  choices: readonly RequestedByChoice[],
  lastUsedId: string | null | undefined,
): RequestedByDefault {
  const last = choices.find((c) => c.id === lastUsedId);
  if (last) return { value: last.label, origin: 'last-partner', address: last.address };
  const own = choices.find((c) => c.own);
  if (own) return { value: own.label, origin: 'own-company', address: own.address };
  return { value: '', origin: 'none' };
}

/**
 * Is this value one the product filled in, rather than one a person
 * chose?
 *
 * ═══ WHY THIS EXISTS AT ALL ═══
 *
 * The builder autosaves to a real deed row as soon as the state holds
 * anything meaningful, and `requestedBy` counts. A pre-filled value
 * therefore MINTS A DRAFT DEED for an officer who opened the builder,
 * typed nothing, and walked away — a row in her deed list that she never
 * made and cannot explain.
 *
 * That is not hypothetical and it is not new: the localStorage prefill
 * has done it since it shipped, for every officer who ever picked a
 * partner. Adding a second prefill without settling this would have
 * extended it to everyone.
 *
 * Autosave exists to protect TYPING. A default is not typing, so a state
 * whose only content is a default has nothing worth saving yet.
 */
export function isPrefillOnly(
  requestedBy: string | null | undefined,
  prefilled: boolean | undefined,
): boolean {
  return !!prefilled && !!(requestedBy || '').trim();
}
