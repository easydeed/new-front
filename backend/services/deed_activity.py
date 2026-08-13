"""What happened on this deed — assembled only from what was recorded.

═══ WHY THIS MODULE IS SUSPICIOUS OF ITSELF ═══

There is NO events table. Every entry below is reconstructed from
columns that exist for other reasons, which is exactly the shape in
which a fabricated history gets built: the timestamps are right there,
they sort, and the result looks like a log.

A synthesized activity feed is worse than none. It is a page asserting
that things happened at times, in a product whose whole doctrine is that
the system never asserts what somebody else must.

So this module names its own epistemics in the DATA, not in comments:

  KIND_EVENT    — somebody performed an act and the record of that act
                  survives. Write-once, or its own row.
  KIND_DERIVED  — a column that merely carries a time. It tells you a
                  state, and the time is when the state last changed.

The distinction is structural because a consumer cannot recover it. If
the API cannot tell them apart, no screen can, and the first person to
add "expired" to the feed will do it because everything already looked
like an event. `expired` is COMPUTED from `expires_at` — nobody recorded
it, nobody was there — and the type system is what says so.

═══ THE DISCRIMINATOR, AND HOW EACH COLUMN WAS CLASSIFIED ═══

Not by intuition: by reading the statement that writes it. Does the
write PRESERVE the moment, or does it hold the latest value?

Two findings from doing that, both of which would have produced a wrong
feed:

 1. `deed_shares.viewed_at` and `signing_participants.last_viewed_at`
    are one word apart and have OPPOSITE semantics. The first is guarded
    (`if status == 'sent' and not viewed_at`) — it is the FIRST view and
    it survives. The second is `SET last_viewed_at = now()`,
    unconditional, and is named for what it is. So the first is an event
    and the second is a state field, and no amount of squinting at the
    column names would tell you which.

 2. `booked_at` IS NOT WHEN THE BOOKING HAPPENED. It is the signing's
    time — a future appointment. A feed keyed on it would place "booked"
    at next month's date and sort it into the future. The moment is
    `booked_asserted_at`, written `now()` on BOTH the convergence and
    override paths, with `booked_by` naming who asserted it.

    That is §13.2 arriving in the timeline: the event is the ASSERTION,
    never the thing asserted.
"""

from __future__ import annotations

from typing import Any, Dict, Iterable, List, Mapping, Optional

#: Somebody did this, and the record of their doing it survives.
KIND_EVENT = "event"
#: A column carrying a time. It reports a state, not an act.
KIND_DERIVED = "derived"


class FabricatedActivity(Exception):
    """Raised when something asks this module to invent an entry."""


#: Sources that must NEVER become entries, with the reason attached so a
#: refusal explains itself. Owner-ruled; each one is a specific way to
#: turn a number into a history nobody recorded.
FORBIDDEN: Dict[str, str] = {
    "expired": (
        "expiry is COMPUTED from expires_at — no row records it, nobody "
        "was present, and rendering it as an event asserts a moment that "
        "was never observed"
    ),
    "expires_at": (
        "a deadline is not something that happened; it is a fact about "
        "the future that may still not happen"
    ),
    "view_count": (
        "a counter is not a series. Four views is ONE recorded time "
        "(viewed_at) and three moments nobody kept"
    ),
    "reminder_count": (
        "only last_reminder_sent_at is kept, so N reminders is one known "
        "time and N-1 fabrications"
    ),
    "updated_at": (
        "it moves for reasons that are not events, so ordering by it "
        "narrates writes rather than acts"
    ),
    "last_viewed_at": (
        "overwritten on every view, so it is the latest state and not a "
        "moment — see deed_shares.viewed_at, which is the opposite"
    ),
    "booked_at": (
        "the signing's TIME, not when it was booked. Keying on it puts "
        "the entry in the future; booked_asserted_at is the moment"
    ),
}


def refuse(source: str) -> None:
    """Name the reason, loudly, if a caller reaches for a forbidden source.

    A rule that is only a comment gets read past. This is callable, so a
    test can ask it and a future author gets an exception rather than a
    plausible-looking feed.
    """
    if source in FORBIDDEN:
        raise FabricatedActivity(f"{source}: {FORBIDDEN[source]}")


def _iso(value: Any) -> Optional[str]:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def entry(at: Any, kind: str, what: str, sentence: str, source: str) -> Optional[Dict[str, Any]]:
    """One line of the record, or nothing if the moment is not there.

    `sentence` is the words a screen renders. It is composed HERE and
    nowhere else — §13 rule 3, the same reason no screen writes its own
    account of a scheduling state.

    `source` names the column this came from, and it is part of the
    payload rather than a debugging aid: an entry that cannot say where
    it came from is one nobody can check.
    """
    refuse(source.split(".")[-1])
    when = _iso(at)
    if when is None:
        return None
    if kind not in (KIND_EVENT, KIND_DERIVED):
        raise FabricatedActivity(f"{kind!r} is not a kind of entry")
    return {"at": when, "kind": kind, "what": what, "sentence": sentence,
            "source": source}


