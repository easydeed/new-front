"""One connection per request, from a pool. RED-S1.

═══ WHAT THIS REPLACES, AND WHY IT WAS A CORRECTNESS BUG ═══

This module used to own ONE module-level psycopg2 connection, referenced
as `db.conn` from 103 call sites. Nearly every endpoint in this codebase
is a sync `def`, which FastAPI runs in an anyio threadpool — up to 40
workers.

Forty threads. One connection. One transaction.

psycopg2 makes a connection thread-safe for CURSOR creation. It cannot
make the TRANSACTION per-thread, because there is exactly one transaction
per connection. So:

  - Request A executes an UPDATE and has not committed.
  - Request B, on another thread, calls `db.conn.commit()` — and commits
    A's uncommitted write, mid-flight, unreviewed.
  - Request C errors and calls `db.conn.rollback()` — and discards A's
    and B's uncommitted work.

None of that is theoretical. The production outage of 2026-08-01 was one
failed query on this connection, never rolled back, leaving the
transaction aborted — after which Postgres refuses EVERY later query on
it and the whole app 500s. RED-H1.2b and #130 each found fresh ways to
reach that state from a PUBLIC url.

═══ WHY THE HEALING LADDER IS GONE RATHER THAN IMPROVED ═══

The response to that outage was a five-step recovery ladder: probe,
rollback, re-probe, reconnect. It worked, and it made the underlying
defect worse in one specific way — step 3 called `rollback()` on a
connection OTHER REQUESTS WERE USING, as a repair, silently. Every heal
was a data-loss event for whatever else was in flight.

It is deleted, not extended. A pool of per-request connections has
nothing to heal: a poisoned connection is discarded at the end of the one
request that poisoned it, and no other request ever saw it.

═══ HOW 103 CALL SITES DID NOT HAVE TO CHANGE ═══

`db.conn` is now a PROXY. It looks and behaves exactly as before —
`.cursor()`, `.commit()`, `.rollback()` — but it resolves, per request,
to that request's own connection from the pool.

That is deliberate. Rewriting 103 call sites by hand, in one diff, in the
module that every endpoint depends on, is how you turn a correctness fix
into an outage. The proxy makes the change one that can be REASONED about
rather than reviewed line by line: if the proxy resolves correctly, every
call site is correct, and the tests aim at the proxy.

Scoping uses `contextvars`, not thread-locals, because both async and
sync endpoints exist here. Starlette copies the context into the
threadpool worker, so a sync endpoint sees the connection the middleware
checked out for it; thread-locals would silently fail for the async ones.

═══ OUTSIDE A REQUEST ═══

Scripts, startup, migrations and the baseline harnesses have no request
to scope to. They get a lazily-created dedicated connection — one, the
old shape — because a CLI script is genuinely single-threaded and the
concurrency argument above does not apply to it.
"""
import contextlib
import os
import threading
from contextvars import ContextVar
from typing import Optional

import psycopg2
from dotenv import load_dotenv
from fastapi import HTTPException
from psycopg2 import pool as _pgpool

from db_rows import ROW_FACTORY

load_dotenv()

DB_URL = os.getenv("DATABASE_URL") or os.getenv("DB_URL")

# Sized against Postgres's max_connections, not against traffic. The
# threadpool is 40 workers, so 40 is the most that can be in flight — but
# a managed Postgres commonly allows ~100 TOTAL across every client, and
# this app is not the only connector (migrations, the psql a human has
# open, the billing SQLAlchemy engine). Overshooting the server limit
# turns a load spike into "FATAL: too many connections" for everyone,
# which is the failure this ticket exists to prevent, wearing a new hat.
POOL_MIN = int(os.getenv("DB_POOL_MIN", "1"))
POOL_MAX = int(os.getenv("DB_POOL_MAX", "20"))

_pool: Optional[_pgpool.ThreadedConnectionPool] = None
_pool_lock = threading.Lock()

# The connection belonging to the request currently being served.
_current: ContextVar[Optional[object]] = ContextVar("db_current_conn", default=None)

# The fallback for code that runs outside any request.
_standalone = None
_standalone_lock = threading.Lock()


def _new_connection():
    return psycopg2.connect(DB_URL, cursor_factory=ROW_FACTORY, connect_timeout=10)


