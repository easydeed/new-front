"""FLOW1 item 7 — DISPATCH: the officer proposes, the notary accepts.

═══ THE MODEL, AND WHY IT IS THE PRIMARY ONE ═══

Owner research into escrow practice: the officer knows when the documents
are ready, schedules with the signers directly — usually by phone — and
then dispatches a notary for that time, who accepts or declines. The
notary is a contractor receiving an assignment.

NOTARY2's loop inverts that: the notary posts availability, the signers
converge, it books. That is the right model for FINDING a time among
people with no prior contact. It is the wrong one for the ordinary case,
where she already has her clients on the phone and needs somebody to show
up.

§13.1 IS UNTOUCHED AND THIS IS WORTH BEING PRECISE ABOUT. Its argument
was that routing AROUND the signers recreated phone tag. Dispatch does
not route around them — the officer talks to them FIRST, which is the leg
she was always going to do herself. What changes is who proposes the
time, not who is included.

═══ THE ONE GAP, AND THE ONE COLUMN THAT CLOSES IT ═══

`converged_window_id` requires the notary AND every live signer to have
answered `available`. Under dispatch the signers never answer this
product — the officer already spoke to them — so convergence could never
fire and the request would sit in `partially_agreed` forever while
everyone involved believed it was booked.

`signing_responses.asserted_by` closes it. An officer-asserted signer row
COUNTS toward convergence, because it is an answer on the record. What it
does not do is disappear: the asserter travels with the row, every
surface can say who spoke, and `state_label` refuses to call such a
booking "everyone agreed".

WITHOUT THE COLUMN THE ROW WOULD LIE — it would say a signer answered
when the officer did. That is exactly the distinction `booked_by` and
RED-S4's `recording_asserted_by` exist to preserve, one level down: the
same argument applied to the answers a booking is built from rather than
to the booking itself.

═══ THE FALLBACK IS NEARLY FREE, AND THAT IS NOT A COINCIDENCE ═══

A declined assignment leaves a request with no live window — which is
exactly the state a fresh request is in. So the state returns to
`requested`, the label goes back to "waiting on the notary to post the
times they are free", and the availability loop resumes unchanged.
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from services import signing_loop as loop
from tests.source_text import code_only

BACKEND = Path(__file__).resolve().parents[1]

dbonly = pytest.mark.skipif(not os.getenv("DATABASE_URL"), reason="needs a database")


# ══════════════════════════════════════════════════════════════════════
# The vocabulary and the convergence rule — no database needed
# ══════════════════════════════════════════════════════════════════════

def test_an_answer_with_no_asserter_is_the_participants_own():
    """Every row written before this column existed was written by the
    person it is about, so the default is a fact rather than a guess."""
    assert loop.asserted_by({}) == loop.ASSERTED_BY_PARTICIPANT
    assert loop.asserted_by({"asserted_by": None}) == loop.ASSERTED_BY_PARTICIPANT
    assert loop.asserted_by({"asserted_by": "officer"}) == loop.ASSERTED_BY_OFFICER


def _world(asserter: str):
    """A notary, one signer, one officer window, both said available."""
    participants = [{"id": 1, "party_role": loop.ROLE_NOTARY},
                    {"id": 2, "party_role": loop.ROLE_SIGNER,
                     "display_name": "Sam"}]
    windows = [{"id": 10, "starts_at": datetime(2026, 9, 1, 17, tzinfo=timezone.utc),
                "ends_at": datetime(2026, 9, 1, 18, tzinfo=timezone.utc),
                "origin": loop.ORIGIN_OFFICER}]
    responses = [
        {"window_id": 10, "participant_id": 2, "answer": loop.ANSWER_AVAILABLE,
         "asserted_by": asserter},
        {"window_id": 10, "participant_id": 1, "answer": loop.ANSWER_AVAILABLE,
         "asserted_by": loop.ASSERTED_BY_PARTICIPANT},
    ]
    return participants, windows, responses


def test_an_officer_asserted_answer_counts_toward_convergence():
    """It is an answer on the record. She rang them and is saying so."""
    participants, windows, responses = _world(loop.ASSERTED_BY_OFFICER)
    assert loop.converged_window_id(participants, windows, responses) == 10


def test_convergence_still_needs_the_notary_to_have_accepted():
    """Dispatch does not let the officer book on her own say-so. That is
    what the override is for, and the override records itself as hers."""
    participants, windows, responses = _world(loop.ASSERTED_BY_OFFICER)
    without_notary = [r for r in responses if r["participant_id"] != 1]
    assert loop.converged_window_id(participants, windows, without_notary) is None


def test_the_booking_sentence_refuses_to_say_everyone_agreed():
    """THE POINT OF THE COLUMN, as a sentence.

    A window everybody personally agreed to and a window the officer
    vouched for are both booked, and they are not the same claim.
    """
    participants, windows, responses = _world(loop.ASSERTED_BY_OFFICER)
    participants[0]["display_name"] = "Nora"
    request = {"booked_at": windows[0]["starts_at"],
               "booked_by": loop.BOOKED_BY_CONVERGENCE,
               "tz_name": "America/Los_Angeles"}
    label = loop.state_label(request, windows, responses, participants)
    assert "everyone agreed" not in label.lower()
    assert "you recorded the signers' agreement" in label.lower()
    assert "nora" in label.lower()

    # And when they really did all answer, it says so.
    participants2, windows2, responses2 = _world(loop.ASSERTED_BY_PARTICIPANT)
    label2 = loop.state_label(request, windows2, responses2, participants2)
    assert "everyone agreed" in label2.lower()


def test_a_dispatch_awaiting_acceptance_says_so():
    """Without this branch the officer's own agenda would describe her
    dispatch back to her as "1 times offered — waiting on 1 more person",
    which is true and useless."""
    participants, windows, responses = _world(loop.ASSERTED_BY_OFFICER)
    participants[0]["display_name"] = "Nora"
    responses = [r for r in responses if r["participant_id"] != 1]
    request = {"tz_name": "America/Los_Angeles",
               "expires_at": datetime(2027, 1, 1, tzinfo=timezone.utc)}
    label = loop.state_label(request, windows, responses, participants)
    assert "waiting on nora to accept" in label.lower()
    assert "you proposed" in label.lower()


def test_the_label_never_promises_a_dispatched_signing_will_happen():
    """§13 at the moment it is most tempting to break."""
    participants, windows, responses = _world(loop.ASSERTED_BY_OFFICER)
    request = {"booked_at": windows[0]["starts_at"],
               "booked_by": loop.BOOKED_BY_CONVERGENCE,
               "tz_name": "America/Los_Angeles"}
    label = loop.state_label(request, windows, responses, participants).lower()
    for promise in ("will happen", "will take place", "will be signed",
                    "is confirmed", "guaranteed", "completed"):
        assert promise not in label, f"the label promises: {label}"


def test_a_name_is_not_a_pronoun_in_the_sentence_writer():
    """§11.1. `state_label` said "the times SHE is free" about a notary
    whose pronouns nobody has told us — the FLOW1 sweep read `utils/` and
    `templates/` and not `services/`, so the one function that writes
    every surface's sentence kept it."""
    src = code_only(BACKEND / "services" / "signing_loop.py")
    import re
    offenders = [line.strip() for line in src.splitlines()
                 if re.search(r"\b(she|her|hers|herself|he|him|his|himself)\b",
                              line, re.I)]
    assert offenders == [], offenders


