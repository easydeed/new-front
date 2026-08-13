"""VERIFY-CHECK — the chain is connected at both ends, and gates nothing.

═══ WHAT WAS ACTUALLY WRONG ═══

Not a broken link in a working chain. The opposite: a complete, correct
chain, disconnected at both ends.

`POST /users/verify-email/request` minted a 24-hour token and emailed the
link, and had NO CALLER anywhere in the repo. `GET /users/verify-email`
validated the token and set `verified = TRUE`, and the only thing that
ever read `verified` was the request endpoint itself, answering "already
verified". Login did not even SELECT it.

So a verified user and an unverified user were indistinguishable to every
part of this product except one admin column — a record that looks like a
control, which its own subject could not see.

═══ THE RULING, AND WHY THE NO-GATE PIN IS THE LOAD-BEARING ONE ═══

Send, and do not gate. Every existing account is unverified — `verified`
defaults to FALSE and nobody has ever been asked — so a gate switched on
today locks out the entire customer base.

That makes "nothing gates on it" a thing the product must be HELD to,
not a thing it happens to do. The obvious future edit is somebody adding
`if not verified: raise 403` to one endpoint, reasonably, without knowing
the population it would lock out. The sweep below is what makes that edit
fail loudly instead of shipping.
"""
import ast
import re
from pathlib import Path

import pytest

from tests.source_text import code_only, function_source

BACKEND = Path(__file__).resolve().parents[1]


# ── Somebody is finally asked ────────────────────────────────────────

def test_registration_sends_the_verification_link():
    """THE PIN THIS FILE EXISTS FOR (first half).

    The endpoint that sends the link had no caller. This is the caller.
    """
    src = code_only(function_source(
        BACKEND / "routers" / "users_auth.py", "register_user"))
    assert "from services.verification import send_verification" in src
    assert "send_verification(" in src


def test_the_send_is_non_blocking_but_never_silent():
    """A registration that fails because SendGrid is down is a lost
    customer over a message the product does not enforce — so it is
    non-blocking. But §4: non-blocking must not become silent, or the
    day nobody verifies is a day nobody can explain."""
    src = code_only(function_source(
        BACKEND / "routers" / "users_auth.py", "register_user"))
    assert "v_ok, v_reason = send_verification(" in src
    assert "if not v_ok:" in src
    assert "v_reason" in src.split("if not v_ok:")[1][:200]


def test_one_place_mints_the_link():
    """Registration needed exactly what the resend endpoint already did.
    A second mint would be a second TTL, a second URL shape, and a second
    thing to get wrong — the standing rule is that a new surface needing
    an existing judgement never gets a copy of it."""
    extra = code_only((BACKEND / "routers" / "auth_extra.py").read_text(encoding="utf-8"))
    assert "send_verification(" in extra
    # The endpoint no longer mints its own.
    assert 'data={"sub": str(user_id), "type": "verify"}' not in extra

    minted = 0
    for path in BACKEND.rglob("*.py"):
        if "__pycache__" in path.parts or "tests" in path.parts:
            continue
        if '"type": "verify"' in code_only(path.read_text(encoding="utf-8")):
            minted += 1
    assert minted == 1, "more than one place mints a verification token"


def test_the_token_is_typed_so_an_ordinary_session_cannot_replay_it():
    """Any logged-in user holds an access token. Without the `type`
    claim, presenting one at the verify endpoint would mark somebody
    verified without them ever seeing an email."""
    src = code_only((BACKEND / "services" / "verification.py").read_text(encoding="utf-8"))
    assert '"type": "verify"' in src
    endpoint = code_only(function_source(
        BACKEND / "routers" / "auth_extra.py", "verify_email"))
    assert 'claims.get("type") != "verify"' in endpoint


# ── The state is visible to the person it is about ───────────────────

def test_the_profile_reports_whether_the_address_is_confirmed():
    """It was an admin column and nothing else. The person whose address
    it is could not see it, could not act on it, and was never asked."""
    src = code_only(function_source(
        BACKEND / "routers" / "users_auth.py", "get_user_profile_endpoint"))
    assert '"verified": bool(user[12]),' in src
    assert "verified" in src.split("SELECT")[1][:300]


# ── AND NOTHING IS GATED ON IT ───────────────────────────────────────

#: Where reading `verified` is the job rather than a gate.
#:
#: `auth_extra.py` holds both verification endpoints — one asks "already
#: verified?" before resending, the other sets it. `admin_api_v2.py`
#: SELECTs it for the admin list, which is display.
VERIFICATION_OWNERS = {"routers/auth_extra.py", "services/verification.py"}

#: Not valid Python, so not parseable — pinned as an exact set in
#: test_db_identity.py, and skipped here rather than crashing the sweep.
UNPARSEABLE = {"run_migration.py"}