def get_pool() -> Optional[_pgpool.ThreadedConnectionPool]:
    """The pool, created on first use."""
    global _pool
    if not DB_URL:
        return None
    if _pool is None:
        with _pool_lock:
            if _pool is None:
                _pool = _pgpool.ThreadedConnectionPool(
                    POOL_MIN, POOL_MAX, DB_URL,
                    cursor_factory=ROW_FACTORY, connect_timeout=10,
                )
    return _pool


def _standalone_connection():
    """One dedicated connection for non-request code paths.

    Recreated if it has been closed or poisoned, because a script that
    hits an error and keeps going would otherwise fail every later
    statement — the same aborted-transaction trap, in the one place where
    a single connection is legitimate.
    """
    global _standalone
    with _standalone_lock:
        if _standalone is None or _standalone.closed:
            _standalone = _new_connection()
            return _standalone
        try:
            with _standalone.cursor() as cur:
                cur.execute("SELECT 1")
        except psycopg2.Error:
            try:
                _standalone.rollback()
                with _standalone.cursor() as cur:
                    cur.execute("SELECT 1")
            except Exception:
                with contextlib.suppress(Exception):
                    _standalone.close()
                _standalone = _new_connection()
        return _standalone


@contextlib.contextmanager
def request_connection():
    """Check a connection out for one request and put it back after.

    Commits nothing on its own: call sites own their transactions and
    always have. What this guarantees is that an UNFINISHED transaction
    never outlives its request — the leak that let one request's failure
    become the next request's error.
    """
    p = get_pool()
    if p is None:
        yield None
        return

    conn_obj = p.getconn()
    token = _current.set(conn_obj)
    try:
        yield conn_obj
    finally:
        _current.reset(token)
        # Whatever state the request left this connection in, it does not
        # travel. rollback() on an already-committed connection is a
        # no-op; on a poisoned one it is the cure; on an open transaction
        # it is the correct default for a request that did not commit.
        try:
            conn_obj.rollback()
        except Exception:
            with contextlib.suppress(Exception):
                conn_obj.close()
        try:
            p.putconn(conn_obj)
        except Exception:
            with contextlib.suppress(Exception):
                conn_obj.close()


def _active():
    """The connection this caller should use."""
    bound = _current.get()
    if bound is not None:
        return bound
    if not DB_URL:
        return None
    return _standalone_connection()


class _ConnectionProxy:
    """`db.conn`, resolving per request.

    Every attribute access forwards to the caller's own connection. The
    proxy holds no connection of its own, which is the entire point: it
    cannot be shared because it is not a connection.
    """

    def __bool__(self):
        # Call sites do `if not db.conn: raise HTTPException(500)`. That
        # question means "is the database usable", and it still does.
        return _active() is not None

    def __getattr__(self, name):
        target = _active()
        if target is None:
            raise HTTPException(status_code=500,
                                detail="Database connection not available")
        if name == "close":
            # Closing a POOLED connection out from under the pool is the
            # exact hazard the ledger named when this work was parked.
            # The request scope owns the lifecycle; a stray close() here
            # would hand the pool a dead socket to give the next caller.
            return lambda *a, **k: None
        return getattr(target, name)

    def __repr__(self):
        target = _active()
        return f"<db.conn -> {target!r}>"


conn = _ConnectionProxy()


def get_db_connection():
    """Kept for callers that ask for a connection explicitly.

    THE HEALING LADDER IS GONE. It probed, rolled back, re-probed and
    reconnected a SHARED connection — and its rollback step discarded
    other in-flight requests' uncommitted work as a "repair".

    There is nothing left to heal. A request's connection is its own; if
    it is poisoned, it is poisoned for that request alone and is rolled
    back and returned to the pool when the request ends.
    """
    target = _active()
    if target is None:
        raise HTTPException(status_code=500,
                            detail="Database connection not available")
    return target


def close_pool():
    """Shutdown hook — closes every pooled connection."""
    global _pool
    with _pool_lock:
        if _pool is not None:
            with contextlib.suppress(Exception):
                _pool.closeall()
            _pool = None


# T2: make sure the stored-PDF table exists (idempotent; no Alembic here).
if DB_URL:
    try:
        from services.deed_pdf import ensure_deed_pdfs_table
        _boot = _standalone_connection()
        ensure_deed_pdfs_table(_boot)
    except Exception as _pdf_table_error:
        print(f"Warning: could not ensure deed_pdfs table: {_pdf_table_error}")
else:
    print("Warning: No database connection URL found")
