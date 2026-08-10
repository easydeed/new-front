"""NOTARY2 — the signer-contact purge. A MECHANISM, not a discipline.

═══ THE PROBLEM THIS SOLVES, AND THE ONE IT DOES NOT ═══

§13.1 reversed "no signer contact anywhere" to "one purgeable row." The
word doing the work is PURGEABLE, and the owner's ruling was explicit:
the purge is a mechanism with a real test, not a note in a runbook.

**There is no scheduler in this deployment.** No cron service, no worker,
no APScheduler, no Celery — `render.yaml` defines web services only. That
was verified before this file was designed rather than assumed after.

So the purge is one function with two invocations:

1. `backend/scripts/purge_signer_contact.py` — ready for a Render Cron
   Job. Creating that service is a deploy-topology change, which is Tier
   3 and the owner's alone.
2. `sweep_if_due()` — a throttled in-request sweep, coordinating on a
   `system_jobs` row taken with `FOR UPDATE SKIP LOCKED`, so concurrent
   requests do not all run it and none of them waits.

**The honest limitation, stated here so it cannot be discovered later:**
the in-request sweep runs only when somebody uses the product. It LAGS
gracefully; it does not fail. That is fine for a retention practice and
it is NOT fine as the backing for a sentence in a privacy statement that
names a window. The moment ruling 1's privacy language says "90 days,"
the cron service stops being optional — which is exactly the owner's
ruling 3, recorded in the ledger as a hard requirement before the first
real signer email.

═══ WHAT SURVIVES THE PURGE ═══

`display_name` survives. A name is not contact information, and the
record of who agreed to what must outlive our ability to reach them —
otherwise a purge quietly rewrites history into "somebody agreed."
Responses, windows and the booking survive for the same reason.

`email` and `phone` are NULLed and `contact_purged_at` is stamped, so the
row can prove it was purged rather than merely being empty. An empty
column and a purged column look identical without that stamp, and "we
never had it" and "we deleted it on the 14th" are different answers to a
question somebody may one day ask.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

JOB_NAME = "signer_contact_purge"

# How often the in-request sweep may run. An hour is chosen against the
# cost of the query rather than the retention window — the deadline is 90
# days, so lag measured in hours is invisible, and a sweep that ran on
# every request would be a self-inflicted load problem.
SWEEP_INTERVAL_SECONDS = 3600

# The retention window. Imported from the loop module so the number lives
# in one place and matches whatever the privacy statement ends up saying.
from services.signing_loop import CONTACT_RETENTION_DAYS  # noqa: E402

# A request is "finished" when it can no longer change: booked and past,
# cancelled, or expired. The clock starts THERE rather than at creation —
# a signing booked for three months out must keep its contact details
# until it happens, and counting from creation would purge the addresses
# of an appointment that has not occurred yet.
_FINISHED_AT = """
    GREATEST(
        COALESCE(sr.cancelled_at, 'epoch'::timestamptz),
        COALESCE(sr.booked_at,    'epoch'::timestamptz),
        COALESCE(sr.expires_at,   'epoch'::timestamptz)
    )
"""

PURGE_SQL = f"""
    UPDATE signing_participants sp
       SET email = NULL,
           phone = NULL,
           contact_purged_at = now(),
           updated_at = now()
      FROM signing_requests sr
     WHERE sr.id = sp.signing_request_id
       AND sp.party_role = 'signer'
       AND sp.contact_purged_at IS NULL
       AND (sp.email IS NOT NULL OR sp.phone IS NOT NULL)
       AND {_FINISHED_AT} < %s
    RETURNING sp.id
