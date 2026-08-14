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


def payment_failed(full_name, amount_text, attempt_url) -> Rendered:
    """TRIAL1 — the renewal failed and the customer does not know.

    Deliberately NOT a threat. A card expires; that is the ordinary
    reason this fires, and the ordinary fix is thirty seconds in the
    billing portal. What it must NOT do is imply the account is already
    gone, because at this point it is not: Stripe retries, and the
    account is untouched until it stops.
    """
    subject = "Your DeedPro payment didn't go through"
    content = (
        _p(f"Hi {_esc(full_name) or 'there'},")
        + _p(f"We couldn't process your subscription payment{_esc(amount_text)}. "
             "This is usually an expired or replaced card.")
        + _p("Your account and your documents are unaffected. Update your "
             "card and the payment will retry automatically.")
        + _button(attempt_url, "Update payment method")
        + _p('<span style="font-size:13px;color:#8a94a0;">If you have already '
             "updated it, you can ignore this.</span>")
    )
    text = (
        f"We couldn't process your DeedPro subscription payment{amount_text}. "
        "This is usually an expired or replaced card. Your account and your "
        f"documents are unaffected. Update your card here: {attempt_url}"
    )
    return subject, _base("Payment failed — your account is unaffected", content, False), text


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


def admin_api_key_request(company_name, contact_email, business_type,
                          expected_volume, use_case, request_id,
                          requested_at: Optional[str] = None) -> Rendered:
    """A3 ops ping: someone asked for API access. Key issuance is manual
    by ruling, so this email is the start of a conversation, not a
    provisioning trigger — it carries what the owner needs to decide
    whether to have that conversation."""
    ts = requested_at or datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    subject = f"API access request: {company_name}"
    content = (
        _p("A platform asked about integrating with the DeedPro API.")
        + _facts([("Company", company_name), ("Contact", contact_email),
                  ("Business type", business_type), ("Expected volume", expected_volume),
                  ("Request", f"#{request_id}"), ("At", ts)])
        + (_p(f'<span style="color:#8a94a0;font-size:13px;">What they described:</span><br>{_esc(use_case)}')
           if use_case else "")
        + _button(f"{_frontend_url()}/admin?tab=api", "Open the API admin")
    )
    text = (
        f"API access request from {company_name}.\n\n"
        f"Contact: {contact_email}\nBusiness type: {business_type}\n"
        f"Expected volume: {expected_volume}\nRequest: #{request_id}\nAt: {ts}\n"
        + (f"\nWhat they described:\n{use_case}\n" if use_case else "")
        + f"\nAdmin: {_frontend_url()}/admin?tab=api"
    )
    return subject, _base(f"API access request from {company_name}", content, False), text


# FLOW1 item 6: `share_signing_request` — the notary-facing "here are
# the times I guessed at" email — is DELETED, not left declared. Its only
# caller was NOTARY1's create route, and that route is gone. The
# precedent is #155's `signer_invited`: a template nothing sends passes
# every rendering pin in the suite while being unreachable, which is the
# most convincing kind of dead code. The orphan pin in
# test_admin3_email_outcomes.py is what caught it.


# ── EMAIL2: the signing-request email, from the owner's design ────────
#
# `docs/design/email_signing_request.html` is the reference. What is
# adopted from it, and what is not, is recorded at each site rather than
# in a commit message nobody reads next year.


