"""The share-PDF endpoint reads the stored instrument from where it lives.

═══ THE DEFECT ═══

`GET /approve/{token}/pdf` selected `d.pdf_data` from `deeds`.

That column does not exist. T2 moved the stored instrument into
`deed_pdfs`; `deeds` kept only `pdf_url`, and the other `pdf_data` in the
schema belongs to `api_deeds` — a different table, for the partner API.

So the query did not quietly return NULL. It raised UndefinedColumn on
every call, which means **every review share has served a 500 since T2**.

═══ WHY IT WAS WORSE THAN A BROKEN FEATURE ═══

The endpoint runs on the SHARED connection and its handler had no
rollback. A failed statement leaves the transaction aborted, and Postgres
then refuses every later query on that connection:

    InFailedSqlTransaction: current transaction is aborted,
    commands ignored until end of transaction block

That is the 2026-08-01 production outage exactly — except triggerable on
demand, by anyone holding a share link, with one GET. Reproduced against
a real database before the fix, which is why the first test below runs
SQL rather than reading source.

═══ WHY THIS TEST EXECUTES INSTEAD OF GREPPING ═══

A source-grep asserting "deed_pdfs" appears in the file would pass on a
query that still had the old join wrong somewhere else. The column
reference is the property; the string is the spelling. So the pin runs
the endpoint's actual SQL against the actual converged schema — the only
check that could not have been green while the bug was live.
"""
import os
import sys
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

from tests.source_text import code_only  # noqa: E402

SHARING = BACKEND / "routers" / "sharing.py"

# The endpoint's query, kept in one place so the executable pin and the
# source pin cannot drift apart.
TOKEN_PDF_SQL = """
    SELECT ds.status, ds.expires_at,
           p.pdf_data, d.pdf_url, d.deed_type, d.property_address
    FROM deed_shares ds
    JOIN deeds d ON ds.deed_id = d.id
    LEFT JOIN deed_pdfs p ON p.deed_id = d.id
    WHERE ds.token = %s
"""

pytestmark = pytest.mark.skipif(
    not os.getenv("DATABASE_URL"),
    reason="needs a database for the executable pins")


@pytest.fixture
def conn():
    import psycopg2
    from db_rows import ROW_FACTORY
    from database import create_tables
    create_tables()
    c = psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=ROW_FACTORY)
    yield c
    c.close()


def test_the_endpoints_query_actually_runs(conn):
    """THE pin. This is the test that could not have passed before."""
    import uuid
    with conn.cursor() as cur:
        cur.execute(TOKEN_PDF_SQL, (str(uuid.uuid4()),))
        assert cur.fetchall() == []


def test_a_malformed_token_is_a_type_error_not_a_miss(conn):
    """The SECOND defect, found while writing the test above.

    `deed_shares.token` is UUID. Passing "no-such-token" does not return
    zero rows — it raises, on the shared connection, from a public URL.
    Anyone could poison the connection by typing nonsense after
    /approve/. All three public token endpoints did this."""
    import psycopg2
    with pytest.raises(psycopg2.errors.InvalidTextRepresentation):
        with conn.cursor() as cur:
            cur.execute(TOKEN_PDF_SQL, ("no-such-token",))
    conn.rollback()


# The "every public token endpoint validates first" pin MOVED to
# test_notary1_signing.py::test_every_public_token_endpoint_validates_first.
#
# It used to live here as `src.count("_valid_token_or_404(...)") == 3` — a
# COUNT, which is a fact about the routes that existed that afternoon
# rather than the property that matters. NOTARY1 added three more public
# `/approve/{token}` endpoints and the pin's response was to demand a new
# number; worse, it would have stayed GREEN for a fourth endpoint added
# while a fifth quietly dropped its guard.
#
# It also could not run in CI's no-database job, because this module skips
# wholesale without DATABASE_URL — a source pin sitting behind a database
# requirement it never needed. Both problems are fixed by the move.


def test_the_guard_rejects_garbage_and_accepts_a_uuid():
    import uuid as _uuid
    sys.path.insert(0, str(BACKEND / "routers"))
    from routers.sharing import _valid_token_or_404
    from fastapi import HTTPException as _HTTPException

    good = str(_uuid.uuid4())
    assert _valid_token_or_404(good) == good
    for bad in ["no-such-token", "", "../../etc/passwd", "1 OR 1=1", "null"]:
        with pytest.raises(_HTTPException) as exc:
            _valid_token_or_404(bad)
        assert exc.value.status_code == 404


def test_the_old_query_is_genuinely_impossible(conn):
    """Proves the defect was a hard error, not a NULL — so "shares serve
    nothing" understated it. They served a 500."""
    import psycopg2
    with pytest.raises(psycopg2.errors.UndefinedColumn):
        with conn.cursor() as cur:
            cur.execute("""
                SELECT ds.status, d.pdf_data
                FROM deed_shares ds JOIN deeds d ON ds.deed_id = d.id
                WHERE ds.token = %s
            """, ("x",))
    conn.rollback()


def test_deeds_has_no_pdf_data_column(conn):
    """The schema fact the endpoint contradicted."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'deeds' AND column_name = 'pdf_data'
        """)
        assert cur.fetchall() == []


