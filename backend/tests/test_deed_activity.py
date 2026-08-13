"""The activity feed reports what was recorded, and says which is which.

═══ THE RISK THIS FILE EXISTS FOR ═══

There is no events table. Every entry is reconstructed from columns that
exist for other reasons — the exact shape in which a fabricated history
gets built, because the timestamps are already there, they sort, and the
result looks like a log.

A synthesized activity feed is worse than none, in a product whose
doctrine is that the system never asserts what somebody else must.

So two things are pinned: WHAT MAY BE A SOURCE, and — structurally, in
the payload rather than in prose — WHETHER AN ENTRY IS AN ACT SOMEBODY
PERFORMED or a column that merely carries a time. A consumer cannot
recover that distinction, so if the API loses it, every screen loses it.
"""
from __future__ import annotations

from datetime import datetime, timezone

import pytest

from services.deed_activity import (
    FORBIDDEN, KIND_DERIVED, KIND_EVENT, FabricatedActivity, activity, entry, refuse,
)

T = lambda d: datetime(2026, 8, d, 12, 0, tzinfo=timezone.utc)  # noqa: E731


# ══════════════════════════════════════════════════════════════════════
# 1. The kinds are structural, not editorial
# ══════════════════════════════════════════════════════════════════════

def test_the_two_kinds_are_actually_two():
    """THIS PIN EXISTS BECAUSE A MUTATION PROBE CAUGHT ITS ABSENCE.

    Every assertion below was written as `row["kind"] == KIND_EVENT` —
    in terms of the constants. Setting `KIND_DERIVED = "event"` collapses
    the distinction completely, and the whole file stayed GREEN: both
    comparisons become the same comparison, and the membership check
    `kind in (KIND_EVENT, KIND_DERIVED)` is satisfied by one value.

    That is the "green and meaningless" state this codebase keeps
    naming, arrived at from a new direction — a test written in the
    vocabulary of the thing it is supposed to be checking cannot notice
    that vocabulary collapsing.

    So the values are asserted LITERALLY here, and the discriminating
    cases below assert literals too. A pin for a distinction has to be
    able to fail when the distinction stops existing.
    """
    assert KIND_EVENT == "event"
    assert KIND_DERIVED == "derived"
    assert KIND_EVENT != KIND_DERIVED


def test_a_real_feed_contains_both_kinds_distinguishably():
    """The end-to-end half of the same guard: a deed that was started
    (derived) and generated (event) must produce two DIFFERENT values,
    not two labels that happen to read differently in the source."""
    rows = activity({"created_at": T(1), "completed_at": T(2)})
    kinds = {r["what"]: r["kind"] for r in rows}
    assert kinds["deed.started"] == "derived"
    assert kinds["deed.generated"] == "event"
    assert len(set(kinds.values())) == 2


def test_every_entry_says_which_kind_it_is():
    """The distinction has to survive the wire.

    A feed of undifferentiated `{at, text}` is one where "expired" fits
    perfectly, because nothing in the shape objects.
    """
    rows = activity(
        {"created_at": T(1), "completed_at": T(2)},
        shares=[{"created_at": T(3), "viewed_at": T(4), "responded_at": T(5),
                 "status": "approved", "recipient_name": "Nora Vasquez"}],
    )
    assert rows, "the feed is empty for a deed that was generated and shared"
    for row in rows:
        assert row["kind"] in (KIND_EVENT, KIND_DERIVED)
        assert row["source"], "an entry that cannot say where it came from"
        assert row["sentence"]


def test_an_act_somebody_performed_is_an_event():
    """Generation, a reviewer opening it, a reviewer deciding, a
    correction — each has a record that survives."""
    rows = {r["what"]: r for r in activity(
        {"created_at": T(1), "completed_at": T(2), "superseded_at": T(9)},
        shares=[{"created_at": T(3), "viewed_at": T(4), "responded_at": T(5),
                 "status": "approved", "recipient_name": "Nora"}],
    )}
    # Literal, not `KIND_EVENT` — see test_the_two_kinds_are_actually_two.
    for what in ("deed.generated", "deed.superseded", "review.viewed",
                 "review.approved"):
        assert rows[what]["kind"] == "event", what


def test_a_column_that_merely_carries_a_time_is_derived():
    """`created_at` ages a row. Nobody recorded "the draft was started"
    as an act; the column exists so the row can be sorted."""
    rows = {r["what"]: r for r in activity(
        {"created_at": T(1)},
        shares=[{"created_at": T(3), "recipient_name": "Nora"}],
        signings=[{"created_at": T(4)}],
    )}
    # Literal, not `KIND_DERIVED` — see test_the_two_kinds_are_actually_two.
    for what in ("deed.started", "review.sent", "signing.requested"):
        assert rows[what]["kind"] == "derived", what


def test_the_two_viewed_columns_are_classified_by_HOW_THEY_ARE_WRITTEN():
    """`deed_shares.viewed_at` and `signing_participants.last_viewed_at`
    are one word apart and have OPPOSITE semantics.

    The first is guarded — `if status == 'sent' and not viewed_at` — so
    it is the FIRST view and it survives every later one. That is an act
    with a surviving record.

    The second is `SET last_viewed_at = now()`, unconditional. It is the
    latest state, and it is named for what it is.

    No amount of reading the column names tells you which is which. Only
    the statement that writes them does.
    """
    rows = {r["what"]: r for r in activity(
        {}, shares=[{"viewed_at": T(4), "recipient_name": "Nora"}])}
    assert rows["review.viewed"]["kind"] == "event"
    assert rows["review.viewed"]["source"] == "deed_shares.viewed_at"

    with pytest.raises(FabricatedActivity):
        refuse("last_viewed_at")


