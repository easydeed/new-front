"""E1 — the transactional email set, one branded base, ten events.

Every renderer returns (subject, html, text): subject per the locked
convention (FACT + short address, no emoji), html on the 600px
table-based base (email clients, not browsers), text as the
plain-text alternative part (deliverability).

Doctrine constraints (owner-ruled, pinned in test_email_system.py):
- Street address only — never legal descriptions or NPI in a body;
  authenticated users are LINKED to the record instead.
- No legal-outcome claims (the recording-readiness sentence was removed
  for cause), no fabricated security claims (the bearer-link
  accessibility sentence was removed for cause and is pinned against
  recurrence), no celebratory editorializing — facts, plainly. The
  literal banned strings live in test_email_system.py::FORBIDDEN so this
  file can never quote them back into existence.
- The doctrinal colors are never decoration: amber and the
  suggest/confirm violet mean things in the product; emails use brand
  purple sparingly (header rule, buttons) and ink text only.
"""
import html as _html
import os
from datetime import datetime
from typing import Optional, Tuple

BRAND = "#7C4DFF"
INK = "#1F2B37"


def _frontend_url() -> str:
    return os.getenv("FRONTEND_URL", "https://deedpro-frontend-new.vercel.app")


def _logo_url() -> str:
    return f"{_frontend_url()}/email/deedpro-lockup@2x.png"


def _esc(v) -> str:
    return _html.escape(str(v)) if v is not None else ""


def _base(preheader: str, content_html: str, deed_related: bool) -> str:
    """The 600px table-based branded shell. Inline CSS only; web-safe
    font stack (email clients won't load the webfont — stack, don't
    embed). Brand purple: header rule + buttons only."""
    legal_note = (
        '<p style="margin:8px 0 0 0;font-size:12px;line-height:18px;color:#8a94a0;">'
        "DeedPro prepares recorder-formatted documents at your direction. "
        "Nothing in this email is legal advice.</p>"
        if deed_related else ""
    )
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">{_esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;">
    <tr><td align="center" style="padding:32px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:10px;overflow:hidden;">
        <tr><td style="padding:28px 36px 20px 36px;border-bottom:3px solid {BRAND};">
          <img src="{_logo_url()}" width="159" height="37" alt="DeedPro" style="display:block;border:0;">
        </td></tr>
        <tr><td style="padding:28px 36px 8px 36px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:{INK};font-size:15px;line-height:23px;">
{content_html}
        </td></tr>
        <tr><td style="padding:20px 36px 28px 36px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="border-top:1px solid #e6e9ed;padding-top:16px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              <p style="margin:0;font-size:12px;line-height:18px;color:#8a94a0;">
                DeedPro &middot; <a href="{_frontend_url()}" style="color:#8a94a0;">deedpro</a>
              </p>{legal_note}
            </td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _button(href: str, label: str) -> str:
    return (
        f'<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;"><tr>'
        f'<td style="background-color:{BRAND};border-radius:8px;">'
        f'<a href="{_esc(href)}" style="display:inline-block;padding:12px 24px;'
        f'font-family:-apple-system,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;'
        f'font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">{_esc(label)}</a>'
        f"</td></tr></table>"
    )


def _facts(rows) -> str:
    cells = "".join(
        f'<tr><td style="padding:4px 14px 4px 0;font-size:13px;color:#8a94a0;white-space:nowrap;">{_esc(k)}</td>'
        f'<td style="padding:4px 0;font-size:14px;color:{INK};font-weight:600;">{_esc(v)}</td></tr>'
        for k, v in rows if v
    )
    return (
        '<table role="presentation" cellpadding="0" cellspacing="0" '
        'style="margin:16px 0;padding:0;background-color:#f7f8fa;border-radius:8px;width:100%;">'
        f'<tr><td style="padding:14px 18px;"><table role="presentation" cellpadding="0" cellspacing="0" '
        f'style="font-family:-apple-system,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;">{cells}</table>'
        "</td></tr></table>"
    )


def _p(s: str) -> str:
    return f'<p style="margin:0 0 14px 0;">{s}</p>'


Rendered = Tuple[str, str, str]  # (subject, html, text)


def _short_addr(property_address: Optional[str]) -> str:
    """Street-address level only — the first comma segment."""
    if not property_address:
        return ""
    return str(property_address).split(",")[0].strip()


# ── The ten events ────────────────────────────────────────────────


