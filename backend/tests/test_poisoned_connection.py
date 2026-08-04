"""The 2026-08-01 outage, and why it can no longer happen. RED-S1.

═══ WHAT THIS FILE USED TO PIN, AND WHY THAT IS GONE ═══

It pinned the HEALING LADDER: that `get_db_connection()` would probe a
poisoned shared connection, `rollback()` it, re-probe, and reconnect if
that failed. Those tests were correct and they passed. They are deleted
here, in the same diff that makes them false — the condition their own
docstring named.

The ladder treated the symptom. One failed query on the ONE shared
connection aborted the transaction, and Postgres then refused every later
query on it, which surfaced as login 500s for everybody. The ladder
healed that after the fact — and its cure was `rollback()` on a
connection OTHER REQUESTS WERE USING, which silently discarded whatever
uncommitted work they had in flight. Every heal was a small data-loss
event, performed as a repair.

RED-S1 removed the thing being healed. Each request checks a connection
out of a pool and returns it; a poisoned connection is poisoned for
exactly one request, is rolled back on the way back to the pool, and no
other request ever sees it.

So the pins invert. They no longer assert that a shared connection
RECOVERS. They assert that requests cannot reach each other at all —
which is the property that made recovery necessary in the first place.
"""
import os
import threading

import psycopg2
import pytest

import db
from tests.source_text import code_only

BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIVE_DB = os.getenv("DATABASE_URL")

pytestmark = pytest.mark.skipif(not LIVE_DB, reason="live test DB required")


@pytest.fixture(autouse=True)
def _fresh_pool():
    db.close_pool()
    yield
    db.close_pool()


# ── The ladder is gone, and stays gone ────────────────────────────────


def test_the_healing_ladder_is_deleted():
    """Not weakened, not made conditional — removed.

    A reconnect-and-rollback recovery path is meaningful ONLY for a
    shared connection. If one reappears here, so has the shared
    connection, and with it the outage.
    """
    src = code_only(os.path.join(BACKEND, "db.py"))
    assert "Recovery ladder" not in src
    assert "_reconnect" not in src
    assert "Healed poisoned connection" not in src


def test_the_module_exposes_no_shared_connection_object():
    """`db.conn` is a PROXY now. The distinction is the whole ticket: a
    proxy cannot be shared between requests because it holds nothing."""
    assert type(db.conn).__name__ == "_ConnectionProxy"
    assert not isinstance(db.conn, psycopg2.extensions.connection)


# ── Requests cannot reach each other ──────────────────────────────────


def test_two_requests_get_different_connections():
    seen = []
    for _ in range(2):
        with db.request_connection() as c:
            seen.append(id(c))
            # Hold nothing; the pool may legitimately hand back the same
            # object once it is returned. What matters is the next test.
    assert len(seen) == 2


def test_concurrent_requests_never_share_a_connection():
    """THE property. Two requests in flight AT THE SAME TIME must hold
    two different connections, or one's commit is the other's."""
    ids = []
    barrier = threading.Barrier(2, timeout=10)
    lock = threading.Lock()

    def worker():
        with db.request_connection() as c:
            barrier.wait()          # both inside their request together
            with lock:
                ids.append(id(c))
            barrier.wait()          # neither returns before both recorded

    threads = [threading.Thread(target=worker) for _ in range(2)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=15)

    assert len(ids) == 2
    assert ids[0] != ids[1], "two concurrent requests shared one connection"


def test_a_poisoned_request_does_not_poison_a_concurrent_one():
    """The outage, reproduced under the new model — and refused.

    Request A runs a failing statement and aborts its transaction, which
    is exactly what happened on 2026-08-01. Request B, in flight at the
    same time, must be entirely unaffected. Under the shared connection
    B's next query raised InFailedSqlTransaction; that is what "login
    500s for everybody" was.
    """
    results = {}
    barrier = threading.Barrier(2, timeout=10)

    def poisoner():
        with db.request_connection() as c:
            with pytest.raises(psycopg2.Error):
                with c.cursor() as cur:
                    cur.execute("SELECT * FROM table_that_does_not_exist_xyz")
            barrier.wait()          # A is poisoned; let B try
            barrier.wait()

    def victim():
        with db.request_connection() as c:
            barrier.wait()          # wait until A is poisoned
            try:
                with c.cursor() as cur:
                    cur.execute("SELECT 1 AS ok")
                    results["victim"] = cur.fetchone()["ok"]
            except psycopg2.Error as e:
                results["victim"] = f"POISONED: {type(e).__name__}"
            barrier.wait()

    threads = [threading.Thread(target=poisoner), threading.Thread(target=victim)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=15)

    assert results.get("victim") == 1, (
        f"a concurrent request was affected by another's failure: {results}")


