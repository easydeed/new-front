"""FLOW1 item 0 — the Shared Deeds list, from the server's side.

═══ THE VERDICT THESE TESTS ENCODE ═══

The page was reported as showing FABRICATED rows. It does not fabricate
anything: it calls `GET /shared-deeds` on mount and renders exactly what
comes back. What it did was read that response with EIGHT WRONG KEY
NAMES — `type` vs `deed_type`, `date` vs `shared_date`,
`shared_with_email` vs `recipient_email`, and five fields the server
never sent at all. A missing key in JavaScript is `undefined`; an
undefined date is `Invalid Date`; an undefined expiry is `NaN days left`.

So the class is not "eight typos". The class is **a response shape and a
screen's shape, declared separately in two languages, with nothing
comparing them.** That is what the corpus and these pins close.

═══ THE PINS ═══

  1. The emitted key set equals `shared_deed_row_keys.json` BY EQUALITY —
     allowlist, not denylist, the same rule the NOTARY2 token surfaces
     follow. A field cannot enter or leave the payload silently.
  2. The frontend's `interface SharedDeed` declares exactly those names.
     The frontend suite pins this too; it is pinned from both sides on
     purpose, because a corpus only one side reads is a corpus one side
     can forget.
  3. Real rows through the real route agree — not just the builder in
     isolation, which would pass while the handler returned something
     else entirely (it did, for months).
  4. No date field is ever the empty string. `""` was the old handler's
     answer for a date it did not have, and it is the direct cause of
     Invalid Date: `new Date("")` is a Date object, just not a valid one,
     so every JS guard shaped `if (d)` waves it through.
  5. The two facts that had no column now have one, and are recorded:
     the recipient's name, and when they responded.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

from tests.source_text import code_only

BACKEND = Path(__file__).resolve().parents[1]
REPO = BACKEND.parent

CORPUS = json.loads(
    (BACKEND / "services" / "shared_deed_row_keys.json").read_text(encoding="utf-8")
)
CONTRACT = set(CORPUS["keys"])

dbonly = pytest.mark.skipif(
    not __import__("os").getenv("DATABASE_URL"),
    reason="needs a database",
)


# ── 1. The builder ───────────────────────────────────────────────────

def test_the_builder_emits_exactly_the_contract():
    from services.shared_deed_row import SHARED_DEED_KEYS, shared_deed_row

    assert set(SHARED_DEED_KEYS) == CONTRACT
    row = shared_deed_row({})
    assert set(row) == CONTRACT


def test_the_builder_refuses_to_grow_a_field_quietly():
    """The assertion is the point — a filter would have let the payload
    and the screen disagree again, silently, which is the whole defect.

    Mutation-checked: this fails if the `assert set(out) == ...` in
    shared_deed_row is removed or softened to a filter.
    """
    from services import shared_deed_row as mod

    # code_only(): this module's docstring quotes the very key names the
    # pins below forbid elsewhere, and a pin that greps prose eventually
    # trips on the comment explaining the thing it forbids.
    source = code_only(BACKEND / "services" / "shared_deed_row.py")
    assert "assert set(out) == SHARED_DEED_KEYS" in source
    # And the keys are READ from the corpus rather than retyped, so the
    # two lists cannot drift by someone editing only one.
    assert "shared_deed_row_keys.json" in source
    assert mod.SHARED_DEED_KEYS is not None


def test_no_date_field_is_ever_the_empty_string():
    """`new Date("")` is Invalid Date and `if (value)` does not catch it.

    Absence must be `null`, which every guard in every language treats as
    absent.
    """
    from services.shared_deed_row import shared_deed_row

    row = shared_deed_row({})
    for key in ("shared_date", "expires_at", "viewed_at", "response_date",
                "scheduled_at"):
        assert row[key] is None, f"{key} reported absence as {row[key]!r}"


def test_shared_with_falls_back_to_the_address_not_to_blank():
    from services.shared_deed_row import shared_deed_row

    named = shared_deed_row({"recipient_name": "Nora Vasquez",
                             "recipient_email": "nora@example.test"})
    assert named["shared_with"] == "Nora Vasquez"

    # No name on file is not a licence for an empty cell in a column
    # headed "Shared With" — she sent it to an address, and that is who.
    anonymous = shared_deed_row({"recipient_email": "nora@example.test"})
    assert anonymous["shared_with"] == "nora@example.test"

    # Whitespace is not a name.
    blank = shared_deed_row({"recipient_name": "   ",
                             "recipient_email": "nora@example.test"})
    assert blank["shared_with"] == "nora@example.test"


# ── 2. The screen's declaration ──────────────────────────────────────

# The tracker moved to /requests; `app/shared-deeds/page.tsx` is now the
# permanent alias that redirects there (the ?focus= links in mail that has
# already gone out). The screen whose eight key names this file exists to
# pin is the tracker, so the pin reads the tracker.
#
# Worth noting how this retarget announced itself, because it is the
# behaviour the pin is FOR: pointed at the alias, `_interface_fields`
# raised rather than passing over a file with no interface in it. A
# cross-language contract pin that shrugged at a missing declaration
# would be the version that lets the next rename through silently.
PAGE = REPO / "frontend" / "src" / "app" / "requests" / "page.tsx"


def _interface_fields(source: str, name: str) -> list[str]:
    start = source.index(f"interface {name} {{")
    depth = 0
    end = -1
    for i in range(source.index("{", start), len(source)):
        if source[i] == "{":
            depth += 1
        elif source[i] == "}":
            depth -= 1
            if depth == 0:
                end = i
                break
    assert end > start, f"unbalanced braces in interface {name}"
    body = source[start:end]
    # Strip block and line comments — a doc comment naming a field must
    # not count as declaring it.
    body = re.sub(r"/\*.*?\*/", "", body, flags=re.S)
    body = re.sub(r"^[^\S\n]*//.*$", "", body, flags=re.M)
    return re.findall(r"^  ([A-Za-z_][A-Za-z0-9_]*)\??\s*:", body, flags=re.M)


def test_the_screens_interface_declares_exactly_the_contract():
    """The pin that would have caught the original defect on the day it
    landed, from either side of the wire."""
    fields = _interface_fields(PAGE.read_text(encoding="utf-8"), "SharedDeed")
    assert set(fields) == CONTRACT, (
        f"screen-only={sorted(set(fields) - CONTRACT)} "
        f"server-only={sorted(CONTRACT - set(fields))}"
    )
    assert len(fields) == len(set(fields))


def test_the_old_wrong_names_are_gone_from_the_route():
    """Renaming the emitted keys while leaving the old ones beside them
    would pass an equality pin on the SCREEN and leave two contracts."""
    source = code_only(BACKEND / "routers" / "sharing.py")
    handler = source[source.index("def list_shared_deeds"):]
    handler = handler[: handler.index("\n@router.")]
    for dead in ('"shared_with_email"', '"shared_by_id"', '"approval_token"',
                 '"type"', '"date"'):
        assert dead not in handler, f"{dead} still emitted by the list route"
    # And the handler builds rows through the one builder, rather than a
    # dict literal that the next field gets appended to.
    assert "shared_deed_row(row)" in handler


# ── 3. Real rows through the real route ──────────────────────────────

@pytest.fixture
def world():
    """One officer, two of their deeds — the second is never shared, so
    "did this row come from a share or from a deed?" has an answer."""
    import os
    import uuid

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
            (f"officer-{tag}@flow1.test",))
        made["users"].append(cur.fetchone()["id"])
        for address in ("11 Contract Way, Los Angeles, CA",
                        "12 Unshared Road, Los Angeles, CA"):
            cur.execute(
                """INSERT INTO deeds (user_id, deed_type, property_address, apn,
                                      grantor_name, grantee_name, county, status)
                   VALUES (%s, 'grant_deed', %s, '1234-567-890',
                           'GRANTOR', 'GRANTEE', 'Los Angeles', 'completed')
                   RETURNING id""",
                (made["users"][0], address))
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
            {"sub": str(user_id), "email": "officer@flow1.test"})
    })
    return client


@dbonly
def test_the_live_response_matches_the_contract(world):
    """The builder passing in isolation proves nothing about the route.

    For months the builder-equivalent lived inline in the handler and the
    screen disagreed with it; a unit test of a function nobody called
    would have been green throughout.
    """
    officer = world["users"][0]
    client = _client_for(officer)
    made = client.post("/shared-deeds", json={
        "deed_id": world["deeds"][0],
        "recipient_name": "Nora Vasquez",
        "recipient_email": "nora@flow1.test",
        "recipient_role": "Reviewer",
    })
    assert made.status_code == 200, made.text

    rows = client.get("/shared-deeds").json()
    assert rows, "the share we just created is not in the officer's list"
    for row in rows:
        assert set(row) == CONTRACT, (
            f"extra={sorted(set(row) - CONTRACT)} "
            f"missing={sorted(CONTRACT - set(row))}"
        )

    fresh = rows[0]
    # Every field the audit reported as blank or Invalid, populated.
    assert fresh["shared_with"] == "Nora Vasquez"
    assert fresh["recipient_email"] == "nora@flow1.test"
    assert fresh["deed_type"], "Deed Type is blank"
    assert fresh["property"], "Property is blank"
    for key in ("shared_date", "expires_at"):
        from datetime import datetime
        assert fresh[key], f"{key} is absent"
        datetime.fromisoformat(fresh[key])  # raises if unparseable
    # Not yet opened, not yet answered — absent, and absent as null.
    assert fresh["viewed_at"] is None
    assert fresh["response_date"] is None


@dbonly
def test_status_and_viewed_at_cannot_contradict_each_other(world):
    """The audit's sharpest symptom: a badge reading "Viewed" beside a
    line reading "Not viewed". The badge read `status`, which arrived;
    the line read `viewed_at`, which never did. They are stamped by the
    same statement, so the surface can no longer show one without the
    other."""
    from fastapi.testclient import TestClient
    import main

    officer = world["users"][0]
    client = _client_for(officer)
    made = client.post("/shared-deeds", json={
        "deed_id": world["deeds"][0],
        "recipient_email": "viewer@flow1.test",
        "recipient_role": "Reviewer",
    }).json()
    token = made["shared_deed"]["approval_token"]

    assert TestClient(main.app).get(f"/approve/{token}").status_code == 200

    row = next(r for r in _client_for(officer).get("/shared-deeds").json()
               if r["recipient_email"] == "viewer@flow1.test")
    assert row["status"] == "viewed"
    assert row["viewed_at"] is not None, (
        "the row says viewed and carries no viewing time — the exact "
        "contradiction this ticket was opened for")


@dbonly
def test_a_response_records_when_it_happened(world):
    """`updated_at` was NOT usable for this and must not be substituted:
    a revoke bumps it too, so a screen reading it would report a response
    on the day access was withdrawn."""
    from fastapi.testclient import TestClient
    import main

    officer = world["users"][0]
    client = _client_for(officer)
    made = client.post("/shared-deeds", json={
        "deed_id": world["deeds"][0],
        "recipient_email": "approver@flow1.test",
        "recipient_role": "Reviewer",
    }).json()
    token = made["shared_deed"]["approval_token"]

    public = TestClient(main.app)
    assert public.get(f"/approve/{token}").status_code == 200
    assert public.post(f"/approve/{token}",
                       json={"approved": True}).status_code == 200

    row = next(r for r in _client_for(officer).get("/shared-deeds").json()
               if r["recipient_email"] == "approver@flow1.test")
    assert row["status"] == "approved"
    assert row["response_date"] is not None, "approved with no response time"


@dbonly
def test_a_deed_that_was_never_shared_produces_no_row(world):
    """The report's hypothesis, tested rather than argued away.

    The audit observed that the row count equalled the number of
    completed deeds, and concluded the page was synthesising rows from
    the deeds list. It was not — but "it isn't doing that today" is not a
    property, it is an observation. This is the property: the officer
    owns two completed deeds and shares ONE. A list derived from deeds
    returns two rows; a list derived from shares returns one.
    """
    officer = world["users"][0]
    shared, never_shared = world["deeds"]
    client = _client_for(officer)

    assert client.get("/shared-deeds").json() == [], (
        "rows exist for an officer who has shared nothing")

    assert client.post("/shared-deeds", json={
        "deed_id": shared,
        "recipient_email": "one@flow1.test",
        "recipient_role": "Reviewer",
    }).status_code == 200

    rows = client.get("/shared-deeds").json()
    assert len(rows) == 1
    assert rows[0]["deed_id"] == shared
    assert never_shared not in {r["deed_id"] for r in rows}
