"""Count, then move, then (separately, by hand) drop.

═══ WHAT THIS IS FOR ═══

`company_name` lived in two tables. `users.company_name` is written by
registration, by the Settings page and by admin; `user_profiles.
company_name` was written by `POST /users/profile/enhanced` and read by
the deed pre-fill. Nothing kept them equal and nothing told anybody they
were different columns, so an officer who fixed her company on the
Settings page did not change the company that pre-fills Recording
Requested By.

Owner-ruled: `users.company_name` is canonical. The read has already
moved (`database.get_user_profile`) and the duplicate write is gone
(`database.update_user_profile`). What is left is the data.

═══ WHY COUNTING IS ITS OWN STEP ═══

The owner's ruling was explicit: report row counts before dropping
anything. A column that turns out to hold the ONLY copy of some
officer's company is not a duplicate, it is the record — and the only
way to know which one it is, is to count first.

`--apply` copies `user_profiles.company_name` into `users.company_name`
for the rows where `users` has nothing and `user_profiles` does. It never
overwrites a non-blank canonical value: where the two disagree, `users`
wins by the ruling, and the disagreements are listed in the report so the
decision is made by a person looking at them.

═══ WHY THE DROP IS NOT IN HERE ═══

Dropping a column is irreversible and owner-only. This script PRINTS the
statement and refuses to run it. A script that can drop a column is a
script that can drop a column by accident, and the accident is not
recoverable from a report.

Usage (where DATABASE_URL points at the database being consolidated):

    python scripts/company_name_consolidation.py            # report only
    python scripts/company_name_consolidation.py --apply    # backfill users
"""
import argparse
import os
import sys

import psycopg2
from db_rows import ROW_FACTORY
from services.db_identity import (WrongDatabase, assert_tables, describe,
                                  expected_database)

# Blank-or-absent, in one place, so the report and the backfill cannot
# disagree about what "has a company name" means. `clean_profile_text`
# collapses whitespace to NULL on the way in, but rows predating it can
# still hold '   '.
HAS = "COALESCE(NULLIF(BTRIM({col}), ''), NULL) IS NOT NULL"


def counts(cur):
    """Every number the ruling asked for, from one pass over the join."""
    cur.execute(f"""
        SELECT
          COUNT(*)                                             AS users_total,
          COUNT(*) FILTER (WHERE {HAS.format(col='u.company_name')})
                                                               AS users_have,
          COUNT(*) FILTER (WHERE p.user_id IS NOT NULL)        AS profiles_total,
          COUNT(*) FILTER (WHERE {HAS.format(col='p.company_name')})
                                                               AS profiles_have,
          COUNT(*) FILTER (WHERE {HAS.format(col='u.company_name')}
                             AND {HAS.format(col='p.company_name')}
                             AND BTRIM(u.company_name) = BTRIM(p.company_name))
                                                               AS agree,
          COUNT(*) FILTER (WHERE {HAS.format(col='u.company_name')}
                             AND {HAS.format(col='p.company_name')}
                             AND BTRIM(u.company_name) <> BTRIM(p.company_name))
                                                               AS disagree,
          COUNT(*) FILTER (WHERE NOT {HAS.format(col='u.company_name')}
                             AND {HAS.format(col='p.company_name')})
                                                               AS only_profile,
          COUNT(*) FILTER (WHERE {HAS.format(col='u.company_name')}
                             AND NOT {HAS.format(col='p.company_name')})
                                                               AS only_users
        FROM users u
        LEFT JOIN user_profiles p ON p.user_id = u.id
    """)
    return dict(cur.fetchone())


def disagreements(cur, limit=50):
    """The rows a person has to look at. Ids only — no contact details."""
    cur.execute(f"""
        SELECT u.id, BTRIM(u.company_name) AS canonical,
               BTRIM(p.company_name) AS duplicate
        FROM users u
        JOIN user_profiles p ON p.user_id = u.id
        WHERE {HAS.format(col='u.company_name')}
          AND {HAS.format(col='p.company_name')}
          AND BTRIM(u.company_name) <> BTRIM(p.company_name)
        ORDER BY u.id
        LIMIT %s
    """, (limit,))
    return [dict(r) for r in cur.fetchall()]


def backfill(cur):
    """Copy the duplicate into the canonical column where it is the only copy.

    The WHERE clause is the whole safety argument: a row whose canonical
    value is already set is not touched, so running this twice changes
    nothing the second time and a disagreement is never silently resolved
    in favour of the column that is being retired.
    """
    cur.execute(f"""
        UPDATE users u
        SET company_name = BTRIM(p.company_name)
        FROM user_profiles p
        WHERE p.user_id = u.id
          AND NOT {HAS.format(col='u.company_name')}
          AND {HAS.format(col='p.company_name')}
    """)
    return cur.rowcount


DROP_STATEMENT = "ALTER TABLE user_profiles DROP COLUMN company_name;"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true",
                        help="copy user_profiles.company_name into users where "
                             "users has none")
    args = parser.parse_args()

    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        sys.exit("DATABASE_URL is required")

    conn = psycopg2.connect(db_url, cursor_factory=ROW_FACTORY)

    # WHICH DATABASE, BEFORE COUNTING ANYTHING OUT OF IT.
    #
    # A report is a decision input, and a report from the wrong database
    # is worse than no report — it looks exactly like the right one.
    try:
        with conn.cursor() as cur:
            assert_tables(cur, ["users", "user_profiles"],
                          expect_database=expected_database())
            print(describe(cur))
    except WrongDatabase as e:
        conn.close()
        sys.exit(str(e))

    with conn.cursor() as cur:
        before = counts(cur)
        clashes = disagreements(cur)

    print("\n── company_name, both homes ─────────────────────────────")
    print(f"  users rows                          {before['users_total']:>7}")
    print(f"  users.company_name set              {before['users_have']:>7}")
    print(f"  user_profiles rows                  {before['profiles_total']:>7}")
    print(f"  user_profiles.company_name set      {before['profiles_have']:>7}")
    print(f"  both set and EQUAL                  {before['agree']:>7}")
    print(f"  both set and DIFFERENT              {before['disagree']:>7}")
    print(f"  only user_profiles has it           {before['only_profile']:>7}"
          "   <- what --apply moves")
    print(f"  only users has it                   {before['only_users']:>7}")

    if clashes:
        print("\n── disagreements (users wins by the ruling) ─────────────")
        for row in clashes:
            print(f"  user {row['id']:>6}: users={row['canonical']!r} "
                  f"profiles={row['duplicate']!r}")
        print("  These are NOT changed by --apply. If any of them is a "
              "correction\n  the officer made in the old profile endpoint, "
              "it needs a person.")

    if args.apply:
        with conn.cursor() as cur:
            moved = backfill(cur)
            conn.commit()
            after = counts(cur)
        print(f"\n  backfilled: {moved} row(s)")
        print(f"  users.company_name set is now {after['users_have']} "
              f"(was {before['users_have']})")
        print(f"  only user_profiles has it is now {after['only_profile']} "
              "(0 means nothing is left only in the retiring column)")
    else:
        print("\n  Report only. Re-run with --apply to backfill.")

    print("\n── retirement (NOT run by this script) ──────────────────")
    print("  Safe to run once 'only user_profiles has it' reads 0 AND the")
    print("  deploy carrying the read/write changes is live:")
    print(f"\n      {DROP_STATEMENT}\n")
    print("  Irreversible, so it is owner-run by hand, not automated here.")

    conn.close()


if __name__ == "__main__":
    main()