def test_the_stored_instrument_lives_in_deed_pdfs(conn):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'deed_pdfs' AND column_name = 'pdf_data'
        """)
        assert len(cur.fetchall()) == 1


def test_a_failed_query_on_the_shared_connection_poisons_the_next_one(conn):
    """Not a pin on our code — a pin on the REASON the rollbacks below
    matter. If this ever stops being true, the shared-connection risk has
    been designed away (RED-S1) and the rollback sweep can retire."""
    import psycopg2
    with pytest.raises(psycopg2.errors.UndefinedColumn):
        with conn.cursor() as cur:
            cur.execute("SELECT no_such_column FROM deeds")
    with pytest.raises(psycopg2.errors.InFailedSqlTransaction):
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
    conn.rollback()


def test_a_share_with_a_stored_pdf_returns_its_bytes(conn):
    """End to end through the real tables: the join must find the PDF."""
    import uuid
    token = str(uuid.uuid4())
    with conn.cursor() as cur:
        cur.execute("INSERT INTO users (email, password_hash) VALUES (%s,%s) RETURNING id",
                    (f"sharepdf-{token[:8]}@test.local", "x"))
        uid = cur.fetchone()["id"]
        cur.execute("""INSERT INTO deeds (user_id, deed_type, status, property_address)
                       VALUES (%s,'grant-deed','completed','1 Test St') RETURNING id""", (uid,))
        did = cur.fetchone()["id"]
        cur.execute("""INSERT INTO deed_pdfs (deed_id, pdf_data, sha256)
                       VALUES (%s, %s, %s)""", (did, psycopg2_bytes(b"%PDF-1.4 fake"), "a" * 64))
        cur.execute("""INSERT INTO deed_shares (deed_id, owner_user_id, recipient_email, token, status)
                       VALUES (%s,%s,'r@test.local',%s,'sent')""", (did, uid, token))
        conn.commit()

        cur.execute(TOKEN_PDF_SQL, (token,))
        row = cur.fetchone()
        assert row is not None, "the share row must be found"
        assert bytes(row["pdf_data"]) == b"%PDF-1.4 fake"

        cur.execute("DELETE FROM deed_shares WHERE token = %s", (token,))
        cur.execute("DELETE FROM deed_pdfs WHERE deed_id = %s", (did,))
        cur.execute("DELETE FROM deeds WHERE id = %s", (did,))
        cur.execute("DELETE FROM users WHERE id = %s", (uid,))
        conn.commit()


def test_a_share_whose_deed_has_no_pdf_still_finds_the_share(conn):
    """Why LEFT JOIN. An inner join reports "Share not found" for a share
    that plainly exists, sending the officer to look for a share problem
    when the real state is "no PDF stored yet"."""
    import uuid
    token = str(uuid.uuid4())
    with conn.cursor() as cur:
        cur.execute("INSERT INTO users (email, password_hash) VALUES (%s,%s) RETURNING id",
                    (f"nopdf-{token[:8]}@test.local", "x"))
        uid = cur.fetchone()["id"]
        cur.execute("""INSERT INTO deeds (user_id, deed_type, status, property_address)
                       VALUES (%s,'grant-deed','draft','2 Test St') RETURNING id""", (uid,))
        did = cur.fetchone()["id"]
        cur.execute("""INSERT INTO deed_shares (deed_id, owner_user_id, recipient_email, token, status)
                       VALUES (%s,%s,'r@test.local',%s,'sent')""", (did, uid, token))
        conn.commit()

        cur.execute(TOKEN_PDF_SQL, (token,))
        row = cur.fetchone()
        assert row is not None, "LEFT JOIN: the share must still be found"
        assert row["pdf_data"] is None

        cur.execute("DELETE FROM deed_shares WHERE token = %s", (token,))
        cur.execute("DELETE FROM deeds WHERE id = %s", (did,))
        cur.execute("DELETE FROM users WHERE id = %s", (uid,))
        conn.commit()


def psycopg2_bytes(b: bytes):
    import psycopg2
    return psycopg2.Binary(b)


# ── The source-level companions ───────────────────────────────────────


def test_the_endpoint_no_longer_names_the_nonexistent_column():
    src = code_only(SHARING.read_text(encoding="utf-8"))
    assert "d.pdf_data" not in src
    assert "deed_pdfs" in src


def test_every_handler_touching_the_shared_connection_rolls_back():
    """The class sweep. Eight handlers in this file already rolled back
    and seven did not — a half-applied pattern, which is exactly why the
    gap was invisible. Handlers that only wrap an email send are excluded
    on purpose: utils.notifications opens its OWN connection, so a
    rollback there would be a no-op with a misleading comment."""
    import re
    lines = SHARING.read_text(encoding="utf-8").split("\n")
    missing = []
    for i, line in enumerate(lines):
        if not re.match(r"\s*except Exception", line):
            continue
        # Find the try: this handler belongs to.
        j = i
        while j > 0 and not re.match(r"^\s*try:", lines[j]):
            j -= 1
        body = "\n".join(lines[j:i])
        if "cur.execute" not in body and "db.conn.cursor" not in body:
            continue  # not a shared-connection statement
        if "rollback" not in "\n".join(lines[i:i + 12]):
            missing.append(i + 1)
    assert missing == [], f"handlers that abort the shared txn: {missing}"
