"""API-CONFIRM — the token surface a human opens.

Not `/approve/{token}`. That route reviews an already-completed officer
deed. This one is the only path from a partner POST to a stored PDF.

Unauthenticated, therefore throttled before the database is touched —
same family as the signer token. The payload is an allowlist pinned by
exact key-set equality in `services/api_confirm.py`.
"""
from __future__ import annotations

import io
import json
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from database import get_db_connection
from services import api_confirm_lifecycle
from services.api_confirm import (
    STATUS_COMPLETED, STATUS_PENDING, STATUS_REJECTED,
    confirmation_package, normalize_rejection, resolve_state,
)
from utils.short_code import generate_content_hash
from utils.throttle import ThrottleExceeded, client_key, throttle

router = APIRouter()


class RejectBody(BaseModel):
    issues: List[str] = Field(default_factory=list)
    comment: Optional[str] = None


def _throttle(request: Request, token: str) -> None:
    try:
        throttle(f"confirm-ip:{client_key(request)}", limit=60, window_seconds=60)
        throttle(f"confirm-token:{token}", limit=120, window_seconds=60)
    except ThrottleExceeded as exc:
        raise HTTPException(
            status_code=429,
            detail={"code": "RATE_LIMITED",
                    "message": "Too many requests for this confirmation link"},
            headers={"Retry-After": str(exc.retry_after)},
        )


def _load(token: str, request: Request):
    _throttle(request, token)
    if not token or len(token) < 16:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "This confirmation link is not valid"},
        )
    conn = get_db_connection()
    if not conn:
        raise HTTPException(
            status_code=500,
            detail={"code": "INTERNAL_ERROR", "message": "Database unavailable"},
        )
    try:
        api_confirm_lifecycle.sweep_if_due(conn)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT deed_id, document_id, deed_type, status,
                   confirmation_token, confirmation_expires_at,
                   approver_name, approver_role, approver_email,
                   preview_pdf_data, pdf_data, request_data,
                   property_address, property_apn, property_county,
                   grantor_name, grantee_name
            FROM api_deeds
            WHERE confirmation_token = %s
        """, (token,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(
                status_code=404,
                detail={"code": "NOT_FOUND",
                        "message": "This confirmation link is not valid"},
            )
        return conn, cursor, row
    except HTTPException:
        conn.close()
        raise
    except Exception:
        conn.close()
        raise


@router.get("/confirm/{token}")
async def get_confirmation(token: str, request: Request):
    conn, cursor, row = _load(token, request)
    try:
        package = confirmation_package(row)
        return package
    finally:
        cursor.close()
        conn.close()


@router.get("/confirm/{token}/preview")
async def get_confirmation_preview(token: str, request: Request):
    conn, cursor, row = _load(token, request)
    try:
        state = resolve_state(row)
        if state == STATUS_COMPLETED:
            data = row["pdf_data"]
        elif state == STATUS_PENDING:
            data = row["preview_pdf_data"]
        else:
            raise HTTPException(
                status_code=410,
                detail={"code": "GONE",
                        "message": "This draft is no longer available to preview"},
            )
        if not data:
            raise HTTPException(
                status_code=410,
                detail={"code": "GONE",
                        "message": "This draft is no longer available to preview"},
            )
        return StreamingResponse(
            io.BytesIO(bytes(data)),
            media_type="application/pdf",
            headers={"Content-Disposition": "inline; filename=preview.pdf"},
        )
    finally:
        cursor.close()
        conn.close()


@router.post("/confirm/{token}/approve")
async def approve_confirmation(token: str, request: Request):
    """Promote the preview bytes. Do not re-render.

    Re-rendering would mean the approver saw one document and we stored
    another — immutability defeated by a timestamp.
    """
    conn, cursor, row = _load(token, request)
    try:
        state = resolve_state(row)
        if state != STATUS_PENDING:
            raise HTTPException(
                status_code=409,
                detail={"code": "NOT_PENDING",
                        "message": f"This draft is {state} and cannot be approved"},
            )
        preview = row["preview_pdf_data"]
        if not preview:
            raise HTTPException(
                status_code=409,
                detail={"code": "NOT_PENDING",
                        "message": "Preview bytes are gone; this draft cannot be approved"},
            )

        request_data = row["request_data"] or {}
        if isinstance(request_data, str):
            request_data = json.loads(request_data)
        content_hash = generate_content_hash(json.dumps(request_data, default=str))
        now = datetime.now(timezone.utc)

        cursor.execute("""
            INSERT INTO document_authenticity (
                short_code, document_type, property_address, property_apn, county,
                grantor_display, grantee_display, content_hash, status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'active')
            RETURNING id
        """, (
            row["document_id"],
            row["deed_type"],
            row["property_address"],
            row["property_apn"],
            row["property_county"],
            (row["grantor_name"] or "")[:50],
            (row["grantee_name"] or "")[:50],
            content_hash,
        ))
        authenticity_id = cursor.fetchone()["id"]

        cursor.execute("""
            UPDATE api_deeds
               SET status = %s,
                   pdf_data = preview_pdf_data,
                   preview_pdf_data = NULL,
                   authenticity_id = %s,
                   approved_at = %s
             WHERE confirmation_token = %s
               AND status = %s
        """, (STATUS_COMPLETED, authenticity_id, now, token, STATUS_PENDING))
        if cursor.rowcount != 1:
            conn.rollback()
            raise HTTPException(
                status_code=409,
                detail={"code": "NOT_PENDING",
                        "message": "This draft is no longer awaiting confirmation"},
            )
        conn.commit()
        return {"status": STATUS_COMPLETED, "approved_at": now.isoformat()}
    except HTTPException:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


@router.post("/confirm/{token}/reject")
async def reject_confirmation(token: str, request: Request, body: RejectBody):
    conn, cursor, row = _load(token, request)
    try:
        state = resolve_state(row)
        if state != STATUS_PENDING:
            raise HTTPException(
                status_code=409,
                detail={"code": "NOT_PENDING",
                        "message": f"This draft is {state} and cannot be rejected"},
            )
        try:
            reason = normalize_rejection(issues=body.issues, comment=body.comment)
        except ValueError as exc:
            raise HTTPException(
                status_code=422,
                detail={"code": "VALIDATION_ERROR", "message": str(exc)},
            )
        now = datetime.now(timezone.utc)
        cursor.execute("""
            UPDATE api_deeds
               SET status = %s,
                   preview_pdf_data = NULL,
                   rejected_at = %s,
                   reject_reason = %s
             WHERE confirmation_token = %s
               AND status = %s
        """, (STATUS_REJECTED, now, reason, token, STATUS_PENDING))
        if cursor.rowcount != 1:
            conn.rollback()
            raise HTTPException(
                status_code=409,
                detail={"code": "NOT_PENDING",
                        "message": "This draft is no longer awaiting confirmation"},
            )
        conn.commit()
        return {"status": STATUS_REJECTED, "reject_reason": reason}
    except HTTPException:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()
