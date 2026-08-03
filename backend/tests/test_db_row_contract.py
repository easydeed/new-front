"""One row contract, and no route back to two.

The history this exists to prevent (see db_rows.py for the full note):

- `database.get_db_connection` returned RealDictCursor rows (dicts);
  `db.get_db_connection` returned tuple rows. Nothing in either name said
  which, and a third private helper hid in api/property_endpoints.py.
- Reading one as the other made the partner API's auth compare a key
  against the literal string "key_hash" — every valid key 401'd, for
  months.
- routers/notifications.py has the mirror-image bug (RealDictCursor rows
  read by integer index). It never surfaced because the router is behind
  a feature flag that defaults off.
- The A3 request-funnel router hit the same trap in its first draft,
  inside the PR that documented the trap.

These tests are CI-safe (no database) except where marked.
"""
import inspect
import os
import re
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
SKIP_DIRS = {"tests", "migrations", "scripts", "__pycache__"}


def _source_files():
    for path in BACKEND.rglob("*.py"):
        if SKIP_DIRS & set(path.parts):
            continue
        yield path


def test_exactly_one_row_factory_is_declared():
    """db_rows.ROW_FACTORY is the single declaration. Nothing else may
    pick a cursor factory — that is how the second contract was born."""
    offenders = []
    for path in _source_files():
        if path.name == "db_rows.py":
            continue
        src = path.read_text(encoding="utf-8", errors="ignore")
        if "cursor_factory=" in src and "ROW_FACTORY" not in src:
            offenders.append(str(path.relative_to(BACKEND)))
        if re.search(r"cursor_factory\s*=\s*RealDictCursor", src):
            offenders.append(f"{path.relative_to(BACKEND)} (RealDictCursor)")
    assert offenders == [], f"a second row contract appeared in: {offenders}"


def test_both_helpers_use_the_one_factory():
    import database
    import db
    for mod in (database, db):
        src = inspect.getsource(mod)
        assert "ROW_FACTORY" in src, f"{mod.__name__} does not use the shared factory"
    # Every connect() in either module carries it.
    for mod in (database, db):
        src = inspect.getsource(mod)
        for call in re.findall(r"psycopg2\.connect\(([^)]*)\)", src):
            assert "ROW_FACTORY" in call, f"{mod.__name__}: connect without the row factory"


def test_no_third_connection_helper():
    """A private get_db_connection in a router or service module is the
    same ambiguity one directory further from where anyone looks."""
    definers = []
    for path in _source_files():
        if path.name in {"database.py", "db.py"}:
            continue
        src = path.read_text(encoding="utf-8", errors="ignore")
        if re.search(r"^def get_db_connection\(", src, re.M):
            definers.append(str(path.relative_to(BACKEND)))
    assert definers == [], f"additional connection helpers: {definers}"


def test_rows_answer_to_both_access_styles():
    """The contract itself: DictCursor rows support index AND key access,
    so neither reading style can be 'the wrong one'. RealDictCursor rows
    raise KeyError on row[0]; plain tuples raise TypeError on row['x'].
    Either exclusive choice recreates the bug class."""
    from db_rows import ROW_FACTORY
    from psycopg2.extras import DictCursor
    assert ROW_FACTORY is DictCursor


@pytest.mark.skipif(not os.getenv("DATABASE_URL"), reason="live test DB required")
def test_live_rows_read_both_ways_from_both_helpers():
    import database
    import db as db_module

    for get_conn in (database.get_db_connection, db_module.get_db_connection):
        conn = get_conn()
        with conn.cursor() as cur:
            cur.execute("SELECT 1 AS alpha, 2 AS beta")
            row = cur.fetchone()
            assert row[0] == 1, "index access broke"
            assert row["alpha"] == 1, "key access broke"
            assert dict(row) == {"alpha": 1, "beta": 2}
        if get_conn is database.get_db_connection:
            conn.close()  # fresh-per-call helper; the shared one stays open


@pytest.mark.skipif(not os.getenv("DATABASE_URL"), reason="live test DB required")
def test_the_notifications_router_can_now_read_its_own_rows():
    """It reads r[0]..r[7] from a helper that used to hand back
    RealDictCursor rows — a KeyError waiting behind a feature flag that
    defaults off. Under the one contract, both styles work."""
    from database import get_db_connection
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute(
            "SELECT n.id, n.type, n.title, n.message, n.severity, n.payload, n.created_at, "
            "COALESCE(un.read, false) AS read "
            "FROM user_notifications un JOIN notifications n ON n.id = un.notification_id LIMIT 1"
        )
        row = cur.fetchone()
    conn.close()
    if row is not None:
        assert row[0] is not None
        assert row["title"] is not None


def test_rows_are_never_returned_raw_from_an_endpoint():
    """The one caveat of DictRow: it is a list subclass, so returning one
    straight out of a handler would serialize as a JSON array instead of
    an object. Call sites build their responses explicitly; keep it so."""
    offenders = []
    for path in (BACKEND / "routers").rglob("*.py"):
        src = path.read_text(encoding="utf-8", errors="ignore")
        for pattern in [r"return\s+cur\.fetchone\(\)", r"return\s+cursor\.fetchone\(\)",
                        r"return\s+cur\.fetchall\(\)", r"return\s+cursor\.fetchall\(\)"]:
            if re.search(pattern, src):
                offenders.append(str(path.relative_to(BACKEND)))
    assert offenders == [], f"raw row returned to the client in: {offenders}"
