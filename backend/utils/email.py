import os
from typing import Optional

def email_configured() -> bool:
    """True when an email provider is actually wired up."""
    return bool(os.getenv('SENDGRID_API_KEY'))


def send_email(to: str, subject: str, body: str) -> bool:
    """Send email via SendGrid if configured; otherwise log and report failure.

    Invariant #4 (doctrine sweep): returning True while only printing to the
    console is a fabricated success — it let /users/forgot-password tell
    users "reset link sent" with no email infrastructure configured at all.
    Callers that treat email as optional already handle False.
    """
    api_key = os.getenv('SENDGRID_API_KEY')
    from_email = os.getenv('SENDGRID_FROM_EMAIL') or os.getenv('FROM_EMAIL', 'noreply@deedpro.com')
    if not api_key:
        print(f"[email:unconfigured] Would send To={to} Subject={subject} — SENDGRID_API_KEY not set")
        return False
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
