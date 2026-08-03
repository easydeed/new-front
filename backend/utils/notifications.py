"""E1 — notification orchestration: templates + the ONE honest transport.

Every send goes through utils.email.send_email_with_reason and returns
(ok, reason) — the boolean-swallow paths died in E1 (an approval email
that failed used to vanish without a why; the S1 reason machinery now
covers every event). Templates live in utils.email_templates; this
module wires event data to them and creates in-app records where the
event must be unlosable regardless of email transport.
"""
from typing import Optional, Tuple

from utils import email_templates
from utils.email import send_email_with_reason

SendResult = Tuple[bool, Optional[str]]


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
    subject, html, text = email_templates.share_invite(
        recipient_name, owner_name, deed_type, property_address, share_link, expires_at)
    return send_email_with_reason(recipient_email, subject, html, text)


def send_share_reminder_with_reason(recipient_email: str, recipient_name: str,
                                    owner_name: str, deed_type: str,
                                    property_address: Optional[str], share_link: str,
                                    hours_remaining: int) -> SendResult:
    subject, html, text = email_templates.share_reminder(
        recipient_name, owner_name, deed_type, property_address, share_link, hours_remaining)
    return send_email_with_reason(recipient_email, subject, html, text)


def send_share_approved_with_reason(owner_email: str, owner_name: str, deed_type: str,
                                    property_address: Optional[str], reviewer_email: str,
                                    comments: Optional[str], view_link: str) -> SendResult:
    subject, html, text = email_templates.share_approved(
        owner_name, deed_type, property_address, reviewer_email, comments, view_link)
    return send_email_with_reason(owner_email, subject, html, text)


def send_share_rejected_with_reason(owner_email: str, owner_name: str, deed_type: str,
                                    property_address: Optional[str], reviewer_email: str,
                                    comments: Optional[str], view_link: str) -> SendResult:
    subject, html, text = email_templates.share_rejected(
        owner_name, deed_type, property_address, reviewer_email, comments, view_link)
    return send_email_with_reason(owner_email, subject, html, text)


def send_deed_completion_notification(user_email: str, user_name: str, deed_type: str,
                                      property_address: str, deed_id: int,
                                      preview_link: str) -> SendResult:
    subject, html, text = email_templates.deed_completed(
        user_name, deed_type, property_address, deed_id, preview_link)
    return send_email_with_reason(user_email, subject, html, text)


def send_password_reset_with_reason(user_email: str, full_name: str,
                                    reset_url: str, ttl_hours: int) -> SendResult:
    subject, html, text = email_templates.password_reset(full_name, reset_url, ttl_hours)
    return send_email_with_reason(user_email, subject, html, text)


def send_verify_email_with_reason(user_email: str, full_name: str,
                                  verify_url: str) -> SendResult:
    subject, html, text = email_templates.verify_email(full_name, verify_url)
    return send_email_with_reason(user_email, subject, html, text)


def send_password_changed_with_reason(user_email: str, full_name: str) -> SendResult:
    subject, html, text = email_templates.password_changed(full_name)
    return send_email_with_reason(user_email, subject, html, text)


def send_welcome_with_reason(user_email: str, full_name: str) -> SendResult:
    subject, html, text = email_templates.welcome(full_name)
    return send_email_with_reason(user_email, subject, html, text)


def notify_new_user_registration(admin_email: str, user_email: str, user_name: str,
                                 user_id: int) -> SendResult:
    """E1 fix (owner-ruled): this function was imported on every signup
    since Phase 7 but never existed — the ImportError was swallowed, so
    the admin ops ping silently never sent. It exists now, minimal by
    ruling: registrant email + timestamp, nothing more (user_name is
    accepted for call-site compatibility and deliberately unused)."""
    subject, html, text = email_templates.admin_new_user(user_email, user_id)
    return send_email_with_reason(admin_email, subject, html, text)
