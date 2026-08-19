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

THE RENDER CRON JOB, EXACTLY (owner-side, Tier 3):

    Name:          renewal_notices
    Runtime:       Python 3
    Root Directory: (leave EMPTY — the repository root)
    Build Command: pip install -r backend/requirements.txt
    Command:       python backend/scripts/send_renewal_notices.py
    Schedule:      0 15 * * *        # daily, 15:00 UTC

    ⚠️ THE COMMAND RUNS FROM THE REPOSITORY ROOT, and that is safe here
    for a reason worth stating rather than assuming: this script puts its
    own package root on `sys.path` from `__file__`, so the working
    directory does not matter. `role_census.py` did not, assumed it ran
    from `backend/`, and died on ModuleNotFoundError in production. If
    you set Root Directory to `backend`, use
    `python scripts/send_renewal_notices.py` instead — both work, but the
    Build Command's path must match the choice.

    ⚠️ 15:00 UTC is mid-morning in California ON PURPOSE. Somebody who
    reads this mail and wants to cancel can do it during a working day
    instead of finding it at 2am.

    Environment variables — every one, and where each value comes from:

      PYTHON_VERSION       3.12.7
                           Pin it. Render's default is a version where
                           pydantic_core has no wheel and the build dies
                           compiling Rust. Set it in the DASHBOARD:
                           declaring it in render.yaml did not apply it
                           (confirmed the hard way, 2026-08-12).

      DATABASE_URL         The EXTERNAL connection string of the
                           `deedpro` Postgres. Not the internal one — a
                           cron job cannot resolve it.

      EXPECTED_DATABASE    deedpro
                           Names the database this job is FOR. Staging
                           carries the same tables, so the tables alone
                           would let a misconfigured cron mail real
                           customers about charges recorded in a copy.

      STRIPE_SECRET_KEY    Same value as the main API's. The charge date
                           and amount are READ from Stripe; without it
                           the job refuses rather than inventing them.

      FRONTEND_URL         https://deedpro.io (whatever the API uses).
                           The cancel link in every notice. Unset, the
                           link is RELATIVE — which in an email client is
                           a dead link — so the job refuses.

      SENDGRID_API_KEY     Same value as the main API's. Without it every
                           send fails HONESTLY: the attempt is recorded
                           in `email_log` with its reason and the job
                           exits 1.

      SENDGRID_FROM_EMAIL  info@deedpro.io — the verified sender. Absent,
                           mail falls back to a default sender, which is
                           visible in the message that arrives.

    NOT needed, and deliberately: JWT_SECRET_KEY, ALLOWED_ORIGINS,
    STRIPE_WEBHOOK_SECRET, the price IDs, ADMIN_EMAIL. This job serves no
    requests, verifies no sessions and creates no checkouts.

    BEFORE THE FIRST RUN, in this order:
      1. Deploy the API at least once after PILOT2 merged. The API
         converges the schema; THIS JOB DOES NOT and must not — a cron
         issuing `ALTER TABLE users` from a schedule nobody watches is a
         worse failure than a missing notice. It asserts the tables and
         refuses when they are absent.
      2. `--verify` from the Render shell. It needs only DATABASE_URL and
         EXPECTED_DATABASE, so it can be run before the secrets are in.
      3. `--dry-run`. Asks Stripe, decides, sends nothing, writes nothing.

    WHAT A SUCCESSFUL RUN PRINTS — so success is distinguishable from
    silence, which is the whole point of a job like this:

        [renewal-notices] running against deedpro on <host> (as <user>) (PostgreSQL 16.x)
        {
          "considered": 3,
          "sent": 0,
          "superseded": 0,
          "failed": 0,
          "unreachable": 0,
          "skipped": [
            {"subscription": "sub_1234", "reason": "the next invoice is zero — nothing to warn about"},
            {"subscription": "sub_5678", "reason": "no window open 41 days out, or already recorded"}
          ]
        }

    `"sent": 0` with a populated `skipped` IS A SUCCESSFUL RUN — during
    the discounted months of a pilot it is the ONLY correct outcome, and
    every subscription says why in its own words. An EMPTY report
    (`"considered": 0`) means the job found no live subscriptions at all,
    which on a day you expect pilots is the thing to investigate.

    A run that sent something prints `"sent": 1` and the notice is in
    `billing_notices` with `ok = true`.

    `"unreachable"` MUST BE 0. It counts subscriptions Stripe would not
    answer about — a wrong API key makes it equal `considered`, and the
    job exits 1. That case is why the counter exists: before it, a bad
    key skipped every subscription with an honest reason and exited 0,
    which is a cron reporting success every day while sending nothing.

WHY `EXPECTED_DATABASE` MATTERS HERE, given nothing is deleted: this job
is not irreversible against the database, it is irreversible against a
PERSON. An email cannot be unsent, and the wrong one tells a customer she
is about to be charged an amount that is not real.

Exit codes:
    0  every notice due was sent, and Stripe answered about everyone.
       A run that sent NOTHING exits 0 when that was the right answer —
       during a pilot's discounted months it is the only right answer.
    1  a send failed, Stripe would not answer, the database was wrong or
       unreachable, or a required variable was missing.

So a cron service's own alerting sees a failed run rather than a silent
one — including the silent failure this job is most likely to have,
which is a Stripe key that stopped working.
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

    # ── What this job refuses to run without ──────────────────────────
    #
    # Both checks are BELOW the `--verify` branch's needs on purpose:
    # `--verify` only reads the database, and demanding a Stripe key to
    # answer "am I pointed at the right database" makes the first check
    # an owner runs the hardest one to run.
    if not verify_only:
        # The date and the amount come from Stripe. Without a key there
        # is no authority to read, and a job that ran anyway would either
        # send nothing (looking healthy) or send something it made up.
        if not (os.getenv("STRIPE_SECRET_KEY") or "").strip():
            print("STRIPE_SECRET_KEY is not set — the charge date and amount "
                  "come from Stripe, and this job will not invent them",
                  file=sys.stderr)
            return 1

        # The cancel link. Unset, `billing_url()` produced a RELATIVE
        # path, which in an email client is a dead link — so the notice
        # would arrive correct in every detail and fail at the one action
        # it exists to enable.
        if not (os.getenv("FRONTEND_URL") or "").strip():
            print("FRONTEND_URL is not set — every notice would carry a "
                  "relative cancel link, which is a dead link in an email",
                  file=sys.stderr)
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
            # A dry run exists to check the configuration BEFORE the
            # first real one, so a Stripe that will not answer has to
            # fail it too. Sends are refused by design here, so
            # `failed` is not consulted — only `unreachable`, which is
            # the wrong-API-key case this check is for.
            return 1 if report.unreachable else 0

        report = renewal_notice.run(conn, stripe, today)
        conn.commit()
        print(json.dumps(report.as_dict(), indent=2, default=str))

        # A failed send is a failed run — and so is a Stripe that would
        # not answer. The rows record a failed send either way, but a
        # cron that exits 0 while nobody was told is the shape this
        # ticket exists to remove, and a wrong API key produces exactly
        # that: every subscription skipped with an honest reason, and a
        # green run every day forever.
        return 1 if (report.failed or report.unreachable) else 0
    except Exception as exc:
        conn.rollback()
        print(f"renewal notices failed: {exc}", file=sys.stderr)
        return 1
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