def _decision_block(when_text: str, fee: Optional[str], where: str,
                    signer_count: Optional[str] = None) -> str:
    """WHEN / FEE / WHERE — the three things a notary decides on.

    THE DESIGN'S CENTRAL IDEA, and its own comment gives the reason: a
    notary reading an assignment decides in that order — can I be there
    then, is it worth the trip, and where is it. Burying any of the three
    in a facts table makes her hunt for the thing she is deciding on.

    ═══ THE FEE IS DISPLAYED, NEVER COMPUTED ═══
    ═══
    NOTARY0b ruled no fee handling and that ruling stands: this product
    does not quote, process, split, or suggest a fee. What it does here is
    pass on a figure THE OFFICER TYPED, to the person deciding whether to
    accept — which is carrying information between two people, not
    brokering between them.
    ═══
    So the block renders only when she set one. There is no default, no
    suggestion, no "typical", and no arithmetic anywhere in this file. A
    pin holds that.
    """
    cells = []
    cells.append(("When", when_text))
    if (fee or "").strip():
        cells.append(("Fee", f"${_esc(fee)}"))
    cells.append(("Where", where))
    if (signer_count or "").strip():
        cells.append(("Signers", signer_count))

    tds = "".join(
        f'<td valign="top" style="padding:0 14px 0 0;'
        f'font-family:-apple-system,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;">'
        f'<div style="font-size:11px;letter-spacing:0.6px;text-transform:uppercase;'
        f'color:#5C6370;padding-bottom:4px;">{_esc(label)}</div>'
        f'<div style="font-size:16px;line-height:22px;font-weight:700;color:{INK};">'
        f'{_esc(value)}</div></td>'
        for label, value in cells if value
    )
    return (
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" '
        'width="100%" style="background-color:#F7F6FB;border:1px solid #E7E3F5;'
        'border-radius:10px;margin:20px 0 0;">'
        f'<tr><td style="padding:18px 20px 16px;"><table role="presentation" '
        f'cellpadding="0" cellspacing="0" border="0" width="100%"><tr>{tds}</tr>'
        "</table></td></tr></table>"
    )


def _respond_by(respond_by: Optional[str]) -> str:
    """The deadline, as its own chip rather than a row in a table.

    A response deadline that reads like another fact is a deadline she
    finds after deciding. Renders only when there is one — an invented
    urgency would be the product hurrying somebody on no information.
    """
    if not (respond_by or "").strip():
        return ""
    return (
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" '
        'style="margin:22px 0 0;"><tr><td style="background-color:#F3EEFF;'
        'border:1px solid #DDD1FA;border-radius:6px;padding:8px 12px;'
        "font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"
        'font-size:13px;line-height:18px;font-weight:600;color:#4C1D95;">'
        f"Please respond by {_esc(respond_by)}</td></tr></table>"
    )


def _escape_hatch(decline_link: str) -> str:
    """"Can't take this one" as a REAL link, not a sentence asking her to
    reply.

    A notary who cannot take an assignment is the most useful early
    answer the officer can get, and making that the hard path is how a
    request sits unanswered for three days. The design made it an
    explicit escape hatch and it is adopted as such.
    """
    if not decline_link:
        return ""
    return _p(
        f'<a href="{_esc(decline_link)}" style="color:#5B21B6;font-weight:600;'
        'text-decoration:underline;">Can\u2019t take this one</a>'
        '<span style="color:#6E7480;">&nbsp;&mdash;&nbsp;lets the officer '
        "reassign it right away</span>"
    )


def _reply_line(officer_name: str) -> str:
    """WHERE A REPLY ACTUALLY GOES.

    The design said "Reply to this email — it goes to our signing team."
    There is no signing team. Owner-ruled out: a support channel that
    does not exist is worse than no sentence, because she waits for an
    answer from nobody.

    Replies reach the officer, and the officer is named.
    """
    who = _esc(officer_name) or "the officer who sent it"
    return _p(
        f'<span style="font-size:13px;color:#8a94a0;">Questions about this '
        f"signing? Replying to this email reaches {who} directly.</span>"
    )


#: The one legal footer for anything sent to somebody who is not our
#: customer. Adopted verbatim from the design.
SIGNING_FOOTER = (
    "DeedPro prepares recorder-formatted documents at your direction. "
    "Nothing in this email is legal advice."
)


