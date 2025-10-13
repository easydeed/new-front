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
            "INSERT INTO user_notifications (user_id, notification_id, read) VALUES (%s, %s, FALSE) RETURNING id",
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

def render_share_email(recipient_name: str, owner_name: str, deed_type: str, share_link: str) -> str:
    """Render HTML email for deed sharing notification."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }}
            .container {{ max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
            .header {{ background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 40px 30px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 28px; font-weight: 700; }}
            .content {{ padding: 40px 30px; }}
            .button {{ display: inline-block; background: #f5576c; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }}
            .button:hover {{ background: #e14458; }}
            .footer {{ background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; }}
            .share-icon {{ font-size: 48px; margin-bottom: 10px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="share-icon">🤝</div>
                <h1>Deed Shared With You</h1>
            </div>
            <div class="content">
                <p>Hi {recipient_name},</p>
                <p><strong>{owner_name}</strong> has shared a deed with you for review and collaboration.</p>
                
                <p><strong>Deed Type:</strong> {deed_type}</p>
                
                <p>Click the button below to view the deed and provide your input:</p>
                
                <center>
                    <a href="{share_link}" class="button">View Shared Deed</a>
                </center>
                
                <p style="margin-top: 30px; color: #666; font-size: 14px;">
                    This link is secure and only accessible to invited collaborators.
                </p>
            </div>
            <div class="footer">
                <p><strong>DeedPro</strong> - Professional Deed Preparation</p>
            </div>
        </div>
    </body>
    </html>
    """

def send_share_notification(recipient_email: str, recipient_name: str, owner_name: str, deed_type: str, share_link: str) -> bool:
    """Send deed sharing notification email."""
    subject = f"🤝 {owner_name} shared a deed with you"
    html = render_share_email(recipient_name, owner_name, deed_type, share_link)
    return send_email(recipient_email, subject, html)
