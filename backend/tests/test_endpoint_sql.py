"""Every statement these endpoints run is parsed by a real Postgres.

═══ THE DEFECT THAT MADE THIS FILE ═══

`GET /deeds/{id}/activity` shipped with

    SELECT r.answer, r.asserted_at, p.name, p.party_role

and `signing_participants` has no `name` column — it has `display_name`.
Postgres rejects an unknown column at PARSE time, so the endpoint
returned 500 on every call, for every deed, whether or not any signing
existed. It was not a rare path. It was the only path.

It shipped green because the pins were unit tests over
`deed_activity.activity()` with dict fixtures. Those tests are good and
they test the right thing — the epistemics of the feed — but a dict
fixture agrees with whatever key you type into it. **The statement had
never once been executed.**

Third time this class has cost something: `users.updated_at` (a column
the code wrote and the database lacked), `:items::jsonb` (a statement
SQLAlchemy could not parse, on a webhook nothing ever posted), and now
this. Every one of them was invisible to a suite that mocks the cursor.

═══ WHAT THIS TESTS, AND WHAT IT DOES NOT ═══

It asks Postgres to PREPARE each statement. That proves every table
exists, every column exists and is spelled right, and the parameter
count matches. It does not prove the query returns the right rows —
that is what the endpoint tests do.

Parsing is the half that mocks can never cover, and it is the half that
has cost three incidents.
"""
import os

import psycopg2
import pytest
from db_rows import ROW_FACTORY

pytestmark = pytest.mark.skipif(
    not os.getenv("DATABASE_URL"),
    reason="needs a real Postgres — this test's whole point is the parser",
)


#: (label, sql, parameter count). Statements are named by the endpoint or
#: helper they belong to, so a failure says which surface is broken
#: rather than which line number moved.
STATEMENTS = [
    (
        "GET /deeds/{id}/activity — shares",
        """SELECT id, recipient_name, recipient_email, status,
                  created_at, viewed_at, responded_at
             FROM deed_shares WHERE deed_id = $1""",
    ),
    (
        "GET /deeds/{id}/activity — signings",
        """SELECT id, created_at, booked_asserted_at, booked_by, cancelled_at
             FROM signing_requests WHERE deed_id = $1""",
    ),
    (
        "GET /deeds/{id}/activity — responses (the one that was broken)",
        """SELECT r.answer, r.asserted_at, p.display_name AS name, p.party_role
             FROM signing_responses r
             JOIN signing_participants p ON p.id = r.participant_id
             JOIN signing_requests s ON s.id = p.signing_request_id
            WHERE s.deed_id = $1""",
    ),
    (
        "signing_rows.for_deed",
        """SELECT sr.*, d.property_address, d.deed_type,
                  (SELECT display_name FROM signing_participants
                    WHERE signing_request_id = sr.id AND party_role = 'notary'
                    ORDER BY id LIMIT 1) AS notary_name
             FROM signing_requests sr
             JOIN deeds d ON d.id = sr.deed_id
            WHERE sr.deed_id = $1
            ORDER BY sr.created_at DESC""",
    ),
    (
        "signing_rows.for_officer",
        """SELECT sr.*, d.property_address, d.deed_type,
                  (SELECT display_name FROM signing_participants
                    WHERE signing_request_id = sr.id AND party_role = 'notary'
                    ORDER BY id LIMIT 1) AS notary_name
             FROM signing_requests sr
             JOIN deeds d ON d.id = sr.deed_id
            WHERE sr.officer_user_id = $1
            ORDER BY COALESCE(sr.booked_at, sr.expires_at) ASC""",
    ),
    (
        "signing_rows.signers_for_deed (§13.1 — name and answer only)",
        """SELECT p.display_name AS name, p.party_role,
                  (SELECT r.answer FROM signing_responses r
                    WHERE r.participant_id = p.id
                    ORDER BY r.asserted_at DESC LIMIT 1) AS answer
             FROM signing_participants p
             JOIN signing_requests s ON s.id = p.signing_request_id
            WHERE s.deed_id = $1 AND p.party_role = $2
            ORDER BY p.id""",
    ),
    (
        "signing_rows.summarise — windows",
        "SELECT * FROM signing_windows WHERE signing_request_id = $1",
    ),
    (
        "signing_rows.summarise — responses",
        """SELECT r.* FROM signing_responses r
             JOIN signing_windows w ON w.id = r.window_id
            WHERE w.signing_request_id = $1""",
    ),
    (
        "signing_rows.summarise — participants",
        "SELECT * FROM signing_participants WHERE signing_request_id = $1",
    ),
    (
        "GET /deeds/{id}/detail — the deed row",
        """SELECT d.*, u.role FROM deeds d
             LEFT JOIN users u ON u.id = $1
            WHERE d.id = $2 AND (d.user_id = $3 OR u.role = 'admin')""",
    ),
    (
        "GET /deeds/{id}/detail — shares",
        """SELECT id, recipient_name, recipient_email, status,
                  created_at, viewed_at, responded_at
             FROM deed_shares WHERE deed_id = $1 ORDER BY created_at DESC""",
    ),
]


@pytest.fixture(scope="module")
def conn():
    c = psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=ROW_FACTORY)
    yield c
    c.close()


@pytest.mark.parametrize("label,sql", STATEMENTS, ids=[s[0] for s in STATEMENTS])
def test_the_database_can_parse_it(conn, label, sql):
    """PREPARE, not EXECUTE.

    Preparing resolves every table and column and refuses an unknown one,
    which is exactly the failure that shipped — and it does so without
    inserting a row or depending on one existing. A test that needed
    fixture data would be skipped on an empty database, which is the
    database CI runs against.
    """
    with conn.cursor() as cur:
        try:
            cur.execute(f"PREPARE _probe AS {sql}")
            cur.execute("DEALLOCATE _probe")
        except psycopg2.Error as e:
            conn.rollback()
            pytest.fail(f"{label}: {type(e).__name__}: {str(e).splitlines()[0]}")
        conn.rollback()


def test_the_column_that_started_this_still_does_not_exist(conn):
    """The regression, named.

    If somebody adds a `name` column to `signing_participants` this test
    fails — and that is the correct outcome, not a nuisance: two columns
    meaning the name would be the same disease this codebase has spent
    three tickets on, and the alias would silently start reading the
    wrong one.
    """
    with conn.cursor() as cur:
        cur.execute("""
            SELECT column_name FROM information_schema.columns
             WHERE table_name = 'signing_participants'
               AND column_name IN ('name', 'display_name')
             ORDER BY column_name
        """)
        found = sorted(r["column_name"] for r in cur.fetchall())
    assert found == ["display_name"], (
        f"expected display_name and nothing like it; found {found}"
    )
