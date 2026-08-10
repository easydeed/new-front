"""NOTARY2 — the loop, driven end to end over HTTP.

The service suite proves the RULES. This proves the WIRING, and the
distinction has cost this codebase real defects: A1 shipped three
never-run bugs because the only tests bypassed HTTP and the database, and
NOTARY1's `_ConnectionProxy` defect was invisible until CI ran the
no-database job. So this drives the real app against a real Postgres.

The scenario every test builds on: an officer creates a request for one
notary and two signers, the notary posts times, the signers answer, and
somewhere in there it either books or does not.
"""
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from services import signing_loop as loop  # noqa: E402

pytestmark = pytest.mark.skipif(not os.getenv("DATABASE_URL"),
                                reason="needs a database")


@pytest.fixture(autouse=True)
def clear_throttle():
    """The token routes are throttled, and the buckets are process-global.

    Without this, a suite that drives forty token calls trips its own
    rate limit and the failure looks like a routing bug. The persistent-
    state lesson, one layer up: in-memory state survives between TESTS
    the way a table survives between RUNS.
    """
    from utils import throttle
    throttle.reset()
    yield
    throttle.reset()


@pytest.fixture
def world():
    import psycopg2
    from database import create_tables
    from db_rows import ROW_FACTORY
    create_tables()
    conn = psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=ROW_FACTORY)
    conn.autocommit = True
    tag = uuid.uuid4().hex[:8]
    with conn.cursor() as cur:
        cur.execute("INSERT INTO users (email, password_hash, full_name, role) "
                    "VALUES (%s, 'x', 'Dana Reyes', 'user') RETURNING id",
                    (f"dana-{tag}@n2.test",))
        officer = cur.fetchone()["id"]
        cur.execute("INSERT INTO users (email, password_hash, full_name, role) "
                    "VALUES (%s, 'x', 'Stranger', 'user') RETURNING id",
                    (f"stranger-{tag}@n2.test",))
        stranger = cur.fetchone()["id"]
        cur.execute("""INSERT INTO deeds (user_id, deed_type, property_address, apn,
                                          grantor_name, grantee_name, county, status)
                       VALUES (%s, 'grant_deed', '9 Private Way, Los Angeles, CA 90017',
                               '1234-567-890', 'PRIVATE GRANTOR', 'PRIVATE GRANTEE',
                               'Los Angeles', 'completed') RETURNING id""", (officer,))
        deed = cur.fetchone()["id"]
    yield {"officer": officer, "stranger": stranger, "deed": deed,
           "conn": conn, "tag": tag}
    conn.close()


def client_for(user_id: int):
    from fastapi.testclient import TestClient
    from auth import create_access_token
    from main import app
    c = TestClient(app)
    c.headers.update({
        "Authorization": f"Bearer {create_access_token({'sub': str(user_id), 'email': 'x@n2.test'})}"})
    return c


def public():
    from fastapi.testclient import TestClient
    from main import app
    return TestClient(app)


def _windows(n=2, days_out=7):
    base = datetime.now(timezone.utc) + timedelta(days=days_out)
    return [{"start": (base + timedelta(days=i)).isoformat(),
             "end": (base + timedelta(days=i, hours=1)).isoformat()}
            for i in range(n)]


def _create(world, signers=2):
    r = client_for(world["officer"]).post("/signing-requests/v2", json={
        "deed_id": world["deed"],
        "notary_email": "nora@notary.test",
        "notary_name": "Nora Vance",
        "notary_company": "Vance Mobile Notary",
        "signers": [{"name": f"Signer {i}", "email": f"s{i}@example.test"}
                    for i in range(signers)],
    })
    assert r.status_code == 200, r.text
    body = r.json()
    tokens = {}
    for p in body["participants"]:
        tokens.setdefault(p["party_role"], []).append(p["link"].rsplit("/", 1)[-1])
    return body["signing_request_id"], tokens


# ══════════════════════════════════════════════════════════════════════
# The whole loop
# ══════════════════════════════════════════════════════════════════════

