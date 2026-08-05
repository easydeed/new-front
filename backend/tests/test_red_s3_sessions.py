"""RED-S3 — sessions that can be ended, and expiry that is not an ending.

Three findings, one ticket:

  1. NO REVOCATION. Tokens carried no `jti`, so no token could be named,
     so none could be killed. "Logout" was a localStorage delete while
     the token itself kept working for the rest of its 30 minutes.
  2. NO LOCKOUT. Unlimited password guessing against bcrypt.
  3. NO REFRESH — so the correct 30-minute token meant "logged out
     mid-file", which is how an officer loses a deed at 4:40 on a
     Thursday and stops using the product.

The end-to-end proof lives in scripts/s3_thursday_walkthrough.py, which
performs that Thursday against the real app. These are the regression
guards underneath it.
"""
import os
import sys
import uuid
from datetime import timedelta
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

from tests.source_text import code_only  # noqa: E402

LIVE_DB = os.getenv("DATABASE_URL")
pytestmark = pytest.mark.skipif(not LIVE_DB, reason="live test DB required")


@pytest.fixture(autouse=True)
def _schema():
    from database import create_tables
    create_tables()


# ── 1. Tokens can be named, and therefore killed ──────────────────────


def test_every_access_token_carries_a_jti():
    from auth import create_access_token
    from jose import jwt as _jwt
    claims = _jwt.get_unverified_claims(create_access_token({"sub": "1"}))
    assert claims.get("jti"), "without a jti there is no token to revoke"
    assert claims.get("typ") == "access"


def test_two_tokens_are_never_the_same_token():
    from auth import create_access_token
    from jose import jwt as _jwt
    a = _jwt.get_unverified_claims(create_access_token({"sub": "1"}))["jti"]
    b = _jwt.get_unverified_claims(create_access_token({"sub": "1"}))["jti"]
    assert a != b


def test_a_revoked_jti_reads_as_revoked():
    from auth import is_revoked, revoke_jti
    jti = uuid.uuid4().hex
    assert not is_revoked(jti)
    revoke_jti(jti, None, "test")
    assert is_revoked(jti)


def test_a_token_with_no_jti_is_treated_as_revoked():
    """Pre-RED-S3 tokens cannot be revoked, so they cannot be trusted.
    They drain out at deploy rather than living their full 30 minutes
    past the fix."""
    from auth import is_revoked
    assert is_revoked(None) is True
    assert is_revoked("") is True


def test_a_refresh_token_cannot_be_used_as_an_api_credential():
    """Otherwise the 14-day token is silently a 14-day API key."""
    src = code_only(BACKEND / "auth.py")
    fn = src[src.index("def verify_token"):src.index("def get_current_user_id")]
    assert "TOKEN_TYPE_REFRESH" in fn


# ── 2. Guessing stops working ─────────────────────────────────────────


def test_repeated_failures_lock_the_address():
    import db
    from services.login_guard import MAX_FAILURES, check_lockout, record_attempt
    from fastapi import HTTPException

    email = f"lock-{uuid.uuid4().hex[:8]}@test.local"
    try:
        for _ in range(MAX_FAILURES):
            record_attempt(email, "1.2.3.4", succeeded=False)
        with pytest.raises(HTTPException) as exc:
            check_lockout(email)
        assert exc.value.status_code == 429
        assert "Retry-After" in (exc.value.headers or {})
    finally:
        with db.conn.cursor() as cur:
            cur.execute("DELETE FROM login_attempts WHERE email = %s", (email,))
            db.conn.commit()


def test_a_success_clears_the_slate():
    """An officer who finally remembers her password must not still be
    one typo from a lock she already escaped."""
    import db
    from services.login_guard import MAX_FAILURES, check_lockout, record_attempt

    email = f"clear-{uuid.uuid4().hex[:8]}@test.local"
    try:
        for _ in range(MAX_FAILURES - 1):
            record_attempt(email, None, succeeded=False)
        record_attempt(email, None, succeeded=True)
        check_lockout(email)  # must not raise
    finally:
        with db.conn.cursor() as cur:
            cur.execute("DELETE FROM login_attempts WHERE email = %s", (email,))
            db.conn.commit()


