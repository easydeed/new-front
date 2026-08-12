"""NOTARY2 — run the NOTARY1 signing-request migration.

    DATABASE_URL=postgresql://... python backend/scripts/migrate_notary1_signings.py --dry-run
    DATABASE_URL=postgresql://... python backend/scripts/migrate_notary1_signings.py

Idempotent: a second run finds nothing. Dry-run first — it reports what
WOULD move without writing, which is the only way to see the count before
committing to it.
"""
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def main() -> int:
    url = os.getenv("DATABASE_URL")
    if not url:
        print("DATABASE_URL is not set — refusing to guess at a database",
              file=sys.stderr)
        return 1

    import psycopg2
    from db_rows import ROW_FACTORY
    from services.signing_migration import migrate

    from services.db_identity import (WrongDatabase, assert_tables, describe,
                                      expected_database)

    dry = "--dry-run" in sys.argv
    conn = psycopg2.connect(url, cursor_factory=ROW_FACTORY)
    try:
        # Standing rule: verify the database before trusting it. A
        # migration pointed at the wrong Postgres reports "nothing to
        # migrate" and looks like success.
        #
        # This block used to be its own two-line copy of the identity
        # query, printing the database and host and nothing else. It is
        # now `services/db_identity` — one module, three callers — and it
        # gained the half it was missing: the tables it reads and writes
        # are asserted, so a wrong database says so instead of reporting
        # a confident zero.
        try:
            assert_tables(conn, "deed_shares", "signing_requests",
                          "signing_participants",
                          expect_database=expected_database())
        except WrongDatabase as wrong:
            print(str(wrong), file=sys.stderr)
            return 1
        print(f"database: {describe(conn)}")

        report = migrate(conn, dry_run=dry)
        if dry:
            conn.rollback()
        else:
            conn.commit()
        print(json.dumps(report, indent=2, default=str))
        return 0
    except Exception as e:
        conn.rollback()
        print(f"migration failed: {type(e).__name__}: {e}", file=sys.stderr)
        return 1
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
