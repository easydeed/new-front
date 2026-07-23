"""Deed CRUD endpoints (T8 split — moved verbatim from main.py)."""
from time import time
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel, Field

import db
from auth import get_current_user_id
from database import create_deed

router = APIRouter()

# Phase 6-2: Draft persistence (in-memory, replace with DB in Phase 6-3)
_DRAFTS = {}

class DeedCreate(BaseModel):
    deed_type: str = Field(..., description="Deed type, e.g., 'grant-deed'")
    property_address: Optional[str] = Field(default=None)
    apn: Optional[str] = Field(default=None)
    county: Optional[str] = Field(default=None)
    legal_description: str = Field(..., min_length=1, description="Legal description (required, non-empty)")
    owner_type: Optional[str] = Field(default=None)
    sales_price: Optional[float] = Field(default=None)
    grantor_name: str = Field(..., min_length=1, description="Grantor name (required, non-empty)")
    grantee_name: str = Field(..., min_length=1, description="Grantee name (required, non-empty)")
    vesting: Optional[str] = Field(default=None)
    requested_by: Optional[str] = Field(default=None, description="Person/company requesting the deed (e.g., escrow officer)")
    source: Optional[str] = Field(default=None, description="Data source tracking (e.g., 'modern-canonical', 'classic')")
    # T2: extras persisted into deeds.metadata so the stored PDF can render
    # the complete document (DTT declaration, reference numbers, mail-to).
    dtt: Optional[Dict] = Field(default=None, description="Documentary transfer tax details from the builder")
    title_order_no: Optional[str] = Field(default=None)
    escrow_no: Optional[str] = Field(default=None)
    return_to: Optional[str] = Field(default=None, description="Mail-to name for the recorded deed")
    provenance: Optional[Dict] = Field(default=None, description="Per-field source + confirmation timestamps (Ticket B)")

    class Config:
        extra = "ignore"  # Ignore extra fields from frontend

# Phase 6-2: Draft persistence model
class DraftPayload(BaseModel):
    deed_type: str
    data: dict

# Deed endpoints
@router.post("/deeds")
def create_deed_endpoint(deed: DeedCreate, user_id: int = Depends(get_current_user_id)):
    """Create a new deed with validation - Backend Hotfix V1"""

    # Convert Pydantic model to dict
    deed_data = deed.dict()

    # DEFENSIVE: Strip whitespace and validate non-empty for critical fields
    # This provides an additional layer of validation beyond Pydantic
    critical_fields = {
        'grantor_name': 'Grantor information',
        'grantee_name': 'Grantee information',
        'legal_description': 'Legal description'
    }

    for field_name, field_label in critical_fields.items():
        value = (deed_data.get(field_name) or "").strip()
        deed_data[field_name] = value
        if not value:
            print(f"[Backend /deeds] ❌ VALIDATION ERROR: {field_label} is empty!")
            print(f"[Backend /deeds] Received payload: {deed_data}")
            raise HTTPException(
                status_code=422,
                detail=f"Validation failed: {field_label} is required and cannot be empty"
            )

    # Enhanced logging for diagnostics
    print(f"[Backend /deeds] ✅ Creating deed for user_id={user_id}")
    print(f"[Backend /deeds] deed_type: {deed_data.get('deed_type')}")
    print(f"[Backend /deeds] county: {deed_data.get('county')}")  # ✅ PHASE 19: Add county logging
    print(f"[Backend /deeds] grantor_name: {deed_data.get('grantor_name')}")
    print(f"[Backend /deeds] grantee_name: {deed_data.get('grantee_name')}")
    print(f"[Backend /deeds] legal_description: {deed_data.get('legal_description')[:100]}...")
    print(f"[Backend /deeds] source: {deed_data.get('source', 'unknown')}")

    new_deed = create_deed(user_id, deed_data)

    if not new_deed:
        print(f"[Backend /deeds] ❌ create_deed returned None!")
        raise HTTPException(status_code=500, detail="Failed to create deed - check backend logs")

    # T2: render the deed's PDF once at generation time and store it.
    # Non-blocking — if rendering fails the deed record still saves, and
    # /download will retry the render on first request.
    try:
        from services.deed_pdf import generate_and_store
        if db.conn:
            digest = generate_and_store(db.conn, new_deed)
            new_deed["pdf_url"] = f"/deeds/{new_deed['id']}/download"
            print(f"[T2] Stored PDF for deed {new_deed['id']} (sha256 {digest[:12]}…)")
    except Exception as pdf_error:
        print(f"[T2] PDF generation failed for deed {new_deed.get('id')} (non-blocking): {pdf_error}")
        # A failed UPDATE mid-transaction would poison the shared connection
        # ("current transaction is aborted") for every subsequent request.
        try:
            db.conn.rollback()
        except Exception:
            pass

    # Phase 7: Send deed completion notification
    try:
        from utils.notifications import send_deed_completion_notification

        # Get user details for notification
        with db.conn.cursor() as cur:
            cur.execute("SELECT email, full_name FROM users WHERE id = %s", (user_id,))
            user_row = cur.fetchone()

            if user_row:
                user_email = user_row[0]
                user_name = user_row[1] or "Valued Customer"
                deed_type = deed_data.get('deed_type', 'deed')
                deed_id = new_deed.get('id', 0)

                # Send notification (non-blocking)
                notification_sent = send_deed_completion_notification(
                    user_email=user_email,
                    user_name=user_name,
                    deed_type=deed_type,
                    deed_id=deed_id
                )

                if notification_sent:
                    print(f"[Phase 7] ✅ Deed completion email sent to {user_email}")
                else:
                    print(f"[Phase 7] ⚠️ Failed to send deed completion email")
    except Exception as notif_error:
        # Don't fail the request if notification fails
        print(f"[Phase 7] ⚠️ Notification error (non-blocking): {notif_error}")

    return new_deed