def _decision_expressions(node):
    """The expressions a piece of code STEERS on.

    Not "lines mentioning verified" — that caught an error message about
    a missing transfer-tax rate and a sentence about signing keys, both
    of which use the English word inside a string. A string is not a
    gate, and no amount of refining a regex teaches it the difference.
    """
    if isinstance(node, (ast.If, ast.IfExp, ast.While, ast.Assert)):
        return [node.test]
    if isinstance(node, ast.comprehension):
        return list(node.ifs)
    return []


def _reads_verified(test) -> bool:
    """Does this expression consult `verified`, in any of the ways this
    codebase reads a column: a bare name, an attribute, `row["verified"]`,
    or `row.get("verified")`."""
    for node in ast.walk(test):
        if isinstance(node, ast.Name) and node.id == "verified":
            return True
        if isinstance(node, ast.Attribute) and node.attr == "verified":
            return True
        if isinstance(node, ast.Subscript):
            key = getattr(node.slice, "value", None)
            if key == "verified":
                return True
        if isinstance(node, ast.Call):
            fn = node.func
            if getattr(fn, "attr", None) == "get" and node.args:
                first = node.args[0]
                if isinstance(first, ast.Constant) and first.value == "verified":
                    return True
    return False


def test_nothing_in_the_product_gates_on_verified():
    """THE PIN THIS FILE EXISTS FOR (second half).

    MATCHED BY PROPERTY, NOT BY PATTERN LIST. The `job_title` sweep one
    ticket ago enumerated six literal spellings and walked straight past
    `user.get('job_title') == 'Administrator'`, because a quote sat where
    the list expected a paren — and it failed silently, which is the
    worst way for a gate to fail: the check is added, the suite stays
    green, and the pin reads as proof.

    What characterises a gate is that the value STEERS something. So:
    any line mentioning `verified` that also branches, refuses, or
    returns a status code.
    """
    offenders = []
    for path in sorted(BACKEND.rglob("*.py")):
        if "__pycache__" in path.parts or "tests" in path.parts:
            continue
        rel = str(path.relative_to(BACKEND))
        if rel in VERIFICATION_OWNERS or rel in UNPARSEABLE:
            continue
        tree = ast.parse(path.read_text(encoding="utf-8"), rel)
        for node in ast.walk(tree):
            for test in _decision_expressions(node):
                if _reads_verified(test):
                    offenders.append(f"{rel}:{getattr(test, 'lineno', '?')}")
    assert offenders == [], (
        "something now gates on email verification. Every existing "
        "account is unverified — nobody has ever been asked — so this "
        "locks out the customer base. It needs an owner ruling and a "
        "backfill decision, not a commit: " + "; ".join(offenders))


def test_login_does_not_consult_it():
    """The gate with the largest blast radius, named explicitly because
    it is the one somebody would reach for first."""
    src = code_only(function_source(
        BACKEND / "routers" / "users_auth.py", "login_user"))
    assert "verified" not in src


def test_the_dead_switch_is_gone():
    """`EMAIL_VERIFICATION_REQUIRED` was defined and read NOWHERE. An
    operator could set it on Render, believe they had turned required
    verification on, and nothing would change — a dead CONTROL, which is
    worse than dead code. The owner ledger cited it as evidence that the
    plumbing existed."""
    offenders = [str(p.relative_to(BACKEND)) for p in BACKEND.rglob("*.py")
                 if "__pycache__" not in p.parts
                 and "tests" not in p.parts
                 and "EMAIL_VERIFICATION_REQUIRED" in
                 code_only(p.read_text(encoding="utf-8"))]
    assert offenders == [], f"the dead switch is back: {offenders}"


# ── The link itself ──────────────────────────────────────────────────

def test_the_ttl_is_read_at_call_time():
    """Read at import, a test cannot change it and a redeploy is the only
    way to correct a wrong value."""
    src = code_only((BACKEND / "services" / "verification.py").read_text(encoding="utf-8"))
    assert "def token_ttl_hours()" in src
    assert 'os.getenv("VERIFY_TOKEN_TTL_HOURS", "24")' in src


def test_the_link_points_at_the_page_that_exists(monkeypatch):
    """The frontend page reads `?token=`. A link shaped differently is a
    link that lands somewhere real and does nothing."""
    monkeypatch.setenv("FRONTEND_URL", "https://app.example.test")
    from services.verification import verification_link
    url = verification_link(42)
    assert url.startswith("https://app.example.test/verify-email?token=")
    page = (BACKEND.parent / "frontend" / "src" / "app" / "verify-email"
            / "page.tsx")
    assert page.exists()
    assert "token" in page.read_text(encoding="utf-8")
