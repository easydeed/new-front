"""E1 — notification orchestration: templates + the ONE honest transport.

Every send goes through utils.email.send_email_with_reason and returns
(ok, reason) — the boolean-swallow paths died in E1 (an approval email
that failed used to vanish without a why; the S1 reason machinery now
covers every event). Templates live in utils.email_templates; this
module wires event data to them and creates in-app records where the
event must be unlosable regardless of email transport.
"""
import json
from typing import Any, Dict, Optional, Tuple

from utils import email_templates
from utils.email import send_email_with_reason

SendResult = Tuple[bool, Optional[str]]

# The eleven template names, as they appear in email_log.template. Named
# here rather than derived from the function name so a refactor cannot
# silently rewrite history: the log is a record, and a record whose
# vocabulary drifts with the code is not one.
TEMPLATES = (
    "share_invite", "share_reminder", "share_approved", "share_rejected",
    "deed_completed", "password_reset", "verify_email", "password_changed",
    "welcome", "admin_api_key_request", "admin_new_user",
)


def _record(template: str, recipient: str, subject: str, ok: bool,
            reason: Optional[str], user_id: Optional[int],
            context: Optional[Dict[str, Any]]) -> None:
    """Persist one send ATTEMPT. Best-effort, and never raises.

    ADMIN3. Two constraints shape this function, and both are scars.

    1. IT MUST NOT BREAK THE SEND PATH. Recording an outcome is strictly
       less important than the thing it records; a logging failure that
       500s a registration would be a worse bug than the one being
       fixed. So every failure here is caught.

    2. IT MUST USE ITS OWN CONNECTION. This is the A1 metering defect,
       and it is worth being explicit about because it cost a deed. That
       code wrote a usage row inside the CALLER's transaction; the
       INSERT failed, Postgres put the transaction in the ABORTED state,
       and the caller's later `commit()` silently discarded a real deed
       while returning 200. A short-lived autocommit connection cannot
       do that to anybody.

    Constraint 1 does mean a swallowed error, which is doctrine §4's
    territory — so it is swallowed LOUDLY, with a prefix an operator can
    grep, and the admin surface states that it can only show attempts it
    managed to record. An honest gap beats a silent one.
    """
    conn = None
    try:
        from database import get_db_connection
        conn = get_db_connection()
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO email_log
                       (template, recipient, subject, status, reason, user_id, context)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (template[:64], recipient[:320], (subject or "")[:500],
                 "sent" if ok else "failed", (reason or None) if not ok else None,
                 user_id, json.dumps(context) if context else None),
            )
    except Exception as e:
        # Not silent: this is the one place the ledger can lose a row,
        # and it says so where an operator will find it.
        print(f"[email-log] ⚠️ could not record {template} to {recipient}: "
              f"{type(e).__name__}: {str(e)[:200]}")
    finally:
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass


def _send(template: str, recipient: str, rendered, *,
          user_id: Optional[int] = None,
          context: Optional[Dict[str, Any]] = None) -> SendResult:
    """Render → send → record. THE choke point.

    Every template goes through here, which is the whole design: the
    alternative was eleven call sites each remembering to persist their
    own outcome, and eleven places that must remember is a place that
    will be forgotten. A3 proved the pattern works and proved how it
    fails to spread — `api_key_requests` persisted its outcome because
    that table is a work queue somebody stares at, and the other ten
    never got it because nothing forced them to.
    """
    subject, html, text = rendered
    ok, reason = send_email_with_reason(recipient, subject, html, text)
    _record(template, recipient, subject, ok, reason, user_id, context)
    return ok, reason


def create_notification(conn, user_id: int, ntype: str, title: str, message: str, link: Optional[str] = None) -> int:
    """Create a notification and user_notification row (in-app)."""
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO notifications (type, title, message, link) VALUES (%s, %s, %s, %s) RETURNING id",
            (ntype, title, message, link)
        )
        nid = cur.fetchone()[0]
        cur.execute(
            "INSERT INTO user_notifications (user_id, notification_id, read) VALUES (%s, %s, FALSE) RETURNING id",
            (user_id, nid)
        )
        conn.commit()
        return nid


