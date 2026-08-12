"""The officer can call a signing off, and everybody who was asked hears.

═══ WHAT WAS ACTUALLY MISSING ═══

An external audit reported that the officer could not cancel a signing
request in any state. Checked before building, and the truth was narrower
and more useful: **the whole system was already there.**
`POST /signing-requests/v2/{id}/cancel` sets `cancelled_at` and revokes
every participant token; `request_state` derives `cancelled`;
`state_label` says "Signing request cancelled"; and the token page has
always rendered "This link has been withdrawn." on the 403 that a revoked
participant produces.

What did not exist was any way to reach it. The expanded signing panel
was read-only — zero interactive elements — so a state the product could
describe, and a recipient screen built to display it, could be produced
by nothing an officer could press.

Building an endpoint would have duplicated a working one.

═══ WHAT THIS TICKET ADDED ═══

 1. The control, the confirmation, and the decision that a cancelled
    request stays visible rather than disappearing.
 2. The notices. The endpoint told nobody, and a notary who blocked out
    Thursday afternoon is exactly who needs telling.
 3. The refusal on the delete-deed path, which turned out to matter more
    than "orphan" suggested — see below.

═══ THE ONE THAT IS NOT A TIDINESS PROBLEM ═══

`DELETE /deeds/{id}` is a SOFT delete: `status = 'deleted'`, the row
stays. So a live signing token did not break when the officer deleted the
deed — **it kept working perfectly**, serving a document she believed she
had withdrawn, to somebody she could no longer see.

That is not an orphaned link. It is a withdrawn document still being
served on request, and the only surface that knew was the stranger's.
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

import pytest

from services import signing_loop as loop
from tests.source_text import code_only

BACKEND = Path(__file__).resolve().parents[1]

dbonly = pytest.mark.skipif(not os.getenv("DATABASE_URL"),
                            reason="needs a database")


# ══════════════════════════════════════════════════════════════════════
# 1. The state vocabulary knows what is over
# ══════════════════════════════════════════════════════════════════════

def test_only_cancelled_and_expired_are_over():
    """`is_live` exists so the SCREEN does not hold this list.

    `['cancelled', 'expired']` lived in TypeScript on the Signings page —
    the same disease as the deleted `STUCK_AFTER_DAYS`, one layer up. A
    list of terminal states in another language is the copy that gets
    missed the day a seventh state is added.
    """
    assert loop.is_live(loop.STATE_REQUESTED)
    assert loop.is_live(loop.STATE_WINDOWS_POSTED)
    assert loop.is_live(loop.STATE_PARTIALLY_AGREED)
    assert loop.is_live(loop.STATE_BOOKED), (
        "a booked signing is still live — it is the one most likely to "
        "need cancelling")
    assert not loop.is_live(loop.STATE_CANCELLED)
    assert not loop.is_live(loop.STATE_EXPIRED)


def test_cancellation_beats_booking_in_the_state_vocabulary():
    """A cancelled request reports `cancelled`, whatever was arranged.

    ═══ WHY THIS IS PINNED, AND WHY HERE ═══

    `request_state` tests `cancelled_at` BEFORE `booked_at`. That order
    is the only reason a cancelled-but-booked signing does not appear in
    two places at once on the officer's list — the agenda groups by
    `state === 'booked'` and by `!live`, and a request that answered
    "booked" while also being over would land in both.

    The grouping was written with a `live &&` guard against exactly that
    collision, and the guard was dead code carrying a false explanation.
    Deleting it makes THIS ordering load-bearing, and an ordering that
    something depends on gets pinned where it is decided rather than
    assumed at the place that depends on it — otherwise reordering these
    two lines is a silent two-line change with a duplicated row three
    files away.
    """
    booked_then_cancelled = {
        "booked_at": datetime(2026, 9, 1, 17, 0, tzinfo=timezone.utc),
        "cancelled_at": datetime(2026, 8, 20, 9, 0, tzinfo=timezone.utc),
        "expires_at": None,
    }
    assert loop.request_state(booked_then_cancelled, [], []) == loop.STATE_CANCELLED, (
        "a cancelled signing reports as booked, so the officer's list "
        "shows it as an appointment she still has")
    assert not loop.is_live(loop.request_state(booked_then_cancelled, [], []))

    # The control: without the cancellation it IS booked, so the pin is
    # reading the order rather than a constant.
    still_on = dict(booked_then_cancelled, cancelled_at=None)
    assert loop.request_state(still_on, [], []) == loop.STATE_BOOKED


def test_the_agenda_sends_the_verdict_so_no_screen_has_to_decide():
    """The server half of the one-copy rule.

    THE OTHER HALF IS IN JEST, and the split is deliberate — the
    sixteenth comment-trip in this codebase was this very test, written
    to read `signings/page.tsx` through `code_only`, which parses PYTHON.
    It matched the comment explaining the removal.

    #15 already ruled on this shape: a TypeScript comment stripper on the
    Python side would be a third opinion about what a comment is. So the
    Python suite pins that the SERVER decides, and
    `frontend/src/__tests__/signingCancel.test.ts` pins that the screen
    holds no list of its own, using the stripper that speaks its language.

    ═══ AND IT NO LONGER GREPS FOR THE SPELLING ═══

    This asserted `'"live": loop.is_live(' in src` — a string-presence
    pin whose subject is a DECISION, which is the class the owner ruled
    on after CANCEL1 item 4. It broke the day the row builder moved into
    `services/signing_summary.py` even though the behaviour was
    unchanged, and it would equally have stayed green if the key had been
    computed and then dropped before the response reached anybody.

    Three checks replace it, none of which passes on a spelling: `live`
    is in the corpus both languages read; the verdict comes from
    `signing_loop`; and the agenda does not re-list the vocabulary beside
    the call. (`test_the_request_is_never_deleted` holds the end-to-end
    half — it reads `mine["live"] is False` off a real response.)
    """
    from services.signing_summary import SIGNING_SUMMARY_KEYS

    assert "live" in SIGNING_SUMMARY_KEYS, (
        "the agenda no longer sends the verdict, so every screen that "
        "needs it will decide for itself")

    src = code_only(BACKEND / "routers" / "signing.py")
    assert "live=loop.is_live(" in src, (
        "the verdict is no longer signing_loop's — a second opinion about "
        "which states are over is the defect this field exists to prevent")
    # And the vocabulary is not re-listed beside the call.
    agenda = src[src.index("def officer_agenda"):]
    agenda = agenda[: agenda.index("\n@router.")]
    assert "STATE_CANCELLED" not in agenda and "STATE_EXPIRED" not in agenda, (
        "the agenda names terminal states itself; that list belongs to "
        "signing_loop and nowhere else")


def test_no_state_guard_forbids_cancelling_a_booked_request():
    """Owner-ruled. The deal falls out, the closing moves, the buyer
    reschedules — refusing to cancel a booked signing would fail the
    officer at the exact moment she needs the product most. The weight
    goes in the confirmation copy, never in a rule that says no."""
    src = code_only(BACKEND / "routers" / "signing.py")
    handler = src[src.index("def officer_cancel("):]
    handler = handler[:handler.index("def ", 10)]
    for forbidden in ("booked_at IS NULL", "STATE_BOOKED", "cannot cancel"):
        assert forbidden not in handler, (
            f"a guard on {forbidden!r} would refuse the most important case")


# ══════════════════════════════════════════════════════════════════════
# 2. Against a real database
# ══════════════════════════════════════════════════════════════════════

@pytest.fixture
def world():
    import psycopg2
    from database import create_tables
    from db_rows import ROW_FACTORY
    create_tables()
    conn = psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=ROW_FACTORY)
    conn.autocommit = True
    tag = uuid.uuid4().hex[:8]
    made = {"tag": tag}
    with conn.cursor() as cur:
        cur.execute("INSERT INTO users (email, password_hash, full_name, role) "
                    "VALUES (%s, 'x', 'Olivia Officer', 'user') RETURNING id",
                    (f"officer-{tag}@cancel1.test",))
        made["officer"] = cur.fetchone()["id"]
        cur.execute("""INSERT INTO deeds (user_id, deed_type, property_address,
                                          county, status)
                       VALUES (%s, 'grant_deed', '1358 5th Street, Coronado, CA',
                               'San Diego', 'completed') RETURNING id""",
                    (made["officer"],))
        made["deed"] = cur.fetchone()["id"]
        cur.execute("""INSERT INTO signing_requests (deed_id, officer_user_id,
                                                     tz_name, expires_at)
                       VALUES (%s, %s, 'America/Los_Angeles', %s) RETURNING id""",
                    (made["deed"], made["officer"],
                     datetime.now(timezone.utc) + timedelta(days=14)))
        made["request"] = cur.fetchone()["id"]
        for role, name in ((loop.ROLE_NOTARY, "Nora Notary"),
                           (loop.ROLE_SIGNER, "Sam Signer")):
            cur.execute(
                """INSERT INTO signing_participants (signing_request_id, party_role,
                        display_name, email, token, expires_at)
                   VALUES (%s, %s, %s, %s, %s, %s) RETURNING id, token""",
                (made["request"], role, name, f"{role}-{tag}@cancel1.test",
                 str(uuid.uuid4()),
                 datetime.now(timezone.utc) + timedelta(days=14)))
            row = cur.fetchone()
            made[f"{role}_token"] = row["token"]
            made[f"{role}_id"] = row["id"]
    made["conn"] = conn
    yield made
    conn.close()


def _client_for(user_id: int):
    from fastapi.testclient import TestClient
    from auth import create_access_token
    from main import app
    client = TestClient(app)
    client.headers.update({
        "Authorization": f"Bearer {create_access_token({'sub': str(user_id), 'email': 'x@cancel1.test'})}"})
    return client


def _public():
    from fastapi.testclient import TestClient
    from main import app
    return TestClient(app)


@dbonly
def test_cancelling_voids_every_link_and_the_recipient_screen_says_why(world):
    """END TO END, across the seam the audit found.

    The officer presses cancel; the notary's link answers 403; and the
    token page renders "This link has been withdrawn." on exactly that
    status. The recipient side was always built — this test is the proof
    that the officer side now reaches it.
    """
    public = _public()
    assert public.get(f"/signing/{world['notary_token']}").status_code == 200

    done = _client_for(world["officer"]).post(
        f"/signing-requests/v2/{world['request']}/cancel")
    assert done.status_code == 200, done.text
    assert done.json()["state"] == "cancelled"
    assert done.json()["cancelled_at"]

    for role in (loop.ROLE_NOTARY, loop.ROLE_SIGNER):
        assert public.get(f"/signing/{world[f'{role}_token']}").status_code == 403


@dbonly
def test_the_request_is_never_deleted(world):
    """T-5, third application. A cancelled request that HAD a booked time
    still had one; folding cancellation into a status column would make
    that unsayable, and deleting the row would make it unaskable."""
    _client_for(world["officer"]).post(
        f"/signing-requests/v2/{world['request']}/cancel")
    with world["conn"].cursor() as cur:
        cur.execute("SELECT cancelled_at FROM signing_requests WHERE id = %s",
                    (world["request"],))
        row = cur.fetchone()
    assert row is not None, "the request was deleted rather than cancelled"
    assert row["cancelled_at"] is not None

    agenda = _client_for(world["officer"]).get("/signing-requests/v2").json()
    mine = next(r for r in agenda if r["id"] == world["request"])
    assert mine["live"] is False
    assert "cancelled" in mine["summary"].lower(), (
        "it stays visible and says what happened")


@dbonly
def test_everybody_invited_is_told_including_a_signer_who_never_answered(world):
    """THE RULING THAT NEEDED MAKING. Nothing was ever booked here and the
    signer never replied — and they are still told, because they hold a
    link that is now dead and finding that out by clicking it is worse.

    Being INVITED is what earns the notice, not having answered.
    """
    with patch("utils.notifications.send_signing_cancelled") as sender:
        _client_for(world["officer"]).post(
            f"/signing-requests/v2/{world['request']}/cancel")

    told = {c.kwargs["recipient_email"] for c in sender.call_args_list}
    assert told == {f"notary-{world['tag']}@cancel1.test",
                    f"signer-{world['tag']}@cancel1.test"}

    by_email = {c.kwargs["recipient_email"]: c.kwargs for c in sender.call_args_list}
    signer = by_email[f"signer-{world['tag']}@cancel1.test"]
    notary = by_email[f"notary-{world['tag']}@cancel1.test"]
    # The two registers, same as every other notice in this feature: the
    # signer gets the street line, the professional gets the address.
    assert signer["is_consumer"] is True
    assert signer["property_text"] == "1358 5th Street"
    assert notary["is_consumer"] is False
    assert notary["property_text"] == "1358 5th Street, Coronado, CA"
    assert notary["officer_name"]


@dbonly
def test_the_notices_are_sent_from_the_world_before_the_revocation(world):
    """THE BUG THIS ORDERING AVOIDS, pinned because it is invisible.

    Cancelling revokes every participant row, and the notice loop skips
    revoked participants — as every loop in that file does, so a
    participant the officer removed stops receiving mail. Read the world
    AFTER the update and this cancellation is announced to precisely
    nobody, silently, with the endpoint returning 200.
    """
    with patch("utils.notifications.send_signing_cancelled") as sender:
        _client_for(world["officer"]).post(
            f"/signing-requests/v2/{world['request']}/cancel")
    assert sender.call_count == 2, (
        "the notices went to nobody — the world was read after the "
        "participants were revoked")


@dbonly
def test_cancelling_twice_is_one_cancellation_and_one_round_of_notices(world):
    """A second "this is cancelled" email is a second alarm about a fire
    that is already out."""
    officer = _client_for(world["officer"])
    with patch("utils.notifications.send_signing_cancelled") as sender:
        officer.post(f"/signing-requests/v2/{world['request']}/cancel")
        again = officer.post(f"/signing-requests/v2/{world['request']}/cancel")
    assert again.status_code == 200
    assert sender.call_count == 2, "the second cancel sent a second round"


@dbonly
def test_a_stranger_cannot_cancel_somebody_elses_signing(world):
    with world["conn"].cursor() as cur:
        cur.execute("INSERT INTO users (email, password_hash, full_name, role) "
                    "VALUES (%s, 'x', 'Stranger', 'user') RETURNING id",
                    (f"stranger-{world['tag']}@cancel1.test",))
        stranger = cur.fetchone()["id"]
    r = _client_for(stranger).post(f"/signing-requests/v2/{world['request']}/cancel")
    assert r.status_code == 404, r.text


# ══════════════════════════════════════════════════════════════════════
# 3. Two destructive acts do not ride one button
# ══════════════════════════════════════════════════════════════════════

@dbonly
def test_deleting_a_deed_with_a_live_signing_is_refused_and_names_the_notary(world):
    """The soft-delete finding. `status = 'deleted'` leaves the row, so
    the signing token does not break — it keeps serving a document the
    officer believes she withdrew, to somebody she can no longer see."""
    r = _client_for(world["officer"]).delete(f"/deeds/{world['deed']}")
    assert r.status_code == 409, r.text
    assert "Nora Notary" in r.text, "the refusal must name who is waiting"
    assert "Cancel the signing first" in r.text

    with world["conn"].cursor() as cur:
        cur.execute("SELECT status FROM deeds WHERE id = %s", (world["deed"],))
        assert cur.fetchone()["status"] != "deleted"


@dbonly
def test_once_the_signing_is_cancelled_the_deed_can_be_deleted(world):
    """The refusal is a sequencing rule, not a lock. Cancel, then delete —
    two deliberate acts, in the order that tells three people why."""
    officer = _client_for(world["officer"])
    officer.post(f"/signing-requests/v2/{world['request']}/cancel")
    r = officer.delete(f"/deeds/{world['deed']}")
    assert r.status_code == 200, r.text


@dbonly
def test_a_deed_with_no_signing_deletes_as_before(world):
    """The guard must not become a tax on every deletion."""
    with world["conn"].cursor() as cur:
        cur.execute("""INSERT INTO deeds (user_id, deed_type, property_address, status)
                       VALUES (%s, 'grant_deed', '9 Nowhere Rd', 'completed')
                       RETURNING id""", (world["officer"],))
        lonely = cur.fetchone()["id"]
    assert _client_for(world["officer"]).delete(f"/deeds/{lonely}").status_code == 200
