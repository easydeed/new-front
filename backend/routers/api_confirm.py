"""API-CONFIRM — the token surface a human opens.

Not `/approve/{token}`. That route reviews an already-completed officer
deed. This one is the only path from a partner POST to a stored PDF.

Unauthenticated, therefore throttled before the database is touched —
same family as the signer token. The payload is an allowlist pinned by
exact key-set equality in `services/api_confirm.py`.
"""
from __future__ import annotations

import hashlib
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
    ARTIFACT_DECLARATIONS, STATUS_COMPLETED, STATUS_PENDING, STATUS_REJECTED,
    assert_artifact_keys, confirmation_package, normalize_rejection,
    resolve_state,
)
from utils.short_code import generate_content_hash
from utils.throttle import ThrottleExceeded, client_key, throttle

router = APIRouter()


class RejectBody(BaseModel):
    issues: List[str] = Field(default_factory=list)
    comment: Optional[str] = None


class ApproveBody(BaseModel):
    """ENGINE1. Both fields optional, for different reasons.

    `draft_sha256` — the SHA-256 the CLIENT computed over the PDF bytes it
    displayed. Optional because the hosted page is not the only possible
    client and a browser that could not hash should still be able to
    approve; when it IS sent, a mismatch is a 409 rather than a warning.

    `license` — OWNER-RULED OPTIONAL, and it stays optional on purpose.
    We would not verify it. A required-but-unverified field is
    stronger-looking provenance than we actually have, which is the first
    thing a vendor review asks about; and "license" is not one thing
    across escrow, title, bar and notary, so a required field would force
    a shape onto four professions that do not share one.
    """
    draft_sha256: Optional[str] = Field(default=None, min_length=64, max_length=64)
    license: Optional[str] = Field(default=None, max_length=120)


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
                   approver_license, draft_sha256, approved_at,
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
async def approve_confirmation(token: str, request: Request,
                               body: Optional[ApproveBody] = None):
    """Promote the preview bytes. Do not re-render.

    Re-rendering would mean the approver saw one document and we stored
    another — immutability defeated by a timestamp.

    ═══ ENGINE1: WHAT `draft_sha256` PROVES, EXACTLY ═══

    It binds the approver's name to THOSE BYTES, and it shows the browser
    fetched them. That is the whole of it.

    **It does not prove a human read the document.** A client can hash
    bytes it never painted, and a person can approve a rendered page
    without looking at it. The check closes one specific hole — that the
    bytes we store might differ from the bytes the client had — and
    claiming more from it would be the kind of stronger-looking
    provenance this ticket exists to refuse.
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

        # ENGINE1 — compare BEFORE the promotion, so a mismatch leaves the
        # draft pending rather than storing bytes the client never saw.
        pdf_sha256 = hashlib.sha256(bytes(preview)).hexdigest()
        claimed = (body.draft_sha256 if body else None) or None
        if claimed and claimed.lower() != pdf_sha256:
            raise HTTPException(
                status_code=409,
                detail={"code": "DRAFT_MISMATCH",
                        "message": "The bytes you hashed are not the bytes we "
                                   "hold for this draft. Re-fetch the preview "
                                   "and confirm again."},
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
                   approved_at = %s,
                   draft_sha256 = %s,
                   approver_license = COALESCE(%s, approver_license)
             WHERE confirmation_token = %s
               AND status = %s
        """, (STATUS_COMPLETED, authenticity_id, now, pdf_sha256,
              (body.license or "").strip() or None if body else None,
              token, STATUS_PENDING))
        if cursor.rowcount != 1:
            conn.rollback()
            raise HTTPException(
                status_code=409,
                detail={"code": "NOT_PENDING",
                        "message": "This draft is no longer awaiting confirmation"},
            )
        conn.commit()
        return {"status": STATUS_COMPLETED, "approved_at": now.isoformat(),
                "draft_sha256": pdf_sha256}
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


@router.get("/confirm/{token}/artifact")
async def get_confirmation_artifact(token: str, request: Request):
    """ENGINE1 — what an auditor gets, and nothing else.

    ═══ WHY THE TWO HASHES ARE ONE HASH ═══

    The mockup showed a draft hash and a PDF hash as separate rows, which
    reads as two independent facts agreeing. **They cannot disagree.**
    Approve PROMOTES the preview bytes rather than re-rendering, so the
    bytes the approver saw and the bytes we stored are the same object.
    One field, named once, with that stated — because two identical
    numbers presented as corroboration is exactly the stronger-looking
    provenance this ticket refuses.

    ═══ WHAT IT DOES AND DOES NOT ESTABLISH ═══

    Establishes: this named person, in this role, approved a document
    with this SHA-256, at this moment, and the bytes we hold hash to it.

    Does NOT establish: that they read it, that they were entitled to
    approve it, or that the licence string is true. The licence is
    recorded when supplied and is NEVER verified — it is reproduced here
    as `license_claimed` so no reader can mistake it for a check we ran.
    """
    conn, cursor, row = _load(token, request)
    try:
        if resolve_state(row) != STATUS_COMPLETED:
            raise HTTPException(
                status_code=409,
                detail={"code": "NOT_COMPLETED",
                        "message": "No artifact exists until the draft is approved"},
            )
        pdf = row["pdf_data"]
        artifact = {
            "document_id": row["document_id"],
            "deed_type": row["deed_type"],
            # ONE hash. See the docstring: the draft and the stored PDF
            # are the same bytes by construction, and `draft_sha256` is
            # what was compared at approval. Recomputed here from the
            # stored bytes so the artifact reports what we HOLD rather
            # than what we once wrote down.
            "pdf_sha256": hashlib.sha256(bytes(pdf)).hexdigest() if pdf else None,
            "sha256_recorded_at_approval": row["draft_sha256"],
            "confirmed_by": (row["approver_name"] or "").strip() or None,
            "role": (row["approver_role"] or "").strip() or None,
            "license_claimed": (row["approver_license"] or "").strip() or None,
            "confirmed_at": (
                row["approved_at"].isoformat() if row["approved_at"] else None
            ),
            "declarations": list(ARTIFACT_DECLARATIONS),
        }
        assert_artifact_keys(artifact)
        return artifact
    finally:
        cursor.close()
        conn.close()
