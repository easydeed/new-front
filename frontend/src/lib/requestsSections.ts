/**
 * Which parts of the Requests page are on screen, given the filter.
 *
 * ═══ WHY THIS IS A FUNCTION ═══
 *
 * It was four JSX conditions, and while wiring them up they produced a
 * BLANK PAGE: filtered to Reviews, with no reviews but several signings,
 * the reviews table did not render (no reviews), the agenda did not
 * render (filtered out), and the page's "nothing here yet" did not
 * render either — because it tested whether BOTH lists were empty, and
 * one of them was not.
 *
 * Every condition was individually correct. The officer got a page with
 * a header, a filter, and nothing underneath — the same shape of defect
 * as CANCEL1 item 2, where two correct behaviours composed into a null
 * result. Four booleans spread across two hundred lines of JSX cannot be
 * reasoned about at the place each one is written, which is exactly why
 * they belong somewhere they can be enumerated.
 *
 * ═══ THE RULE ═══
 *
 * AT LEAST ONE of the three is always true. Not exactly one — the
 * unfiltered view legitimately shows both halves — but never zero, and
 * the pin asserts it across every combination rather than trusting a
 * reading of the conditions. The first draft of this very function got
 * it wrong again in the opposite direction: filtered to Signings with no
 * signings, all three came back false.
 */

import type { TrackerFilter } from './requestsFocus';

export interface RequestsSections {
  /** The reviews table — a recipient and a decision per row. */
  showReviews: boolean;
  /** The signings agenda — grouped cards with an expandable detail. */
  showSignings: boolean;
  /** The page-level "you have not sent anything out yet" panel. */
  showEmpty: boolean;
}

export function requestsSections(
  filter: TrackerFilter,
  reviewCount: number,
  signingCount: number,
): RequestsSections {
  // What the CURRENT FILTER could show, not what exists. "Nothing here"
  // has to mean nothing here — under the filter she is actually looking
  // at — or it is answering a question she did not ask.
  const reviewsVisible = filter !== 'signings' && reviewCount > 0;
  // The agenda carries its own "no signings arranged yet" note, so when
  // she has asked for Signings specifically it renders even with none —
  // that is a section answering her, not an empty page.
  const signingsVisible = filter !== 'reviews' && (signingCount > 0 || filter === 'signings');

  return {
    showReviews: reviewsVisible,
    showSignings: signingsVisible,
    showEmpty: !reviewsVisible && !signingsVisible,
  };
}