"""


def purge_signer_contact(conn, *, older_than_days: int = CONTACT_RETENTION_DAYS,
                         now: Optional[datetime] = None) -> int:
    """NULL the contact details of signers on finished requests.

    Idempotent by construction: `contact_purged_at IS NULL` means a second
    run finds nothing, and the stamp is what makes that true rather than
    a convention about who calls this.

    Returns the number of rows purged. The caller commits — this function
    does not, so it can run inside a script's transaction or a sweep's
    without deciding for either.
    """
    now = now or datetime.now(timezone.utc)
    cutoff = now - timedelta(days=older_than_days)
    with conn.cursor() as cur:
        cur.execute(PURGE_SQL, (cutoff,))
        rows = cur.fetchall() or []
    return len(rows)


def sweep_if_due(conn, *, interval_seconds: int = SWEEP_INTERVAL_SECONDS,
                 now: Optional[datetime] = None) -> Optional[int]:
    """Run the purge at most once per interval, across all workers.

    Returns the purged count when this call did the work, or None when
    another call had it recently or is holding it right now.

    `FOR UPDATE SKIP LOCKED` rather than a plain lock, deliberately: a
    request that arrives while the sweep is running must not WAIT for it.
    The purge is housekeeping and the request is a person; housekeeping
    never blocks a person.

    Never raises. A failed sweep must not fail the request that happened
    to trigger it — but it prints loudly, because a purge that silently
    stops running is exactly the failure the ledger's cron requirement
    exists to make unnecessary.
    """
    now = now or datetime.now(timezone.utc)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO system_jobs (job_name, last_run_at) VALUES (%s, NULL) "
                "ON CONFLICT (job_name) DO NOTHING", (JOB_NAME,))
            cur.execute(
                "SELECT last_run_at FROM system_jobs WHERE job_name = %s "
                "FOR UPDATE SKIP LOCKED", (JOB_NAME,))
            row = cur.fetchone()
            if row is None:
                return None  # somebody else is sweeping; not our turn
            last = row["last_run_at"] if isinstance(row, dict) else row[0]
            if last is not None and (now - last).total_seconds() < interval_seconds:
                return None

            purged = purge_signer_contact(conn, now=now)
            cur.execute(
                "UPDATE system_jobs SET last_run_at = %s, last_result = %s, "
                "updated_at = now() WHERE job_name = %s",
                (now, f"purged {purged}", JOB_NAME))
        conn.commit()
        if purged:
            print(f"[signer-purge] purged contact details on {purged} participant rows")
        return purged
    except Exception as e:
        try:
            conn.rollback()
        except Exception:
            pass
        print(f"[signer-purge] ⚠️ sweep failed (non-blocking): "
              f"{type(e).__name__}: {str(e)[:200]}")
        return None


def purge_status(conn) -> Dict[str, Any]:
    """What an operator needs to answer "is this actually running?"

    Exists because the in-request sweep's weakness is invisibility: it
    either ran or it did not, and without this there is nothing to look
    at. If the cron service lands, this is also how it is verified.
    """
    with conn.cursor() as cur:
        cur.execute("SELECT last_run_at, last_result FROM system_jobs "
                    "WHERE job_name = %s", (JOB_NAME,))
        job = cur.fetchone()
        cur.execute(
            f"""SELECT count(*) AS n FROM signing_participants sp
                  JOIN signing_requests sr ON sr.id = sp.signing_request_id
                 WHERE sp.party_role = 'signer'
                   AND sp.contact_purged_at IS NULL
                   AND (sp.email IS NOT NULL OR sp.phone IS NOT NULL)
                   AND {_FINISHED_AT} < %s""",
            (datetime.now(timezone.utc) - timedelta(days=CONTACT_RETENTION_DAYS),))
        overdue = cur.fetchone()
    return {
        "job": JOB_NAME,
        "retention_days": CONTACT_RETENTION_DAYS,
        "last_run_at": (job or {}).get("last_run_at") if job else None,
        "last_result": (job or {}).get("last_result") if job else None,
        # The number that matters: rows that SHOULD be purged and are not.
        # Non-zero and rising means the sweep is not running.
        "overdue": (overdue or {}).get("n", 0) if overdue else 0,
    }