def test_notary_posts_signers_agree_and_it_books(world):
    request_id, tokens = _create(world)
    notary = tokens[loop.ROLE_NOTARY][0]
    signers = tokens[loop.ROLE_SIGNER]
    pub = public()

    posted = pub.post(f"/signing/{notary}/windows", json={"windows": _windows()})
    assert posted.status_code == 200, posted.text
    assert posted.json()["state"] == loop.STATE_PARTIALLY_AGREED, (
        "posting availability IS an answer — she should not have to tick her own windows")

    view = pub.get(f"/signing/{signers[0]}").json()
    assert view["party_role"] == loop.ROLE_SIGNER
    window_id = view["windows"][0]["id"]

    first = pub.post(f"/signing/{signers[0]}/answer",
                     json={"window_id": window_id, "answer": "available"})
    assert first.status_code == 200
    assert first.json()["state"] != loop.STATE_BOOKED, "one signer is not everyone"

    second = pub.post(f"/signing/{signers[1]}/answer",
                      json={"window_id": window_id, "answer": "available"})
    assert second.status_code == 200
    assert second.json()["state"] == loop.STATE_BOOKED

    with world["conn"].cursor() as cur:
        cur.execute("SELECT booked_at, booked_by, booked_asserted_at "
                    "FROM signing_requests WHERE id = %s", (request_id,))
        row = cur.fetchone()
    assert row["booked_by"] == loop.BOOKED_BY_CONVERGENCE, (
        "the parties agreed — the record must not credit the officer")
    assert row["booked_at"] is not None
    assert row["booked_asserted_at"] is not None


def test_the_officer_is_not_asked_to_approve_the_time(world):
    """Owner ruling: she initiates and is notified; she does not gate."""
    request_id, tokens = _create(world)
    pub = public()
    pub.post(f"/signing/{tokens[loop.ROLE_NOTARY][0]}/windows",
             json={"windows": _windows()})
    view = pub.get(f"/signing/{tokens[loop.ROLE_SIGNER][0]}").json()
    wid = view["windows"][0]["id"]
    for token in tokens[loop.ROLE_SIGNER]:
        pub.post(f"/signing/{token}/answer", json={"window_id": wid, "answer": "available"})

    officer = client_for(world["officer"]).get(f"/signing-requests/v2/{request_id}").json()
    assert officer["state"] == loop.STATE_BOOKED
    assert officer["booked_by"] == loop.BOOKED_BY_CONVERGENCE


def test_a_signer_saying_no_does_not_book(world):
    _, tokens = _create(world)
    pub = public()
    pub.post(f"/signing/{tokens[loop.ROLE_NOTARY][0]}/windows", json={"windows": _windows()})
    wid = pub.get(f"/signing/{tokens[loop.ROLE_SIGNER][0]}").json()["windows"][0]["id"]
    pub.post(f"/signing/{tokens[loop.ROLE_SIGNER][0]}/answer",
             json={"window_id": wid, "answer": "available"})
    last = pub.post(f"/signing/{tokens[loop.ROLE_SIGNER][1]}/answer",
                    json={"window_id": wid, "answer": "unavailable"})
    assert last.json()["state"] != loop.STATE_BOOKED


# ══════════════════════════════════════════════════════════════════════
# The signer surface — the first consumer surface
# ══════════════════════════════════════════════════════════════════════

def test_the_signer_view_carries_nothing_from_the_instrument(world):
    _, tokens = _create(world)
    pub = public()
    pub.post(f"/signing/{tokens[loop.ROLE_NOTARY][0]}/windows", json={"windows": _windows()})
    body = pub.get(f"/signing/{tokens[loop.ROLE_SIGNER][0]}").text
    for secret in ("1234-567-890", "PRIVATE GRANTOR", "PRIVATE GRANTEE",
                   "grant_deed", "Los Angeles", "90017"):
        assert secret not in body, f"the signer surface leaked {secret!r}"
    assert "9 Private Way" in body