# ══════════════════════════════════════════════════════════════════════
# The whole path, against a database
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
    made = {"users": [], "deeds": []}
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO users (email, password_hash, full_name, role) "
            "VALUES (%s, 'x', 'Officer', 'user') RETURNING id",
            (f"officer-{tag}@dispatch.test",))
        made["users"].append(cur.fetchone()["id"])
        cur.execute(
            """INSERT INTO deeds (user_id, deed_type, property_address, apn,
                                  grantor_name, grantee_name, county, status)
               VALUES (%s, 'grant_deed', '30 Dispatch Way, Los Angeles, CA',
                       '1234-567-890', 'GRANTOR', 'GRANTEE', 'Los Angeles',
                       'completed') RETURNING id""",
            (made["users"][0],))
        made["deeds"].append(cur.fetchone()["id"])
    made["conn"] = conn
    yield made
    conn.close()


def _client_for(user_id: int):
    from fastapi.testclient import TestClient
    from auth import create_access_token
    from main import app

    client = TestClient(app)
    client.headers.update({
        "Authorization": "Bearer " + create_access_token(
            {"sub": str(user_id), "email": "officer@dispatch.test"})})
    return client


def _times(days_out: int = 4):
    base = datetime.now(timezone.utc) + timedelta(days=days_out)
    return {"start": base.isoformat(), "end": (base + timedelta(hours=1)).isoformat()}


def _dispatch(world, *, agreed: bool = True):
    return _client_for(world["users"][0]).post("/signing-requests/v2", json={
        "deed_id": world["deeds"][0],
        "notary_email": "nora@dispatch.test",
        "notary_name": "Nora",
        "signers": [{"name": "Sam Signer", "email": "sam@dispatch.test"}],
        "proposed_time": _times(),
        "signers_already_agreed": agreed,
    })