@router.get("/deeds")
def list_deeds_endpoint(user_id: int = Depends(get_current_user_id)):
    """List all deeds for current user"""
    try:
        if not db.conn:
            raise HTTPException(status_code=500, detail="Database connection not available")

        with db.conn.cursor() as cur:
            cur.execute("""
                SELECT id, deed_type, property_address, grantor_name, grantee_name,
                       county, status, pdf_url, created_at, updated_at
                FROM deeds
                WHERE user_id = %s AND COALESCE(status, '') <> 'deleted'
                ORDER BY created_at DESC
            """, (user_id,))

            deeds = cur.fetchall()

            # F4: real column values under the schema's own names — the row
            # used to hardcode status "completed" and rename fields (bug #11).
            formatted_deeds = []
            for deed in deeds:
                formatted_deeds.append({
                    "id": deed[0],
                    "deed_type": deed[1],
                    "property_address": deed[2],
                    "grantor_name": deed[3],
                    "grantee_name": deed[4],
                    "county": deed[5],
                    "status": deed[6] or "draft",
                    "pdf_url": deed[7],
                    "created_at": deed[8].strftime("%Y-%m-%d") if deed[8] else None,
                    "updated_at": deed[9].strftime("%Y-%m-%d") if deed[9] else None,
                })

            return {"deeds": formatted_deeds}

    except HTTPException:
        raise
    except Exception as e:
        db.conn.rollback()  # Phase 14-B: Prevent transaction cascade failures
        print(f"Error fetching deeds: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch deeds: {str(e)}")

# --- Phase 6-1: Deeds summary endpoint (for dashboard) ---
@router.get("/deeds/summary")
def deeds_summary(user_id: int = Depends(get_current_user_id)) -> Dict[str, int]:
    """Return aggregated deed counts for the current user."""
    try:
        if not db.conn:
            raise HTTPException(status_code=500, detail="Database connection not available")

        with db.conn.cursor() as cur:
            # F4: real status counts. Vocabulary matches the admin tab:
            # a deed is 'completed' (stored PDF) or it's a draft — the old
            # query counted every deed as completed and hardcoded 0 drafts.
            cur.execute("""
                SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed,
                    COUNT(*) FILTER (WHERE COALESCE(status, 'draft') <> 'completed') as drafts
                FROM deeds
                WHERE user_id = %s AND COALESCE(status, '') <> 'deleted'
            """, (user_id,))

            row = cur.fetchone()
            total = row[0] if row else 0
            completed = row[1] if row else 0
            drafts = row[2] if row else 0

            # Query for deeds created this month
            cur.execute("""
                SELECT COUNT(*)
                FROM deeds
                WHERE user_id = %s AND COALESCE(status, '') <> 'deleted'
                AND created_at >= date_trunc('month', CURRENT_DATE)
            """, (user_id,))

            month_row = cur.fetchone()
            month = month_row[0] if month_row else 0

            return {
                "total": total,
                "completed": completed,
                "drafts": drafts,
                "month": month
            }

    except HTTPException:
        raise
    except Exception as e:
        db.conn.rollback()  # Phase 14-B: Prevent transaction cascade failures
        print(f"Error fetching deed summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch summary: {str(e)}")

# --- Phase 6-2: Wizard draft persistence (minimal in-memory) ---
@router.post("/deeds/drafts")
def save_draft(payload: DraftPayload, user_id: int = Depends(get_current_user_id)):
    """Save a draft deed for the current user"""
    draft_id = f"{user_id}:{int(time())}"
    if user_id not in _DRAFTS:
        _DRAFTS[user_id] = {}
    _DRAFTS[user_id][draft_id] = {
        "deed_type": payload.deed_type,
        "data": payload.data,
        "updated_at": int(time())
    }
    return {"draft_id": draft_id, "message": "Draft saved successfully"}