def test_the_booking_event_is_the_ASSERTION_not_the_appointment():
    """`booked_at` IS NOT WHEN THE BOOKING HAPPENED.

    It is the signing's time — a future appointment. A feed keyed on it
    would place "booked" at next month's date and sort it into the
    future, above everything that has actually happened.

    The moment is `booked_asserted_at`, written `now()` on BOTH the
    convergence and override paths, with `booked_by` naming who asserted
    it. §13.2 arriving in the timeline: the event is the assertion, never
    the thing asserted.
    """
    rows = {r["what"]: r for r in activity(
        {}, signings=[{"booked_at": datetime(2026, 12, 25, tzinfo=timezone.utc),
                       "booked_asserted_at": T(6), "booked_by": "convergence"}])}
    booked = rows["signing.booked"]
    assert booked["source"] == "signing_requests.booked_asserted_at"
    assert booked["at"].startswith("2026-08-06"), (
        "the entry is dated by the appointment rather than by the moment "
        "somebody recorded it")

    with pytest.raises(FabricatedActivity):
        refuse("booked_at")


def test_who_asserted_the_booking_changes_the_sentence():
    """Convergence and an officer override are different claims, and §13
    rule 3 says one place turns that into English. This is that place."""
    agreed = activity({}, signings=[{"booked_asserted_at": T(6),
                                     "booked_by": "convergence"}])[0]
    recorded = activity({}, signings=[{"booked_asserted_at": T(6),
                                       "booked_by": "officer"}])[0]
    assert agreed["sentence"] != recorded["sentence"]


# ══════════════════════════════════════════════════════════════════════
# 2. What may never become an entry
# ══════════════════════════════════════════════════════════════════════

@pytest.mark.parametrize("source", sorted(FORBIDDEN))
def test_a_forbidden_source_refuses_and_says_why(source):
    """A rule that is only a comment gets read past.

    Callable, so the next author gets an exception rather than a
    plausible-looking feed — and the exception names the reason, because
    a refusal that does not explain itself gets worked around.
    """
    with pytest.raises(FabricatedActivity) as raised:
        refuse(source)
    assert len(str(raised.value)) > 40, "the refusal does not explain itself"


def test_the_owner_ruled_exclusions_are_all_present():
    """The list is the ruling, so it is asserted by NAME.

    Dropping one silently is how "expired" gets into the feed a year from
    now, on the reasoning that everything else already looked like an
    event.
    """
    for source in ("expired", "expires_at", "view_count", "reminder_count",
                   "updated_at", "last_viewed_at", "booked_at"):
        assert source in FORBIDDEN, f"{source} stopped being forbidden"


def test_an_entry_cannot_be_built_from_a_forbidden_source():
    """The refusal is not advisory — it is on the constructor path, so
    there is no way to add one without deleting the rule first."""
    with pytest.raises(FabricatedActivity):
        entry(T(1), KIND_EVENT, "share.expired", "The link expired.",
              "deed_shares.expires_at")


def test_an_unknown_kind_is_refused():
    """`kind` is a closed vocabulary. A third value invented at a call
    site is how the distinction stops meaning anything."""
    with pytest.raises(FabricatedActivity):
        entry(T(1), "probably", "deed.something", "Something.", "deeds.created_at")


# ══════════════════════════════════════════════════════════════════════
# 3. It reports absence as absence
# ══════════════════════════════════════════════════════════════════════

def test_a_missing_moment_is_not_an_entry():
    """No filling in. A share that was never viewed contributes no view."""
    rows = activity({"created_at": T(1)},
                    shares=[{"created_at": T(2), "viewed_at": None,
                             "responded_at": None, "recipient_name": "Nora"}])
    assert not any(r["what"].startswith("review.viewed") for r in rows)
    assert not any(r["what"].startswith("review.responded") for r in rows)


def test_the_feed_is_never_empty_for_a_real_deed():
    """`created_at` always exists, so the section always has something to
    say. That was the argument for building it rather than deferring."""
    assert activity({"created_at": T(1)})


def test_newest_first():
    """The question the page exists for is "what changed since I was last
    here", and the answer belongs at the top."""
    rows = activity({"created_at": T(1), "completed_at": T(5)})
    assert [r["at"] for r in rows] == sorted((r["at"] for r in rows), reverse=True)


def test_the_responses_log_is_read_as_itself():
    """`signing_responses` is the only source here built to be an event
    log — one row per answer, with who and when. A second answer is a
    second row, and both survive."""
    rows = activity({}, responses=[
        {"answer": "available", "asserted_at": T(7), "name": "Dana Ruiz",
         "party_role": "signer"},
        {"answer": "unavailable", "asserted_at": T(8), "name": "Sam Okafor",
         "party_role": "signer"},
    ])
    assert len(rows) == 2
    assert all(r["kind"] == "event" for r in rows)
    assert {r["what"] for r in rows} == {"signing.available", "signing.unavailable"}
    assert "Dana Ruiz" in " ".join(r["sentence"] for r in rows)


def test_no_contact_detail_reaches_the_feed():
    """§13.1. The responses join reaches a participant for a NAME, and a
    name is all it may carry across."""
    rows = activity({}, responses=[
        {"answer": "available", "asserted_at": T(7), "name": "Dana Ruiz",
         "party_role": "signer", "email": "dana@example.test",
         "phone": "+1-555-0100"},
    ])
    blob = " ".join(str(v) for r in rows for v in r.values())
    assert "example.test" not in blob
    assert "555" not in blob