def test_attempts_against_unknown_addresses_are_counted_too():
    """Counting only real accounts would be weaker AND would leak which
    addresses exist, because only those would ever start locking."""
    # Anchored on CODE, not on a comment: code_only() blanks comments,
    # so a comment makes a useless slice boundary. (Caught by this very
    # test failing with "substring not found".)
    src = code_only(BACKEND / "routers" / "users_auth.py")
    login = src[src.index("async def login_user"):
                src.index("record_attempt(credentials.email.lower(), _ip, succeeded=True)")]
    # Twice: once for an address that does not exist, once for a wrong
    # password. Both must count.
    assert login.count("succeeded=False") == 2, login.count("succeeded=False")


def test_the_lock_is_announced_rather_than_disguised():
    src = code_only(BACKEND / "services" / "login_guard.py")
    assert "429" in src or "status_code=429" in src
    assert "locked" in src.lower()


def test_the_lockout_check_fails_open():
    """If the attempts table is unreadable, locking every officer out is
    a self-inflicted outage worse than the risk it mitigates."""
    src = code_only(BACKEND / "services" / "login_guard.py")
    fn = src[src.index("def check_lockout"):]
    assert "except Exception" in fn and "return" in fn


# ── 3. Expiry is a pause ──────────────────────────────────────────────


def test_rotation_retires_the_presented_token():
    src = code_only(BACKEND / "routers" / "auth_extra.py")
    fn = src[src.index("def refresh_token"):src.index("def logout")]
    assert "used_at = NOW()" in fn
    assert "replaced_by" in fn
    assert "'rotated'" in fn


def test_a_replayed_refresh_kills_the_whole_family():
    """Two parties hold the token and we cannot tell which is the
    officer, so both lose the session. Losing a session is a smaller
    harm than letting a thief keep one."""
    src = code_only(BACKEND / "routers" / "auth_extra.py")
    fn = src[src.index("def refresh_token"):src.index("def logout")]
    assert fn.count("revoke_refresh_family") >= 2


def test_the_stub_refresh_endpoint_is_gone():
    """What was here decoded a `type` claim nothing wrote and minted a
    token, with a comment admitting it: "omitted for brevity in this
    starter". An endpoint shaped like refresh with no storage, no
    rotation and no revocation."""
    src = code_only(BACKEND / "routers" / "auth_extra.py")
    assert "omitted for brevity" not in src
    assert 'claims.get("type") != "refresh"' not in src


def test_logout_actually_revokes():
    src = code_only(BACKEND / "routers" / "auth_extra.py")
    fn = src[src.index("def logout"):]
    assert "revoke_jti" in fn
    assert "revoke_refresh_family" in fn


def test_a_refresh_token_we_cannot_record_is_not_issued():
    """A credential outside the system that governs it is a credential
    we cannot revoke — which is the whole ticket."""
    src = code_only(BACKEND / "auth.py")
    fn = src[src.index("def _record_refresh"):src.index("def revoke_jti")]
    assert "raise HTTPException" in fn


# ── The client contract ───────────────────────────────────────────────


FRONTEND = BACKEND.parent / "frontend" / "src"


def test_the_client_refreshes_before_it_gives_up():
    src = (FRONTEND / "lib" / "apiClient.ts").read_text(encoding="utf-8")
    assert "handleUnauthorized" in src
    # ...and retries exactly once, so a dead session cannot loop.
    assert src.count("handleSessionExpired") >= 1


def test_the_client_preserves_before_it_navigates():
    """Order is the whole thing: once the route changes, the React state
    holding her deed is gone and no later step can recover it."""
    src = (FRONTEND / "lib" / "session.ts").read_text(encoding="utf-8")
    fn = src[src.index("export async function handleUnauthorized"):]
    assert fn.index("captureSnapshot") < fn.index("clearTokens")


def test_the_refresh_is_single_flight():
    """Several requests can 401 together. Without this, each would spend
    the refresh token separately, the second would present an
    already-rotated token, and the backend would correctly read that as a
    replay — logging her out for being efficient."""
    src = (FRONTEND / "lib" / "session.ts").read_text(encoding="utf-8")
    assert "inFlight" in src


def test_the_walkthrough_covers_the_whole_thursday():
    src = code_only(BACKEND / "scripts" / "s3_thursday_walkthrough.py")
    for stage in ["expires_delta=timedelta(seconds=-5)", "refresh-token",
                  "candidate", "logout", "429"]:
        assert stage in src, stage
