import os
import time
from datetime import timedelta, datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Body, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field, validator
from jose import jwt, JWTError

try:
    # Project-local utilities
    # RED-H1.2: db_connection() closes on every exit. All four
    # endpoints in this module are UNAUTHENTICATED (forgot-password,
    # reset-password, both verify-email routes) and none of them
    # closed its connection — four more anonymous leak vectors of the
    # same class as the inquiry endpoint, and forgot-password sends
    # an email too, so it carried both amplifiers.
    from database import db_connection
    from auth import create_access_token, get_password_hash, AuthUtils, ALGORITHM, SECRET_KEY
    from utils.email import email_configured  # Phase 7.5: Relative import first
    from utils.notifications import (
        send_password_reset_with_reason,
        send_verify_email_with_reason,
        send_password_changed_with_reason,
    )
except Exception as e:
    # Fallback names if modules are under different paths; adjust as needed in your repo
    from backend.database import db_connection  # type: ignore
    from backend.auth import create_access_token, get_password_hash, AuthUtils, ALGORITHM, SECRET_KEY  # type: ignore
    from backend.utils.email import email_configured  # Phase 7.5: Absolute fallback
    from backend.utils.notifications import (  # type: ignore
        send_password_reset_with_reason,
        send_verify_email_with_reason,
        send_password_changed_with_reason,
    )

router = APIRouter()

EMAIL_VERIFICATION_REQUIRED = os.getenv("EMAIL_VERIFICATION_REQUIRED", "false").lower() == "true"
REFRESH_TOKENS_ENABLED = os.getenv("REFRESH_TOKENS_ENABLED", "false").lower() == "true"
LOGIN_RATE_LIMIT = os.getenv("LOGIN_RATE_LIMIT", "true").lower() == "true"
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

RESET_TOKEN_TTL_HOURS = int(os.getenv("RESET_TOKEN_TTL_HOURS", "1"))
VERIFY_TOKEN_TTL_HOURS = int(os.getenv("VERIFY_TOKEN_TTL_HOURS", "24"))

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str = Field(..., description="Reset token")
    new_password: str
    confirm_password: str

    @validator("confirm_password")
    def passwords_match(cls, v, values):
        if "new_password" in values and v != values["new_password"]:
            raise ValueError("Passwords don't match")
        return v

class VerifyEmailRequest(BaseModel):
    email: EmailStr

@router.post("/users/forgot-password")
def forgot_password(payload: ForgotPasswordRequest):
    """Send password reset email. Always return success to avoid user enumeration."""
    # Invariant #4: with no email provider configured, "we sent a reset
    # link" is a fabricated success. Fail uniformly BEFORE the user lookup
    # so the honest error carries no enumeration signal either.
    if not email_configured():
        raise HTTPException(
            status_code=503,
            detail="Password reset is not available yet — email service is not configured.",
        )
    email = payload.email.lower()
    try:
        with db_connection() as conn, conn.cursor() as cur:
            cur.execute("SELECT id, full_name FROM users WHERE email = %s", (email,))
            row = cur.fetchone()
        if not row:
            # Don't leak whether user exists
            return {"message": "If the email exists, we sent a reset link."}

        user_id, full_name = row[0], row[1] or "there"
        reset_token = create_access_token(
            data={"sub": str(user_id), "type": "reset"},
            expires_delta=timedelta(hours=RESET_TOKEN_TTL_HOURS)
        )
        reset_url = f"{FRONTEND_URL}/reset-password?token={reset_token}"
        sent, reason = send_password_reset_with_reason(
            email, full_name, reset_url, RESET_TOKEN_TTL_HOURS
        )
        if not sent:
            # Provider configured but the send failed: log loudly WITH the
            # reason, keep the generic message (a distinct error here would
            # leak that the account exists).
            print(f"[forgot-password] send failed for an existing account: {reason}")
        return {"message": "If the email exists, we sent a reset link."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to process request")

@router.post("/users/reset-password")
def reset_password(payload: ResetPasswordRequest):
    """Reset password using a time-limited token."""
    try:
        # Validate token
        claims = jwt.decode(payload.token, SECRET_KEY, algorithms=[ALGORITHM])
        if claims.get("type") != "reset":
            raise HTTPException(status_code=400, detail="Invalid token")
        user_id = int(claims.get("sub"))
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    # Validate password
    ok, msg = AuthUtils.validate_password_strength(payload.new_password)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)

    hashed = get_password_hash(payload.new_password)
    try:
        with db_connection() as conn, conn.cursor() as cur:
            cur.execute("UPDATE users SET password_hash = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s RETURNING email, full_name", (hashed, user_id))
            updated = cur.fetchone()
            conn.commit()
        # E1: security notice on successful change (lifecycle gap — a
        # credential change left no trace in the user's inbox). Best-effort:
        # the reset itself already succeeded.
        if updated:
            u_email, u_name = updated[0], updated[1] or ""
            try:
                pc_sent, pc_reason = send_password_changed_with_reason(u_email, u_name)
                if not pc_sent:
                    print(f"[reset-password] changed-notice not sent: {pc_reason}")
            except Exception as pc_err:
                print(f"[reset-password] changed-notice error (non-blocking): {pc_err}")
        return {"message": "Password reset successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to reset password")

@router.post("/users/verify-email/request")
def request_verify_email(payload: VerifyEmailRequest):
    email = payload.email.lower()
    try:
        with db_connection() as conn, conn.cursor() as cur:
            cur.execute("SELECT id, full_name, verified FROM users WHERE email = %s", (email,))
            row = cur.fetchone()
        if not row:
            return {"message": "If the email exists, we sent a verification link."}
        user_id, full_name, verified = row
        if verified:
            return {"message": "Email already verified"}
        token = create_access_token(
            data={"sub": str(user_id), "type": "verify"},
            expires_delta=timedelta(hours=VERIFY_TOKEN_TTL_HOURS)
        )
        verify_url = f"{FRONTEND_URL}/verify-email?token={token}"
        v_sent, v_reason = send_verify_email_with_reason(email, full_name or "", verify_url)
        if not v_sent:
            print(f"[verify-email] send failed: {v_reason}")
        return {"message": "If the email exists, we sent a verification link."}
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to send verification email")

@router.get("/users/verify-email")
def verify_email(token: str):
    try:
        claims = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if claims.get("type") != "verify":
            raise HTTPException(status_code=400, detail="Invalid token")
        user_id = int(claims.get("sub"))
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    try:
        with db_connection() as conn, conn.cursor() as cur:
            cur.execute("UPDATE users SET verified = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = %s", (user_id,))
            conn.commit()
        return {"message": "Email verified"}
    except Exception:
        raise HTTPException(status_code=500, detail="Verification failed")

# Optional refresh tokens (OFF by default)
class RefreshTokenRequest(BaseModel):
    refresh_token: str

@router.post("/users/refresh-token")
def refresh_token(payload: RefreshTokenRequest):
    if not REFRESH_TOKENS_ENABLED:
        raise HTTPException(status_code=403, detail="Refresh tokens disabled")
    try:
        claims = jwt.decode(payload.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        if claims.get("type") != "refresh":
            raise HTTPException(status_code=400, detail="Invalid refresh token")
        user_id = int(claims.get("sub"))
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    # In production you'd verify token hash in DB; omitted for brevity in this starter
    # Issue a short-lived access token
    new_access = create_access_token(data={"sub": str(user_id)}, expires_delta=timedelta(minutes=30))
    return {"access_token": new_access, "token_type": "bearer"}
