"""DASH1 — the officer's queue, and the numbers it is allowed to claim.

═══ THE FINDING ═══

The dashboard showed AUTHORING state only: four counters and a feed of
completed deeds. Nothing on it was workflow state — and workflow state is
the escrow officer's job. She could not answer "what is stuck?", "what
signs tomorrow?" or "who has not responded?" without visiting two other
pages, while the page carried four entry points for creating a deed,
which she does once per file.

═══ WHAT THESE PINS PROTECT ═══

 1. THE PAYLOAD'S SHAPE, by equality. Same rule as the NOTARY2 token
    surfaces and the Shared Deeds row: a screen reading a key the server
    stopped sending renders `undefined` and says nothing about it, which
    is what FLOW1 item 0 was a whole PR about.

 2. THE ATTENTION NUMBER MEANS SOMETHING. If it counted every row it
    would mean "there are rows below", and she would stop reading it. It
    counts stale unanswered requests: when it is zero, nobody is waiting
    on her and nobody has gone quiet.

 3. AN UNKNOWN AGE IS NOT URGENT. A row we cannot date must not be
    pushed into that count on the strength of a missing timestamp.

 4. ONE PLACE DECIDES WHAT STALE MEANS. `/signings` carried
    `STUCK_AFTER_DAYS = 5` in TypeScript; a second threshold in Python
    for the same question is how the partner category list came to have
    four copies.

 5. §13 HOLDS. The queue reports what is arranged and what is
    unanswered. Nothing in it infers that a signing happened, and a
    booked time that has passed is still booked.
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from services import officer_queue as q
from tests.source_text import code_only

BACKEND = Path(__file__).resolve().parents[1]
REPO = BACKEND.parent

dbonly = pytest.mark.skipif(not os.getenv("DATABASE_URL"), reason="needs a database")


# ══════════════════════════════════════════════════════════════════════
# The rules, without a database
# ══════════════════════════════════════════════════════════════════════

#: An empty accuracy block, stated rather than defaulted. `queue()` takes
#: it as a required keyword for the reason the key sets exist: a caller
#: that omits the hero number would get "nothing outstanding", which is
#: exactly the reading the two-population design exists to prevent.
NOTHING_OUTSTANDING = {"fields": 0, "documents": 0, "items": []}


def test_an_unknown_age_is_unknown_rather_than_today():
    """Zero reads as "asked today", which is a claim. None reads as "we
    do not know", which is true."""
    assert q.days_since(None) is None
    now = datetime(2026, 8, 11, tzinfo=timezone.utc)
    assert q.days_since(now - timedelta(days=3), now) == 3
    # A naive timestamp is read as UTC rather than crashing — but it is
    # still read, not guessed at.
    assert q.days_since(datetime(2026, 8, 8), now) == 3


def test_an_unknown_age_is_never_stale():
    """Fail quiet, not fail loud. The number she checks before anything
    else has to be trustworthy, and one false entry costs more than one
    missed entry."""
    assert q.is_stale(None) is False
    assert q.is_stale(q.STALE_AFTER_DAYS - 1) is False
    assert q.is_stale(q.STALE_AFTER_DAYS) is True


def _awaiting(stale: bool, days=9):
    return {"kind": "review", "id": 1, "deed_id": 2, "property": "x",
            "who": "Nora", "days_waiting": days if stale else 1,
            "stale": stale, "summary": "Sent, not opened yet"}


def test_the_attention_count_is_stale_requests_and_nothing_else():
    """Not "everything in the queue". A signing booked for Thursday needs
    nothing from her, and counting it would make the number mean "there
    are rows below" — at which point she stops reading it."""
    payload = q.queue(
        upcoming=[{"kind": "signing", "id": 3, "deed_id": 4, "property": "y",
                   "when": "2026-08-13T10:00:00+00:00", "who": "Nora",
                   "summary": "Everyone agreed on ..."}],
        awaiting=[_awaiting(True), _awaiting(False)],
        idle_drafts=[{"kind": "draft", "id": 5, "deed_type": "grant_deed",
                      "property": "z", "days_idle": 30}],
        accuracy=NOTHING_OUTSTANDING,
    )
    assert payload["needs_attention"] == 1


def test_a_badge_counts_presence_and_the_attention_number_counts_silence():
    """Two numbers, two claims, and neither is the other.

    A badge on Signings says "there are things here". The attention
    number says "these have gone quiet". Collapsing them would make the
    badge alarming and the attention number decorative.
    """
    payload = q.queue(
        upcoming=[],
        awaiting=[
            dict(_awaiting(False), kind="signing"),
            dict(_awaiting(True), kind="review"),
            dict(_awaiting(False), kind="review"),
        ],
        idle_drafts=[],
        accuracy=NOTHING_OUTSTANDING,
    )
    assert payload["badges"] == {"signings": 1, "shared_deeds": 2}
    assert payload["needs_attention"] == 1