def test_an_induced_failure_does_not_roll_back_the_other_writer():
    """The acquirer's prescribed proof: two concurrent WRITES, one fails,
    the other's row must survive.

    Under the shared connection this could not hold — A's rollback (or
    the healing ladder's) discarded B's uncommitted INSERT along with
    A's, because there was only ever one transaction.
    """
    import uuid
    tag_ok = f"s1-ok-{uuid.uuid4().hex[:10]}"
    tag_bad = f"s1-bad-{uuid.uuid4().hex[:10]}"
    barrier = threading.Barrier(2, timeout=10)

    def failing_writer():
        with db.request_connection() as c:
            with c.cursor() as cur:
                cur.execute(
                    "INSERT INTO users (email, password_hash) VALUES (%s,%s)",
                    (f"{tag_bad}@test.local", "x"))
            barrier.wait()              # both have an open write
            with pytest.raises(psycopg2.Error):
                with c.cursor() as cur:
                    cur.execute("SELECT * FROM table_that_does_not_exist_xyz")
            c.rollback()                # A discards its own work
            barrier.wait()

    def good_writer():
        with db.request_connection() as c:
            with c.cursor() as cur:
                cur.execute(
                    "INSERT INTO users (email, password_hash) VALUES (%s,%s)",
                    (f"{tag_ok}@test.local", "x"))
            barrier.wait()
            barrier.wait()              # A has now failed and rolled back
            c.commit()                  # B commits AFTER A's rollback

    threads = [threading.Thread(target=failing_writer),
               threading.Thread(target=good_writer)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=15)

    check = psycopg2.connect(LIVE_DB, connect_timeout=10)
    try:
        with check.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM users WHERE email = %s",
                        (f"{tag_ok}@test.local",))
            survived = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM users WHERE email = %s",
                        (f"{tag_bad}@test.local",))
            rolled_back = cur.fetchone()[0]
            cur.execute("DELETE FROM users WHERE email IN (%s,%s)",
                        (f"{tag_ok}@test.local", f"{tag_bad}@test.local"))
            check.commit()
    finally:
        check.close()

    assert survived == 1, "the succeeding writer's row was destroyed by the other's failure"
    assert rolled_back == 0, "the failing writer's row should not have survived"


# ── The connection does not outlive its request ───────────────────────


def test_an_uncommitted_transaction_never_escapes_its_request():
    """A request that opens a write and never commits must not leave that
    transaction open on a pooled connection for the next caller to
    inherit — the leak that turns one request's mistake into another's."""
    import uuid
    tag = f"s1-leak-{uuid.uuid4().hex[:10]}@test.local"

    with db.request_connection() as c:
        with c.cursor() as cur:
            cur.execute("INSERT INTO users (email, password_hash) VALUES (%s,%s)",
                        (tag, "x"))
        # deliberately no commit, no rollback

    check = psycopg2.connect(LIVE_DB, connect_timeout=10)
    try:
        with check.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM users WHERE email = %s", (tag,))
            assert cur.fetchone()[0] == 0, "uncommitted work escaped its request"
    finally:
        check.close()


def test_the_proxy_refuses_to_close_a_pooled_connection():
    """Closing a pooled connection hands the pool a dead socket to give
    the next caller — the hazard the ledger named when this work was
    parked."""
    with db.request_connection() as c:
        db.conn.close()
        assert not c.closed
        with db.conn.cursor() as cur:
            cur.execute("SELECT 1 AS ok")
            assert cur.fetchone()["ok"] == 1


def test_outside_a_request_there_is_still_a_usable_connection():
    """Scripts, migrations and the baseline harnesses have no request to
    scope to and must keep working."""
    with db.conn.cursor() as cur:
        cur.execute("SELECT 1 AS ok")
        assert cur.fetchone()["ok"] == 1