def notary_invited(notary_name, officer_name, officer_company, deed_type,
                   property_address, county, link, expires_at, fee=None,
                   signer_count=None, decline_link="", respond_by="",
                   window_text="") -> Rendered:
    """NOTARY2 — officer → notary: post the times you are free.

    ═══ THE FALLBACK VARIANT (EMAIL2) ═══

    The owner's design was drawn for exactly this case — its primary
    button is "Post my availability" — and the flow was re-ruled after
    the drawing: dispatch became the primary path, this the fallback. So
    the design's structure lands on BOTH, and the question stays
    different, because these two emails want different answers.

    Professional-to-professional. The notary gets the address, the
    instrument and the county because they are going there to notarise
    that document; what they do NOT get is any way to reach the signers,
    because they have no reason to and the officer does.

    No distance: see `notary_dispatched`. We hold a city, not a point.
    """
    addr = _short_addr(property_address)
    subject = f"Signing request — {addr}" if addr else "Notary signing request"

    preheader = " · ".join(x for x in [
        _esc(deed_type) or "Signing request",
        f"${_esc(fee)}" if (fee or "").strip() else "",
        f"respond by {_esc(respond_by)}" if (respond_by or "").strip() else "",
    ] if x)

    content = (
        _p(f"Hi {_esc(notary_name) or 'there'},")
        + _p(f"<strong>{_esc(officer_name)}</strong>"
             + (f" at {_esc(officer_company)}" if officer_company else "")
             + " is asking whether you can notarize a signing.")
        # The three decisions, with WHEN as the window she is being asked
        # about rather than a time anybody has agreed — nothing is
        # proposed on this path, so it says so.
        + _decision_block(window_text or "You post the times", fee,
                          addr or (county or ""), signer_count)
        + _facts([("Document", deed_type), ("Address", property_address),
                  ("County", county), ("Link expires", expires_at or "")])
        + _respond_by(respond_by)
        + _button(link, "Post the times you are free")
        + _escape_hatch(decline_link)
        + _p('<span style="font-size:13px;color:#8a94a0;">The signers pick from the '
             "times you post. When you and they land on the same one, it is booked and "
             "everybody is told.</span>")
        + _reply_line(officer_name)
        + _p(f'<span style="font-size:12px;color:#8a94a0;">{SIGNING_FOOTER}</span>')
    )
    text = (
        f"{officer_name} is asking whether you can notarize a signing.\n\n"
        + (f"Fee: ${fee}\n" if (fee or "").strip() else "")
        + f"Document: {deed_type}\nProperty: {addr}\nCounty: {county}\n"
        f"Link expires: {expires_at or ''}\n"
        + (f"Please respond by: {respond_by}\n" if (respond_by or "").strip() else "")
        + f"\nPost the times you are free: {link}\n"
        + (f"Can't take this one: {decline_link}\n" if decline_link else "")
        + "\nThe signers pick from the times you post.\n\n"
        f"Questions? Replying to this email reaches {officer_name} directly.\n\n"
        f"{SIGNING_FOOTER}"
    )
    return subject, _base(preheader, content, True), text



# ── EMAIL2: the signing-request email, from the owner's design ────────
#
# `docs/design/email_signing_request.html` is the reference. What is
# adopted from it, and what is not, is recorded at each site rather than
# in a commit message nobody reads next year.


def _decision_block(when_text: str, fee: Optional[str], where: str,
                    signer_count: Optional[str] = None) -> str:
    """WHEN / FEE / WHERE — the three things a notary decides on.

    THE DESIGN'S CENTRAL IDEA, and its own comment gives the reason: a
    notary reading an assignment decides in that order — can I be there
    then, is it worth the trip, and where is it. Burying any of the three
    in a facts table makes her hunt for the thing she is deciding on.

    ═══ THE FEE IS DISPLAYED, NEVER COMPUTED ═══
    ═══
    NOTARY0b ruled no fee handling and that ruling stands: this product
    does not quote, process, split, or suggest a fee. What it does here is
    pass on a figure THE OFFICER TYPED, to the person deciding whether to
    accept — which is carrying information between two people, not
    brokering between them.
    ═══
    So the block renders only when she set one. There is no default, no
    suggestion, no "typical", and no arithmetic anywhere in this file. A
    pin holds that.
    """
    cells = []
    cells.append(("When", when_text))
    if (fee or "").strip():
        cells.append(("Fee", f"${_esc(fee)}"))
    cells.append(("Where", where))
    if (signer_count or "").strip():
        cells.append(("Signers", signer_count))

    tds = "".join(
        f'<td valign="top" style="padding:0 14px 0 0;'
        f'font-family:-apple-system,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;">'
        f'<div style="font-size:11px;letter-spacing:0.6px;text-transform:uppercase;'
        f'color:#5C6370;padding-bottom:4px;">{_esc(label)}</div>'
        f'<div style="font-size:16px;line-height:22px;font-weight:700;color:{INK};">'
        f'{_esc(value)}</div></td>'
        for label, value in cells if value
    )
    return (
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" '
        'width="100%" style="background-color:#F7F6FB;border:1px solid #E7E3F5;'
        'border-radius:10px;margin:20px 0 0;">'
        f'<tr><td style="padding:18px 20px 16px;"><table role="presentation" '
        f'cellpadding="0" cellspacing="0" border="0" width="100%"><tr>{tds}</tr>'
        "</table></td></tr></table>"
    )