def share_invite(recipient_name, owner_name, deed_type, property_address,
                 share_link, expires_at: Optional[str]) -> Rendered:
    addr = _short_addr(property_address)
    subject = f"Review requested — {addr}" if addr else "Deed review requested"
    expiry = expires_at or ""
    content = (
        _p(f"Hi {_esc(recipient_name) or 'there'},")
        + _p(f"<strong>{_esc(owner_name)}</strong> has shared a deed with you on DeedPro "
             "and is asking you to review it and approve or request changes.")
        + _facts([("Document", deed_type), ("Property", addr), ("Shared by", owner_name),
                  ("Link expires", expiry)])
        + _button(share_link, "Review the document")
        + _p('<span style="font-size:13px;color:#8a94a0;">Anyone with this link can open it '
             "until it expires — forward it only to people who should see the document.</span>")
    )
    text = (
        f"{owner_name} has shared a deed with you on DeedPro and is asking you to review it.\n\n"
        f"Document: {deed_type}\nProperty: {addr}\nLink expires: {expiry}\n\n"
        f"Review: {share_link}\n\n"
        "Anyone with this link can open it until it expires."
    )
    return subject, _base(f"{owner_name} asked you to review a {deed_type}", content, True), text


def share_reminder(recipient_name, owner_name, deed_type, property_address,
                   share_link, hours_remaining) -> Rendered:
    addr = _short_addr(property_address)
    subject = f"Reminder: review pending — {addr}" if addr else "Reminder: deed review pending"
    content = (
        _p(f"Hi {_esc(recipient_name) or 'there'},")
        + _p(f"A reminder that <strong>{_esc(owner_name)}</strong> is waiting on your review.")
        + _facts([("Document", deed_type), ("Property", addr),
                  ("Link expires in", f"{hours_remaining} hours")])
        + _button(share_link, "Review the document")
        + _p('<span style="font-size:13px;color:#8a94a0;">If you did not expect this email, '
             "you can ignore it.</span>")
    )
    text = (
        f"Reminder: {owner_name} is waiting on your review.\n\n"
        f"Document: {deed_type}\nProperty: {addr}\nLink expires in: {hours_remaining} hours\n\n"
        f"Review: {share_link}"
    )
    return subject, _base(f"{owner_name} is waiting on your review", content, True), text


def share_approved(owner_name, deed_type, property_address, reviewer_email,
                   comments, view_link) -> Rendered:
    addr = _short_addr(property_address)
    subject = f"Approved — {addr}" if addr else "Your shared deed was approved"
    comment_block = ""
    if comments and str(comments).strip():
        comment_block = (
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">'
            f'<tr><td style="border-left:3px solid #e6e9ed;padding:6px 14px;font-size:14px;'
            f'color:{INK};white-space:pre-wrap;">{_esc(str(comments).strip())}</td></tr></table>'
        )
    content = (
        _p(f"Hi {_esc(owner_name)},")
        + _p(f"<strong>{_esc(reviewer_email)}</strong> approved the deed you shared.")
        + _facts([("Document", deed_type), ("Property", addr), ("Approved by", reviewer_email)])
        + comment_block
        + _button(view_link, "Open in DeedPro")
    )
    text = (
        f"{reviewer_email} approved the deed you shared.\n\n"
        f"Document: {deed_type}\nProperty: {addr}\n"
        + (f"\nComments:\n{str(comments).strip()}\n" if comments and str(comments).strip() else "")
        + f"\nOpen: {view_link}"
    )
    return subject, _base(f"{reviewer_email} approved — {addr}", content, True), text


def share_rejected(owner_name, deed_type, property_address, reviewer_email,
                   comments, view_link) -> Rendered:
    addr = _short_addr(property_address)
    subject = f"Changes requested — {addr}" if addr else "Changes requested on your shared deed"
    feedback = str(comments).strip() if comments and str(comments).strip() else "(no comments provided)"
    content = (
        _p(f"Hi {_esc(owner_name)},")
        + _p(f"<strong>{_esc(reviewer_email)}</strong> requested changes on the deed you shared. "
             "Their feedback, verbatim:")
        + f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">'
          f'<tr><td style="border-left:3px solid #e6e9ed;padding:6px 14px;font-size:14px;'
          f'color:{INK};white-space:pre-wrap;">{_esc(feedback)}</td></tr></table>'
        + _facts([("Document", deed_type), ("Property", addr), ("Requested by", reviewer_email)])
        + _button(view_link, "View feedback in DeedPro")
    )
    text = (
        f"{reviewer_email} requested changes on the deed you shared.\n\n"
        f"Feedback:\n{feedback}\n\n"
        f"Document: {deed_type}\nProperty: {addr}\n\nView: {view_link}"
    )
    return subject, _base(f"{reviewer_email} requested changes — {addr}", content, True), text