def test_the_payload_shape_is_asserted_by_equality():
    from services.officer_queue import QUEUE_KEYS

    payload = q.queue(upcoming=[], awaiting=[], idle_drafts=[], accuracy=NOTHING_OUTSTANDING)
    assert set(payload) == QUEUE_KEYS
    assert payload["needs_attention"] == 0
    # And the thresholds travel WITH it, so no screen retypes them.
    assert payload["thresholds"]["stale_after_days"] == q.STALE_AFTER_DAYS


def test_a_row_that_grew_a_field_is_refused():
    """An assertion rather than a filter: silently dropping an unexpected
    key would let the screen and the server disagree again, quietly."""
    bad = _awaiting(True)
    bad["extra"] = 1
    with pytest.raises(AssertionError):
        q.queue(upcoming=[], awaiting=[bad], idle_drafts=[], accuracy=NOTHING_OUTSTANDING)


def test_only_one_place_decides_what_stale_means():
    """`/signings` used to carry `STUCK_AFTER_DAYS = 5` in TypeScript.
    A second threshold in Python for the same question is how the partner
    category list came to have four copies.

    COMMENT-TRIP FIFTEEN, and the fix is a division of labour rather than
    a better regex. The first version searched the raw .tsx for
    "STUCK_AFTER_DAYS = 5" and tripped on the comment recording that the
    constant used to live there — this suite has no TypeScript comment
    stripper, and writing one here would be a third opinion about what a
    comment is.

    So each side pins what it can read properly: Python asserts the
    SERVER sends the verdict (below), and `officerTrackers.test.ts` —
    which has `codeOnly()` — asserts the screen holds no threshold. The
    DECLARATION is still checked here as a cheap belt, because a
    declaration is a shape a comment is unlikely to contain.

    ═══ BOTH HALVES MOVED, AND BOTH RETARGETS ARE THE SAME LESSON ═══

    The screen: the agenda is a COMPONENT now, not a page. `/signings`
    became a permanent alias when the Requests merge folded the agenda
    into `/requests`, so reading `app/signings/page.tsx` for a threshold
    would be reading a forty-line redirect and finding nothing — a pin
    that passes because there is nothing left to look at.

    The payload: this matched `'"stale": ('`, a string-presence pin whose
    subject is a decision. It broke when the row builder moved into
    `services/signing_summary.py` with the behaviour unchanged, and it
    would have stayed green if `stale` had been computed and then dropped
    before the response left. The corpus is the referee now — the builder
    asserts its emitted key set equals it by equality, so a field cannot
    be quietly omitted, which is the failure this pin is actually for.
    """
    from services.signing_summary import SIGNING_SUMMARY_KEYS

    agenda = (REPO / "frontend" / "src" / "features" / "signing"
              / "SigningAgenda.tsx").read_text(encoding="utf-8")
    assert "const STUCK_AFTER_DAYS" not in agenda, (
        "the screen declares its own staleness threshold again — the "
        "server sends `stale` and the number lives in officer_queue.py")

    assert "stale" in SIGNING_SUMMARY_KEYS, (
        "the agenda payload stopped carrying the verdict, so the screen "
        "has to form one")
    # Moved with the row assembly into services/signing_rows.py; the
    # threshold itself never left officer_queue.py, which is the rule.
    payload = code_only(BACKEND / "services" / "signing_rows.py")
    assert "officer_queue.is_stale(" in payload
    assert "STALE_AFTER_DAYS" not in payload, (
        "the assembler copied the threshold instead of asking for it")


