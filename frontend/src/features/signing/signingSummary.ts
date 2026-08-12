/**
 * One signing, as every officer surface receives it — and how they group.
 *
 * ═══ WHY THE TYPE LIVES HERE AND NOT ON A PAGE ═══
 *
 * `GET /signing-requests/v2` had TWO screens declaring what its rows
 * contain: the agenda declared fourteen fields, the merged tracker
 * declared eleven, and nothing compared them.
 *
 * The three the tracker was missing were `live`, `days_waiting` and
 * `stale` — the fields CANCEL1 and DASH1 added so that a screen would
 * stop deciding for itself which signings are over and which have gone
 * quiet. A screen that does not declare a field cannot render it, so the
 * merged tracker listed cancelled and expired signings among the live
 * ones and could not mark a single stuck request. No test failed.
 *
 * That is FLOW1 item 0's defect one endpoint over, and milder only by
 * luck: there the names were WRONG and rendered as `undefined`; here
 * they were ABSENT and rendered as nothing at all.
 *
 * One declaration, checked against `backend/services/signing_summary_keys.json`
 * — the same corpus the Python row builder asserts its output against, so
 * drift costs two deliberate edits instead of one silent omission.
 *
 * ═══ AND WHY THE GROUPING IS A FUNCTION ═══
 *
 * Booked / being arranged / closed was a `useMemo` on a page. As a page
 * expression its only available pin is "the source contains a filter" —
 * a string-presence pin over a decision, which cannot tell REACHABLE
 * from PRESENT. Called, it can be asked what it does with a cancelled
 * booked signing, which is the case where two plausible rules disagree.
 *
 * Note what is NOT decided here: WHICH STATES COUNT AS OVER. That is
 * `services/signing_loop.is_live`, the payload carries the verdict, and
 * this module reads `row.live` rather than holding a list. A list here
 * is the copy that gets missed the day a seventh state is added.
 */

export interface SigningSummary {
  id: number;
  deed_id: number;
  property_address: string | null;
  deed_type: string | null;
  notary_name: string | null;
  state: string;
  /** Whether this one is still somebody's problem. The SERVER's verdict. */
  live: boolean;
  /** The server's sentence about this request. Rendered verbatim (§13 rule 3). */
  summary: string;
  booked_at: string | null;
  booked_by: string | null;
  created_at: string | null;
  /** How long she has waited. The server counts; this screen does not. */
  days_waiting: number | null;
  /** Whether that is too long. The server judges; this screen does not. */
  stale: boolean;
  expires_at: string | null;
  signers: number;
}

export const STATE_LABEL: Record<string, string> = {
  requested: 'Waiting on the notary',
  windows_posted: 'Waiting on signers',
  partially_agreed: 'Part-agreed',
  booked: 'Booked',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

/**
 * DASH1 — `STUCK_AFTER_DAYS = 5` used to live on the agenda page.
 *
 * The dashboard needed the same judgement, and a second threshold in
 * Python beside one in TypeScript is exactly how the partner category
 * list came to have four divergent copies. The number lives in
 * `backend/services/officer_queue.py`; the server sends `stale`; this
 * reads it.
 */
export function isStuck(row: SigningSummary): boolean {
  return row.stale;
}

export interface SigningGroups {
  booked: SigningSummary[];
  arranging: SigningSummary[];
  closed: SigningSummary[];
}

/**
 * The three groups, each sorted by the fact it actually has.
 *
 * ═══ WHY THREE AND NOT ONE SORTED LIST ═══
 *
 * The server orders by `COALESCE(booked_at, expires_at)`. For a booked
 * signing that is the signing's time; for an unbooked one it is WHEN THE
 * LINK DIES — a fact with no relationship to when anybody will meet. Two
 * orthogonal facts sharing one sort key, under a subtitle describing the
 * result as a schedule.
 *
 * So: booked by when, because that is a date. Being arranged by how long
 * she has been waiting, oldest first, because the oldest is the one that
 * needs a phone call and it has no date to be sorted by. Closed last and
 * never deleted — a cancelled request that HAD a booked time still had
 * one (T-5), and folding it away would make that unaskable.
 */
export function groupSignings(rows: SigningSummary[]): SigningGroups {
  return {
    /**
     * NO `live &&` GUARD HERE, AND THE REASON IS WORTH WRITING DOWN.
     *
     * A cancelled signing that had been booked looks like it should
     * appear in two groups — `state === 'booked'` and `!live` — and a
     * first draft of this function guarded against exactly that.
     *
     * It cannot happen, because `signing_loop.request_state` tests
     * `cancelled_at` BEFORE `booked_at`: a cancelled request reports
     * `cancelled`, never `booked`, whatever was arranged. The guard was
     * dead code carrying a false explanation, which is worse than no
     * guard — the next reader would have believed the collision was real
     * and defended against it somewhere else too.
     *
     * That ordering is now load-bearing for this grouping, so it is
     * pinned where it lives rather than assumed here:
     * `test_cancellation_beats_booking_in_the_state_vocabulary`.
     */
    booked: rows
      .filter((r) => r.state === 'booked')
      .sort((a, b) => (a.booked_at || '').localeCompare(b.booked_at || '')),
    arranging: rows
      .filter((r) => r.live && r.state !== 'booked')
      .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || '')),
    closed: rows.filter((r) => !r.live),
  };
}