def send_share_notification_with_reason(recipient_email: str, recipient_name: str,
                                        owner_name: str, deed_type: str, share_link: str,
                                        property_address: Optional[str] = None,
                                        expires_at: Optional[str] = None) -> SendResult:
    return _send("share_invite", recipient_email, email_templates.share_invite(
        recipient_name, owner_name, deed_type, property_address, share_link, expires_at),
        context={"deed_type": deed_type, "property_address": property_address})


def send_share_reminder_with_reason(recipient_email: str, recipient_name: str,
                                    owner_name: str, deed_type: str,
                                    property_address: Optional[str], share_link: str,
                                    hours_remaining: int) -> SendResult:
    return _send("share_reminder", recipient_email, email_templates.share_reminder(
        recipient_name, owner_name, deed_type, property_address, share_link, hours_remaining),
        context={"deed_type": deed_type, "hours_remaining": hours_remaining})


def send_share_approved_with_reason(owner_email: str, owner_name: str, deed_type: str,
                                    property_address: Optional[str], reviewer_email: str,
                                    comments: Optional[str], view_link: str) -> SendResult:
    return _send("share_approved", owner_email, email_templates.share_approved(
        owner_name, deed_type, property_address, reviewer_email, comments, view_link),
        context={"deed_type": deed_type, "reviewer_email": reviewer_email})


def send_share_rejected_with_reason(owner_email: str, owner_name: str, deed_type: str,
                                    property_address: Optional[str], reviewer_email: str,
                                    comments: Optional[str], view_link: str) -> SendResult:
    return _send("share_rejected", owner_email, email_templates.share_rejected(
        owner_name, deed_type, property_address, reviewer_email, comments, view_link),
        context={"deed_type": deed_type, "reviewer_email": reviewer_email})


def send_deed_completion_notification(user_email: str, user_name: str, deed_type: str,
                                      property_address: str, deed_id: int,
                                      preview_link: str) -> SendResult:
    return _send("deed_completed", user_email, email_templates.deed_completed(
        user_name, deed_type, property_address, deed_id, preview_link),
        context={"deed_id": deed_id, "deed_type": deed_type})


def send_password_reset_with_reason(user_email: str, full_name: str,
                                    reset_url: str, ttl_hours: int) -> SendResult:
    return _send("password_reset", user_email,
                 email_templates.password_reset(full_name, reset_url, ttl_hours))


def send_verify_email_with_reason(user_email: str, full_name: str,
                                  verify_url: str) -> SendResult:
    return _send("verify_email", user_email,
                 email_templates.verify_email(full_name, verify_url))


def send_password_changed_with_reason(user_email: str, full_name: str) -> SendResult:
    return _send("password_changed", user_email,
                 email_templates.password_changed(full_name))


def send_welcome_with_reason(user_email: str, full_name: str) -> SendResult:
    return _send("welcome", user_email, email_templates.welcome(full_name))


def notify_api_key_request(admin_email: str, company_name: str, contact_email: str,
                           business_type: str, expected_volume: str, use_case: str,
                           request_id: int) -> SendResult:
    """A3: an API-access inquiry reached us. The row is already stored —
    this is the ping, and its reason is recorded on the row when it
    fails, so a lost email cannot lose the request."""
    return _send("admin_api_key_request", admin_email,
                 email_templates.admin_api_key_request(
                     company_name, contact_email, business_type,
                     expected_volume, use_case, request_id),
                 context={"request_id": request_id, "company_name": company_name})


def notify_new_user_registration(admin_email: str, user_email: str, user_name: str,
                                 user_id: int) -> SendResult:
    """E1 fix (owner-ruled): this function was imported on every signup
    since Phase 7 but never existed — the ImportError was swallowed, so
    the admin ops ping silently never sent. It exists now, minimal by
    ruling: registrant email + timestamp, nothing more (user_name is
    accepted for call-site compatibility and deliberately unused)."""
    return _send("admin_new_user", admin_email,
                 email_templates.admin_new_user(user_email, user_id),
                 user_id=user_id, context={"registrant": user_email})
