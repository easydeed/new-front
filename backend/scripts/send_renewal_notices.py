"""PILOT2 — the pre-charge notices, as a standalone daily job.

READY FOR A RENDER CRON JOB, WHICH DOES NOT EXIST YET. Creating that
service is a deploy-topology change and therefore Tier 3 — the owner's
call, not this repo's. Unlike the purge, there is no in-request fallback
carrying this work: **until the cron exists, no notice is sent by this
path.** The `customer.subscription.trial_will_end` webhook covers the
14-day trial three days out and nothing covers the pilot's coupon path,
which emits no trial event at all.

That is stated plainly because the failure is silent by construction: a
job nobody scheduled produces exactly the same customer experience as the
gap it was written to close.

Usage:
    DATABASE_URL=postgresql://... python backend/scripts/send_renewal_notices.py
    DATABASE_URL=... python backend/scripts/send_renewal_notices.py --dry-run
    DATABASE_URL=... python backend/scripts/send_renewal_notices.py --verify

Suggested Render Cron Job (owner-side, Tier 3):
    schedule:      0 15 * * *         # daily, 15:00 UTC — mid-morning in
                                      # California, so a customer who
                                      # wants to cancel can do it during
                                      # a working day rather than finding
                                      # the mail at 2am.
    command:       python backend/scripts/send_renewal_notices.py
    env:           DATABASE_URL from the deedpro-db database
                   STRIPE_SECRET_KEY   ← the charge date and amount come
                                         from Stripe; without it this job
                                         refuses rather than guessing.
                   FRONTEND_URL        ← the cancel link in the email.
                   SENDGRID_API_KEY    ← without it every send fails
                                         HONESTLY: the attempt is
                                         recorded with its reason and the
                                         exit code is non-zero.
                   EXPECTED_DATABASE=deedpro   ← name the database this
                   job is FOR. Staging carries the same tables, and a
                   misconfigured cron pointed there would email real
                   customers about charges from a copy of the data.

WHY `EXPECTED_DATABASE` MATTERS HERE, given nothing is deleted: this job
is not irreversible against the database, it is irreversible against a
PERSON. An email cannot be unsent, and the wrong one tells a customer she
is about to be charged an amount that is not real.

Exit codes: 0 when every notice due was sent, 1 when any send failed or
the job could not run — so a cron service's own alerting sees a failed
run rather than a silent one.
"""
import json
import os
import sys
from datetime import datetime, timezone
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

    from services import renewal_notice
    from services.db_identity import (WrongDatabase, assert_tables, describe,
                                      expected_database)

    dry_run = "--dry-run" in sys.argv
    verify_only = "--verify" in sys.argv

    # The date and the amount come from Stripe. Without a key there is no
    # authority to read, and a job that ran anyway would either send
    # nothing (looking healthy) or send something it made up.
    if not (os.getenv("STRIPE_SECRET_KEY") or "").strip():
        print("STRIPE_SECRET_KEY is not set — the charge date and amount come "
              "from Stripe, and this job will not invent them", file=sys.stderr)
        return 1

    import stripe
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

    conn = psycopg2.connect(url, cursor_factory=ROW_FACTORY)
    try:
        # ── WHICH DATABASE, BEFORE ANYTHING ELSE ──────────────────────
        #
        # Same assertion as the purge cron, for a different irreversible
        # act: that job deletes rows, this one sends mail to customers.
        # Staging has both tables, so the tables alone would let a
        # misconfigured cron write to real people about charges recorded
        # in a copy.
        try:
            assert_tables(conn, "subscriptions", "billing_notices", "users",
                          expect_database=expected_database())
        except WrongDatabase as wrong:
            print(str(wrong), file=sys.stderr)
            return 1

        if verify_only:
            print(describe(conn))
            rows = renewal_notice.subscriptions_to_check(conn)
            print(f"{len(rows)} live subscription(s) would be checked")
            return 0

        print(f"[renewal-notices] running against {describe(conn)}")
        today = datetime.now(timezone.utc).date()

        if dry_run:
            # Asks Stripe and decides, sends nothing, writes nothing. The
            # question worth asking before the first real run is "who
            # would this email today", and answering it must not be the
            # thing that emails them.
            sent = []

            def refuse(*args, **kwargs):
                return False, "dry run — not sent"

            report = renewal_notice.run(conn, stripe, today, sender=refuse)
            conn.rollback()
            print(json.dumps(report.as_dict(), indent=2, default=str))
            print("[dry-run] nothing was sent and nothing was recorded")
            return 0

        report = renewal_notice.run(conn, stripe, today)
        conn.commit()
        print(json.dumps(report.as_dict(), indent=2, default=str))

        # A failed send is a failed run. The rows record it either way,
        # but a cron that exits 0 while nobody was told is the shape this
        # ticket exists to remove.
        return 1 if report.failed else 0
    except Exception as exc:
        conn.rollback()
        print(f"renewal notices failed: {exc}", file=sys.stderr)
        return 1
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
