import os
from typing import Optional

def email_configured() -> bool:
    """True when an email provider is actually wired up."""
    return bool(os.getenv('SENDGRID_API_KEY'))


def send_email_with_reason(to: str, subject: str, body: str, text: Optional[str] = None):
    """Send email via SendGrid. Returns (ok, reason) — reason is None on
    success and a human-actionable string on failure.

    S1 follow-up: the old path swallowed every failure into a bare
    `print(e)` + False, so a valid key with an unverified sender looked
    identical to "not configured." Invariant #4 cuts both ways: a failure
    must carry its WHY. SendGrid's 4xx errors arrive as exceptions whose
    .body names the cause (e.g. "from address does not match a verified
    Sender Identity") — that body is the diagnosis and must survive.

    Env contract (names the deployment must use):
      SENDGRID_API_KEY    — the API key (required)
      SENDGRID_FROM_EMAIL — verified sender (falls back to FROM_EMAIL;
                            if NEITHER is set the hardcoded default
                            noreply@deedpro.com is used and named in any
                            failure, because an unverified default sender
                            is the classic silent 403).
    """
    api_key = os.getenv('SENDGRID_API_KEY')
    from_email = os.getenv('SENDGRID_FROM_EMAIL') or os.getenv('FROM_EMAIL') or ''
    from_defaulted = not from_email
    if from_defaulted:
        from_email = 'noreply@deedpro.com'
    if not api_key:
        reason = "SENDGRID_API_KEY is not set in the environment"
        print(f"[email:unconfigured] Would send To={to} Subject={subject} — {reason}")
        return False, reason
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail
        # E1: every send carries a plain-text alternative part when the
        # template provides one (deliverability — multipart/alternative).
        msg = Mail(from_email=from_email, to_emails=to, subject=subject,
                   html_content=body, plain_text_content=text)
        sg = SendGridAPIClient(api_key)
        resp = sg.send(msg)
        if 200 <= resp.status_code < 300:
            return True, None
        reason = f"SendGrid responded {resp.status_code} (from={from_email})"
        print(f"[email:error] {reason}")
        return False, reason
    except Exception as e:
        detail = getattr(e, 'body', None)
        if isinstance(detail, bytes):
            detail = detail.decode('utf-8', 'replace')
        reason = f"{type(e).__name__}: {str(detail or e)[:300]} (from={from_email}"
        reason += ", DEFAULT sender — set SENDGRID_FROM_EMAIL)" if from_defaulted else ")"
        print(f"[email:error] {reason}")
        return False, reason
