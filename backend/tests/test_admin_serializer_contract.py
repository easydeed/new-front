"""ADMIN1.5 — the admin console's field contract, pinned.

WHAT HAPPENED. PR #107 unified the two connection helpers onto psycopg2's
`DictCursor`, chosen because its rows answer to BOTH `row[0]` and
`row['name']`. What that PR under-weighted is that a `DictRow` is a LIST
subclass, not a dict subclass — so every endpoint that returns rows to
FastAPI began emitting a JSON **array** instead of an object.

The admin console read every field by name, got `undefined` for all of
them, and rendered two tiers of nothing: `ID`/`EMAIL` blank, and
`PLAN`/`ROLE`/`DEEDS`/`LAST LOGIN` politely showing an em-dash from
their `?? '—'` fallbacks. The drill-downs then requested
`/admin/users/undefined/real` → 422. One serialisation change, two
visual symptoms, one broken navigation.

#107 DID document the caveat and pin it — but the pin matched
`return cur.fetchall()` written literally, while the real call sites
assign first (`rows = cur.fetchall()` … `return {"items": rows}`) and
walked straight past it. Hence this file: the pin is now the FIELD
CONTRACT itself, asserted against real serialised output, so the shape
cannot drift regardless of which mechanism breaks it.

THE FIELD SETS BELOW ARE A CONTRACT WITH THE FRONTEND. They are the keys
`UsersTab.tsx`, `DeedsTab.tsx` and the user-detail page actually read.
The set deliberately exceeds what is visibly broken when it breaks —
that was the audit's sharpest observation: a field with an `?? '—'`
fallback fails politely and silently, so testing only the loud ones
tests half the surface.
"""
import json
import os

import pytest
from tests.source_text import code_only

LIVE_DB = os.getenv("DATABASE_URL")
pytestmark = pytest.mark.skipif(not LIVE_DB, reason="live test DB required")

# Read by UsersTab.tsx (id, email, plan, role, deed_count, last_login)
# plus the fields the detail page and CSV rely on.
USER_ROW_FIELDS = {
    "id", "email", "full_name", "role", "plan",
    "last_login", "created_at", "is_active", "deed_count",
}

# Read by DeedsTab.tsx (id, deed_type, status, property_address,
# created_at) plus the modal's extras.
DEED_ROW_FIELDS = {
    "id", "deed_type", "status", "property_address",
    "apn", "county", "created_at", "updated_at", "user_email",
}

ADMIN_EMAIL = "contract@admin.test"
ADMIN_PASSWORD = "Contract!Passw0rd"


