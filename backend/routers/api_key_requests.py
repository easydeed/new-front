"""A3 — the honest API-access inquiry funnel.

What this replaces: a form whose submit handler was
`await new Promise(r => setTimeout(r, 2000))` followed by a success
screen promising a review within 24 hours. Nothing was sent, nothing was
stored, and nobody could perform the review — the fabricated-success
class (invariant #4), aimed at the exact people we would want to sell to.

The loop now: the request is STORED first, the owner is emailed through
the one honest transport, and the admin API tab lists what is waiting.
Key issuance stays manual by ruling, so this table is the queue — which
is why the store must survive a failed email, and why the failure reason
is recorded on the row rather than swallowed.
"""
import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field

from auth import get_current_admin, get_current_user_id
# NOTE: two get_db_connection helpers exist in this codebase and they
# differ in ROW TYPE — database.get_db_connection hands out
# RealDictCursor connections (dict rows), db.get_db_connection returns
# the shared connection with tuple rows. Reading one as the other is
# exactly the defect that made every partner API key 401 for months
# (A1). This module reads rows as dicts, so it uses database's, which
# also gives a fresh per-request connection rather than the shared one.
from database import clean_profile_text, get_db_connection
from utils.notifications import notify_api_key_request

router = APIRouter(tags=["API Access Requests"])


class ApiKeyRequestIn(BaseModel):
    company_name: str = Field(..., min_length=1)
    business_type: Optional[str] = None
    contact_name: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    use_case: Optional[str] = None
    expected_volume: Optional[str] = None
    integration_timeline: Optional[str] = None
    current_software: Optional[str] = None
    additional_info: Optional[str] = None


@router.post("/api-key-requests")
def create_api_key_request(payload: ApiKeyRequestIn,
                           user_id: int = Depends(get_current_user_id)):
    """Record an API-access inquiry and ping the owner.

    Returns whether the notification email went out AND why not when it
    did not (the S1 contract) — but the request itself is saved either
    way, and the response says so plainly. The user is told what actually
    happens next: a conversation, not an automatic provisioning.
    """
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503,
                            detail="Unable to record the request right now — please try again.")

    company = clean_profile_text(payload.company_name)
    if not company:
        raise HTTPException(status_code=400, detail="Company name is required")

    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO api_key_requests (
                    user_id, company_name, business_type, contact_name, email, phone,
                    use_case, expected_volume, integration_timeline, current_software,
                    additional_info, status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'new')
                RETURNING id, created_at
            """, (
                user_id, company, payload.business_type,
                clean_profile_text(payload.contact_name), payload.email.lower(),
                clean_profile_text(payload.phone), payload.use_case,
                payload.expected_volume, payload.integration_timeline,
                payload.current_software, payload.additional_info,
            ))
            row = cur.fetchone()
            conn.commit()
    except Exception as e:
        try:
            conn.rollback()
        except Exception:
            pass
        print(f"[api-key-request] store failed: {e}")
        raise HTTPException(status_code=500,
                            detail="Could not record the request — please try again.")

    request_id = row["id"] if isinstance(row, dict) else row[0]
    # The connection stays open only long enough to record the send
    # result below; closed in the finally that follows.

    admin_email = os.getenv("ADMIN_EMAIL", "admin@deedpro.com")
    notified, notify_error = notify_api_key_request(
        admin_email=admin_email,
        company_name=company,
        contact_email=payload.email.lower(),
        business_type=payload.business_type or "—",
        expected_volume=payload.expected_volume or "—",
        use_case=payload.use_case or "",
        request_id=request_id,
    )

    # The row carries whether its own ping landed. A failed email must
    # not lose a sales lead — the admin queue still shows it, flagged.
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE api_key_requests
                SET notified_at = CASE WHEN %s THEN NOW() ELSE NULL END,
                    notify_error = %s
                WHERE id = %s
            """, (notified, None if notified else (notify_error or "unknown")[:500], request_id))
            conn.commit()
    except Exception as e:
        try:
            conn.rollback()
        except Exception:
            pass
        print(f"[api-key-request] could not record notification state: {e}")
    finally:
        try:
            conn.close()
        except Exception:
            pass

    if not notified:
        print(f"[api-key-request] request #{request_id} stored but not emailed: {notify_error}")

    return {
        "success": True,
        "request_id": request_id,
        "email_sent": notified,
        "email_error": notify_error,
        "message": "Your request is recorded. We'll reach out to discuss your integration.",
    }


