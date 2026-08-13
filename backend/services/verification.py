"""Ask somebody to confirm the address they signed up with.

═══ VERIFY-CHECK: BUILT-BUT-UNUSED, AND WHICH HALF IS BEING TURNED ON ═══

The investigation found a complete, correct, disconnected chain. Both
endpoints worked: `POST /users/verify-email/request` minted a 24-hour
token and emailed the link, `GET /users/verify-email` validated it and
set `verified = TRUE`. The frontend page existed and worked.

Nothing called the first. Nothing read the result. `verified` was
consulted in exactly one place — inside the request endpoint, to answer
"already verified" — so a verified user and an unverified one were
indistinguishable to every part of this product except one admin column.

Owner ruling: **send, and do not gate.**

  - registration sends the link, so somebody is actually asked;
  - the product says out loud whether the address is confirmed, and
    offers to send it again;
  - NOTHING is gated on `verified`. Not login, not deed generation, not
    sharing.

═══ WHY NOT GATE, WHEN GATING IS THE POINT OF VERIFICATION ═══

Because every current account is unverified. `verified` defaults to
FALSE and nobody has ever been asked, so a gate switched on today locks
out the entire customer base — acting on a signal nobody was given the
chance to provide, which is the `subscribe` mistake pointed the other
way.

And a gate on verification is a gate on our own email deliverability:
`send_verify_email_with_reason` returns a reason when it fails, SendGrid
is not configured in every environment, and coupling a customer's access
to that is a decision to make deliberately rather than inherit.

So the honest order is send → watch → decide. This is step one, and a
test in `test_verify_check.py` holds the product to "no gate" until
somebody rules otherwise.

═══ ONE PLACE MINTS THE LINK ═══

Registration needed exactly what `/users/verify-email/request` already
did. The standing rule when a new surface needs an existing judgement is
that the answer is never a second copy — a second token mint is a second
TTL, a second URL shape, and a second thing to get wrong.
"""
from datetime import timedelta
from typing import Tuple

VERIFY_PATH = "/verify-email"


def token_ttl_hours() -> int:
    """Read at call time, not import time, so a test can set it."""
    import os
    return int(os.getenv("VERIFY_TOKEN_TTL_HOURS", "24"))


def verification_link(user_id: int) -> str:
    """The URL that verifies this account, if somebody clicks it.

    The `type: verify` claim is what stops an ordinary access token —
    which any logged-in user holds — being replayed at the verify
    endpoint to mark somebody else confirmed.
    """
    from auth import create_access_token
    from services.environment import require

    token = create_access_token(
        data={"sub": str(user_id), "type": "verify"},
        expires_delta=timedelta(hours=token_ttl_hours()),
    )
    return f"{require('FRONTEND_URL')}{VERIFY_PATH}?token={token}"


def send_verification(user_id: int, email: str, full_name: str) -> Tuple[bool, str]:
    """Send the confirm-your-address email. Returns (sent, reason).

    THE REASON IS RETURNED, NOT SWALLOWED (§4). Both callers are
    non-blocking — a registration that fails because SendGrid is down is
    a lost customer over a message we have chosen not to enforce — but
    "non-blocking" must never become "silent", or the day nobody verifies
    is a day nobody can explain.
    """
    from utils.notifications import send_verify_email_with_reason

    return send_verify_email_with_reason(
        email, full_name or "", verification_link(user_id))
