"""API-CONFIRM — expire unapproved drafts and purge approver email.

READY FOR A RENDER CRON JOB, which does not exist yet. Until it exists,
the in-request sweep in `services/api_confirm_lifecycle.py` carries the
work. Same shape as `purge_signer_contact.py`.

Usage:
    DATABASE_URL=postgresql://... python backend/scripts/purge_api_confirm.py
    DATABASE_URL=... python backend/scripts/purge_api_confirm.py --status
    DATABASE_URL=... python backend/scripts/purge_api_confirm.py --dry-run
"""
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
    from services.api_confirm_lifecycle import purge_status, run_lifecycle
    from services.db_identity import WrongDatabase, assert_tables, describe, expected_database

    status_only = "--status" in sys.argv
    dry_run = "--dry-run" in sys.argv

    conn = psycopg2.connect(url, cursor_factory=ROW_FACTORY)
    try:
        try:
            who = assert_tables(conn, "api_deeds", "system_jobs",
                                expected=expected_database())
        except WrongDatabase as exc:
            print(str(exc), file=sys.stderr)
            return 1
        print(f"database: {describe(who)}")

        if status_only:
            print(purge_status(conn))
            return 0
        if dry_run:
            print(purge_status(conn))
            print("dry-run: no writes")
            return 0

        result = run_lifecycle(conn)
        conn.commit()
        print(result)
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