class ApiKeyInquiryIn(BaseModel):
    """The public path: three fields, no account.

    Ruled after A4 shipped — the developer docs are public, so their
    "Request access" call to action cannot lead to a login wall. A
    platform engineer evaluating the API should be able to start a
    conversation without first creating a DeedPro account they may never
    use. The authenticated form stays for logged-in users, who can give
    us the fuller picture.
    """
    company_name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    use_case: str = Field(..., min_length=1, max_length=2000)


@router.post("/api-key-inquiries")
def create_api_key_inquiry(payload: ApiKeyInquiryIn):
    """Public — deliberately no auth dependency.

    Same store and same transport as the authenticated form, so the
    admin queue is one queue: the row simply has no user_id. Storing
    before sending matters more here, not less — an anonymous inquiry has
    no account we could trace it back to if the email were lost.

    Abuse posture (ruled): no captcha today; length caps and the email
    validator are the whole defence, and the fallback if spam becomes
    real is a plain mailto: link rather than more machinery.
    """
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503,
                            detail="Unable to record the request right now — please try again.")

    company = clean_profile_text(payload.company_name)
    if not company:
        raise HTTPException(status_code=400, detail="Company name is required")

    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO api_key_requests (
                    user_id, company_name, email, use_case, status
                ) VALUES (NULL, %s, %s, %s, 'new')
                RETURNING id
            """, (company, payload.email.lower(), payload.use_case))
            request_id = cur.fetchone()[0]
            conn.commit()
    except Exception as e:
        try:
            conn.rollback()
        except Exception:
            pass
        print(f"[api-key-inquiry] store failed: {e}")
        raise HTTPException(status_code=500,
                            detail="Could not record the request — please try again.")

    admin_email = os.getenv("ADMIN_EMAIL", "admin@deedpro.com")
    notified, notify_error = notify_api_key_request(
        admin_email=admin_email,
        company_name=company,
        contact_email=payload.email.lower(),
        business_type="—",
        expected_volume="—",
        use_case=payload.use_case,
        request_id=request_id,
    )

    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE api_key_requests
                SET notified_at = CASE WHEN %s THEN NOW() ELSE NULL END,
                    notify_error = %s
                WHERE id = %s
            """, (notified, None if notified else (notify_error or "unknown")[:500], request_id))
            conn.commit()
    except Exception as e:
        try:
            conn.rollback()
        except Exception:
            pass
        print(f"[api-key-inquiry] could not record notification state: {e}")
    finally:
        try:
            conn.close()
        except Exception:
            pass

    if not notified:
        print(f"[api-key-inquiry] inquiry #{request_id} stored but not emailed: {notify_error}")

    return {
        "success": True,
        "request_id": request_id,
        "email_sent": notified,
        "email_error": notify_error,
        "message": "Your request is recorded. We'll reach out to discuss your integration.",
    }


@router.get("/admin/api-key-requests")
def list_api_key_requests(status: Optional[str] = None,
                          admin=Depends(get_current_admin)):
    """The queue behind the manual-issuance ruling."""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database unavailable")
    with conn.cursor() as cur:
        if status:
            cur.execute("""
                SELECT id, company_name, business_type, contact_name, email, phone,
                       use_case, expected_volume, integration_timeline, current_software,
                       additional_info, status, notified_at, notify_error, created_at
                FROM api_key_requests WHERE status = %s
                ORDER BY created_at DESC LIMIT 100
            """, (status,))
        else:
            cur.execute("""
                SELECT id, company_name, business_type, contact_name, email, phone,
                       use_case, expected_volume, integration_timeline, current_software,
                       additional_info, status, notified_at, notify_error, created_at
                FROM api_key_requests
                ORDER BY created_at DESC LIMIT 100
            """)
        items = [dict(r) for r in cur.fetchall()]
    conn.close()
    return {"items": items, "total": len(items)}


class RequestStatusIn(BaseModel):
    status: str = Field(..., description="new | contacted | approved | declined")


@router.patch("/admin/api-key-requests/{request_id}")
def update_api_key_request(request_id: int, payload: RequestStatusIn,
                           admin=Depends(get_current_admin)):
    allowed = {"new", "contacted", "approved", "declined"}
    if payload.status not in allowed:
        raise HTTPException(status_code=400,
                            detail=f"status must be one of {sorted(allowed)}")
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database unavailable")
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE api_key_requests SET status = %s WHERE id = %s
            RETURNING id, company_name, status
        """, (payload.status, request_id))
        row = cur.fetchone()
        if not row:
            conn.close()
            raise HTTPException(status_code=404, detail="Request not found")
        conn.commit()
    result = dict(row)
    conn.close()
    return {"success": True, "request": result}
