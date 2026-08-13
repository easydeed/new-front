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
from pathlib import Path

# BEFORE the project imports, not after. This sat four lines lower, so
# `python scripts/role_census.py` — the invocation this file's own
# docstring gives — died on `ModuleNotFoundError: No module named
# 'db_rows'` every time it was ever run.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import psycopg2  # noqa: E402
from db_rows import ROW_FACTORY  # noqa: E402
from services.db_identity import (WrongDatabase, assert_tables,  # noqa: E402
                                  describe, expected_database)


def main():
    # ── WHY A PLACEHOLDER SECRET, IN A SCRIPT THAT SIGNS NOTHING ─────
    #
    # This census reads four columns and writes nothing. It imports
    # `auth` for one thing: `ADMIN_ROLES`, the one definition of the
    # vocabulary — and `auth.py` raises at IMPORT time if JWT_SECRET_KEY
    # is unset, which is correct for an API that must not boot without a
    # signing key and wrong for a read-only count.
    #
    # Without this, running the census means handing the operator the
    # production JWT signing key to look at a `role` column. That is a
    # worse instruction than the problem it solves. The placeholder is
    # never used to sign or verify anything; a real value in the
    # environment is left alone.
    #
    # The alternative — a second home for the vocabulary that does not
    # drag the key in — is how `utils/roles.py` came to exist, and ROLE1
    # deleted that for being a fourth definition of admin.
    os.environ.setdefault("JWT_SECRET_KEY", "unused-by-this-read-only-census")
    from auth import ADMIN_ROLES

    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        sys.exit("DATABASE_URL is required")

    conn = psycopg2.connect(db_url, cursor_factory=ROW_FACTORY)

    # WHICH DATABASE, BEFORE COUNTING ANYTHING OUT OF IT. A census from
    # the wrong database looks exactly like the right one.
    try:
        with conn.cursor() as cur:
            assert_tables(cur, "users", expect_database=expected_database())
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
