/**
 * Which row a `/requests` link is about.
 *
 * ═══ THE PROBLEM THE MERGE CREATED ═══
 *
 * Reviews and signings used to live on two pages, and `?focus=42` on
 * either one was unambiguous because THE PATH SAID WHICH TABLE THE ID
 * CAME FROM: `/shared-deeds` meant `deed_shares.id`, `/signings` meant
 * `signing_requests.id`. One merged page has both, and the two id spaces
 * overlap — there is a review 42 and there is a signing 42, and they are
 * different deeds belonging to different people.
 *
 * So the id alone cannot say which row, and this module never guesses.
 * `?kind=` carries what the path used to. The permanent alias at
 * `/shared-deeds` supplies it on the way in, which is how every link
 * already sitting in somebody's inbox still lands on the right row.
 *
 * ═══ WHY THIS IS A MODULE AND NOT THREE EXPRESSIONS IN THE PAGE ═══
 *
 * It was three expressions in the page first. The pin written for them
 * would have asserted that `focusKind === "reviews"` appeared in the
 * source — and that is a string-presence pin over a DECISION, which is
 * the failure `signingRowAction.ts` documents from the other end: such a
 * pin cannot tell REACHABLE from PRESENT, and stays green when the
 * branch is disabled outright.
 *
 * The rule that matters here is a negative one — that an ambiguous link
 * highlights NOTHING — and a negative rule is exactly what source text
 * cannot demonstrate. A test has to call it with a bare focus and read
 * the answer.
 *
 * ═══ AND WHY IT REFUSES RATHER THAN PICKS ═══
 *
 * A tie-breaking rule invents an answer that will be right often enough
 * that nobody checks it (doctrine §0). "Try reviews first" would land
 * correctly most of the time and silently highlight a stranger's signing
 * the rest — which is worse than highlighting nothing, because a
 * highlighted wrong row is an assertion and an unhighlighted list is
 * merely a list.
 */

export type RequestKind = 'reviews' | 'signings';
export type TrackerFilter = 'all' | RequestKind;

export interface Focus {
  /** The row id from the link, or null when absent or not a whole number. */
  id: number | null;
  /** Which table it came from. Null means the link did not say. */
  kind: RequestKind | null;
}

/** Reads a focus out of whatever `useSearchParams()` hands over. Takes
 *  the getter rather than the object so a test needs no DOM. */
export function readFocus(get: (key: string) => string | null): Focus {
  const raw = get('focus');
  const parsed = raw === null || raw.trim() === '' ? NaN : Number(raw);
  const kind = get('kind');
  return {
    id: Number.isInteger(parsed) ? parsed : null,
    kind: kind === 'reviews' || kind === 'signings' ? kind : null,
  };
}

/** The list the page opens on. A link that named a kind opens that kind;
 *  anything else opens everything, because "all" is the answer that
 *  hides nothing. */
export function initialFilter(focus: Focus): TrackerFilter {
  return focus.kind ?? 'all';
}

/**
 * Whether THIS row is the one the link was about.
 *
 * Both halves are required. An id with no kind is ambiguous and matches
 * nothing; a kind with no id names a list rather than a row.
 */
export function isFocused(rowId: number, rowKind: RequestKind, focus: Focus): boolean {
  return focus.id !== null && focus.kind === rowKind && focus.id === rowId;
}

/**
 * Where `/shared-deeds?…` sends the officer.
 *
 * THIS IS WHERE THE ID SPACE IS RECOVERED. The old path meant reviews,
 * so the alias says so on the way through and the ambiguity never
 * reaches the page. Every other parameter is carried across untouched —
 * a redirect that dropped one would be a link that half-works, which is
 * harder to notice than one that does not work at all.
 */
export function aliasTarget(entries: Array<[string, string]>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of entries) {
    if (key === 'kind') continue;   // supplied below, never doubled
    qs.append(key, value);
  }
  qs.set('kind', 'reviews');
  return `/requests?${qs.toString()}`;
}
