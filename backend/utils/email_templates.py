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


def share_signing_request(recipient_name, owner_name, deed_type, property_address,
                          window_texts, share_link, expires_at: Optional[str]) -> Rendered:
    """NOTARY1 — to the notary: here is the document, here are the times.

    `window_texts` arrives already formatted. The renderer does not know
    how to say a date, deliberately: signing.window_label() says it once,
    and a template that reformatted times would be a second place for the
    wording to drift.

    Two things this email must not say, and both are doctrine rather than
    taste. It does not ask the notary to CONFIRM the signing — she is
    telling us when she is free, and the difference between availability
    and attendance is the whole of rule 3. And it names no signer,
    because the product holds no signer contact and never messages one;
    the officer arranges that leg herself.
    """
    addr = _short_addr(property_address)
    subject = f"Signing request — {addr}" if addr else "Notary signing request"
    times = "".join(
        f'<tr><td style="padding:4px 0;font-size:14px;color:{INK};font-weight:600;">'
        f"&bull;&nbsp;{_esc(w)}</td></tr>" for w in (window_texts or [])
    )
    times_block = (
        '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:10px 0 4px 0;">'
        f"{times}</table>" if times else ""
    )
    content = (
        _p(f"Hi {_esc(recipient_name) or 'there'},")
        + _p(f"<strong>{_esc(owner_name)}</strong> is asking whether you are available "
             "to notarize a signing, and has proposed these times:")
        + times_block
        + _facts([("Document", deed_type), ("Property", addr),
                  ("Requested by", owner_name), ("Link expires", expires_at or "")])
        + _button(share_link, "Open the request and pick a time")
        + _p('<span style="font-size:13px;color:#8a94a0;">Picking a time tells '
             f"{_esc(owner_name)} you are available then; she confirms the appointment "
             "with the signers herself. Calendar files for each proposed time are "
             "attached so you can hold them.</span>")
        + _p('<span style="font-size:13px;color:#8a94a0;">Anyone with this link can open '
             "the document until it expires.</span>")
    )
    text = (
        f"{owner_name} is asking whether you are available to notarize a signing.\n\n"
        f"Document: {deed_type}\nProperty: {addr}\nLink expires: {expires_at or ''}\n\n"
        "Proposed times:\n"
        + "".join(f"  - {w}\n" for w in (window_texts or []))
        + f"\nOpen the request and pick a time: {share_link}\n\n"
        f"Picking a time tells {owner_name} you are available then; she confirms the "
        "appointment with the signers herself."
    )
    return subject, _base(f"{owner_name} asked about your availability — {addr}",
                          content, True), text


def signing_time_recorded(owner_name, deed_type, property_address, notary_email,
                          when_text, asserted_note, view_link) -> Rendered:
    """NOTARY1 — to the officer: a time is on the record.

    The subject and body say RECORDED, never "confirmed for" or "your
    signing is set". A time in this system is an arrangement two people
    made; the product knows the arrangement was made and knows nothing
    about whether anybody keeps it. `asserted_note` carries who said so,
    because per RED-S4 the system's knowledge is always somebody's
    statement.
    """
    addr = _short_addr(property_address)
    subject = f"Signing time recorded — {addr}" if addr else "Signing time recorded"
    content = (
        _p(f"Hi {_esc(owner_name)},")
        + _p(_esc(asserted_note))
        + _facts([("Time", when_text), ("Notary", notary_email),
                  ("Document", deed_type), ("Property", addr)])
        + _button(view_link, "Open in DeedPro")
        + _p('<span style="font-size:13px;color:#8a94a0;">The signers have not been '
             "contacted — DeedPro does not message them. A calendar file for this time "
             "is attached.</span>")
    )
    text = (
        f"{asserted_note}\n\n"
        f"Time: {when_text}\nNotary: {notary_email}\n"
        f"Document: {deed_type}\nProperty: {addr}\n\n"
        f"Open: {view_link}\n\n"
        "The signers have not been contacted — DeedPro does not message them."
    )
    return subject, _base(f"Signing time recorded — {addr}", content, True), text


def notary_invited(notary_name, officer_name, officer_company, deed_type,
                   property_address, county, link, expires_at) -> Rendered:
    """NOTARY2 — officer → notary: post the times you are free.

    Professional-to-professional. She gets the address, the instrument
    and the county because she is going there to notarise that document;
    what she does NOT get is any way to reach the signers, because she
    has no reason to and the officer does.
    """
    addr = _short_addr(property_address)
    subject = f"Signing request — {addr}" if addr else "Notary signing request"
    content = (
        _p(f"Hi {_esc(notary_name) or 'there'},")
        + _p(f"<strong>{_esc(officer_name)}</strong>"
             + (f" at {_esc(officer_company)}" if officer_company else "")
             + " is asking whether you can notarize a signing.")
        + _facts([("Document", deed_type), ("Property", addr),
                  ("County", county), ("Link expires", expires_at or "")])
        + _button(link, "Post the times you are free")
        + _p('<span style="font-size:13px;color:#8a94a0;">The signers pick from the '
             "times you post. When you and they land on the same one, it is booked and "
             "everybody is told.</span>")
    )
    text = (
        f"{officer_name} is asking whether you can notarize a signing.\n\n"
        f"Document: {deed_type}\nProperty: {addr}\nCounty: {county}\n"
        f"Link expires: {expires_at or ''}\n\n"
        f"Post the times you are free: {link}\n\n"
        "The signers pick from the times you post."
    )
    return subject, _base(f"{officer_name} asked about your availability", content, True), text


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