def test_the_signer_sees_the_notary_by_name_and_company_only(world):
    _, tokens = _create(world)
    pub = public()
    view = pub.get(f"/signing/{tokens[loop.ROLE_SIGNER][0]}").json()
    assert view["notary"] == {"name": "Nora Vance", "company": "Vance Mobile Notary"}
    assert "nora@notary.test" not in pub.get(f"/signing/{tokens[loop.ROLE_SIGNER][0]}").text


def test_one_signer_never_sees_another(world):
    _, tokens = _create(world)
    body = public().get(f"/signing/{tokens[loop.ROLE_SIGNER][0]}").text
    assert "s1@example.test" not in body
    assert "Signer 1" not in body


def test_a_signer_cannot_post_availability(world):
    """Posting windows is the notary's act. A route that merely hid the
    button on her page would not be a rule."""
    _, tokens = _create(world)
    r = public().post(f"/signing/{tokens[loop.ROLE_SIGNER][0]}/windows",
                      json={"windows": _windows()})
    assert r.status_code == 403


def test_a_notary_cannot_propose_as_though_she_were_a_signer(world):
    _, tokens = _create(world)
    r = public().post(f"/signing/{tokens[loop.ROLE_NOTARY][0]}/propose",
                      json=_windows(1)[0])
    assert r.status_code == 403


# ══════════════════════════════════════════════════════════════════════
# Proposals and the cap
# ══════════════════════════════════════════════════════════════════════

def test_a_signer_proposal_is_a_proposal_not_a_booking(world):
    """Owner ruling. A signer offering a time the notary did not must not
    put an appointment in anybody's calendar on their own say-so."""
    _, tokens = _create(world, signers=1)
    pub = public()
    pub.post(f"/signing/{tokens[loop.ROLE_NOTARY][0]}/windows", json={"windows": _windows(1)})
    proposed = pub.post(f"/signing/{tokens[loop.ROLE_SIGNER][0]}/propose",
                        json=_windows(1, days_out=30)[0])
    assert proposed.status_code == 200, proposed.text
    assert proposed.json()["state"] != loop.STATE_BOOKED

    notary_view = pub.get(f"/signing/{tokens[loop.ROLE_NOTARY][0]}").json()
    origins = [w["origin"] for w in notary_view["windows"]]
    assert loop.ORIGIN_SIGNER_PROPOSAL in origins


def test_the_notary_accepting_a_proposal_can_book_it(world):
    _, tokens = _create(world, signers=1)
    pub = public()
    pub.post(f"/signing/{tokens[loop.ROLE_NOTARY][0]}/windows", json={"windows": _windows(1)})
    pub.post(f"/signing/{tokens[loop.ROLE_SIGNER][0]}/propose",
             json=_windows(1, days_out=30)[0])
    notary_view = pub.get(f"/signing/{tokens[loop.ROLE_NOTARY][0]}").json()
    proposal = next(w for w in notary_view["windows"]
                    if w["origin"] == loop.ORIGIN_SIGNER_PROPOSAL)
    accepted = pub.post(f"/signing/{tokens[loop.ROLE_NOTARY][0]}/answer",
                        json={"window_id": proposal["id"], "answer": "available"})
    assert accepted.json()["state"] == loop.STATE_BOOKED


def test_a_declined_proposal_stops_being_answerable(world):
    _, tokens = _create(world, signers=1)
    pub = public()
    pub.post(f"/signing/{tokens[loop.ROLE_NOTARY][0]}/windows", json={"windows": _windows(1)})
    pub.post(f"/signing/{tokens[loop.ROLE_SIGNER][0]}/propose",
             json=_windows(1, days_out=30)[0])
    view = pub.get(f"/signing/{tokens[loop.ROLE_NOTARY][0]}").json()
    proposal = next(w for w in view["windows"] if w["origin"] == loop.ORIGIN_SIGNER_PROPOSAL)
    pub.post(f"/signing/{tokens[loop.ROLE_NOTARY][0]}/decline/{proposal['id']}")
    again = pub.post(f"/signing/{tokens[loop.ROLE_SIGNER][0]}/answer",
                     json={"window_id": proposal["id"], "answer": "available"})
    assert again.status_code == 409