@dbonly
def test_the_whole_dispatch(world):
    """Officer proposes → notary accepts → it books, and the record says
    who actually spoke."""
    from fastapi.testclient import TestClient
    from main import app

    made = _dispatch(world)
    assert made.status_code == 200, made.text
    body = made.json()
    assert "accepts or declines" in body["next"]

    request_id = body["signing_request_id"]
    notary_link = next(p["link"] for p in body["participants"]
                       if p["party_role"] == "notary")
    notary_token = notary_link.rsplit("/", 1)[-1]

    # Before she answers: proposed, not booked, and the officer's own
    # surface says what it is waiting on.
    officer = _client_for(world["users"][0])
    view = officer.get(f"/signing-requests/v2/{request_id}").json()
    assert view["booked_at"] is None
    assert "waiting on nora to accept" in view["summary"].lower()
    assert view["windows"][0]["origin"] == "officer"

    public = TestClient(app)
    seen = public.get(f"/signing/{notary_token}").json()
    window_id = seen["windows"][0]["id"]
    accepted = public.post(f"/signing/{notary_token}/answer",
                           json={"window_id": window_id, "answer": "available"})
    assert accepted.status_code == 200, accepted.text

    booked = officer.get(f"/signing-requests/v2/{request_id}").json()
    assert booked["booked_at"] is not None
    assert booked["state"] == "booked"
    # The sentence tells the truth about who spoke.
    assert "everyone agreed" not in booked["summary"].lower()
    assert "you recorded the signers' agreement" in booked["summary"].lower()


@dbonly
def test_the_signer_sees_who_answered_for_them(world):
    """A consumer opening their link must not be told they said something
    they did not say. The one audience with no account, no history and no
    way to check is the one that most needs this."""
    from fastapi.testclient import TestClient
    from main import app

    body = _dispatch(world).json()
    signer_token = next(p["link"] for p in body["participants"]
                        if p["party_role"] == "signer").rsplit("/", 1)[-1]
    pkg = TestClient(app).get(f"/signing/{signer_token}").json()
    answers = list(pkg["my_answers"].values())
    assert answers, "the officer's assertion is not on the signer's surface"
    assert answers[0]["answer"] == "available"
    assert answers[0]["asserted_by"] == "officer"


@dbonly
def test_without_the_assertion_the_signers_must_still_answer(world):
    """The safe half of the fork: a time proposed without the tick is a
    time the signers have to agree to themselves."""
    from fastapi.testclient import TestClient
    from main import app

    body = _dispatch(world, agreed=False).json()
    request_id = body["signing_request_id"]
    notary_token = next(p["link"] for p in body["participants"]
                        if p["party_role"] == "notary").rsplit("/", 1)[-1]
    public = TestClient(app)
    window_id = public.get(f"/signing/{notary_token}").json()["windows"][0]["id"]
    public.post(f"/signing/{notary_token}/answer",
                json={"window_id": window_id, "answer": "available"})

    view = _client_for(world["users"][0]).get(
        f"/signing-requests/v2/{request_id}").json()
    assert view["booked_at"] is None, (
        "it booked on the notary's answer alone — the signers never agreed")


@dbonly
def test_an_assertion_with_no_time_is_refused(world):
    """Silently dropping it would record nothing and tell her nothing,
    and she would believe her signers were on the record."""
    r = _client_for(world["users"][0]).post("/signing-requests/v2", json={
        "deed_id": world["deeds"][0],
        "notary_email": "nora@dispatch.test",
        "signers": [{"name": "Sam", "email": "sam@dispatch.test"}],
        "signers_already_agreed": True,
    })
    assert r.status_code == 400
    assert "alongside a proposed time" in r.text


@dbonly
def test_a_naive_time_is_refused_before_anything_is_written(world):
    """A time we would refuse must not leave a half-made request behind.

    And a wall-clock time with no zone is not a time — #149's rule,
    which exists because the alternative produced a calendar file up to
    eight hours out.
    """
    officer = _client_for(world["users"][0])
    before = len(officer.get("/signing-requests/v2").json())
    r = officer.post("/signing-requests/v2", json={
        "deed_id": world["deeds"][0],
        "notary_email": "nora@dispatch.test",
        "signers": [{"name": "Sam", "email": "sam@dispatch.test"}],
        "proposed_time": {"start": "2026-09-01T10:00:00",
                          "end": "2026-09-01T11:00:00"},
    })
    assert r.status_code == 400, r.text
    assert len(officer.get("/signing-requests/v2").json()) == before, (
        "a refused time left a request behind")


