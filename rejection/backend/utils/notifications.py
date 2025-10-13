import os
from typing import Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

try:
    # Optional SendGrid dependency; degrade gracefully
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail
except Exception:
    SendGridAPIClient = None
    Mail = None

def send_email(to: str, subject: str, html: str) -> bool:
    """Send email via SendGrid. If not configured, log and noop."""
    api_key = os.getenv("SENDGRID_API_KEY")
    from_email = os.getenv("FROM_EMAIL", "noreply@deedpro.com")

    if not api_key or not SendGridAPIClient or not Mail:
        logger.info("[email] No provider configured; noop send to %s", to)
        return False

    try:
        sg = SendGridAPIClient(api_key)
        msg = Mail(from_email=from_email, to_emails=to, subject=subject, html_content=html)
        res = sg.send(msg)
        ok = 200 <= res.status_code < 300
        logger.info("[email] sent=%s status=%s to=%s", ok, res.status_code, to)
        return ok
    except Exception as e:
        logger.exception("Email send failed: %s", e)
        return False

def create_notification(conn, user_id: int, ntype: str, title: str, message: str, link: Optional[str] = None) -> int:
    """Create a notification and user_notification row."""
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO notifications (type, title, message, link) VALUES (%s, %s, %s, %s) RETURNING id",
            (ntype, title, message, link)
        )
        nid = cur.fetchone()[0]
        cur.execute(
            "INSERT INTO user_notifications (user_id, notification_id, is_read) VALUES (%s, %s, FALSE) RETURNING id",
            (user_id, nid)
        )
        conn.commit()
        return nid

def render_rejection_email(property_addr: str, reviewer_email: str, comments: str, link: Optional[str]) -> str:
    return f"""
    <div style="font-family:system-ui,Segoe UI,Roboto,Arial">
      <h2>Deed Request Changes</h2>
      <p><strong>{reviewer_email}</strong> requested changes on the deed for <strong>{property_addr}</strong>.</p>
      <p><em>Feedback:</em></p>
      <blockquote style="border-left:4px solid #ccc;padding:8px 12px;margin:8px 0;white-space:pre-wrap">{comments or '(no comments provided)'}</blockquote>
      {f'<p><a href="{link}">View deed & feedback</a></p>' if link else ''}
      <p style="color:#666">This is an automated message from DeedPro.</p>
    </div>
    """