def _respond_by(respond_by: Optional[str]) -> str:
    """The deadline, as its own chip rather than a row in a table.

    A response deadline that reads like another fact is a deadline she
    finds after deciding. Renders only when there is one — an invented
    urgency would be the product hurrying somebody on no information.
    """
    if not (respond_by or "").strip():
        return ""
    return (
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" '
        'style="margin:22px 0 0;"><tr><td style="background-color:#F3EEFF;'
        'border:1px solid #DDD1FA;border-radius:6px;padding:8px 12px;'
        "font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"
        'font-size:13px;line-height:18px;font-weight:600;color:#4C1D95;">'
        f"Please respond by {_esc(respond_by)}</td></tr></table>"
    )


def _escape_hatch(decline_link: str) -> str:
    """"Can't take this one" as a REAL link, not a sentence asking her to
    reply.

    A notary who cannot take an assignment is the most useful early
    answer the officer can get, and making that the hard path is how a
    request sits unanswered for three days. The design made it an
    explicit escape hatch and it is adopted as such.
    """
    if not decline_link:
        return ""
    return _p(
        f'<a href="{_esc(decline_link)}" style="color:#5B21B6;font-weight:600;'
        'text-decoration:underline;">Can\u2019t take this one</a>'
        '<span style="color:#6E7480;">&nbsp;&mdash;&nbsp;lets the officer '
        "reassign it right away</span>"
    )


def _reply_line(officer_name: str) -> str:
    """WHERE A REPLY ACTUALLY GOES.

    The design said "Reply to this email — it goes to our signing team."
    There is no signing team. Owner-ruled out: a support channel that
    does not exist is worse than no sentence, because she waits for an
    answer from nobody.

    Replies reach the officer, and the officer is named.
    """
    who = _esc(officer_name) or "the officer who sent it"
    return _p(
        f'<span style="font-size:13px;color:#8a94a0;">Questions about this '
        f"signing? Replying to this email reaches {who} directly.</span>"
    )


#: The one legal footer for anything sent to somebody who is not our
#: customer. Adopted verbatim from the design.
SIGNING_FOOTER = (
    "DeedPro prepares recorder-formatted documents at your direction. "
    "Nothing in this email is legal advice."
)