def test_the_cap_is_three_and_the_refusal_names_the_officer(world):
    """Owner ruling: three, AGGREGATE. Two signers alternating twice each
    is six emails and the same deadlock a cap exists to prevent."""
    _, tokens = _create(world, signers=2)
    pub = public()
    pub.post(f"/signing/{tokens[loop.ROLE_NOTARY][0]}/windows", json={"windows": _windows(1)})
    # Alternating signers, to prove the cap is not per-person.
    order = [tokens[loop.ROLE_SIGNER][0], tokens[loop.ROLE_SIGNER][1],
             tokens[loop.ROLE_SIGNER][0]]
    for i, token in enumerate(order):
        r = pub.post(f"/signing/{token}/propose", json=_windows(1, days_out=30 + i)[0])
        assert r.status_code == 200, r.text
    refused = pub.post(f"/signing/{tokens[loop.ROLE_SIGNER][1]}/propose",
                       json=_windows(1, days_out=60)[0])
    assert refused.status_code == 409
    assert "Dana Reyes" in refused.json()["detail"]
    assert "call" in refused.json()["detail"].lower()

    # And picking an existing time still works — the cap closes the
    # negotiation, not the feature.
    view = pub.get(f"/signing/{tokens[loop.ROLE_SIGNER][1]}").json()
    assert view["proposals_remaining"] == 0
    assert pub.post(f"/signing/{tokens[loop.ROLE_SIGNER][1]}/answer",
                    json={"window_id": view["windows"][0]["id"],
                          "answer": "available"}).status_code == 200


# ══════════════════════════════════════════════════════════════════════
# The officer's override
# ══════════════════════════════════════════════════════════════════════

