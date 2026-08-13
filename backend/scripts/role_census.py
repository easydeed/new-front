"""Count what `users.role` actually holds, before anything is decided.

═══ WHY THIS IS THE DELIVERABLE AND THE MIGRATION IS NOT ═══

ROLE1 step 3 separates job title from authorization: job title to its own
column, `users.role` reduced to a closed set. Every version of that
migration rewrites somebody's access, and which somebody depends on
values nobody has looked at.

Specifically: `is_admin_role` accepts four spellings. If production holds
`Administrator` or `superadmin`, converging the gates — which this same
ticket just did — CHANGED that person's access. Not hypothetically:
before, they entered the console and were refused by two gates inside it;
now they are admitted by all three. That may be exactly right, and it is
not a thing to discover from a support ticket.

Same discipline as `company_name`: count first, and the count is a
person's decision input rather than a step in a script.

═══ WHAT IT DOES NOT DO ═══

It writes nothing. There is no `--apply`, deliberately — a census that
can mutate is a census somebody runs with the wrong flag.

Usage (where DATABASE_URL points at the database being counted):

    python scripts/role_census.py
"""
import os
import sys

import psycopg2
from db_rows import ROW_FACTORY
from services.db_identity import (WrongDatabase, assert_tables, describe,
                                  expected_database)

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def main():
    from auth import ADMIN_ROLES

    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        sys.exit("DATABASE_URL is required")

    conn = psycopg2.connect(db_url, cursor_factory=ROW_FACTORY)

    # WHICH DATABASE, BEFORE COUNTING ANYTHING OUT OF IT. A census from
    # the wrong database looks exactly like the right one.
    try:
        with conn.cursor() as cur:
            assert_tables(cur, ["users"], expect_database=expected_database())
            print(describe(cur))
    except WrongDatabase as e:
        conn.close()
        sys.exit(str(e))

    admin = [r.lower() for r in ADMIN_ROLES]

    with conn.cursor() as cur:
        cur.execute("""
            SELECT COALESCE(NULLIF(BTRIM(role), ''), '(blank)') AS value,
                   COUNT(*) AS n
              FROM users
             GROUP BY 1
             ORDER BY n DESC, 1
        """)
        rows = [dict(r) for r in cur.fetchall()]

        cur.execute("""
            SELECT COUNT(*) AS n FROM users
             WHERE LOWER(BTRIM(role)) = ANY(%s)
        """, (admin,))
        admins = dict(cur.fetchone())["n"]

        # The rows whose access the gate convergence CHANGED: an admin
        # spelling that is not exactly 'admin' was previously refused by
        # admin_partners and by the owner-or-admin deed fetch.
        cur.execute("""
            SELECT id, email, BTRIM(role) AS role FROM users
             WHERE LOWER(BTRIM(role)) = ANY(%s)
               AND BTRIM(role) <> 'admin'
             ORDER BY id
        """, (admin,))
        widened = [dict(r) for r in cur.fetchall()]

    print("\n── every value in users.role ────────────────────────────")
    for row in rows:
        mark = "  <- ADMIN" if row["value"].strip().lower() in admin else ""
        print(f"  {row['n']:>6}  {row['value']!r}{mark}")

    print(f"\n  admins by any spelling: {admins}")

    print("\n── whose access the gate convergence CHANGED ────────────")
    if not widened:
        print("  none — every admin row is exactly 'admin', so converging")
        print("  the three gates was a no-op for real users.")
    else:
        for row in widened:
            print(f"  user {row['id']:>6}  {row['role']!r}  {row['email']}")
        print("\n  These were PARTIAL admins: the console opened and two")
        print("  gates inside it refused. They now pass all three. Confirm")
        print("  that is intended for each one.")

    print("\n── what step 3 needs from this ──────────────────────────")
    print("  1. Which non-admin values are JOB TITLES (they move to")
    print("     users.job_title) versus placeholders like 'user'.")
    print("  2. Whether every admin row should keep admin.")
    print("  3. Nothing is written by this script. Step 3 is a separate")
    print("     decision, made by a person reading the numbers above.")

    conn.close()


if __name__ == "__main__":
    main()
