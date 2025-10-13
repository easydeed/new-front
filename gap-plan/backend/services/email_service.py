# backend/services/email_service.py
import os

def send_email(to: str, subject: str, html: str) -> bool:
    """
    Minimal email sender.
    - If SENDGRID_API_KEY present, you can wire real sending here.
    - Otherwise we log to stdout to avoid breaking flows.
    """
    api_key = os.getenv("SENDGRID_API_KEY")
    if not api_key:
        print(f"[EMAIL:DRYRUN] To={to} | Subject={subject}\n{html}")
        return True
    try:
        import sendgrid
        from sendgrid.helpers.mail import Mail
        sg = sendgrid.SendGridAPIClient(api_key)
        message = Mail(
            from_email=os.getenv("FROM_EMAIL", "noreply@deedpro.com"),
            to_emails=to,
            subject=subject,
            html_content=html,
        )
        resp = sg.send(message)
        return resp.status_code in (200, 202)
    except Exception as e:
        print(f"[EMAIL:ERROR] {e}")
        return False
