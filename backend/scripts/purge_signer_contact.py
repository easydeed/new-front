"""NOTARY2 — the signer-contact purge, as a standalone job.

READY FOR A RENDER CRON JOB, which does not exist yet. Creating that
service is a deploy-topology change and therefore Tier 3 — the owner's
call, not this repo's. Until it exists, the in-request sweep in
`services/signing_purge.py` carries the work; it lags gracefully rather
than failing, and it runs only when somebody uses the product.

That distinction is the whole reason this script exists ahead of the
service: a retention PRACTICE can lag, and a retention PROMISE cannot.
The moment the privacy statement names a window, this needs a scheduler
behind it.

Usage:
    DATABASE_URL=postgresql://... python backend/scripts/purge_signer_contact.py
    DATABASE_URL=... python backend/scripts/purge_signer_contact.py --status
    DATABASE_URL=... python backend/scripts/purge_signer_contact.py --dry-run

Suggested Render Cron Job (owner-side, Tier 3):
    schedule:      0 4 * * *          # daily, 4am UTC
    command:       python backend/scripts/purge_signer_contact.py
    env:           DATABASE_URL from the deedpro-db database

Exit codes: 0 on success, 1 on failure — so a cron service's own
alerting sees a failed purge rather than a silent one.
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
    from services.signing_purge import purge_signer_contact, purge_status

    status_only = "--status" in sys.argv
    dry_run = "--dry-run" in sys.argv

    conn = psycopg2.connect(url, cursor_factory=ROW_FACTORY)
    try:
        if status_only:
            print(json.dumps(purge_status(conn), indent=2, default=str))
            return 0

        purged = purge_signer_contact(conn)
        if dry_run:
            # The count is real; the write is not kept. Useful before the
            # first production run, when "how many rows would this touch"
            # is the only question worth asking.
            conn.rollback()
            print(f"[dry-run] would purge {purged} participant rows")
            return 0

        conn.commit()
        print(f"purged contact details on {purged} participant rows")
        return 0
    except Exception as e:
        conn.rollback()
        print(f"purge failed: {type(e).__name__}: {e}", file=sys.stderr)
        return 1
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