@pytest.fixture(scope="module")
def admin_client():
    import psycopg2
    from fastapi.testclient import TestClient
    from main import app

    client = TestClient(app)
    conn = psycopg2.connect(LIVE_DB)
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute("""DELETE FROM user_profiles WHERE user_id IN
                       (SELECT id FROM users WHERE email = %s)""", (ADMIN_EMAIL,))
        cur.execute("DELETE FROM users WHERE email = %s", (ADMIN_EMAIL,))
    conn.close()

    client.post("/users/register", json={
        "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD,
        "confirm_password": ADMIN_PASSWORD, "full_name": "Contract Admin",
        "role": "escrow_officer", "state": "CA", "agree_terms": True})
    conn = psycopg2.connect(LIVE_DB)
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute("UPDATE users SET role = 'admin' WHERE email = %s", (ADMIN_EMAIL,))
    conn.close()

    token = client.post("/users/login", json={
        "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}).json()["access_token"]
    return client, {"Authorization": f"Bearer {token}"}


# ── Shape: objects, not arrays ───────────────────────────────────────

def test_user_rows_serialise_as_objects(admin_client):
    """The regression in one assertion: rows arrived as JSON arrays, so
    every by-name read was undefined."""
    client, auth = admin_client
    items = client.get("/admin/users/search?limit=5", headers=auth).json()["items"]
    assert items, "need at least one user to check the shape"
    assert isinstance(items[0], dict), (
        f"rows serialised as {type(items[0]).__name__} — the console reads "
        "every field by name and would render blanks"
    )


def test_deed_rows_serialise_as_objects(admin_client):
    client, auth = admin_client
    items = client.get("/admin/deeds/search?limit=5", headers=auth).json()["items"]
    if not items:
        pytest.skip("no deeds in this database")
    assert isinstance(items[0], dict)


# ── The field contract itself ────────────────────────────────────────

def test_user_search_carries_every_field_the_console_reads(admin_client):
    client, auth = admin_client
    items = client.get("/admin/users/search?limit=5", headers=auth).json()["items"]
    assert items
    missing = USER_ROW_FIELDS - set(items[0].keys())
    assert not missing, (
        f"user rows are missing {sorted(missing)} — note that a field with "
        "an '?? \\u2014' fallback in the UI fails SILENTLY, so the missing "
        "set is wider than what looks broken on screen"
    )


def test_deed_search_carries_every_field_the_console_reads(admin_client):
    client, auth = admin_client
    items = client.get("/admin/deeds/search?limit=5", headers=auth).json()["items"]
    if not items:
        pytest.skip("no deeds in this database")
    missing = DEED_ROW_FIELDS - set(items[0].keys())
    assert not missing, f"deed rows are missing {sorted(missing)}"


# ── Navigation: the 422s die with the shape ──────────────────────────

def test_the_drilldown_ids_are_usable(admin_client):
    """`/admin/users/undefined` and `/admin/deeds/undefined` were the
    symptom; a usable id is the cure."""
    client, auth = admin_client
    user = client.get("/admin/users/search?limit=1", headers=auth).json()["items"][0]
    assert isinstance(user["id"], int)
    assert client.get(f"/admin/users/{user['id']}", headers=auth).status_code == 200

    deeds = client.get("/admin/deeds/search?limit=1", headers=auth).json()["items"]
    if deeds:
        assert isinstance(deeds[0]["id"], int)
        assert client.get(f"/admin/deeds/{deeds[0]['id']}", headers=auth).status_code == 200


def test_the_real_fossil_route_is_gone(admin_client):
    """`/users/{id}/real` was a fossil of a mock/real serializer split.
    The mock half is deleted; the honest one holds the plain path."""
    client, auth = admin_client
    user = client.get("/admin/users/search?limit=1", headers=auth).json()["items"][0]
    assert client.get(f"/admin/users/{user['id']}/real", headers=auth).status_code == 404


def test_the_mock_half_of_the_split_is_deleted():
    """The deleted endpoints emitted a per-user monthly_revenue from
    hardcoded prices, `shared_deeds: 0`, and an empty `activity_log`."""
    from pathlib import Path
    src = code_only(Path(__file__).resolve().parents[1] / "routers/admin_inline.py")
    assert "TODO: Implement activity tracking table" not in src
    assert "TODO: Implement when shared_deeds table exists" not in src


# ── CSV exports share the serializer; check them too ─────────────────

@pytest.mark.parametrize("path,expected_header", [
    # ROLE1 step 3 — `job_title` sits between them, so an export tells an
    # operator who somebody is as well as what they may do.
    ("/admin/export/users.csv", "id,email,full_name,role,job_title,plan"),
    ("/admin/export/deeds.csv", "id,deed_type,status"),
])
def test_csv_exports_emit_populated_columns(admin_client, path, expected_header):
    """The audit could not click these. They use `row.values()`, which
    works on both row types — but a blank-column export would look
    identical to an empty database, so it is pinned rather than assumed."""
    client, auth = admin_client
    resp = client.get(path, headers=auth)
    assert resp.status_code == 200
    lines = [ln for ln in resp.text.strip().splitlines() if ln]
    assert lines[0].startswith(expected_header)
    if len(lines) > 1:
        cells = lines[1].split(",")
        assert cells[0].strip(), "first CSV column is empty — serializer drift"
        assert any(c.strip() for c in cells[1:]), "CSV row has no populated values"


# ── The row contract that underpins all of the above ─────────────────

def test_rows_are_dicts_and_index_addressable():
    """HybridRow must be BOTH: a dict subclass (so FastAPI emits an
    object) and integer-indexable (so the ~66 existing `row[0]` call
    sites keep working). Losing either half re-breaks a whole class of
    screens — one silently."""
    from database import get_db_connection

    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT 1 AS alpha, 2 AS beta")
        row = cur.fetchone()
        assert isinstance(row, dict), "must serialise as a JSON object"
        assert row[0] == 1, "must still answer to positional access"
        assert row["alpha"] == 1
        assert json.loads(json.dumps(row)) == {"alpha": 1, "beta": 2}
    conn.close()
