"""Production outage 2026-08-01 — the poisoned shared connection, pinned.

One failed query on the module-level psycopg2 connection, never rolled
back, aborted the transaction — and Postgres then refused EVERY later
query on it, surfacing as login 500s ("current transaction is aborted,
commands ignored until end of transaction block"). Three stacked defects
let it stick: the liveness probe caught only Operational/Interface
errors (the aborted-transaction class escaped to callers), it never
tried rollback() (the instant cure), and the login handler's rollback
fallback referenced an unbound local when get_db_connection raised.

Pins: get_db_connection HEALS a poisoned connection via rollback (fake
connection, CI-safe), the recovery ladder falls through to reconnect,
and — against the live test DB — a genuinely poisoned psycopg2
connection comes back usable and the login route answers 401, not 500.
"""
import os

import psycopg2
import pytest

import db


class FakePoisonedConn:
    """Mimics psycopg2's aborted-transaction state: every query raises
    until rollback() is called."""

    closed = 0

    def __init__(self):
        self.poisoned = True
        self.rollbacks = 0

    def cursor(self):
        conn = self

        class _Cur:
            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

            def execute(self, sql, params=None):
                if conn.poisoned:
                    raise psycopg2.errors.InFailedSqlTransaction(
                        "current transaction is aborted, commands ignored "
                        "until end of transaction block\n"
                    )

        return _Cur()

    def rollback(self):
        self.rollbacks += 1
        self.poisoned = False


class FakeDeadConn(FakePoisonedConn):
    """Rollback does NOT help — forces the reconnect rung."""

    def rollback(self):
        self.rollbacks += 1  # still poisoned


def test_poisoned_connection_heals_via_rollback(monkeypatch):
    fake = FakePoisonedConn()
    monkeypatch.setattr(db, "conn", fake)
    monkeypatch.setattr(db, "DB_URL", "postgresql://unused/healed-before-reconnect")

    healed = db.get_db_connection()

    assert healed is fake            # same connection, not a reconnect
    assert fake.rollbacks == 1       # the cure was rollback
    assert not fake.poisoned


def test_unhealable_connection_falls_through_to_reconnect(monkeypatch):
    fake = FakeDeadConn()
    fresh = FakePoisonedConn()
    fresh.poisoned = False
    monkeypatch.setattr(db, "conn", fake)
    monkeypatch.setattr(db, "DB_URL", "postgresql://unused/reconnect-rung")
    monkeypatch.setattr(db.psycopg2, "connect", lambda *a, **k: fresh)

    healed = db.get_db_connection()

    assert healed is fresh           # rollback failed → reconnected
    assert fake.rollbacks == 1       # ... but rollback WAS attempted first


LIVE_DB = os.getenv("DATABASE_URL")


@pytest.mark.skipif(not LIVE_DB, reason="live test DB required")
def test_real_poisoned_connection_recovers_and_login_returns_401():
    """The production failure, reproduced end to end: poison a REAL
    psycopg2 connection with a failing statement, install it as the
    shared conn, and prove (a) the helper heals it and (b) the login
    route answers 401 for bad credentials — never the outage's 500."""
    from fastapi.testclient import TestClient
    from main import app

    poisoned = psycopg2.connect(LIVE_DB, connect_timeout=10)
    try:
        with poisoned.cursor() as cur:
            cur.execute("SELECT 1")   # open a transaction
        try:
            with poisoned.cursor() as cur:
                cur.execute("SELECT * FROM table_that_does_not_exist_xyz")
        except psycopg2.Error:
            pass                      # transaction now aborted — poisoned

        # Confirm the poisoned state is real before installing it:
        with pytest.raises(psycopg2.Error):
            with poisoned.cursor() as cur:
                cur.execute("SELECT 1")

        original = db.conn
        db.conn = poisoned
        try:
            healed = db.get_db_connection()
            with healed.cursor() as cur:
                cur.execute("SELECT 1")   # usable again

            db.conn = poisoned if healed is poisoned else healed
            client = TestClient(app)
            resp = client.post("/users/login", json={
                "email": "poisoned-conn-probe@example.com",
                "password": "wrong-password",
            })
            assert resp.status_code == 401, resp.text
        finally:
            db.conn = original
    finally:
        try:
            poisoned.close()
        except Exception:
            pass
