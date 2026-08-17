"""DASH-FIX #4 — the offer whose times have all gone by.

═══ THE FINDING ═══

An audit found a signing request with a window offered for that morning,
10:00–12:00, which had passed half an hour before the audit ran.

Three surfaces described it and none of them was wrong:

  "Signing in the next 7 days"   "Nothing booked this week" — true, it is
                                 not booked
  the sidebar                    "Signings 1" — true, there is one
  the request's own sentence     "You proposed 10:00 — waiting on them to
                                 accept" — about a time that no longer
                                 exists

Nothing in the vocabulary could say otherwise, because `request_state`
had no notion of a window's time passing. `STATE_EXPIRED` is about
`expires_at` on the REQUEST — the whole invitation timing out — not about
the offer inside it going stale.

═══ WHY THIS IS A STATE AND NOT A SCREEN'S FILTER ═══

T-5's ruling, fourth application. A screen computing "have all the
windows passed" is that judgement copied into a client, and the copy is
the one that gets missed when a state is added. The state is derived in
one place and every surface inherits both the state and its sentence.

═══ AND IT IS NOT TERMINAL ═══

Nobody refused anything and nothing failed. The times ran out and
somebody has to offer new ones — which makes a lapsed request the most
actionable row on the page, and it was the one row the agenda could not
see.
"""
from datetime import datetime, timedelta, timezone

import pytest

from services import signing_loop as loop

NOW = datetime(2026, 8, 14, 18, 0, tzinfo=timezone.utc)


def _req(**over):
    return {"id": 1, "expires_at": NOW + timedelta(days=7),
            "tz_name": "America/Los_Angeles", **over}


def _win(id_, start_offset_h, length_h=2, **over):
    starts = NOW + timedelta(hours=start_offset_h)
    return {"id": id_, "starts_at": starts, "ends_at": starts + timedelta(hours=length_h),
            "origin": loop.ORIGIN_NOTARY, "proposed_by": 9, "declined_at": None, **over}


def _state(windows, responses=(), **req):
    return loop.request_state(_req(**req), windows, responses, now=NOW)


# ── The state ────────────────────────────────────────────────────────

def test_every_offered_time_gone_by_is_lapsed():
    """THE PIN THIS FILE EXISTS FOR."""
    assert _state([_win(1, -8), _win(2, -30)]) == loop.STATE_LAPSED


def test_one_time_still_ahead_is_not_lapsed():
    assert _state([_win(1, -8), _win(2, +24)]) == loop.STATE_WINDOWS_POSTED


def test_a_window_running_right_now_is_still_a_live_offer():
    """`ends_at`, not `starts_at`. A window of 10:00–12:00 is a real
    offer at 11:00, and calling it lapsed would tell her to re-offer a
    time somebody could still accept."""
    assert _state([_win(1, -1, length_h=3)]) == loop.STATE_WINDOWS_POSTED


def test_an_answer_survives_its_window_passing():
    """THE ORDERING DECISION, and it is deliberate.

    Partial agreement is checked BEFORE lapse. If somebody said they
    were available for a window that has since gone by, this is not
    "nobody answered" — it is an agreement that did not finish
    converging, and reporting it as lapsed would erase an answer a
    person actually gave.
    """
    responses = [{"window_id": 1, "participant_id": 5,
                  "answer": loop.ANSWER_AVAILABLE}]
    assert _state([_win(1, -8)], responses) == loop.STATE_PARTIALLY_AGREED


def test_a_declined_window_is_not_one_of_the_offers_that_lapsed():
    declined = _win(1, -8, declined_at=NOW - timedelta(days=1))
    # Only the declined one has passed; the live one is ahead.
    assert _state([declined, _win(2, +24)]) == loop.STATE_WINDOWS_POSTED
    # And with nothing live at all it is back to `requested`, not lapsed:
    # no offer stands, which is a different thing from every offer having
    # run out.
    assert _state([declined]) == loop.STATE_REQUESTED


def test_a_window_with_no_end_is_not_assumed_to_have_passed():
    """§4 — a missing instant is not evidence that it went by."""
    assert _state([_win(1, -8, ends_at=None)]) == loop.STATE_WINDOWS_POSTED


def test_a_naive_end_is_read_as_utc_rather_than_crashing():
    naive = _win(1, -8)
    naive["ends_at"] = naive["ends_at"].replace(tzinfo=None)
    assert _state([naive]) == loop.STATE_LAPSED


@pytest.mark.parametrize("field,value,expected", [
    ("booked_at", NOW - timedelta(days=1), loop.STATE_BOOKED),
    ("cancelled_at", NOW - timedelta(days=1), loop.STATE_CANCELLED),
    ("expires_at", NOW - timedelta(days=1), loop.STATE_EXPIRED),
])
def test_the_settled_states_still_win(field, value, expected):
    """A booked signing whose time has passed is STILL BOOKED — §13's
    oldest rule in this file, and adding a state that reasons about
    clocks is exactly when it could have been broken."""
    assert _state([_win(1, -8)], **{field: value}) == expected


def test_lapsed_is_not_terminal_because_it_is_the_most_actionable_state():
    assert loop.STATE_LAPSED not in loop.TERMINAL_STATES
    assert loop.is_live(loop.STATE_LAPSED) is True


# ── The sentence ─────────────────────────────────────────────────────

def _label(windows, responses=(), participants=(), **req):
    return loop.state_label(_req(**req), windows, responses, participants, now=NOW)


def test_it_says_the_times_passed_and_names_what_unsticks_it():
    said = _label([_win(1, -8)])
    assert "passed" in said
    assert "offer new times" in said
    assert said.startswith("1 time offered")
    assert _label([_win(1, -8), _win(2, -30)]).startswith("2 times offered")


def test_it_never_says_anybody_refused_or_that_anything_failed():
    """§13, and the temptation is real: a lapsed slot LOOKS like a
    refusal and is not one. The notary may have been ill, the email may
    have gone to spam, or the officer may have offered a slot two hours
    out on a Friday. The product knows the clock, and nothing else."""
    said = _label([_win(1, -8)]).lower()
    for claim in ("declined", "refused", "rejected", "failed", "missed",
                  "did not attend", "no-show", "ignored"):
        assert claim not in said, said


def test_the_dispatch_sentence_stops_describing_a_time_that_is_gone():
    """The audited row exactly: the officer proposed a slot, nobody
    accepted, and the sentence still read "waiting on them to accept"
    about a morning that had ended."""
    win = _win(1, -8, origin=loop.ORIGIN_OFFICER)
    said = _label([win])
    assert "waiting on" not in said.lower()
    assert "passed" in said