@dbonly
def test_a_declined_dispatch_falls_back_to_negotiation(world):
    """The fallback, and it is nearly free because it is the flow that
    already exists: a declined assignment leaves a request with no live
    window, which is exactly the state a fresh request is in."""
    from fastapi.testclient import TestClient
    from main import app

    body = _dispatch(world).json()
    request_id = body["signing_request_id"]
    notary_token = next(p["link"] for p in body["participants"]
                        if p["party_role"] == "notary").rsplit("/", 1)[-1]

    public = TestClient(app)
    window_id = public.get(f"/signing/{notary_token}").json()["windows"][0]["id"]
    declined = public.post(f"/signing/{notary_token}/decline/{window_id}")
    assert declined.status_code == 200, declined.text

    officer = _client_for(world["users"][0])
    view = officer.get(f"/signing-requests/v2/{request_id}").json()
    assert view["state"] == "requested", view["state"]
    assert "post the times they are free" in view["summary"].lower()
    assert view["booked_at"] is None

    # And the loop resumes with no new code: she posts availability.
    base = datetime.now(timezone.utc) + timedelta(days=9)
    posted = public.post(f"/signing/{notary_token}/windows", json={
        "windows": [{"start": base.isoformat(),
                     "end": (base + timedelta(hours=1)).isoformat()}]})
    assert posted.status_code == 200, posted.text
    resumed = officer.get(f"/signing-requests/v2/{request_id}").json()
    assert resumed["state"] in ("windows_posted", "partially_agreed")


@dbonly
def test_the_officer_is_told_when_a_dispatch_is_declined(world):
    """She proposed it; she is the one who needs to know it is off."""
    from fastapi.testclient import TestClient
    from main import app

    body = _dispatch(world).json()
    notary_token = next(p["link"] for p in body["participants"]
                        if p["party_role"] == "notary").rsplit("/", 1)[-1]
    public = TestClient(app)
    window_id = public.get(f"/signing/{notary_token}").json()["windows"][0]["id"]
    public.post(f"/signing/{notary_token}/decline/{window_id}")

    # `notifications` holds the message; `user_notifications` holds who
    # it is for. Two tables, joined — reading `notifications.user_id`
    # would be reading a column that does not exist, which is how the
    # first version of this test failed and earned the join.
    with world["conn"].cursor() as cur:
        cur.execute("""SELECT n.type, n.link FROM notifications n
                         JOIN user_notifications un ON un.notification_id = n.id
                        WHERE un.user_id = %s
                        ORDER BY n.id DESC LIMIT 1""", (world["users"][0],))
        row = cur.fetchone()
    assert row and row["type"] == "signing_dispatch_declined"
    # And it points at the signing, not at a list — FLOW1 item 4's route.
    # The merged tracker, with the kind the old path used to imply. A
    # bare `?focus=` there is ambiguous — a review id and a signing id are
    # both integers — and the page correctly refuses to guess, so a link
    # without its kind would land her on the right page pointing at
    # nothing.
    assert row["link"].startswith("/requests?kind=signings&focus=")


@dbonly
def test_an_officer_window_is_not_attributed_to_the_notary(world):
    """#156's migration pointed officer-origin windows at the NOTARY
    because `proposed_by` was NOT NULL, which reads as her having offered
    a time she has never seen. `origin` carried the truth and the column
    contradicted it."""
    body = _dispatch(world).json()
    with world["conn"].cursor() as cur:
        cur.execute("SELECT origin, proposed_by FROM signing_windows "
                    "WHERE signing_request_id = %s",
                    (body["signing_request_id"],))
        row = cur.fetchone()
    assert row["origin"] == "officer"
    assert row["proposed_by"] is None


@dbonly
def test_the_signers_are_not_emailed_a_time_nobody_has_accepted(world):
    """§13 by email. Telling a consumer their signing is at 10am on
    Tuesday, before the person who has to show up has answered, is the
    arrangement-is-not-an-act error committed to somebody's inbox."""
    with world["conn"].cursor() as cur:
        cur.execute("SELECT COALESCE(MAX(id), 0) AS high FROM email_log")
        high = cur.fetchone()["high"]

    _dispatch(world)

    with world["conn"].cursor() as cur:
        cur.execute("SELECT template, recipient FROM email_log WHERE id > %s",
                    (high,))
        sent = cur.fetchall()
    assert sent, "the notary was not emailed at all"
    assert all(r["recipient"] != "sam@dispatch.test" for r in sent), (
        "a signer was emailed about a time nobody has accepted")
    assert any(r["template"] == "notary_dispatched" for r in sent), (
        "the notary got the availability email, not the assignment")