def notary_dispatched(notary_name, officer_name, officer_company, deed_type,
                      property_address, county, when_text, location, link,
                      expires_at, fee=None, signer_count=None,
                      decline_link="", respond_by="") -> Rendered:
    """FLOW1 item 7 — officer → notary: can you take this, at this time?

    ═══ THE PRIMARY VARIANT (EMAIL2) ═══

    The owner's design was drawn for the availability case ("Post my
    availability"), and the flow was RE-RULED after it was drawn:
    dispatch is the primary path — the officer proposes a specific time
    and the notary accepts or declines — with availability-posting as the
    fallback. So this template gets the design's structure and the
    dispatch question, and `notary_invited` keeps the design's original
    ask.

    ═══ WHY THIS IS A SECOND TEMPLATE AND NOT A BRANCH ═══

    `notary_invited` asks "when are you free?". This asks "can you be at
    this address at this time?". They want different answers and
    different buttons, and a professional deciding whether to accept an
    assignment should not have to work out which question she has been
    sent. One template with a conditional clause would have made the
    subject line and the button lie about one of the two cases.

    ═══ WHAT IT MUST NOT SAY ═══

    Not that the signing is BOOKED, and not that it is CONFIRMED. Nothing
    is booked until she accepts — she is the party who has not answered
    yet. §13's rule reaching the one email most tempted to break it: the
    officer has a time, the signers have agreed, and every word here
    still has to treat the arrangement as incomplete, because it is.

    And it does not say the officer "confirmed" anything on the signers'
    behalf in a way that implies they spoke to us. She rang them. The
    email says she did.

    ═══ AND NO DISTANCE ═══

    The design shows "~6 mi from you". This product holds a notary's
    city, state and postal code — not a geocoded point — so any mileage
    would be arithmetic on data we do not have. §0: a figure that would
    be roughly right most of the time is exactly the kind this product
    declines. The block is omitted rather than shipped unreachable.
    """
    addr = _short_addr(property_address)
    where = location or addr
    subject = f"Signing assignment — {addr}" if addr else "Notary signing assignment"

    # PREHEADER — document · fee · respond-by, so she can triage from the
    # inbox list without opening. The design's idea and a good one: a
    # notary scanning ten requests decides which to open on exactly these.
    preheader = " · ".join(x for x in [
        _esc(deed_type) or "Signing request",
        f"${_esc(fee)}" if (fee or "").strip() else "",
        f"respond by {_esc(respond_by)}" if (respond_by or "").strip() else "",
    ] if x)

    content = (
        _p(f"Hi {_esc(notary_name) or 'there'},")
        + _p(f"<strong>{_esc(officer_name)}</strong>"
             + (f" at {_esc(officer_company)}" if officer_company else "")
             + " is asking whether you can take a signing at a set time.")
        + _decision_block(when_text, fee, where, signer_count)
        + _facts([("Document", deed_type), ("Address", property_address),
                  ("County", county), ("Link expires", expires_at or "")])
        + _respond_by(respond_by)
        + _button(link, "Accept this signing")
        + _escape_hatch(decline_link)
        + _p('<span style="font-size:13px;color:#8a94a0;">'
             f"{_esc(officer_name)} has already agreed this time with the "
             "signers. Nothing is booked until you accept — and if the time "
             "does not work, decline it and post the times you are free "
             "instead.</span>")
        + _reply_line(officer_name)
        + _p(f'<span style="font-size:12px;color:#8a94a0;">{SIGNING_FOOTER}</span>')
    )
    text = (
        f"{officer_name} is asking whether you can take a signing at a set time.\n\n"
        f"When: {when_text}\n"
        + (f"Fee: ${fee}\n" if (fee or "").strip() else "")
        + f"Where: {where}\n"
        f"Document: {deed_type}\nCounty: {county}\n"
        f"Link expires: {expires_at or ''}\n"
        + (f"Please respond by: {respond_by}\n" if (respond_by or "").strip() else "")
        + f"\nAccept: {link}\n"
        + (f"Can't take this one: {decline_link}\n" if decline_link else "")
        + f"\n{officer_name} has already agreed this time with the signers. "
        "Nothing is booked until you accept. If it does not work, decline "
        "it and post the times you are free instead.\n\n"
        f"Questions? Replying to this email reaches {officer_name} directly.\n\n"
        f"{SIGNING_FOOTER}"
    )
    return subject, _base(preheader, content, True), text


def signing_windows_posted(signer_name, officer_name, officer_company, notary_name,
                           property_street, window_texts, link) -> Rendered:
    """NOTARY2 — to a SIGNER. The first email this product sends to
    somebody who never signed up, and therefore the one that has to
    introduce as well as ask.

    A separate `signer_invited` existed for one commit and was DELETED
    rather than wired: nothing sent it, because there is nothing to
    invite a signer to until the notary has posted times. "Pick a time"
    with no times is asking a consumer to do nothing. So this email does
    both jobs, and there is one template instead of a dead one and a
    terse one.

    The signer surface's rules, in prose: plain language, the officer's
    name leading, the property STREET only, one thing to do. No deed
    type, no county, no APN, no party names — the allowlist is not a UI
    concern, it is what we may say to this person at all.
    """
    subject = f"Pick a time to sign — {_short_addr(property_street)}"
    times = "".join(f"  - {w}\n" for w in (window_texts or []))
    listed = "".join(
        f'<tr><td style="padding:4px 0;font-size:14px;color:{INK};font-weight:600;">'
        f"&bull;&nbsp;{_esc(w)}</td></tr>" for w in (window_texts or []))
    content = (
        _p(f"Hi {_esc(signer_name) or 'there'},")
        + _p(f"<strong>{_esc(officer_name)}</strong>"
             + (f" at {_esc(officer_company)}" if officer_company else "")
             + " is arranging the signing for your property and needs to know when "
             "you are free.")
        + _facts([("Property", _short_addr(property_street)),
                  ("Your notary", notary_name)])
        + _p(f"{_esc(notary_name) or 'The notary'} is free at these times:")
        + ('<table role="presentation" cellpadding="0" cellspacing="0" '
           f'style="margin:10px 0;">{listed}</table>' if listed else "")
        + _button(link, "Pick one")
        + _p('<span style="font-size:13px;color:#8a94a0;">A notary will meet you to '
             "witness the signing. Everyone signing has to agree on the same time — you "
             "will be told once one is settled. If none of these work, you can suggest "
             "another.</span>")
        + _p(f'<span style="font-size:13px;color:#8a94a0;">Questions about the '
             f"paperwork? Ask {_esc(officer_name)}.</span>")
    )
    text = (
        f"{officer_name} is arranging the signing for your property and needs to know "
        f"when you are free.\n\n"
        f"Property: {_short_addr(property_street)}\nYour notary: {notary_name}\n\n"
        f"{notary_name or 'The notary'} is free at these times:\n\n{times}\n"
        f"Pick one: {link}\n\n"
        "A notary will meet you to witness the signing. Everyone signing has to agree "
        f"on the same time. Questions about the paperwork? Ask {officer_name}."
    )
    return subject, _base(f"{officer_name} needs to know when you are free",
                          content, False), text


