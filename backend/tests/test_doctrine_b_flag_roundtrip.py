"""Doctrine B — the flag survives the trip to the database.

Separate file because these need a real Postgres, and the boundary suite
proper must stay runnable without one.

The source-level pins in `test_doctrine_b_ai_boundary.py` prove the
scanner is CALLED and the column is DECLARED. Neither proves the value
lands. That gap is the one RED0 kept finding: a pin that reads the code
and a behaviour that never runs — "the number was honest and weak".

So this file writes a flagged exchange through the real logging function
into the real column and reads it back, and it does the same for a clean
one to prove NULL means clean rather than "the write silently failed".
"""
import json
import os
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

import pytest

pytestmark = pytest.mark.skipif(
    not os.getenv("DATABASE_URL"),
    reason="needs a database for the executable pins")


@pytest.fixture
def cur():
    import psycopg2
    from database import create_tables
    from db_rows import ROW_FACTORY
    create_tables()
    c = psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=ROW_FACTORY)
    c.autocommit = True
    with c.cursor() as k:
        yield k
    c.close()


VIOLATING = "You should use a quitclaim deed for this transfer."
CLEAN = "A quitclaim deed conveys whatever interest the grantor holds."


def _log(response):
    """Through the REAL logging function, not a hand-written INSERT — a
    test that writes its own SQL proves the column exists and nothing
    about whether the endpoint fills it."""
    from api.ai_assist import _log_exchange
    from services.ai_boundary import flags_json
    tag = f"doctrine-b-{os.getpid()}-{abs(hash(response)) % 10**8}"
    _log_exchange(None, "deed_type_advisor", "which deed?", response,
                  300, "ok", None, tag, flags_json(response))
    return tag


def test_a_flagged_response_lands_in_the_column(cur):
    tag = _log(VIOLATING)
    cur.execute("SELECT response, boundary_flags FROM ai_exchange_log "
                "WHERE request_tag = %s", (tag,))
    row = cur.fetchone()
    assert row is not None, "the exchange was not logged at all"

    flags = json.loads(row["boundary_flags"])
    assert flags, "a violating response logged with no flags"
    assert flags[0]["instrument"].lower() == "quitclaim deed"
    assert flags[0]["cue"]
    assert flags[0]["excerpt"]

    # And the response itself was stored UNCHANGED. The scanner detects;
    # it does not edit. An officer reading the log must see what she was
    # actually shown, not a sanitised version of it.
    assert row["response"] == VIOLATING


def test_a_clean_response_stores_null_not_an_empty_list(cur):
    """`WHERE boundary_flags IS NOT NULL` is the whole conformance audit,
    and it only works if clean means NULL. An empty JSON array would be
    truthy in SQL and every clean exchange would answer the audit."""
    tag = _log(CLEAN)
    cur.execute("SELECT boundary_flags FROM ai_exchange_log "
                "WHERE request_tag = %s", (tag,))
    assert cur.fetchone()["boundary_flags"] is None


def test_the_audit_query_returns_the_flagged_row_and_not_the_clean_one(cur):
    """The query that is written into OWNER_LEDGER as the thing to run.
    A ledgered query nobody executed is a ledgered guess."""
    flagged_tag = _log(VIOLATING)
    clean_tag = _log(CLEAN)

    cur.execute(
        "SELECT request_tag FROM ai_exchange_log "
        "WHERE boundary_flags IS NOT NULL AND request_tag IN (%s, %s)",
        (flagged_tag, clean_tag))
    found = {r["request_tag"] for r in cur.fetchall()}
    assert found == {flagged_tag}


def test_the_partial_index_backs_the_audit_query(cur):
    """Declared in the schema ladder; asserted here against the live
    catalog, because an index that failed to create is invisible until
    the table is large enough for it to matter."""
    cur.execute("SELECT indexdef FROM pg_indexes "
                "WHERE tablename = 'ai_exchange_log' "
                "AND indexname = 'idx_ai_log_flagged'")
    row = cur.fetchone()
    assert row is not None, "the flagged-exchange index is missing"
    assert "boundary_flags IS NOT NULL" in row["indexdef"]


def test_logging_a_flag_never_breaks_the_response_path(cur):
    """`_log_exchange` swallows its own failures on purpose: a logging
    problem is real, and it is still not a reason to deny an officer
    mid-file an answer we already have. Proven by handing it something
    the INSERT cannot take."""
    from api.ai_assist import _log_exchange
    _log_exchange(None, "deed_type_advisor", "x", "y", 300, "ok", None,
                  "t" * 500, "not-even-json")  # request_tag overflows VARCHAR(80)
    # No exception reached the caller. That is the whole assertion.