def test_the_queue_never_infers_that_a_signing_happened():
    """§13. It reports what is arranged and what is unanswered.

    THE FIRST VERSION OF THIS PIN MATCHED THE SPELLING. It forbade the
    bare word "completed" anywhere in the router, and fired on
    `COALESCE(status, 'draft') NOT IN ('completed', 'deleted')` — the
    DEED status vocabulary, in the query that finds untouched drafts,
    which has nothing to do with whether a signing occurred. A pin that
    fails on a word doing an unrelated job is the same instrument error
    FLOW1 kept finding.

    The properties, matched as themselves:

      * READ-ONLY. A queue that writes is a queue that can change what it
        reports on.
      * The scheduling state and its sentence come from `signing_loop`,
        not from anything composed here — §13 rule 3, the same rule the
        other three surfaces follow.
      * Nothing compares a booked time to the clock in order to conclude
        something. `booked_at <= cutoff` is a HORIZON — it decides
        whether a row is shown — and the pin has to permit that while
        forbidding an inference about attendance.
    """
    src = code_only(BACKEND / "routers" / "dashboard.py")

    for write in ("INSERT INTO", "UPDATE ", "DELETE FROM"):
        assert write not in src, f"the queue writes ({write}) — it is a read"

    assert "loop.request_state(" in src
    assert "loop.state_label(" in src
    # No locally-composed account of a scheduling state.
    for invented in ("Everyone agreed", "Booked for", "will happen",
                     "took place", "attended"):
        assert invented not in src, (
            f"the queue writes its own scheduling sentence: {invented!r}")

    # The only clock comparison is the display horizon, and it is named.
    import re
    comparisons = re.findall(r"booked_at\s*[<>]=?\s*(\w+)", src)
    assert comparisons == ["cutoff"], (
        f"something compares a booked time to something else: {comparisons} "
        "— a window that has passed is not evidence that anybody met")


# ══════════════════════════════════════════════════════════════════════
# The whole thing, against a database
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
            (f"officer-{tag}@dash1.test",))
        made["users"].append(cur.fetchone()["id"])
        for address, status in (("40 Queue Way, Los Angeles, CA", "completed"),
                                ("41 Idle Road, Los Angeles, CA", "draft")):
            cur.execute(
                """INSERT INTO deeds (user_id, deed_type, property_address, apn,
                                      grantor_name, grantee_name, county, status)
                   VALUES (%s, 'grant_deed', %s, '1234-567-890',
                           'GRANTOR', 'GRANTEE', 'Los Angeles', %s)
                   RETURNING id""",
                (made["users"][0], address, status))
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
            {"sub": str(user_id), "email": "officer@dash1.test"})})
    return client


@dbonly
def test_an_empty_queue_is_empty_rather_than_absent(world):
    """An honest empty queue is a good morning, not a blank page — and
    the screen can only say so if the shape arrives whatever the counts."""
    body = _client_for(world["users"][0]).get("/dashboard/queue").json()
    assert set(body) == set(q.QUEUE_KEYS)
    assert body["needs_attention"] == 0
    assert body["upcoming"] == []
    assert body["awaiting"] == []


@dbonly
def test_a_share_nobody_has_answered_is_waiting_with_its_age(world):
    officer = world["users"][0]
    client = _client_for(officer)
    assert client.post("/shared-deeds", json={
        "deed_id": world["deeds"][0],
        "recipient_name": "Nora Vasquez",
        "recipient_email": "nora@dash1.test",
        "recipient_role": "Reviewer",
    }).status_code == 200

    body = client.get("/dashboard/queue").json()
    row = next(r for r in body["awaiting"] if r["kind"] == "review")
    assert row["who"] == "Nora Vasquez"
    assert row["days_waiting"] == 0
    assert row["stale"] is False
    # Fresh, so nothing needs her attention yet.
    assert body["needs_attention"] == 0

    # Age it past the threshold and it becomes the number she checks.
    with world["conn"].cursor() as cur:
        cur.execute("UPDATE deed_shares SET created_at = now() - interval '%s days' "
                    "WHERE id = %s", (q.STALE_AFTER_DAYS + 2, row["id"]))
    body = client.get("/dashboard/queue").json()
    row = next(r for r in body["awaiting"] if r["kind"] == "review")
    assert row["stale"] is True
    assert row["days_waiting"] >= q.STALE_AFTER_DAYS
    assert body["needs_attention"] == 1


@dbonly
def test_an_answered_share_stops_waiting(world):
    """Waiting means somebody owes her a reply. A decided share does not,
    whatever else it is."""
    officer = world["users"][0]
    client = _client_for(officer)
    made = client.post("/shared-deeds", json={
        "deed_id": world["deeds"][0],
        "recipient_email": "decided@dash1.test",
        "recipient_role": "Reviewer",
    }).json()

    with world["conn"].cursor() as cur:
        cur.execute("UPDATE deed_shares SET status = 'approved' WHERE id = %s",
                    (made["shared_deed"]["id"],))
    body = client.get("/dashboard/queue").json()
    assert not [r for r in body["awaiting"]
                if r["kind"] == "review" and r["id"] == made["shared_deed"]["id"]]


