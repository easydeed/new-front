"""Registration must never grant privilege.

`users.role` carries two meanings at once: the professional role that
prints on a profile (Escrow Officer, Title Agent, ...) and the value
`is_admin_role()` reads to open the admin console. Registration accepted
that field verbatim from the request body, so:

    POST /users/register {"job_title": "admin", ...}

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
    """STRUCTURALLY, and that word finally means what it says.

    This asserted the handler contains `is_admin_role(user.role)` — a
    string refusal, which was the right fix in #103 and is not the fix
    now. ROLE1 step 3 gave the job title its own column and bound the
    access column to a module constant, so no request value reaches it.
    The refusal came out with the legacy `role` field once a frontend
    sending `job_title` had been live through a deploy.

    What is pinned instead is the structure.
    """
    from routers import users_auth
    from routers.users_auth import UserRegister

    assert "role" not in UserRegister.model_fields, (
        "a `role` field on the registration model is a field that can be "
        "spelled at, which is the defect this replaced")
    src = inspect.getsource(users_auth.register_user)
    assert "DEFAULT_ROLE," in src


def test_no_spelling_a_registrant_could_try_grants_anything():
    """The predicate NARROWED with the data — `ADMIN_ROLES` is ('admin',)
    since the migration converged the column — so most of these are now
    ordinary strings. That changes nothing about the protection, which is
    the point: it never depended on the predicate being wide."""
    from auth import is_admin_role
    assert is_admin_role("admin") is True
    assert is_admin_role(" ADMIN ") is True
    for ordinary in ["escrow_officer", "Title Agent", "attorney", "user", "",
                     "administrator", "superadmin", "super_admin"]:
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
    import psycopg2
    conn = psycopg2.connect(LIVE_DB)
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute("""DELETE FROM user_profiles WHERE user_id IN
                       (SELECT id FROM users WHERE email = %s)""", (email,))
        cur.execute("DELETE FROM users WHERE email = %s", (email,))
    conn.close()

    # Sent under the ONE wire name there is. The account IS created —
    # this is a job title, and being called "admin" is not a claim on
    # anything.
    resp = client.post("/users/register", json={
        "email": email, "password": "Escalate!Passw0rd",
        "confirm_password": "Escalate!Passw0rd", "full_name": "Escalation Probe",
        "job_title": spelling, "state": "CA", "agree_terms": True,
    })
    assert resp.status_code == 200, resp.text

    # AND IT GRANTED NOTHING — a stronger statement than the 400 this
    # used to assert, because it survives somebody adding a field back.
    conn = psycopg2.connect(LIVE_DB)
    with conn.cursor() as cur:
        cur.execute("SELECT role, job_title FROM users WHERE email = %s", (email,))
        assert cur.fetchone() == ("user", spelling.strip())
    conn.close()

    token = resp.json()["access_token"]
    assert client.get("/admin/api-keys",
                      headers={"Authorization": f"Bearer {token}"}).status_code == 403


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
        "job_title": "Escrow Officer", "state": "CA", "agree_terms": True,
    })
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    claims = json.loads(base64.urlsafe_b64decode(token.split(".")[1] + "=="))
    # ROLE1 step 3 — this used to read "Escrow Officer": a job title in
    # an authorization claim, which every gate and every screen then had
    # to work out was not one. The title went to `job_title`; the claim
    # is the answer.
    assert claims["role"] == "user"
    assert client.get("/admin/api-keys",
                      headers={"Authorization": f"Bearer {token}"}).status_code == 403

    # And the title was kept — moving it must not lose it.
    conn = psycopg2.connect(LIVE_DB)
    with conn.cursor() as cur:
        cur.execute("SELECT job_title, role FROM users WHERE email = %s", (email,))
        assert cur.fetchone() == ("Escrow Officer", "user")
    conn.close()
