"""
Phase 7: Notifications System
Handles email notifications for deed completion, sharing, and admin alerts.
"""
import os
from typing import Optional
from utils.email import send_email


# ============================================================================
# EMAIL TEMPLATES
# ============================================================================

def get_deed_completion_template(user_name: str, deed_type: str, deed_id: int, pdf_url: Optional[str] = None) -> str:
    """HTML email template for deed completion"""
    app_url = os.getenv('FRONTEND_URL', 'https://deedpro-frontend-new.vercel.app')
    
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
            .deed-card {{ background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px; }}
            .deed-card h2 {{ margin: 0 0 10px 0; color: #333; font-size: 18px; }}
            .deed-card p {{ margin: 5px 0; color: #666; }}
            .button {{ display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }}
            .button:hover {{ background: #5568d3; }}
            .footer {{ background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; }}
            .success-icon {{ font-size: 48px; margin-bottom: 10px; }}
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
                <p>Great news! Your deed has been successfully created and saved to your account.</p>
                
                <div class="deed-card">
                    <h2>{deed_type.replace('_', ' ').title()}</h2>
                    <p><strong>Deed ID:</strong> #{deed_id}</p>
                    <p><strong>Status:</strong> Completed</p>
                </div>
                
                <p><strong>What's Next?</strong></p>
                <ul>
                    <li>View your deed in the dashboard</li>
                    <li>Download the PDF for your records</li>
                    <li>Share with collaborators if needed</li>
                </ul>
                
                <center>
                    <a href="{app_url}/past-deeds" class="button">View My Deeds</a>
                </center>
                
                <p style="margin-top: 30px; color: #666; font-size: 14px;">
                    Need help? Reply to this email or visit our <a href="{app_url}/support" style="color: #667eea;">support center</a>.
                </p>
            </div>
            <div class="footer">
                <p><strong>DeedPro</strong> - Professional Deed Preparation</p>
                <p>This is an automated notification. Please do not reply directly to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """


def get_share_notification_template(owner_name: str, recipient_name: str, deed_type: str, share_link: str) -> str:
    """HTML email template for deed sharing"""
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
                
                <p><strong>Deed Type:</strong> {deed_type.replace('_', ' ').title()}</p>
                
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


def get_admin_notification_template(event_type: str, details: dict) -> str:
    """HTML email template for admin notifications"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }}
            .container {{ max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
            .header {{ background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: #333; padding: 40px 30px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 24px; font-weight: 700; }}
            .content {{ padding: 40px 30px; }}
            .detail-box {{ background: #f8f9fa; padding: 15px; margin: 15px 0; border-radius: 4px; }}
            .detail-box p {{ margin: 5px 0; }}
            .footer {{ background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔔 Admin Notification</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">{event_type}</p>
            </div>
            <div class="content">
                <div class="detail-box">
                    {"".join([f"<p><strong>{k}:</strong> {v}</p>" for k, v in details.items()])}
                </div>
            </div>
            <div class="footer">
                <p><strong>DeedPro Admin</strong></p>
            </div>
        </div>
    </body>
    </html>
    """


# ============================================================================
# NOTIFICATION FUNCTIONS
# ============================================================================

def send_deed_completion_notification(user_email: str, user_name: str, deed_type: str, deed_id: int, pdf_url: Optional[str] = None) -> bool:
    """
    Send deed completion notification to user.
    
    Args:
        user_email: User's email address
        user_name: User's full name
        deed_type: Type of deed (e.g., 'grant_deed', 'quitclaim')
        deed_id: ID of the created deed
        pdf_url: Optional URL to PDF
    
    Returns:
        bool: True if email sent successfully
    """
    subject = f"✅ Your {deed_type.replace('_', ' ').title()} is Ready!"
    body = get_deed_completion_template(user_name, deed_type, deed_id, pdf_url)
    
    return send_email(user_email, subject, body)


def send_share_notification(recipient_email: str, recipient_name: str, owner_name: str, deed_type: str, share_link: str) -> bool:
    """
    Send deed sharing notification to recipient.
    
    Args:
        recipient_email: Recipient's email address
        recipient_name: Recipient's name
        owner_name: Name of the person sharing the deed
        deed_type: Type of deed being shared
        share_link: URL to view the shared deed
    
    Returns:
        bool: True if email sent successfully
    """
    subject = f"🤝 {owner_name} shared a deed with you"
    body = get_share_notification_template(owner_name, recipient_name, deed_type, share_link)
    
    return send_email(recipient_email, subject, body)


def send_admin_notification(admin_email: str, event_type: str, details: dict) -> bool:
    """
    Send admin notification for system events.
    
    Args:
        admin_email: Admin's email address
        event_type: Type of event (e.g., 'New User Registration', 'Support Request')
        details: Dictionary of event details
    
    Returns:
        bool: True if email sent successfully
    """
    subject = f"🔔 Admin Alert: {event_type}"
    body = get_admin_notification_template(event_type, details)
    
    return send_email(admin_email, subject, body)


# ============================================================================
# CONVENIENCE FUNCTIONS
# ============================================================================

def notify_new_user_registration(admin_email: str, user_email: str, user_name: str, user_id: int) -> bool:
    """Notify admin of new user registration"""
    return send_admin_notification(
        admin_email,
        "New User Registration",
        {
            "User ID": user_id,
            "Name": user_name,
            "Email": user_email,
            "Registration Time": "Just now"
        }
    )


def notify_support_request(admin_email: str, user_email: str, user_name: str, message: str) -> bool:
    """Notify admin of support request"""
    return send_admin_notification(
        admin_email,
        "Support Request",
        {
            "From": f"{user_name} ({user_email})",
            "Message": message[:200] + ("..." if len(message) > 200 else "")
        }
    )

