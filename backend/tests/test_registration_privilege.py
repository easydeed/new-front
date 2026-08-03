"""Registration must never grant privilege.

`users.role` carries two meanings at once: the professional role that
prints on a profile (Escrow Officer, Title Agent, ...) and the value
`is_admin_role()` reads to open the admin console. Registration accepted
that field verbatim from the request body, so:

    POST /users/register {"role": "admin", ...}

minted a working admin account — the token returned by the very same call
carried role=admin, and /admin/* answered it, including POST
/admin/api-keys (mint a live partner key) and the user/deed search
consoles. Found while building the A1 partner-API harness, which needed
an admin token and got one far too easily.

The structural pin runs everywhere; the end-to-end proof needs a database.
"""
import inspect
import os

import pytest

LIVE_DB = os.getenv("DATABASE_URL")

ADMIN_ROLE_SPELLINGS = ["admin", "Admin", "ADMIN", " administrator ",
                        "superadmin", "super_admin"]


def test_registration_rejects_privileged_roles_structurally():
    """The guard lives in the handler and must stay there."""
    from routers import users_auth
    src = inspect.getsource(users_auth.register_user)
    assert "is_admin_role(user.role)" in src, "registration no longer checks the role"


def test_is_admin_role_still_covers_every_spelling():
    """The guard is only as wide as the predicate it shares with the
    admin gate — they must not drift apart."""
    from auth import is_admin_role
    for spelling in ADMIN_ROLE_SPELLINGS:
        assert is_admin_role(spelling), spelling
    for ordinary in ["escrow_officer", "Title Agent", "attorney", "user", ""]:
        assert not is_admin_role(ordinary), ordinary


@pytest.mark.skipif(not LIVE_DB, reason="live test DB required")
@pytest.mark.parametrize("spelling", ADMIN_ROLE_SPELLINGS)
def test_cannot_self_register_as_admin(spelling):
    # No create_tables() here: calling it mid-suite issues ALTER TABLE
    # users, which queues behind any connection sitting idle-in-
    # transaction and then blocks every later reader of that table. The
    # schema is already converged by the time tests run.
    from fastapi.testclient import TestClient
    from main import app

    client = TestClient(app)
    email = f"escalate-{spelling.strip().lower()}@privilege.test"
    resp = client.post("/users/register", json={
        "email": email, "password": "Escalate!Passw0rd",
        "confirm_password": "Escalate!Passw0rd", "full_name": "Escalation Probe",
        "role": spelling, "state": "CA", "agree_terms": True,
    })
    assert resp.status_code == 400, f"{spelling!r} was accepted: {resp.text}"

    # And no account exists to be promoted by a later login.
    import psycopg2
    conn = psycopg2.connect(LIVE_DB)
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM users WHERE email = %s", (email,))
        assert cur.fetchone()[0] == 0
    conn.close()


@pytest.mark.skipif(not LIVE_DB, reason="live test DB required")
def test_ordinary_registration_still_works_and_is_not_admin():
    """The guard must not cost an honest signup."""
    from fastapi.testclient import TestClient
    from main import app
    import base64
    import json
    import psycopg2

    client = TestClient(app)
    email = "ordinary@privilege.test"
    conn = psycopg2.connect(LIVE_DB)
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute("""DELETE FROM user_profiles WHERE user_id IN
                       (SELECT id FROM users WHERE email = %s)""", (email,))
        cur.execute("DELETE FROM users WHERE email = %s", (email,))
    conn.close()

    resp = client.post("/users/register", json={
        "email": email, "password": "Ordinary!Passw0rd",
        "confirm_password": "Ordinary!Passw0rd", "full_name": "Ordinary User",
        "role": "Escrow Officer", "state": "CA", "agree_terms": True,
    })
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    claims = json.loads(base64.urlsafe_b64decode(token.split(".")[1] + "=="))
    assert claims["role"] == "Escrow Officer"
    assert client.get("/admin/api-keys",
                      headers={"Authorization": f"Bearer {token}"}).status_code == 403
