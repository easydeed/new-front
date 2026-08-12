"""Declare a database disposable, so the destructive harnesses will run.

`s1_concurrency_proof` and `s2_restore_drill` insert users and deeds, and
`s2` runs `pg_dump` and `pg_restore`. They now refuse any database that
does not carry the marker this script creates.

    DATABASE_URL=postgresql://... python scripts/mark_scratch_database.py \
        --yes-this-is-a-throwaway-database

═══ WHY THE FLAG IS SPELLED LIKE THAT ═══

Nothing here can stop somebody marking production — no code can. What it
can do is make the two acts LOOK DIFFERENT. Mis-pasting a DATABASE_URL is
easy and common; typing `--yes-this-is-a-throwaway-database` while
looking at an identity line that reads `deedpro` is not something anybody
does by accident.

So the script prints WHICH database it is about to mark, before it marks
it, and refuses without the flag. The safety is in the shape of the
mistake, not in a promise that no mistake is possible — see
`services/db_identity.assert_scratch` for the full reasoning, including
what was rejected: an `ALLOW_DESTRUCTIVE_TESTS` variable somebody sets
and forgets, and matching production by NAME, which fails the moment a
second production-shaped database exists.

Exit codes: 0 marked (or already marked), 1 refused.
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

FLAG = "--yes-this-is-a-throwaway-database"


def main() -> int:
    url = os.getenv("DATABASE_URL")
    if not url:
        print("DATABASE_URL is not set — refusing to guess at a database",
              file=sys.stderr)
        return 1

    import psycopg2
    from services.db_identity import (SCRATCH_MARKER, describe, is_scratch,
                                      mark_scratch)

    conn = psycopg2.connect(url)
    try:
        where = describe(conn)
        if is_scratch(conn):
            print(f"already marked: {where}")
            return 0

        # The identity line comes FIRST, and before the refusal, so that
        # the operator who forgot the flag has already read which
        # database they were pointed at.
        print(f"about to mark as a THROWAWAY database: {where}")
        print(f"  this creates the table `{SCRATCH_MARKER}` and allows the")
        print("  destructive proof harnesses to write and drop data here.")

        if FLAG not in sys.argv:
            print(f"\nrefusing without {FLAG}", file=sys.stderr)
            print("If the line above names production, that refusal is the "
                  "point.", file=sys.stderr)
            return 1

        mark_scratch(conn)
        conn.commit()
        print(f"marked: {where}")
        return 0
    except Exception as e:
        conn.rollback()
        print(f"marking failed: {type(e).__name__}: {e}", file=sys.stderr)
        return 1
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
