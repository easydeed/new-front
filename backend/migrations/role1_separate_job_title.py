"""ROLE1 step 3 — move the job title out of the authorization column.

═══ WHAT THIS IS ═══

`users.role` held two facts at once: what somebody is called (Escrow
Officer, Title Agent) and what somebody may do (admin). ROLE1 step 3
gave the first its own column. This script moves the existing rows.

For every row:

  - a value that is NOT an admin spelling is a JOB TITLE. It moves to
    `job_title` and `role` becomes 'user' — explicitly, never by default,
    because "we assumed" is not a thing to say about an access column.
  - an admin spelling stays admin and is written in the canonical
    lowercase. `job_title` is left alone: 'admin' was never a job title
    and copying it into one would invent a fact.
  - 'user' is already the answer. Untouched.

═══ WHY IT PLANS BEFORE IT WRITES ═══

    python migrations/role1_separate_job_title.py            # plan
    python migrations/role1_separate_job_title.py --apply    # write

Default is the plan, and the plan is the row-by-row list of what would
change — not a count. An access migration whose output is "17 rows
updated" is one nobody can check afterwards.

`--apply` runs in ONE transaction. A half-migrated users table has some
people's titles in one column and some in the other, and every reader
downstream would have to handle both forever.

═══ WHAT IT DOES NOT DO ═══

It does not narrow `ADMIN_ROLES`. The gates go on recognizing all four
spellings after this runs, deliberately: narrowing the recognized set is
a SECOND decision, safe only once a census of the migrated table shows
nothing but 'admin' — and taking it here would mean one script that both
converges the data and changes what the converged data means.

It is also re-runnable. Every row it has already moved fails the
selection on the second pass, so a partial run followed by a full one
lands in the same place.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2  # noqa: E402

from auth import ADMIN_ROLES, ADMIN_ROLE, DEFAULT_ROLE  # noqa: E402
from db_rows import ROW_FACTORY  # noqa: E402
from services.db_identity import (WrongDatabase, assert_tables,  # noqa: E402
                                  describe, expected_database)

#: Rows whose `role` is a job title: anything with a value that is not an
#: admin spelling and not already the default.
TITLES_SQL = """
    SELECT id, email, BTRIM(role) AS role, job_title
      FROM users
     WHERE COALESCE(BTRIM(role), '') NOT IN ('', %s)
       AND LOWER(BTRIM(role)) <> ALL(%s)
     ORDER BY id
"""

#: Admin rows written in something other than the canonical spelling.
SPELLINGS_SQL = """
    SELECT id, email, BTRIM(role) AS role
      FROM users
     WHERE LOWER(BTRIM(role)) = ANY(%s)
       AND BTRIM(role) <> %s
     ORDER BY id
"""


def read_plan(cur):
    admin = [r.lower() for r in ADMIN_ROLES]
    cur.execute(TITLES_SQL, (DEFAULT_ROLE, admin))
    titles = [dict(r) for r in cur.fetchall()]
    cur.execute(SPELLINGS_SQL, (admin, ADMIN_ROLE))
    spellings = [dict(r) for r in cur.fetchall()]
    return titles, spellings


def print_plan(titles, spellings):
    print("\n── job titles moving out of users.role ──────────────────")
    if not titles:
        print("  none")
    for row in titles:
        occupied = f"  (job_title already holds {row['job_title']!r})" \
            if row["job_title"] else ""
        print(f"  user {row['id']:>6}  {row['email']}")
        print(f"           role {row['role']!r} → job_title, "
              f"role → {DEFAULT_ROLE!r}{occupied}")

    print("\n── admin rows being written in the canonical spelling ───")
    if not spellings:
        print("  none")
    for row in spellings:
        print(f"  user {row['id']:>6}  {row['email']}  "
              f"{row['role']!r} → {ADMIN_ROLE!r}")

    # A row that already has a job_title is the one case where this
    # script would DESTROY something. It does not: `job_title` wins and
    # `role` is still reduced, because the person filled that field in
    # themselves and the column they never saw does not outrank it.
    conflicts = [r for r in titles if r["job_title"]]
    if conflicts:
        print(f"\n  {len(conflicts)} row(s) already have a job_title. Theirs "
              f"is kept; only `role` changes.")


def apply(cur, titles, spellings):
    for row in titles:
        cur.execute("""
            UPDATE users
               SET job_title = COALESCE(NULLIF(BTRIM(job_title), ''), %s),
                   role = %s
             WHERE id = %s
        """, (row["role"], DEFAULT_ROLE, row["id"]))
    for row in spellings:
        cur.execute("UPDATE users SET role = %s WHERE id = %s",
                    (ADMIN_ROLE, row["id"]))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true",
                        help="write the changes (default is to print them)")
    args = parser.parse_args()

    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        sys.exit("DATABASE_URL is required")

    conn = psycopg2.connect(db_url, cursor_factory=ROW_FACTORY)
    try:
        with conn.cursor() as cur:
            # WHICH DATABASE, BEFORE WRITING TO IT.
            try:
                assert_tables(cur, ["users"], expect_database=expected_database())
                print(describe(cur))
            except WrongDatabase as e:
                sys.exit(str(e))

            titles, spellings = read_plan(cur)
            print_plan(titles, spellings)

            if not args.apply:
                print("\n  PLAN ONLY — nothing was written. Re-run with "
                      "--apply to make these changes.")
                return

            apply(cur, titles, spellings)
        # One transaction for the whole table: a half-migrated users
        # table would leave every reader downstream handling both shapes.
        conn.commit()
        print(f"\n  APPLIED — {len(titles)} title(s) moved, "
              f"{len(spellings)} spelling(s) canonicalised.")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