def _name(row: Mapping[str, Any]) -> str:
    """Who, by the name we were given, or by the role. Never a pronoun."""
    return ((row.get("recipient_name") or "").strip()
            or (row.get("name") or "").strip()
            or (row.get("recipient_email") or "").strip()
            or (row.get("party_role") or "Someone"))


def activity(
    deed: Mapping[str, Any],
    *,
    shares: Iterable[Mapping[str, Any]] = (),
    signings: Iterable[Mapping[str, Any]] = (),
    responses: Iterable[Mapping[str, Any]] = (),
) -> List[Dict[str, Any]]:
    """Everything recorded about this deed, newest first.

    Only the sources the owner permitted. Anything absent from a row is
    simply not an entry — there is no filling in.
    """
    out: List[Optional[Dict[str, Any]]] = []

    # ── The deed itself ───────────────────────────────────────────────
    #
    # `created_at` is DERIVED: it is the row's birth, and while starting
    # a draft is an act, the column exists to age the row rather than to
    # record that anybody did anything.
    out.append(entry(deed.get("created_at"), KIND_DERIVED, "deed.started",
                     "Draft started.", "deeds.created_at"))
    # `completed_at` is an EVENT: stamped once by store_deed_pdf, under
    # COALESCE so it never moves, at the moment the instrument came into
    # existence. That is an act with a record.
    out.append(entry(deed.get("completed_at"), KIND_EVENT, "deed.generated",
                     "Deed generated — the instrument was recorded.",
                     "deeds.completed_at"))
    out.append(entry(deed.get("superseded_at"), KIND_EVENT, "deed.superseded",
                     "Corrected and replaced by a later deed.",
                     "deeds.superseded_at"))

    # ── Reviews ───────────────────────────────────────────────────────
    for share in shares:
        who = _name(share)
        out.append(entry(share.get("created_at"), KIND_DERIVED, "review.sent",
                         f"Sent to {who} for review.", "deed_shares.created_at"))
        # EVENT, and this is the classification that needed the code read:
        # the write is guarded on `status = 'sent' AND NOT viewed_at`, so
        # it is the FIRST view and it survives every later one.
        out.append(entry(share.get("viewed_at"), KIND_EVENT, "review.viewed",
                         f"{who} opened it.", "deed_shares.viewed_at"))
        # EVENT: written at the decision, on BOTH the approve and reject
        # paths, and a decided share cannot be decided again (409).
        decision = (share.get("status") or "").strip().lower()
        said = {"approved": "approved it", "rejected": "asked for changes"}.get(
            decision, "responded")
        out.append(entry(share.get("responded_at"), KIND_EVENT, f"review.{decision or 'responded'}",
                         f"{who} {said}.", "deed_shares.responded_at"))

    # ── Signings ──────────────────────────────────────────────────────
    for signing in signings:
        out.append(entry(signing.get("created_at"), KIND_DERIVED, "signing.requested",
                         "Signing requested.", "signing_requests.created_at"))
        # EVENT — and NOT `booked_at`, which is the appointment's time.
        # `booked_asserted_at` is when somebody said so, and `booked_by`
        # is who: §13.2, the assertion rather than the thing asserted.
        by = (signing.get("booked_by") or "").strip()
        out.append(entry(signing.get("booked_asserted_at"), KIND_EVENT, "signing.booked",
                         "A time was agreed by everyone." if by == "convergence"
                         else "The officer recorded the time.",
                         "signing_requests.booked_asserted_at"))
        out.append(entry(signing.get("cancelled_at"), KIND_EVENT, "signing.cancelled",
                         "Signing cancelled — every link was voided.",
                         "signing_requests.cancelled_at"))

    # ── The real event log ────────────────────────────────────────────
    #
    # One row per answer, with who and when. This is the only source here
    # that was built to be an event, and it shows: nothing is inferred,
    # nothing is overwritten, and a second answer is a second row.
    for response in responses:
        answered = (response.get("answer") or "").strip().lower()
        out.append(entry(
            response.get("asserted_at"), KIND_EVENT, f"signing.{answered or 'answered'}",
            f"{_name(response)} said "
            + ("that time works." if answered == "available" else "that time does not work."),
            "signing_responses.asserted_at"))

    kept = [e for e in out if e is not None]
    # Newest first: the question the page exists for is "what changed
    # since I was last here", and the answer is at the top.
    kept.sort(key=lambda e: e["at"], reverse=True)
    return kept
