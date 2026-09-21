"""API-CONFIRM — expiry of unapproved drafts and purge of approver contact.

Same sweep pattern as signer-contact purge: no scheduler in this
deployment, so one function with two invocations (optional cron script +
throttled in-request sweep). The work is different. Signing purge NULLs
phone numbers on finished signings. This drops preview bytes on expired
or rejected drafts, and NULLs approver email after CONTACT_RETENTION_DAYS.

The name and role survive. A name is not contact, and the provenance
record of who approved must outlive our ability to reach them — otherwise
a purge rewrites history into "somebody with the link."

═══ AND THE ONE CLASS OF ROW THAT IS DELETED ENTIRELY, NAME INCLUDED ═══

`demo_kind = 'try'` rows are deleted outright after DEMO_RETENTION_HOURS.
That reads as a contradiction of the paragraph above, and it is not — the
reconciliation is recorded here rather than in the demo code, because
THIS is the rule a future reader will think is being broken.

**The survival rule exists because an INSTRUMENT's provenance must
outlive our ability to reach the person who approved it.** A
`SAMPLE — NOT FOR RECORDING` draft created by a marketing page never
becomes an instrument: it is watermarked in its own bytes (every render
under a `dp_test_` key is — see `services/sample_watermark.py`), it is
never recorded, and nobody will ever ask who approved it. There is no
provenance to preserve, so the rule's premise does not hold. Deleting it
rewrites no history.

What remains true, and is why the name goes: a prospect typed their real
name into a public demo. Keeping it would make a sandbox a quiet store of
people who once looked at the product.

**THE PREDICATE IS EXACT EQUALITY ON A MARKER WRITTEN AT INSERT**, never
a heuristic over sample APNs or approver names. A delete that identifies
its targets by guessing is an irreversible data operation against the
same table real deeds live in, and the only safe version of it is one
that cannot match a row nobody marked. `demo_kind IS NOT NULL` would
have been the loose version; it is deliberately not that, which is also
what makes the TRY-8 fixture (`demo_kind = 'fixture'`) exempt BY
CONSTRUCTION rather than by an extra clause somebody could drop.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from services.api_confirm import STATUS_EXPIRED, STATUS_PENDING, STATUS_REJECTED
from services.signing_loop import CONTACT_RETENTION_DAYS

JOB_NAME = "api_confirm_lifecycle"
SWEEP_INTERVAL_SECONDS = 3600

# Demo drafts live a few hours — long enough that a prospect who walks
# away mid-demo can come back to the same tab, short enough that the
# sandbox is not a register of who visited.
DEMO_RETENTION_HOURS = 3

# The ONLY value this sweep deletes. `fixture` rows (TRY-8's permanently
# expired token) carry a different value and are therefore out of reach
# of the predicate rather than excluded by it.
DEMO_KIND_TRY = "try"
DEMO_KIND_FIXTURE = "fixture"

EXPIRE_SQL = """
    UPDATE api_deeds
       SET status = %s,
           preview_pdf_data = NULL
     WHERE status = %s
       AND confirmation_expires_at IS NOT NULL
       AND confirmation_expires_at < %s
    RETURNING id
"""

# Rejected drafts also drop preview bytes immediately on reject. This
# sweep is the backstop for any row that was rejected before that write
# existed, or whose preview lingered.
REJECTED_PREVIEW_SQL = """
    UPDATE api_deeds
       SET preview_pdf_data = NULL
     WHERE status = %s
       AND preview_pdf_data IS NOT NULL
    RETURNING id
"""

PURGE_EMAIL_SQL = """
    UPDATE api_deeds
       SET approver_email = NULL,
           contact_purged_at = now()
     WHERE contact_purged_at IS NULL
       AND approver_email IS NOT NULL
       AND (
            approved_at < %s
         OR rejected_at < %s
         OR (status = %s AND confirmation_expires_at < %s)
       )
    RETURNING id
"""


DELETE_DEMO_SQL = """
    DELETE FROM api_deeds
     WHERE demo_kind = %s
       AND created_at < %s
    RETURNING id
