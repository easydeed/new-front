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
    # Check both variable names for backward compatibility
    from_email = os.getenv("SENDGRID_FROM_EMAIL") or os.getenv("FROM_EMAIL", "noreply@deedpro.com")

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

def render_deed_completion_email(user_name: str, deed_type: str, property_address: str, deed_id: int, preview_link: str) -> str:
    """Render HTML email for deed completion notification."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }}
            .container {{ max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 28px; font-weight: 700; }}
            .content {{ padding: 40px 30px; }}
            .button {{ display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }}
            .button:hover {{ background: #5568d3; }}
            .footer {{ background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; }}
            .success-icon {{ font-size: 48px; margin-bottom: 10px; }}
            .deed-details {{ background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="success-icon">✅</div>
                <h1>Your Deed is Ready!</h1>
            </div>
            <div class="content">
                <p>Hi {user_name},</p>
                <p>Great news! Your deed has been successfully created and is ready for review.</p>
                
                <div class="deed-details">
                    <p><strong>Deed Type:</strong> {deed_type}</p>
                    <p><strong>Property:</strong> {property_address}</p>
                    <p><strong>Deed ID:</strong> #{deed_id}</p>
                </div>
                
                <p>You can now view, download, or share your deed with collaborators.</p>
                
                <center>
                    <a href="{preview_link}" class="button">View Your Deed</a>
                </center>
                
                <p style="margin-top: 30px; color: #666; font-size: 14px;">
                    Your deed is securely stored and ready to download at any time.
                </p>
            </div>
            <div class="footer">
                <p><strong>DeedPro</strong> - Professional Deed Preparation</p>
            </div>
        </div>
    </body>
    </html>
    """

def send_deed_completion_notification(user_email: str, user_name: str, deed_type: str, property_address: str, deed_id: int, preview_link: str) -> bool:
    """Send deed completion notification email to user."""
    subject = f"✅ Your {deed_type} is Ready!"
    html = render_deed_completion_email(user_name, deed_type, property_address, deed_id, preview_link)
    return send_email(user_email, subject, html)


def log_share_activity(
    conn,
    share_id: int,
    activity_type: str,
    actor_email: str = None,
    metadata: dict = None
) -> Optional[int]:
    """
    Log sharing activity for audit trail.
    
    Args:
        conn: Database connection
        share_id: ID of the deed_share
        activity_type: One of 'created', 'viewed', 'reminded', 'approved', 'rejected', 'revoked', 'expired'
        actor_email: Email of the person performing the action
        metadata: Optional JSON metadata
    
    Returns:
        Activity log ID or None if failed
    """
    import json
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO deed_share_activity (share_id, activity_type, actor_email, metadata)
                VALUES (%s, %s, %s, %s)
                RETURNING id
            """, (share_id, activity_type, actor_email, json.dumps(metadata) if metadata else None))
            result = cur.fetchone()
            conn.commit()
            activity_id = result[0] if result else None
            logger.info(f"[Activity] Logged {activity_type} for share {share_id}")
            return activity_id
    except Exception as e:
        logger.warning(f"[Activity] Failed to log {activity_type} for share {share_id}: {e}")
        # Don't fail - activity logging is non-critical
        return None


def render_approval_email(owner_name: str, deed_type: str, property_address: str, reviewer_email: str, view_link: str) -> str:
    """Render HTML email for deed approval notification."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }}
            .container {{ max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
            .header {{ background: #10B981; color: white; padding: 30px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 24px; font-weight: 700; }}
            .content {{ padding: 30px; }}
            .button {{ display: inline-block; background: #7C4DFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; }}
            .footer {{ background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }}
            .details {{ background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✓ Deed Approved</h1>
            </div>
            <div class="content">
                <p>Hi {owner_name},</p>
                <p>Great news! Your deed has been approved and is ready for recording.</p>
                
                <div class="details">
                    <p><strong>Deed Type:</strong> {deed_type}</p>
                    <p><strong>Property:</strong> {property_address}</p>
                    <p><strong>Approved by:</strong> {reviewer_email}</p>
                </div>
                
                <center>
                    <a href="{view_link}" class="button">View Your Deed</a>
                </center>
            </div>
            <div class="footer">
                <p><strong>DeedPro</strong> - Professional Deed Preparation</p>
            </div>
        </div>
    </body>
    </html>
    """


def render_reminder_email(owner_name: str, deed_type: str, property_address: str, approval_url: str, hours_remaining: int) -> str:
    """Render HTML email for approval reminder."""
    urgency_color = "#e53e3e" if hours_remaining < 24 else "#d69e2e"
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }}
            .container {{ max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
            .header {{ background: #7C4DFF; color: white; padding: 30px; text-align: center; }}
            .content {{ padding: 30px; }}
            .button {{ display: inline-block; background: #7C4DFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; }}
            .footer {{ background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }}
            .details {{ background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0; }}
            .urgency {{ color: {urgency_color}; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>⏰ Review Reminder</h1>
            </div>
            <div class="content">
                <p>This is a reminder that <strong>{owner_name}</strong> is waiting for your review of a deed:</p>
                
                <div class="details">
                    <p><strong>Deed Type:</strong> {deed_type}</p>
                    <p><strong>Property:</strong> {property_address}</p>
                    <p class="urgency">⚠️ Expires in: {hours_remaining} hours</p>
                </div>
                
                <center>
                    <a href="{approval_url}" class="button">Review Deed Now</a>
                </center>
                
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                    If you did not expect this email, you can safely ignore it.
                </p>
            </div>
            <div class="footer">
                <p><strong>DeedPro</strong> - Professional Deed Preparation</p>
            </div>
        </div>
    </body>
    </html>
    """