def deed_completed(user_name, deed_type, property_address, deed_id, detail_link) -> Rendered:
    addr = _short_addr(property_address)
    subject = f"Generated: {deed_type} — {addr}" if addr else f"Generated: {deed_type}"
    content = (
        _p(f"Hi {_esc(user_name)},")
        + _p("Your document was generated and stored. It is available to view, download, or share.")
        + _facts([("Document", deed_type), ("Property", addr), ("Document ID", f"#{deed_id}")])
        + _button(detail_link, "Open in DeedPro")
    )
    text = (
        f"Your document was generated and stored.\n\n"
        f"Document: {deed_type}\nProperty: {addr}\nDocument ID: #{deed_id}\n\nOpen: {detail_link}"
    )
    return subject, _base(f"{deed_type} generated — {addr}", content, True), text


def password_reset(full_name, reset_url, ttl_hours) -> Rendered:
    subject = "Reset your DeedPro password"
    content = (
        _p(f"Hi {_esc(full_name) or 'there'},")
        + _p("A password reset was requested for your account. If this was you, "
             "set a new password below.")
        + _button(reset_url, "Reset password")
        + _p(f'<span style="font-size:13px;color:#8a94a0;">This link expires in {int(ttl_hours)} '
             "hour(s). If you did not request a reset, you can ignore this email — "
             "your password is unchanged.</span>")
    )
    text = (
        "A password reset was requested for your DeedPro account.\n\n"
        f"Reset: {reset_url}\n\nThis link expires in {int(ttl_hours)} hour(s). "
        "If you did not request a reset, ignore this email."
    )
    return subject, _base("Set a new password for your DeedPro account", content, False), text


def verify_email(full_name, verify_url) -> Rendered:
    subject = "Verify your DeedPro email"
    content = (
        _p(f"Hi {_esc(full_name) or 'there'},")
        + _p("Confirm this address to finish setting up your DeedPro account.")
        + _button(verify_url, "Verify email")
    )
    text = f"Confirm your DeedPro email address:\n\n{verify_url}"
    return subject, _base("Confirm your email address", content, False), text


def password_changed(full_name) -> Rendered:
    subject = "Your DeedPro password was changed"
    content = (
        _p(f"Hi {_esc(full_name) or 'there'},")
        + _p(f"Your password was changed on {datetime.utcnow().strftime('%B %d, %Y at %H:%M UTC')}.")
        + _p('<span style="font-size:13px;color:#8a94a0;">If this was you, no action is needed. '
             "If it was not, reset your password immediately from the login page and contact "
             "support.</span>")
    )
    text = (
        "Your DeedPro password was changed. If this was you, no action is needed. "
        "If not, reset your password immediately from the login page."
    )
    return subject, _base("Password changed on your account", content, False), text


def welcome(full_name) -> Rendered:
    subject = "Welcome to DeedPro"
    url = _frontend_url()
    content = (
        _p(f"Hi {_esc(full_name) or 'there'},")
        + _p("Your account is ready. DeedPro prepares recorder-formatted California "
             "documents: you choose the instrument, confirm the facts, and generate "
             "a stored, hash-stamped PDF.")
        + _button(f"{url}/deed-builder", "Create your first document")
    )
    text = (
        "Your DeedPro account is ready.\n\n"
        f"Create your first document: {url}/deed-builder"
    )
    return subject, _base("Your account is ready", content, False), text


def admin_new_user(user_email, user_id, registered_at: Optional[str] = None) -> Rendered:
    """Ops ping (owner ruling): registrant email + timestamp — no more."""
    ts = registered_at or datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    subject = f"New DeedPro signup: {user_email}"
    content = _p("New registration.") + _facts([("Email", user_email), ("User ID", f"#{user_id}"), ("At", ts)])
    text = f"New DeedPro registration.\nEmail: {user_email}\nUser ID: #{user_id}\nAt: {ts}"
    return subject, _base(f"New signup: {user_email}", content, False), text