@router.get("/deeds/drafts")
def list_drafts(user_id: int = Depends(get_current_user_id)):
    """List all draft deeds for the current user"""
    user_drafts = _DRAFTS.get(user_id, {})
    return [
        {"id": draft_id, **draft_data}
        for draft_id, draft_data in user_drafts.items()
    ]

@router.get("/deeds/available")
def list_available_deeds_for_sharing(user_id: int = Depends(get_current_user_id)):
    """List deeds available for sharing (completed deeds)"""
    try:
        if not db.conn:
            raise HTTPException(status_code=500, detail="Database connection not available")

        with db.conn.cursor() as cur:
            cur.execute("""
                SELECT id, property_address, deed_type
                FROM deeds
                WHERE user_id = %s AND COALESCE(status, '') <> 'deleted'
                ORDER BY created_at DESC
            """, (user_id,))

            deeds = cur.fetchall()

            # Format for sharing dropdown
            available_deeds = []
            for deed in deeds:
                available_deeds.append({
                    "id": deed[0],
                    "address": deed[1],
                    "deed_type": deed[2]
                })

            return {"available_deeds": available_deeds}

    except HTTPException:
        raise
    except Exception as e:
        db.conn.rollback()  # Phase 14-B: Prevent transaction cascade failures
        print(f"Error fetching available deeds: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch available deeds: {str(e)}")

@router.get("/deeds/{deed_id}")
def get_deed_endpoint(deed_id: int, user_id: int = Depends(get_current_user_id)):
    """Get a specific deed - Phase 15 v5: Preview page integration"""
    try:
        cursor = db.conn.cursor(cursor_factory=RealDictCursor)

        # Fetch deed - ensure user owns it or is admin
        cursor.execute("""
            SELECT d.*, u.role
            FROM deeds d
            LEFT JOIN users u ON u.id = %s
            WHERE d.id = %s AND (d.user_id = %s OR u.role = 'admin')
        """, (user_id, deed_id, user_id))

        deed = cursor.fetchone()
        cursor.close()

        if not deed:
            raise HTTPException(status_code=404, detail="Deed not found")

        return dict(deed)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching deed {deed_id}: {e}")
        db.conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to fetch deed: {str(e)}")

@router.delete("/deeds/{deed_id}")
def delete_deed_endpoint(deed_id: int, user_id: int = Depends(get_current_user_id)):
    """Soft-delete a deed (owner only): status='deleted', hidden from lists,
    row and stored PDF retained in the database (T5 owner decision)."""
    if not db.conn:
        raise HTTPException(status_code=500, detail="Database connection not available")
    try:
        with db.conn.cursor() as cur:
            cur.execute("SELECT user_id FROM deeds WHERE id = %s", (deed_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Deed not found")
            if row[0] != user_id:
                raise HTTPException(status_code=403, detail="You don't have permission to delete this deed")
            cur.execute("""
                UPDATE deeds SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (deed_id,))
            db.conn.commit()
        return {"success": True, "message": f"Deed {deed_id} deleted"}
    except HTTPException:
        raise
    except Exception as e:
        db.conn.rollback()
        print(f"Error deleting deed {deed_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete deed")

@router.get("/deeds/{deed_id}/download")
def download_deed_endpoint(deed_id: int, user_id: int = Depends(get_current_user_id)):
    """Stream the stored deed PDF; render+store on first request for legacy rows."""
    if not db.conn:
        raise HTTPException(status_code=500, detail="Database connection not available")
    try:
        cursor = db.conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT d.*, u.role
            FROM deeds d
            LEFT JOIN users u ON u.id = %s
            WHERE d.id = %s AND (d.user_id = %s OR u.role = 'admin')
        """, (user_id, deed_id, user_id))
        deed = cursor.fetchone()
        cursor.close()

        if not deed:
            raise HTTPException(status_code=404, detail="Deed not found")

        with db.conn.cursor() as cur:
            cur.execute("SELECT pdf_data FROM deed_pdfs WHERE deed_id = %s", (deed_id,))
            stored = cur.fetchone()

        if stored and stored[0]:
            pdf_bytes = bytes(stored[0])
        else:
            # Legacy row saved before the stored-PDF pipeline: render now,
            # store, and serve — subsequent downloads hit the stored copy.
            from services.deed_pdf import render_deed_pdf, store_deed_pdf
            pdf_bytes = render_deed_pdf(dict(deed))
            store_deed_pdf(db.conn, deed_id, pdf_bytes)

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="deed_{deed_id}.pdf"'},
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error downloading deed {deed_id}: {e}")
        db.conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to generate deed PDF")
