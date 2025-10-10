import os
from typing import Optional

def send_email(to: str, subject: str, body: str) -> bool:
    """Send email via SendGrid if configured; otherwise log to console for dev/test."""
    api_key = os.getenv('SENDGRID_API_KEY')
    from_email = os.getenv('SENDGRID_FROM_EMAIL') or os.getenv('FROM_EMAIL', 'noreply@deedpro.com')
    if not api_key:
        print(f"[email:dev] To={to}\nSubject={subject}\nBody={body[:200]}...")
        return True
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail
        msg = Mail(from_email=from_email, to_emails=to, subject=subject, html_content=body)
        sg = SendGridAPIClient(api_key)
        resp = sg.send(msg)
        return 200 <= resp.status_code < 300
    except Exception as e:
        print(f"[email:error] {e}")
        return False