def test_the_override_is_recorded_as_her_assertion(world):
    request_id, tokens = _create(world)
    officer = client_for(world["officer"])
    when = (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()
    r = officer.post(f"/signing-requests/v2/{request_id}/override",
                     json={"booked_at": when})
    assert r.status_code == 200, r.text
    assert r.json()["booked_by"] == loop.BOOKED_BY_OFFICER
    assert "you recorded" in r.json()["summary"].lower()


def test_the_override_refuses_a_time_without_a_zone(world):
    """The NOTARY1 bug, closed on every path that accepts a time."""
    request_id, _ = _create(world)
    r = client_for(world["officer"]).post(
        f"/signing-requests/v2/{request_id}/override",
        json={"booked_at": "2026-09-01T10:00:00"})
    assert r.status_code == 400
    assert "offset" in r.json()["detail"].lower()


def test_the_officer_can_correct_a_booking_the_parties_made(world):
    """Convergence writes once and never argues with itself; an override
    is the officer CORRECTING the record, including a booking that
    already exists. The record keeps which is which."""
    request_id, tokens = _create(world)
    pub = public()
    pub.post(f"/signing/{tokens[loop.ROLE_NOTARY][0]}/windows", json={"windows": _windows()})
    wid = pub.get(f"/signing/{tokens[loop.ROLE_SIGNER][0]}").json()["windows"][0]["id"]
    for token in tokens[loop.ROLE_SIGNER]:
        pub.post(f"/signing/{token}/answer", json={"window_id": wid, "answer": "available"})

    officer = client_for(world["officer"])
    assert officer.get(f"/signing-requests/v2/{request_id}").json()["booked_by"] == \
        loop.BOOKED_BY_CONVERGENCE
    when = (datetime.now(timezone.utc) + timedelta(days=20)).isoformat()
    r = officer.post(f"/signing-requests/v2/{request_id}/override", json={"booked_at": when})
    assert r.json()["booked_by"] == loop.BOOKED_BY_OFFICER


# ══════════════════════════════════════════════════════════════════════
# Authorization and link lifecycle
# ══════════════════════════════════════════════════════════════════════

def test_a_stranger_cannot_create_a_request_on_someone_elses_deed(world):
    r = client_for(world["stranger"]).post("/signing-requests/v2", json={
        "deed_id": world["deed"], "notary_email": "n@x.test",
        "signers": [{"name": "S", "email": "s@x.test"}]})
    assert r.status_code == 404


def test_a_stranger_cannot_read_or_override_someone_elses_request(world):
    request_id, _ = _create(world)
    stranger = client_for(world["stranger"])
    assert stranger.get(f"/signing-requests/v2/{request_id}").status_code == 404
    assert stranger.post(f"/signing-requests/v2/{request_id}/override",
                         json={"booked_at": datetime.now(timezone.utc).isoformat()}
                         ).status_code == 404


def test_a_malformed_token_is_refused_before_postgres_sees_it(world):
    """`token` is a UUID column: a malformed value is a TYPE ERROR, not a
    miss, and on the shared connection it aborts the request."""
    for bad in ("not-a-token", "1 OR 1=1", "../../etc/passwd"):
        assert public().get(f"/signing/{bad}").status_code == 404


def test_cancelling_withdraws_every_link(world):
    request_id, tokens = _create(world)
    client_for(world["officer"]).post(f"/signing-requests/v2/{request_id}/cancel")
    pub = public()
    for role_tokens in tokens.values():
        for token in role_tokens:
            assert pub.get(f"/signing/{token}").status_code == 403


def test_an_expired_link_stops_answering(world):
    request_id, tokens = _create(world)
    with world["conn"].cursor() as cur:
        cur.execute("UPDATE signing_participants SET expires_at = now() - interval '1 day' "
                    "WHERE signing_request_id = %s", (request_id,))
    pub = public()
    token = tokens[loop.ROLE_SIGNER][0]
    assert pub.get(f"/signing/{token}").status_code == 410
    assert pub.post(f"/signing/{token}/answer",
                    json={"window_id": 1, "answer": "available"}).status_code == 410


def test_the_agenda_lists_signings_across_files(world):
    """Part D, as an agenda rather than a month grid (owner-accepted cut)."""
    request_id, _ = _create(world)
    rows = client_for(world["officer"]).get("/signing-requests/v2").json()
    mine = [r for r in rows if r["id"] == request_id]
    assert mine, "the officer's own signing is missing from her agenda"
    assert mine[0]["property_address"]
    assert mine[0]["summary"], "no status line"
    assert mine[0]["signers"] == 2


def test_the_agenda_shows_only_her_own(world):
    request_id, _ = _create(world)
    rows = client_for(world["stranger"]).get("/signing-requests/v2").json()
    assert all(r["id"] != request_id for r in rows)


# ══════════════════════════════════════════════════════════════════════
# The emails actually fire
#
# Every send in this loop is best-effort and non-fatal, which is correct
# — a booking that happened must not be undone because a mail server was
# slow — and it means a broken send makes NOTHING go red. So the ledger
# is the assertion: `email_log` records every ATTEMPT through the one
# transport (ADMIN3), configured or not.
#
# High-water marks throughout, per the rule these suites learned twice:
# `email_log` survives between runs, so "a row with this template exists"
# is satisfied by yesterday's row and passes with the code broken.
# ══════════════════════════════════════════════════════════════════════

def _mark(conn) -> int:
    with conn.cursor() as cur:
        cur.execute("SELECT COALESCE(MAX(id), 0) AS m FROM email_log")
        return cur.fetchone()["m"]


def _sent_since(conn, mark: int):
    with conn.cursor() as cur:
        cur.execute("SELECT template, recipient FROM email_log WHERE id > %s "
                    "ORDER BY id", (mark,))
        return [(r["template"], r["recipient"]) for r in (cur.fetchall() or [])]


def test_creating_a_request_asks_the_notary_and_nobody_else(world):
    """The signers are NOT emailed yet. "Pick a time" with no times is
    asking a consumer to do nothing, and the first email this product
    ever sends a member of the public should not be that."""
    mark = _mark(world["conn"])
    _create(world)
    sent = _sent_since(world["conn"], mark)
    assert [t for t, _ in sent] == ['notary_invited'], sent
    assert sent[0][1] == 'nora@notary.test'


def test_posting_windows_tells_every_signer_on_their_own_link(world):
    _, tokens = _create(world)
    mark = _mark(world["conn"])
    public().post(f"/signing/{tokens[loop.ROLE_NOTARY][0]}/windows",
                  json={"windows": _windows()})
    sent = _sent_since(world["conn"], mark)
    assert [t for t, _ in sent] == ['signing_windows_posted'] * 2, sent
    assert {r for _, r in sent} == {'s0@example.test', 's1@example.test'}


def test_a_proposal_tells_the_notary(world):
    _, tokens = _create(world, signers=1)
    pub = public()
    pub.post(f"/signing/{tokens[loop.ROLE_NOTARY][0]}/windows", json={"windows": _windows(1)})
    mark = _mark(world["conn"])
    pub.post(f"/signing/{tokens[loop.ROLE_SIGNER][0]}/propose",
             json=_windows(1, days_out=30)[0])
    sent = _sent_since(world["conn"], mark)
    assert [t for t, _ in sent] == ['signing_proposal_received'], sent
    assert sent[0][1] == 'nora@notary.test'


def test_booking_tells_everyone_once(world):
    """All three parties, one email each. Not two for anybody: a person
    who gets the same news twice stops reading the second one."""
    _, tokens = _create(world)
    pub = public()
    pub.post(f"/signing/{tokens[loop.ROLE_NOTARY][0]}/windows", json={"windows": _windows()})
    wid = pub.get(f"/signing/{tokens[loop.ROLE_SIGNER][0]}").json()["windows"][0]["id"]
    pub.post(f"/signing/{tokens[loop.ROLE_SIGNER][0]}/answer",
             json={"window_id": wid, "answer": "available"})
    mark = _mark(world["conn"])
    pub.post(f"/signing/{tokens[loop.ROLE_SIGNER][1]}/answer",
             json={"window_id": wid, "answer": "available"})

    sent = _sent_since(world["conn"], mark)
    booked = [r for t, r in sent if t == 'signing_booked']
    assert sorted(booked) == ['nora@notary.test', 's0@example.test', 's1@example.test']
    assert len(booked) == len(set(booked)), "somebody was told twice"


def test_windows_that_book_immediately_do_not_also_say_pick_a_time(world):
    """A single-signer request where the notary posts a time the signer
    has already agreed to would otherwise send "pick one" and "it is
    booked" in the same minute."""
    _, tokens = _create(world, signers=1)
    pub = public()
    pub.post(f"/signing/{tokens[loop.ROLE_NOTARY][0]}/windows", json={"windows": _windows(1)})
    wid = pub.get(f"/signing/{tokens[loop.ROLE_SIGNER][0]}").json()["windows"][0]["id"]
    pub.post(f"/signing/{tokens[loop.ROLE_SIGNER][0]}/answer",
             json={"window_id": wid, "answer": "available"})
    # Now a SECOND window posted after it is already booked.
    mark = _mark(world["conn"])
    pub.post(f"/signing/{tokens[loop.ROLE_NOTARY][0]}/windows",
             json={"windows": _windows(1, days_out=40)})
    assert 'signing_windows_posted' not in [t for t, _ in _sent_since(world["conn"], mark)]


# ══════════════════════════════════════════════════════════════════════
# Reminders — officer-triggered, capped, and aimed only at silence
# ══════════════════════════════════════════════════════════════════════

def test_a_reminder_goes_only_to_people_who_have_answered_nothing(world):
    """Somebody who said "not that time" HAS answered. Re-asking them the
    same question is how a product teaches people to ignore it."""
    _, tokens = _create(world)
    pub = public()
    officer = client_for(world["officer"])
    pub.post(f"/signing/{tokens[loop.ROLE_NOTARY][0]}/windows", json={"windows": _windows()})
    wid = pub.get(f"/signing/{tokens[loop.ROLE_SIGNER][0]}").json()["windows"][0]["id"]
    pub.post(f"/signing/{tokens[loop.ROLE_SIGNER][0]}/answer",
             json={"window_id": wid, "answer": "unavailable"})

    mark = _mark(world["conn"])
    r = officer.post(f"/signing-requests/v2/{world_request_id(world)}/remind")
    assert r.status_code == 200, r.text
    body = r.json()
    # The notary answered by posting; signer 0 answered "no"; only signer
    # 1 is silent.
    assert [s["name"] for s in body["sent"]] == ["Signer 1"]
    assert {s["why"] for s in body["skipped"]} == {"already answered"}
    assert [t for t, _ in _sent_since(world["conn"], mark)] == ["signing_reminder"]


def test_a_signer_is_not_chased_before_there_are_times_to_look_at(world):
    """A reminder they cannot act on is noise aimed at the wrong person —
    the request is waiting on the notary, not on them."""
    _, _tokens = _create(world)
    r = client_for(world["officer"]).post(
        f"/signing-requests/v2/{world_request_id(world)}/remind")
    body = r.json()
    assert [s["name"] for s in body["sent"]] == ["Nora Vance"]
    assert {s["why"] for s in body["skipped"]} == {"no times posted yet"}


def test_the_reminder_cap_is_three_per_person(world):
    _, _tokens = _create(world)
    officer = client_for(world["officer"])
    rid = world_request_id(world)
    for _ in range(3):
        officer.post(f"/signing-requests/v2/{rid}/remind")
    body = officer.post(f"/signing-requests/v2/{rid}/remind").json()
    assert body["sent"] == []
    assert "reminded three times" in {s["why"] for s in body["skipped"]}


def test_a_failed_send_still_counts_against_the_cap(world):
    """Fail-closed. "The transport reported an error" is not proof
    nothing arrived, and the two mistakes cost differently: undercounting
    means a consumer gets an email they did not consent to."""
    _, _tokens = _create(world)
    officer = client_for(world["officer"])
    rid = world_request_id(world)
    officer.post(f"/signing-requests/v2/{rid}/remind")
    with world["conn"].cursor() as cur:
        cur.execute("SELECT reminders_sent FROM signing_participants "
                    "WHERE signing_request_id = %s AND party_role = 'notary'", (rid,))
        # No transport is configured in tests, so every send "fails".
        assert cur.fetchone()["reminders_sent"] == 1


def test_a_settled_signing_has_nobody_to_chase(world):
    _, tokens = _create(world)
    pub = public()
    pub.post(f"/signing/{tokens[loop.ROLE_NOTARY][0]}/windows", json={"windows": _windows()})
    wid = pub.get(f"/signing/{tokens[loop.ROLE_SIGNER][0]}").json()["windows"][0]["id"]
    for t in tokens[loop.ROLE_SIGNER]:
        pub.post(f"/signing/{t}/answer", json={"window_id": wid, "answer": "available"})
    r = client_for(world["officer"]).post(
        f"/signing-requests/v2/{world_request_id(world)}/remind")
    assert r.status_code == 409


def test_a_stranger_cannot_send_reminders_on_someone_elses_request(world):
    _create(world)
    r = client_for(world["stranger"]).post(
        f"/signing-requests/v2/{world_request_id(world)}/remind")
    assert r.status_code == 404


def test_the_reminder_asks_the_same_question_the_original_ask_did(world):
    """NOTARY1 refused to reuse the review reminder because it asked the
    wrong question. A reminder that REPHRASES is one the recipient has to
    re-read from scratch — and no urgency theatre on a consumer who is
    doing us a favour."""
    from utils import email_templates as t
    subject, html, text = t.signing_reminder(
        "Sam", "Dana Reyes", "Pacific Coast Title", "Nora", "9 Private Way",
        ["Tuesday at 10:00 AM"], "http://x", True)
    assert "still" in (subject + html).lower()
    for pressure in ("urgent", "immediately", "final notice", "asap",
                     "act now", "last chance"):
        assert pressure not in html.lower(), f"urgency theatre: {pressure}"
    # And it offers the way out that always works.
    assert "call" in html.lower()


def world_request_id(world) -> int:
    with world["conn"].cursor() as cur:
        cur.execute("SELECT id FROM signing_requests WHERE officer_user_id = %s "
                    "ORDER BY id DESC LIMIT 1", (world["officer"],))
        return cur.fetchone()["id"]
