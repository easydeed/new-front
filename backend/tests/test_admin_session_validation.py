"""P05 D7: administrator authority never bypasses the normal session gate."""
from datetime import datetime, timedelta, timezone
import os
import threading
from uuid import uuid4

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from jose import jwt
import pytest

import auth


@pytest.fixture
def session_client(monkeypatch):
    revoked = set()
    # Unit seam replaces only the revocation store, not JWT validation or
    # the administrator dependency. Real SQL/logout coverage is below.
    monkeypatch.setattr(auth, "is_revoked", lambda jti: not jti or jti in revoked)
    app = FastAPI()

    @app.get("/admin/session-proof")
    def proof(email=Depends(auth.get_current_admin)):
        return {"email": email}

    return TestClient(app), revoked


def token(**changes):
    claims = {"sub": "1", "email": "admin-session@example.invalid", "role": "admin",
              "jti": uuid4().hex, "typ": "access",
              "exp": datetime.now(timezone.utc) + timedelta(minutes=5)}
    claims.update(changes)
    return jwt.encode(claims, auth.SECRET_KEY, algorithm=auth.ALGORITHM)


def call(client, value):
    return client.get("/admin/session-proof", headers={"Authorization": "Bearer " + value})


@pytest.mark.parametrize("role", ["admin", "ADMIN", " Admin "])
def test_valid_admin_keeps_email_return_contract(session_client, role):
    client, _ = session_client
    response = call(client, token(role=role))
    assert response.status_code == 200
    assert response.json() == {"email": "admin-session@example.invalid"}


@pytest.mark.parametrize("role", ["user", "escrow_officer", "super_admin", None, ""])
def test_non_admin_is_forbidden(session_client, role):
    client, _ = session_client
    assert call(client, token(role=role)).status_code == 403


@pytest.mark.parametrize("change", [
    {"sub": None}, {"jti": None}, {"jti": ""}, {"typ": "refresh"},
    {"exp": datetime(2020, 1, 1, tzinfo=timezone.utc)},
])
def test_invalid_session_cannot_borrow_admin_role(session_client, change):
    client, _ = session_client
    assert call(client, token(**change)).status_code == 401


def test_revoked_admin_is_refused(session_client):
    client, revoked = session_client
    identifier = uuid4().hex
    credential = token(jti=identifier)
    assert call(client, credential).status_code == 200
    revoked.add(identifier)
    response = call(client, credential)
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_missing_email_is_not_an_admin_identity(session_client):
    client, _ = session_client
    assert call(client, token(email=None)).status_code == 403


def test_invalid_signature_and_missing_credentials_fail(session_client):
    client, _ = session_client
    assert call(client, "not-a-signed-token").status_code == 401
    assert client.get("/admin/session-proof").status_code in (401, 403)


@pytest.mark.skipif(not os.getenv("DATABASE_URL"), reason="test database required")
def test_real_logout_revokes_all_key_management_operations():
    import psycopg2
    import database
    from main import app

    for worker in threading.enumerate():
        if worker.name == "schema-convergence":
            worker.join(30)
            assert not worker.is_alive(), "schema convergence incomplete"

    email = f"admin-session-{uuid4().hex}@example.invalid"
    with psycopg2.connect(os.environ["DATABASE_URL"]) as conn, conn.cursor() as cursor:
        cursor.execute("INSERT INTO users(email,role) VALUES (%s,'admin') RETURNING id", (email,))
        user_id = cursor.fetchone()[0]
    credential = auth.create_access_token({"sub": str(user_id), "email": email, "role": "admin"})
    headers = {"Authorization": "Bearer " + credential}
    client = TestClient(app)
    assert client.get("/admin/api-keys", headers=headers).status_code == 200
    logout = client.post("/users/logout", headers=headers)
    assert logout.status_code == 200
    assert "access" in logout.json()["revoked"]
    target = str(uuid4())
    requests = [
        ("GET", "/admin/api-keys", None),
        ("GET", "/admin/api-keys/" + target, None),
        ("POST", "/admin/api-keys", {"name": "must-not-be-issued", "is_test": True}),
        ("PATCH", "/admin/api-keys/" + target, {"is_active": True}),
        ("DELETE", "/admin/api-keys/" + target, None),
        ("GET", "/admin/api-key-requests", None),
        ("GET", "/usage/overage/quote", None),
    ]
    with psycopg2.connect(os.environ["DATABASE_URL"]) as conn, conn.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) FROM api_keys")
        before = cursor.fetchone()[0]
    for method, path, body in requests:
        response = client.request(method, path, headers=headers, json=body)
        assert response.status_code == 401, (method, path, response.status_code)
    with psycopg2.connect(os.environ["DATABASE_URL"]) as conn, conn.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) FROM api_keys")
        assert cursor.fetchone()[0] == before
    # No historical user, key or document is changed. Synthetic fixture rows
    # can remain in the disposable test database like the existing harness.