@dbonly
def test_a_booked_signing_is_upcoming_and_not_awaiting(world):
    """Two different questions. Nothing is owed on a booked signing; she
    needs to know it is coming."""
    from fastapi.testclient import TestClient
    from main import app

    officer = world["users"][0]
    client = _client_for(officer)
    when = datetime.now(timezone.utc) + timedelta(days=2)
    created = client.post("/signing-requests/v2", json={
        "deed_id": world["deeds"][0],
        "notary_email": "nora@dash1.test", "notary_name": "Nora",
        "signers": [{"name": "Sam", "email": "sam@dash1.test"}],
        "proposed_time": {"start": when.isoformat(),
                          "end": (when + timedelta(hours=1)).isoformat()},
        "signers_already_agreed": True,
    }).json()

    # Before acceptance it is AWAITING — somebody owes her an answer.
    body = client.get("/dashboard/queue").json()
    assert any(r["kind"] == "signing" for r in body["awaiting"])
    assert body["upcoming"] == []

    notary_token = next(p["link"] for p in created["participants"]
                        if p["party_role"] == "notary").rsplit("/", 1)[-1]
    public = TestClient(app)
    window_id = public.get(f"/signing/{notary_token}").json()["windows"][0]["id"]
    public.post(f"/signing/{notary_token}/answer",
                json={"window_id": window_id, "answer": "available"})

    body = client.get("/dashboard/queue").json()
    assert not [r for r in body["awaiting"] if r["kind"] == "signing"]
    upcoming = next(r for r in body["upcoming"] if r["kind"] == "signing")
    assert upcoming["who"] == "Nora"
    assert upcoming["summary"], "the server's sentence is missing"


@dbonly
def test_a_signing_beyond_the_horizon_is_not_on_the_dashboard(world):
    """A booking three months out is real and is not what she needs this
    morning."""
    from fastapi.testclient import TestClient
    from main import app

    officer = world["users"][0]
    client = _client_for(officer)
    when = datetime.now(timezone.utc) + timedelta(days=q.UPCOMING_DAYS + 20)
    created = client.post("/signing-requests/v2", json={
        "deed_id": world["deeds"][0],
        "notary_email": "far@dash1.test", "notary_name": "Far",
        "signers": [{"name": "Sam", "email": "sam@dash1.test"}],
        "proposed_time": {"start": when.isoformat(),
                          "end": (when + timedelta(hours=1)).isoformat()},
        "signers_already_agreed": True,
    }).json()
    notary_token = next(p["link"] for p in created["participants"]
                        if p["party_role"] == "notary").rsplit("/", 1)[-1]
    public = TestClient(app)
    window_id = public.get(f"/signing/{notary_token}").json()["windows"][0]["id"]
    public.post(f"/signing/{notary_token}/answer",
                json={"window_id": window_id, "answer": "available"})

    body = client.get("/dashboard/queue").json()
    assert body["upcoming"] == []
    assert not [r for r in body["awaiting"] if r["kind"] == "signing"]


@dbonly
def test_an_untouched_draft_surfaces_and_a_fresh_one_does_not(world):
    officer = world["users"][0]
    client = _client_for(officer)
    assert client.get("/dashboard/queue").json()["idle_drafts"] == []

    with world["conn"].cursor() as cur:
        cur.execute("UPDATE deeds SET updated_at = now() - interval '%s days' "
                    "WHERE id = %s", (q.IDLE_DRAFT_DAYS + 3, world["deeds"][1]))
    rows = client.get("/dashboard/queue").json()["idle_drafts"]
    assert [r["id"] for r in rows] == [world["deeds"][1]]
    assert rows[0]["days_idle"] >= q.IDLE_DRAFT_DAYS
    # A completed deed is not a draft, however long ago it was touched.
    assert world["deeds"][0] not in [r["id"] for r in rows]


@dbonly
def test_the_queue_is_the_officers_own(world):
    """`officer_user_id` / `owner_user_id` / `user_id` scoping, tested
    rather than assumed — three tables, three column names, one rule."""
    conn = world["conn"]
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO users (email, password_hash, full_name, role) "
            "VALUES (%s, 'x', 'Stranger', 'user') RETURNING id",
            (f"stranger-{uuid.uuid4().hex[:8]}@dash1.test",))
        stranger = cur.fetchone()["id"]

    _client_for(world["users"][0]).post("/shared-deeds", json={
        "deed_id": world["deeds"][0],
        "recipient_email": "nora@dash1.test",
        "recipient_role": "Reviewer",
    })
    body = _client_for(stranger).get("/dashboard/queue").json()
    assert body["awaiting"] == []
    assert body["idle_drafts"] == []


@dbonly
def test_the_summary_counts_thirty_days_rather_than_a_calendar_page(world):
    """`date_trunc('month')` renders a big zero on the first of every
    month for a user whose work did not stop."""
    body = _client_for(world["users"][0]).get("/deeds/summary").json()
    assert "last_30_days" in body
    assert body["last_30_days"] == 2, body
    assert body["drafts"] == 1
    assert body["completed"] == 1
