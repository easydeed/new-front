"""P04 shared contact/clock judgment and owner-operated review preparation.

Automatic contact cleanup is limited to contact-free, versioned new records.
Legacy JSON, legacy columns and historical hashes require owner batch review.
"""
from datetime import datetime, timedelta, timezone
import re

from services.api_evidence import SNAPSHOT_VERSION
from services.signing_loop import CONTACT_RETENTION_DAYS

# One CTE powers both the aggregate report and the restricted purge. Missing
# or contradictory terminal facts are not replaced with creation/migration time.
FACTS_SQL = """
    WITH raw_contact_facts AS (
        SELECT deed_id, status, retention_hold, request_snapshot_version, contact_purged_at,
               request_snapshot_sha256 IS NOT NULL AS request_digest_present,
               approval_evidence_sha256 IS NOT NULL AS approval_digest_present,
               EXISTS (SELECT 1 FROM document_authenticity AS a
                        WHERE a.id = api_deeds.authenticity_id AND a.content_hash IS NOT NULL) AS legacy_digest_present,
               approver_email IS NOT NULL AS column_contact,
               COALESCE((request_data #> '{approver,email}') <> 'null'::jsonb, FALSE) AS json_contact,
               (COALESCE((approval_evidence #> '{request_snapshot,approver,email}') <> 'null'::jsonb, FALSE)
                OR COALESCE((approval_evidence #> '{claimed_approver,email}') <> 'null'::jsonb, FALSE)) AS evidence_contact,
               ((request_data IS NOT NULL AND jsonb_typeof(request_data) IS DISTINCT FROM 'object')
                OR (request_data ? 'approver' AND jsonb_typeof(request_data->'approver') IS DISTINCT FROM 'object')
                OR (approval_evidence IS NOT NULL AND jsonb_typeof(approval_evidence) IS DISTINCT FROM 'object')
                OR (approval_evidence ? 'request_snapshot' AND jsonb_typeof(approval_evidence->'request_snapshot') IS DISTINCT FROM 'object')
                OR ((approval_evidence->'request_snapshot') ? 'approver' AND jsonb_typeof(approval_evidence #> '{request_snapshot,approver}') IS DISTINCT FROM 'object')
                OR (approval_evidence ? 'claimed_approver' AND jsonb_typeof(approval_evidence->'claimed_approver') IS DISTINCT FROM 'object')) AS shape_review,
               CASE
                 WHEN status = 'completed' AND approved_at IS NOT NULL AND rejected_at IS NULL
                   THEN approved_at
                 WHEN status = 'rejected' AND rejected_at IS NOT NULL AND approved_at IS NULL
                   THEN rejected_at
                 WHEN status IN ('expired', 'pending_confirmation')
                      AND approved_at IS NULL AND rejected_at IS NULL
                      AND confirmation_expires_at <= %s THEN confirmation_expires_at
                 ELSE NULL
               END AS finished_at,
               COALESCE(status = 'pending_confirmation' AND approved_at IS NULL
                        AND rejected_at IS NULL AND confirmation_expires_at > %s, FALSE) AS active_pending
          FROM api_deeds
    ), contact_facts AS (
        SELECT *, (column_contact OR json_contact OR evidence_contact) AS has_contact,
               (request_snapshot_version IS DISTINCT FROM %s OR json_contact OR evidence_contact) AS needs_legacy_review,
               finished_at <= %s AS due
          FROM raw_contact_facts
    ), classified_contacts AS (
        SELECT *, (column_contact AND NOT json_contact AND NOT evidence_contact AND NOT COALESCE(shape_review, FALSE)
                   AND NOT retention_hold AND request_snapshot_version = %s AND due) AS eligible
          FROM contact_facts
    )
"""

PURGE_SQL = FACTS_SQL + """
    UPDATE api_deeds AS d
       SET approver_email = NULL, contact_purged_at = %s
      FROM classified_contacts AS f
     WHERE d.deed_id = f.deed_id
       AND f.eligible
    RETURNING d.id
"""