def signing_reminder(recipient_name, officer_name, officer_company,
                     notary_name, property_text, window_texts, link,
                     is_consumer: bool) -> Rendered:
    """NOTARY2 — the officer nudges somebody who has not answered.

    ONE TEMPLATE FOR BOTH PARTIES, register chosen by `is_consumer` — the
    same pattern as the booking notice, and for the same reason: two
    near-identical templates drift, and the drift is invisible because
    each one looks fine on its own.

    NOTARY1 refused to reuse the review reminder for a signing because it
    asked the wrong question ("waiting on your review"). This one asks
    the SAME question the original ask did, with "still" in front of it —
    a reminder that rephrases is a reminder the recipient has to re-read
    from scratch.

    No urgency theatre. Nothing here says "urgent", "immediately" or
    "final notice": the officer chose to send this, the recipient has not
    done anything wrong, and manufactured pressure on a consumer who is
    doing us a favour is how a product gets ignored.
    """
    subject = f"Still need a time — {property_text}"
    listed = "".join(
        f'<tr><td style="padding:4px 0;font-size:14px;color:{INK};font-weight:600;">'
        f"&bull;&nbsp;{_esc(w)}</td></tr>" for w in (window_texts or []))
    if is_consumer:
        body = (
            _p(f"Hi {_esc(recipient_name) or 'there'},")
            + _p(f"<strong>{_esc(officer_name)}</strong>"
                 + (f" at {_esc(officer_company)}" if officer_company else "")
                 + " is still waiting to hear which time works for you.")
            + ('<table role="presentation" cellpadding="0" cellspacing="0" '
               f'style="margin:10px 0;">{listed}</table>' if listed else "")
            + _button(link, "Pick a time")
            + _p(f'<span style="font-size:13px;color:#8a94a0;">If none of them work you '
                 f"can suggest another, or just call {_esc(officer_name)}.</span>")
        )
        text = (f"{officer_name} is still waiting to hear which time works for you.\n\n"
                + "".join(f"  - {w}\n" for w in (window_texts or []))
                + f"\nPick a time: {link}\n\n"
                f"If none of them work you can suggest another, or call {officer_name}.")
    else:
        body = (
            _p(f"Hi {_esc(recipient_name) or 'there'},")
            + _p(f"<strong>{_esc(officer_name)}</strong> is still waiting on times for "
                 f"the signing at {_esc(property_text)}.")
            + _button(link, "Post the times you are free")
        )
        text = (f"{officer_name} is still waiting on times for the signing at "
                f"{property_text}.\n\nPost your availability: {link}")
    return subject, _base(f"Still waiting on a time — {property_text}", body,
                          not is_consumer), text


def signing_proposal_received(notary_name, signer_name, officer_name,
                              property_address, window_text, link) -> Rendered:
    """NOTARY2 — a signer suggested a time the notary did not offer."""
    addr = _short_addr(property_address)
    subject = f"A signer suggested a time — {addr}"
    content = (
        _p(f"Hi {_esc(notary_name) or 'there'},")
        + _p(f"{_esc(signer_name) or 'A signer'} cannot make the times you posted for "
             f"{_esc(officer_name)}'s signing, and suggested this instead:")
        + _facts([("Suggested", window_text), ("Property", addr)])
        + _button(link, "Accept or decline")
        + _p('<span style="font-size:13px;color:#8a94a0;">Accepting it may book the '
             "signing straight away, if everyone else has already agreed.</span>")
    )
    text = (f"{signer_name or 'A signer'} suggested a different time:\n\n"
            f"Suggested: {window_text}\nProperty: {addr}\n\n"
            f"Accept or decline: {link}")
    return subject, _base("A signer suggested a different time", content, True), text