"""


def delete_demo_drafts(conn, *, older_than_hours: int = DEMO_RETENTION_HOURS,
                       now: Optional[datetime] = None) -> int:
    """Delete `/try` drafts outright — row, name, bytes, all of it.

    See the module header for why this does not contradict the survival
    rule two paragraphs above it. The predicate is exact equality on
    `demo_kind`, so a row nobody marked cannot be reached by it, and the
    permanently expired fixture carries a different marker.
    """
    now = now or datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=older_than_hours)
    with conn.cursor() as cur:
        cur.execute(DELETE_DEMO_SQL, (DEMO_KIND_TRY, cutoff))
        rows = cur.fetchall() or []
    return len(rows)


def expire_unapproved_drafts(conn, *, now: Optional[datetime] = None) -> int:
    """Drop preview bytes on drafts past their 7-day window.

    Idempotent: a second run finds nothing once preview_pdf_data is NULL
    and status is expired. Does not commit.
    """
    now = now or datetime.now(timezone.utc)
    with conn.cursor() as cur:
        cur.execute(EXPIRE_SQL, (STATUS_EXPIRED, STATUS_PENDING, now))
        expired = cur.fetchall() or []
        cur.execute(REJECTED_PREVIEW_SQL, (STATUS_REJECTED,))
        rejected = cur.fetchall() or []
    return len(expired) + len(rejected)


def purge_approver_email(conn, *, older_than_days: int = CONTACT_RETENTION_DAYS,
                         now: Optional[datetime] = None) -> int:
    """NULL approver email. Name and role stay.

    Clock starts at the finished event (approve / reject / expiry), not
    at create — a pending draft must keep the named-for-record email
    until the draft is done.
    """
    now = now or datetime.now(timezone.utc)
    cutoff = now - timedelta(days=older_than_days)
    with conn.cursor() as cur:
        cur.execute(PURGE_EMAIL_SQL, (cutoff, cutoff, STATUS_EXPIRED, cutoff))
        rows = cur.fetchall() or []
    return len(rows)


def run_lifecycle(conn, *, now: Optional[datetime] = None) -> Dict[str, int]:
    expired = expire_unapproved_drafts(conn, now=now)
    purged = purge_approver_email(conn, now=now)
    demo = delete_demo_drafts(conn, now=now)
    return {"expired_or_cleared": expired, "emails_purged": purged,
            "demo_deleted": demo}


def sweep_if_due(conn, *, interval_seconds: int = SWEEP_INTERVAL_SECONDS,
                 now: Optional[datetime] = None) -> Optional[Dict[str, int]]:
    """Run at most once per interval across workers. Never raises."""
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
                return None
            last = row["last_run_at"] if isinstance(row, dict) else row[0]
            if last is not None and (now - last).total_seconds() < interval_seconds:
                return None

            result = run_lifecycle(conn, now=now)
            cur.execute(
                "UPDATE system_jobs SET last_run_at = %s, last_result = %s, "
                "updated_at = now() WHERE job_name = %s",
                (now, f"expired {result['expired_or_cleared']}, "
                      f"purged {result['emails_purged']}, "
                      f"demo deleted {result['demo_deleted']}", JOB_NAME))
        conn.commit()
        return result
    except Exception as e:
        try:
            conn.rollback()
        except Exception:
            pass
        print(f"[api-confirm] sweep failed (non-blocking): "
              f"{type(e).__name__}: {str(e)[:200]}")
        return None


def purge_status(conn) -> Dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute("SELECT last_run_at, last_result FROM system_jobs "
                    "WHERE job_name = %s", (JOB_NAME,))
        job = cur.fetchone()
        cutoff = datetime.now(timezone.utc) - timedelta(days=CONTACT_RETENTION_DAYS)
        cur.execute(
            """SELECT count(*) AS n FROM api_deeds
                WHERE contact_purged_at IS NULL
                  AND approver_email IS NOT NULL
                  AND (
                       approved_at < %s
                    OR rejected_at < %s
                    OR (status = %s AND confirmation_expires_at < %s)
                  )""",
            (cutoff, cutoff, STATUS_EXPIRED, cutoff))
        overdue = cur.fetchone()
    return {
        "job": JOB_NAME,
        "retention_days": CONTACT_RETENTION_DAYS,
        "last_run_at": (job or {}).get("last_run_at") if job else None,
        "last_result": (job or {}).get("last_result") if job else None,
        "overdue": (overdue or {}).get("n", 0) if overdue else 0,
    }