INVENTORY_SQL = FACTS_SQL + """
    SELECT
      COUNT(*) FILTER (WHERE status = 'completed') AS completed_records,
      COUNT(*) FILTER (WHERE status = 'pending_confirmation') AS pending_records,
      COUNT(*) FILTER (WHERE status = 'rejected') AS rejected_records,
      COUNT(*) FILTER (WHERE status = 'expired') AS expired_records,
      COUNT(*) FILTER (WHERE status IS NULL OR status NOT IN ('completed','pending_confirmation','rejected','expired')) AS other_status_records,
      COUNT(*) FILTER (WHERE request_digest_present) AS request_digest_records,
      COUNT(*) FILTER (WHERE approval_digest_present) AS approval_digest_records,
      COUNT(*) FILTER (WHERE legacy_digest_present) AS legacy_digest_records,
      COUNT(*) FILTER (WHERE shape_review) AS unclassified_snapshot_rows,
      COUNT(*) FILTER (WHERE has_contact) AS contact_rows,
      COUNT(*) FILTER (WHERE json_contact) AS json_contact_rows,
      COUNT(*) FILTER (WHERE evidence_contact) AS evidence_contact_rows,
      COUNT(*) FILTER (WHERE has_contact AND contact_purged_at IS NOT NULL) AS stamped_contact_remaining,
      COUNT(*) FILTER (WHERE has_contact AND retention_hold) AS held_contact_rows,
      COUNT(*) FILTER (WHERE has_contact AND finished_at IS NULL AND NOT active_pending) AS unknown_clock_rows,
      COUNT(*) FILTER (WHERE has_contact AND needs_legacy_review) AS legacy_transition_required,
      COUNT(*) FILTER (WHERE has_contact AND due) AS overdue,
      COUNT(*) FILTER (WHERE eligible) AS eligible_overdue
    FROM classified_contacts
"""


def event_now(value=None):
    value = value or datetime.now(timezone.utc)
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError("Retention event time must be timezone-aware")
    return value.astimezone(timezone.utc)


def inventory(conn, *, now=None):
    now = event_now(now)
    cutoff = now - timedelta(days=CONTACT_RETENTION_DAYS)
    with conn.cursor() as cur:
        cur.execute(INVENTORY_SQL, (now, now, SNAPSHOT_VERSION, cutoff, SNAPSHOT_VERSION))
        row = cur.fetchone()
    return {name: int(row[name] or 0) for name in (
        "completed_records", "pending_records", "rejected_records", "expired_records", "other_status_records",
        "request_digest_records", "approval_digest_records", "legacy_digest_records", "unclassified_snapshot_rows",
        "contact_rows", "json_contact_rows", "evidence_contact_rows", "stamped_contact_remaining", "held_contact_rows",
        "unknown_clock_rows", "legacy_transition_required", "overdue", "eligible_overdue",
    )}


def purge_new_contact(conn, *, older_than_days=CONTACT_RETENTION_DAYS, now=None):
    if older_than_days != CONTACT_RETENTION_DAYS:
        raise ValueError("Changing the approved contact window requires policy review")
    now = event_now(now)
    cutoff = now - timedelta(days=CONTACT_RETENTION_DAYS)
    with conn.cursor() as cur:
        cur.execute(PURGE_SQL, (now, now, SNAPSHOT_VERSION, cutoff, SNAPSHOT_VERSION, now))
        return len(cur.fetchall() or [])


def restore_review(conn, *, now=None):
    counts = inventory(conn, now=now)
    technical_pass = not any(counts[k] for k in (
        "overdue", "legacy_transition_required", "unknown_clock_rows", "stamped_contact_remaining", "unclassified_snapshot_rows",
    ))
    return {"counts": counts, "technical_contact_checks_passed": technical_pass,
            "ready_for_serving": False,
            "requires_owner_backup_and_hold_reconciliation": True}


def set_retention_hold(conn, deed_id, *, held: bool, operator_claim: str,
                       case_reference: str, now=None):
    """Owner-operated control, not actor identity verification. Caller commits.

    Opaque references only; no free-text contact dump in the hold audit trail.
    No HTTP surface can invoke this function. Production invocation stays held.
    """
    validate_record_id(deed_id)
    for value in (operator_claim, case_reference):
        if not isinstance(value, str) or not re.fullmatch(r"[A-Za-z0-9_.:/-]{1,120}", value):
            raise ValueError("Use bounded opaque operator/case references, not contact details")
    if not isinstance(held, bool):
        raise ValueError("Hold state must be an explicit boolean")
    now = event_now(now)
    with conn.cursor() as cur:
        cur.execute("SELECT retention_hold FROM api_deeds WHERE deed_id=%s FOR UPDATE", (deed_id,))
        row = cur.fetchone()
        if row is None:
            raise ValueError("Record not found")
        if row["retention_hold"] == held:
            return False
        cur.execute("UPDATE api_deeds SET retention_hold=%s WHERE deed_id=%s", (held, deed_id))
        cur.execute("""INSERT INTO api_contact_hold_events
                       (deed_id,held,operator_claim,case_reference,occurred_at)
                       VALUES (%s,%s,%s,%s,%s)""",
                    (deed_id, held, operator_claim, case_reference, now))
    return True


def validate_record_id(value):
    if not isinstance(value, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,50}", value):
        raise ValueError("Use a bounded opaque record identifier")