def signing_cancelled(recipient_name, property_text, when_text, officer_name,
                      is_consumer: bool) -> Rendered:
    """CANCEL1 — the request is off, and everybody who was asked is told.

    WHO GETS THIS AND WHY. A notary who blocked out Thursday afternoon
    and a signer who picked a time both arranged their day around an
    appointment that is no longer happening. Owner-ruled: an invited
    signer is told even when nothing was ever booked — they hold a link,
    the link is now dead, and finding that out by clicking it is worse
    than being told.

    NO REASON FIELD, deliberately. The product does not know why she
    cancelled and will not invent one; "cancelled by {officer}" is the
    whole of what it can say. A blank line inviting an explanation would
    be a place for one to be guessed at later.

    SAME TWO REGISTERS AS `signing_booked`, for the same reason: the
    signer gets the street line, the professionals get the full address.
    An email is not a loophole in the surface allowlist.
    """
    subject = f"Signing cancelled — {property_text}"
    body = (
        _p(f"Hi {_esc(recipient_name) or 'there'},")
        + _p(f"{_esc(officer_name)} has cancelled this signing request. "
             "Any link you were sent for it no longer works.")
        + _facts([("Property", property_text),
                  ("Time that was agreed", when_text)])
        + _p('<span style="font-size:13px;color:#8a94a0;">'
             f"There is nothing to do. If you were expecting this signing, "
             f"contact {_esc(officer_name)}.</span>")
    )
    text = (
        f"{officer_name} has cancelled this signing request. Any link you "
        "were sent for it no longer works.\n\n"
        f"Property: {property_text}\n"
        + (f"Time that was agreed: {when_text}\n" if when_text else "")
        + f"\nIf you were expecting this signing, contact {officer_name}.\n"
    )
    return subject, _base(subject, body, is_consumer), text


def signing_booked(recipient_name, when_text, property_text, notary_name,
                   officer_name, is_consumer: bool, link) -> Rendered:
    """NOTARY2 — everybody, on convergence. Carries the .ics.

    ONE TEMPLATE, TWO REGISTERS, chosen by `is_consumer` rather than by
    two near-identical functions that drift. The professionals get the
    full address and a link into the record; the signer gets the street
    line and the officer's name, because that is all their surface may
    carry and an email is not a loophole in it.

    §13: "agreed", never "confirmed" and never "will happen". The
    calendar file is METHOD:PUBLISH — a copy of an arrangement, not an
    invitation expecting an RSVP.
    """
    subject = f"Signing time agreed — {property_text}"
    who = f"{_esc(notary_name)}" if notary_name else "your notary"
    body = (
        _p(f"Hi {_esc(recipient_name) or 'there'},")
        + _p("Everyone has agreed on a time. It is in the calendar file attached.")
        + _facts([("Time", when_text), ("Property", property_text),
                  ("Notary", notary_name),
                  ("Arranged by", officer_name if is_consumer else None)])
        + (_p(f'<span style="font-size:13px;color:#8a94a0;">{who} will meet you then. '
              f"If anything changes, contact {_esc(officer_name)}.</span>")
           if is_consumer else _button(link, "Open in DeedPro"))
    )
    text = (
        "Everyone has agreed on a time.\n\n"
        f"Time: {when_text}\nProperty: {property_text}\nNotary: {notary_name}\n"
        + (f"Arranged by: {officer_name}\n" if is_consumer else f"\nOpen: {link}\n")
    )
    return subject, _base(f"Signing time agreed — {when_text}", body, not is_consumer), text


def admin_new_user(user_email, user_id, registered_at: Optional[str] = None) -> Rendered:
    """Ops ping (owner ruling): registrant email + timestamp — no more."""
    ts = registered_at or datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    subject = f"New DeedPro signup: {user_email}"
    content = _p("New registration.") + _facts([("Email", user_email), ("User ID", f"#{user_id}"), ("At", ts)])
    text = f"New DeedPro registration.\nEmail: {user_email}\nUser ID: #{user_id}\nAt: {ts}"
    return subject, _base(f"New signup: {user_email}", content, False), text
