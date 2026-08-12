"""Deed CRUD endpoints (T8 split — moved verbatim from main.py)."""
import os
from datetime import timezone
from time import time
from typing import Dict, Optional, Union

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel, Field

import db
from auth import get_current_user_id
from database import create_deed
from services import pcor_offer

router = APIRouter()


def _iso_utc(dt) -> Optional[str]:
    """Naive DB TIMESTAMP (stored UTC) → ISO string with explicit offset."""
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


# Phase 6-2: Draft persistence (in-memory, replace with DB in Phase 6-3)
_DRAFTS = {}

class DeedCreate(BaseModel):
    deed_type: str = Field(..., description="Deed type, e.g., 'grant-deed'")
    property_address: Optional[str] = Field(default=None)
    apn: Optional[str] = Field(default=None)
    county: Optional[str] = Field(default=None)
    # Required for every parcel-tied instrument — enforced by the family-
    # aware critical-field check (same 422s); property-less instruments
    # (certification of trust) legitimately have none.
    legal_description: Optional[str] = Field(default=None, description="Legal description (required for parcel-tied instruments)")
    owner_type: Optional[str] = Field(default=None)
    sales_price: Optional[float] = Field(default=None)
    # FORMS parties migration: the pair is required for two-party families
    # (deed, affidavit) — enforced by the family-aware critical-field check
    # below, which returns the same 400s as before. Single-party families
    # (declaration) carry their parties in `parties` instead, so the model
    # itself can no longer hard-require the pair.
    grantor_name: Optional[str] = Field(default=None, description="Grantor name (required for two-party instruments)")
    grantee_name: Optional[str] = Field(default=None, description="Grantee name (required for two-party instruments)")
    vesting: Optional[str] = Field(default=None)
    requested_by: Optional[str] = Field(default=None, description="Person/company requesting the deed (e.g., escrow officer)")
    requested_by_address: Optional[str] = Field(default=None, description="Requesting party's mailing address (one line)")
    source: Optional[str] = Field(default=None, description="Data source tracking (e.g., 'modern-canonical', 'classic')")
    # T2: extras persisted into deeds.metadata so the stored PDF can render
    # the complete document (DTT declaration, reference numbers, mail-to).
    dtt: Optional[Dict] = Field(default=None, description="Documentary transfer tax details from the builder")
    title_order_no: Optional[str] = Field(default=None)
    escrow_no: Optional[str] = Field(default=None)
    # Bare string (name only, legacy) or a full mail-to block
    # ({name, company?, address1, address2?, city, state, zip}) — the
    # template and build_context_from_row handle both shapes.
    return_to: Optional[Union[str, Dict[str, Optional[str]]]] = Field(
        default=None, description="Mail-to for the recorded deed (name or address block)")
    provenance: Optional[Dict] = Field(default=None, description="Per-field source + confirmation timestamps (Ticket B)")
    # Resume-persistence follow-up: city/state/zip and the county-records
    # owner were only recoverable by parsing the address string (or not at
    # all) — persist them into metadata so a resumed draft restores fully.
    property_city: Optional[str] = Field(default=None)
    property_state: Optional[str] = Field(default=None)
    property_zip: Optional[str] = Field(default=None)
    current_owner: Optional[str] = Field(default=None, description="Owner per county records (prefill source)")
    # FORMS-SPIKE: affidavit-of-death facts (affiant, decedent, JT-deed
    # recording reference) — persisted into metadata.affidavit.
    affidavit: Optional[Dict] = Field(default=None, description="Affidavit facts for affidavit-type instruments")
    # FORMS parties migration (owner-ledgered): named parties of single-party
    # instruments (e.g. {"declarant": "..."}) — deeds.parties JSONB column.
    # Two-party instruments keep the authoritative grantor/grantee columns.
    parties: Optional[Dict[str, Optional[str]]] = Field(
        default=None, description="Named parties for single-party instruments (declaration family)")
    # Ticket R: present when regenerating a RESUMED DRAFT — updates that
    # row instead of inserting a new one. Drafts only; completed deeds are
    # immutable (their PDF is stored) and deleted stays deleted.
    deed_id: Optional[int] = Field(default=None, description="Existing draft to update (builder resume)")

    class Config:
        extra = "ignore"  # Ignore extra fields from frontend

# Phase 6-2: Draft persistence model
class DraftPayload(BaseModel):
    deed_type: str
    data: dict

# U1: autosave payload — every field optional except deed_type. A draft may
# be arbitrarily incomplete (the officer typed one field and left); the
# generate path's critical-field validation does NOT apply here. Shape
# otherwise mirrors DeedCreate so the draft row is the same row generate
# later completes (deed_id threads through).
class DraftSave(BaseModel):
    deed_type: str = Field(..., description="Deed type, e.g., 'grant-deed'")
    deed_id: Optional[int] = Field(default=None, description="Existing draft row to update; omit on first save")
    property_address: Optional[str] = None
    apn: Optional[str] = None
    county: Optional[str] = None
    legal_description: Optional[str] = None
    grantor_name: Optional[str] = None
    grantee_name: Optional[str] = None
    vesting: Optional[str] = None
    requested_by: Optional[str] = None
    requested_by_address: Optional[str] = None
    source: Optional[str] = None
    dtt: Optional[Dict] = None
    title_order_no: Optional[str] = None
    escrow_no: Optional[str] = None
    return_to: Optional[Union[str, Dict[str, Optional[str]]]] = None
    provenance: Optional[Dict] = None
    property_city: Optional[str] = None
    property_state: Optional[str] = None
    property_zip: Optional[str] = None
    current_owner: Optional[str] = None
    affidavit: Optional[Dict] = None
    parties: Optional[Dict[str, Optional[str]]] = None

    class Config:
        extra = "ignore"

# Deed endpoints
@router.post("/deeds")
def create_deed_endpoint(deed: DeedCreate, user_id: int = Depends(get_current_user_id)):
    """Create a new deed with validation - Backend Hotfix V1"""

    # Convert Pydantic model to dict
    deed_data = deed.dict()

    # DEFENSIVE: Strip whitespace and validate non-empty for critical fields
    # This provides an additional layer of validation beyond Pydantic.
    # FORMS parties migration: single-party families (declaration) have no
    # grantor/grantee — they must name at least one party in `parties`;
    # two-party families keep the strict pair exactly as before.
    from services.form_families import is_single_party, requires_legal_description
    if is_single_party(deed_data.get('deed_type')):
        critical_fields = (
            {'legal_description': 'Legal description'}
            if requires_legal_description(deed_data.get('deed_type'))
            else {}
        )
        parties = {
            k: (v or '').strip() for k, v in (deed_data.get('parties') or {}).items()
        }
        deed_data['parties'] = parties
        if not any(parties.values()):
            print(f"[Backend /deeds] ❌ VALIDATION ERROR: no named party on single-party instrument!")
            # Same status/shape as the two-party critical-field failures.
            raise HTTPException(
                status_code=422,
                detail="Validation failed: Party information is required and cannot be empty"
            )
    else:
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
    print(f"[Backend /deeds] legal_description: {(deed_data.get('legal_description') or '')[:100]}...")
    print(f"[Backend /deeds] source: {deed_data.get('source', 'unknown')}")

    # Ticket R: a resumed draft regenerates INTO ITS OWN ROW.
    resume_deed_id = deed_data.pop('deed_id', None)
    if resume_deed_id:
        from database import update_deed_draft
        new_deed = update_deed_draft(user_id, resume_deed_id, deed_data)
        if not new_deed:
            # Wrong owner, already completed (PDF immutability), deleted,
            # or missing — refuse rather than silently forking a new row.
            raise HTTPException(
                status_code=409,
                detail="This deed can no longer be updated (not found, not yours, or already completed)",
            )
    else:
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
        # H1 (invariant #4, the flagship flow): a deed saved without its
        # PDF must SAY so — print-only failure let production celebrate
        # every generation while storing nothing (completed_at incident).
        # The deed stays a draft; /download retries the render on request.
        new_deed["pdf_error"] = (
            "The deed was saved, but its PDF could not be generated and "
            "stored. It remains a draft; opening or downloading it will "
            "retry."
        )
        # Diagnostic surfacing: the owner of the deed may see WHY (class +
        # trimmed message) — a generic error hid the completed_at incident
        # for weeks. Render logs carry the full trace.
        new_deed["pdf_error_detail"] = f"{type(pdf_error).__name__}: {str(pdf_error)[:200]}"

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

                # Send notification (non-blocking). Signature drifted when
                # the helper gained property_address/preview_link — this
                # call failed on EVERY generation until 2026-07-28.
                frontend_url = os.getenv("FRONTEND_URL", "https://deedpro-frontend-new.vercel.app")
                # E1: sender returns (ok, reason) — the reason is logged,
                # never swallowed into a bare boolean.
                email_ok, email_reason = send_deed_completion_notification(
                    user_email=user_email,
                    user_name=user_name,
                    deed_type=deed_type,
                    property_address=deed_data.get('property_address', ''),
                    deed_id=deed_id,
                    preview_link=f"{frontend_url}/past-deeds?highlight={deed_id}",
                )

                if email_ok:
                    print(f"[Phase 7] ✅ Deed completion email sent to {user_email}")
                else:
                    print(f"[Phase 7] ⚠️ Completion email not sent: {email_reason}")
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
                       county, status, pdf_url, created_at, updated_at, apn, parties
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
                    # U1.4: full ISO timestamps, not date-only strings — the
                    # browser parses "2026-07-28" as UTC midnight, which
                    # renders as the PREVIOUS day anywhere west of Greenwich.
                    # The column is a naive TIMESTAMP holding UTC, so stamp
                    # the offset explicitly or the browser assumes local.
                    "created_at": _iso_utc(deed[8]),
                    "updated_at": _iso_utc(deed[9]),
                    # X2.6/X2.7: the parcel id — dupe-parcel awareness in the
                    # builder and searchable rows in Past Deeds.
                    "apn": deed[10],
                    # FORMS parties migration: named parties of single-party
                    # instruments (Past Deeds projects these when the
                    # grantor/grantee columns are legitimately empty).
                    "parties": deed[11],
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

            # DASH1: LAST 30 DAYS, not "this month".
            #
            # `date_trunc('month', ...)` renders a big zero on the first
            # of every month, for a user whose work did not stop — the
            # counter tells her she has done nothing when what happened
            # is that a calendar page turned. The admin surface already
            # carries a paragraph apologising for exactly this framing;
            # this is the honest version it settled on.
            #
            # `month` is kept in the response ALONGSIDE it rather than
            # renamed away, for one release: an old cached bundle asking
            # for a key that vanished renders `undefined`, and FLOW1 item
            # 0 was a whole PR about what that looks like. It is marked
            # here so the next reader knows it is a deprecation and not a
            # duplicate.
            cur.execute("""
                SELECT
                    COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days') AS last_30,
                    COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)) AS month
                FROM deeds
                WHERE user_id = %s AND COALESCE(status, '') <> 'deleted'
            """, (user_id,))

            row = cur.fetchone()
            last_30 = (row[0] if row else 0) or 0
            month = (row[1] if row else 0) or 0

            return {
                "total": total,
                "completed": completed,
                "drafts": drafts,
                "last_30_days": last_30,
                # DEPRECATED — see above. Remove one release after the
                # dashboard stops reading it.
                "month": month,
            }

    except HTTPException:
        raise
    except Exception as e:
        db.conn.rollback()  # Phase 14-B: Prevent transaction cascade failures
        print(f"Error fetching deed summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch summary: {str(e)}")

# --- U1: durable draft autosave (the real one — deed row, not memory) ---
@router.post("/deeds/draft")
def save_draft_endpoint(draft: DraftSave, user_id: int = Depends(get_current_user_id)):
    """Create-or-update a draft deed row from in-progress builder state.

    First save (no deed_id) inserts and returns the row id; the builder
    keeps it for every subsequent save and hands it to generate as deed_id,
    so autosave and generate converge on ONE row — never a duplicate.
    Completed deeds refuse the update (stored-PDF immutability), as do
    deleted rows: both 409.
    """
    from database import save_draft_row

    draft_data = draft.dict()
    deed_id = draft_data.pop('deed_id', None)
    row = save_draft_row(user_id, deed_id, draft_data)
    if not row:
        if deed_id:
            # Wrong owner, completed, deleted, or missing — refuse rather
            # than silently forking a new row (same doctrine as generate).
            raise HTTPException(
                status_code=409,
                detail="This draft can no longer be updated (not found, not yours, or already completed)",
            )
        raise HTTPException(status_code=500, detail="Failed to save draft - check backend logs")

    return {
        "id": row["id"],
        "status": row.get("status") or "draft",
        "updated_at": _iso_utc(row.get("updated_at")),
    }

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
        cursor = db.conn.cursor()

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

@router.get("/deeds/{deed_id}/pcor")
def pcor_status_endpoint(deed_id: int, user_id: int = Depends(get_current_user_id)):
    """Is a PCOR available for this deed's county, and what will it still
    need from the buyer?

    T-3. The body is built by `services/pcor_offer.py` — the notary now
    offers the same form from her signing link, and two surfaces offering
    one document must offer the same shape of it.
    """
    return pcor_offer.status(_pcor_deed_row(deed_id, user_id),
                             f"/deeds/{deed_id}/pcor.pdf")


@router.get("/deeds/{deed_id}/pcor.pdf")
def pcor_download_endpoint(deed_id: int, user_id: int = Depends(get_current_user_id)):
    """Stream the filled PCOR — UNFLATTENED, so the buyer can finish it.

    Not stored and not hashed, deliberately. A deed is ours and is frozen
    (doctrine §9); this is the buyer's form, and freezing a document
    somebody else must complete and sign would be the wrong kind of
    faithful.
    """
    return pcor_offer.download(_pcor_deed_row(deed_id, user_id),
                               f"PCOR-deed-{deed_id}.pdf")


def _pcor_deed_row(deed_id: int, user_id: int) -> dict:
    """Owner-or-admin fetch, mirroring /download's access rule."""
    if not db.conn:
        raise HTTPException(status_code=500, detail="Database connection not available")
    with db.conn.cursor() as cur:
        cur.execute("""
            SELECT d.*, u.role
            FROM deeds d
            LEFT JOIN users u ON u.id = %s
            WHERE d.id = %s AND (d.user_id = %s OR u.role = 'admin')
        """, (user_id, deed_id, user_id))
        deed = cur.fetchone()
    if not deed:
        raise HTTPException(status_code=404, detail="Deed not found")
    return dict(deed)


class SupersedeRequest(BaseModel):
    """The correcting instrument's id. It must already be generated —
    lineage points at a document, not at an intention."""
    superseded_by: int


@router.post("/deeds/{deed_id}/supersede")
def supersede_endpoint(deed_id: int, body: SupersedeRequest,
                       user_id: int = Depends(get_current_user_id)):
    """T-5 — record that a new instrument replaces this one.

    A NEW ROW AND A POINTER. The superseded deed is not edited, not
    deleted, and not hidden: its PDF, hash and status all stay exactly as
    they were, and the single write here is `superseded_by` going from
    NULL to the new document's id.

    The pointer is written once. A second write would silently redirect
    history, which is the harm §9 refuses on the artifacts and this
    refuses on the lineage.
    """
    from services.supersession import SupersessionRefused, validate_supersession

    old = _pcor_deed_row(deed_id, user_id)
    new_row = _pcor_deed_row(body.superseded_by, user_id)
    try:
        validate_supersession(old, new_row)
    except SupersessionRefused as e:
        raise HTTPException(status_code=409, detail=str(e))

    with db.conn.cursor() as cur:
        # Guarded in SQL as well as in Python: the IS NULL predicate makes
        # the write-once rule true even under a concurrent second request,
        # which the application check alone cannot promise.
        cur.execute("""
            UPDATE deeds
               SET superseded_by = %s, superseded_at = now()
             WHERE id = %s AND superseded_by IS NULL
            RETURNING id, superseded_by, superseded_at
        """, (body.superseded_by, deed_id))
        updated = cur.fetchone()
        if updated is None:
            db.conn.rollback()
            raise HTTPException(
                status_code=409,
                detail="This document was superseded by another request "
                       "moments ago. Reload to see the current version.")
        db.conn.commit()

    return {
        "superseded": deed_id,
        "superseded_by": updated["superseded_by"],
        "superseded_at": updated["superseded_at"].isoformat() if updated["superseded_at"] else None,
        "note": "The superseded document is unchanged and still readable. "
                "A corrected deed is a new instrument and requires its own "
                "execution — we record the relationship, we do not un-record "
                "documents.",
    }


@router.get("/deeds/{deed_id}/lineage")
def lineage_endpoint(deed_id: int, user_id: int = Depends(get_current_user_id)):
    """The correction chain, forwards and backwards, all of it readable.

    The history is the feature, not the embarrassment: an officer asked
    six months later which version was recorded needs to see both and see
    which replaced which.
    """
    from services.supersession import lineage_state

    row = _pcor_deed_row(deed_id, user_id)
    with db.conn.cursor() as cur:
        cur.execute("""
            WITH RECURSIVE forward AS (
                SELECT id, deed_type, status, superseded_by, superseded_at, created_at
                  FROM deeds WHERE id = %s
                UNION ALL
                SELECT d.id, d.deed_type, d.status, d.superseded_by, d.superseded_at, d.created_at
                  FROM deeds d JOIN forward f ON d.id = f.superseded_by
            )
            SELECT * FROM forward
        """, (deed_id,))
        forward = [dict(r) for r in cur.fetchall()]

        cur.execute("""
            SELECT id, deed_type, status, superseded_by, superseded_at, created_at
              FROM deeds WHERE superseded_by = %s AND user_id = %s
        """, (deed_id, row.get("user_id")))
        supersedes = [dict(r) for r in cur.fetchall()]

    def shape(r):
        return {
            "id": r["id"],
            "deed_type": r["deed_type"],
            "status": r["status"],
            "lineage_state": lineage_state(r),
            "superseded_by": r.get("superseded_by"),
            "superseded_at": r["superseded_at"].isoformat() if r.get("superseded_at") else None,
            "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
        }

    return {
        "deed_id": deed_id,
        "lineage_state": lineage_state(row),
        "chain": [shape(r) for r in forward],
        "supersedes": [shape(r) for r in supersedes],
        "current_version": shape(forward[-1])["id"] if forward else deed_id,
    }


@router.post("/prelim/import")
async def prelim_import_endpoint(file: UploadFile = File(...),
                                 user_id: int = Depends(get_current_user_id)):
    """T-6 — read a preliminary title report into CANDIDATES.

    Nothing here reaches a deed. The response is a list of amber
    candidates the officer confirms through the existing gate, exactly as
    she confirms county-record data. This adds a source, not a lane.

    A file we cannot read is a 422 with the reason in plain words — never
    an empty success. An officer who thinks we read her prelim and found
    little is worse off than one who knows we read nothing.
    """
    from services.prelim_import import PrelimUnreadable, import_prelim

    raw = await file.read()
    if len(raw) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413,
                            detail="That file is larger than 25 MB.")
    try:
        return import_prelim(raw)
    except PrelimUnreadable as e:
        # 422, not 400: the request was well-formed and we understood it.
        # What we could not do is READ THE DOCUMENT, and the message says
        # which of the two reasons applies.
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/deeds/{deed_id}/matter")
def matter_endpoint(deed_id: int, user_id: int = Depends(get_current_user_id)):
    """T-4 — the other documents on this file.

    v1 threads by escrow number (then title order), which the builder has
    collected and persisted since T2 and nothing has ever grouped by. No
    schema change: the proper `matters` table waits until this proves the
    workflow.
    """
    from services.matters import carry_forward, matter_key, party_names

    row = _pcor_deed_row(deed_id, user_id)
    key = matter_key(row)
    if key is None:
        return {"grouped": False,
                "reason": "This document has no escrow or title order number, "
                          "so there is nothing to group it by."}

    kind, value = key
    with db.conn.cursor() as cur:
        cur.execute(f"""
            SELECT id, deed_type, status, property_address, apn,
                   grantor_name, grantee_name, parties, created_at
            FROM deeds
            WHERE user_id = %s AND id <> %s AND status <> 'deleted'
              AND metadata->>%s = %s
            ORDER BY created_at DESC
        """, (row.get("user_id"), deed_id, kind, value))
        siblings = [dict(r) for r in cur.fetchall()]

    return {
        "grouped": True,
        "key": {"kind": kind, "value": value},
        "documents": [{
            "id": s_["id"],
            "deed_type": s_["deed_type"],
            "status": s_["status"],
            "property_address": s_["property_address"],
            "created_at": s_["created_at"].isoformat() if s_.get("created_at") else None,
            "parties": party_names(s_),
        } for s_ in siblings],
        "carry_forward": carry_forward(row),
    }


@router.get("/deeds/{deed_id}/death-statement")
def death_statement_status_endpoint(deed_id: int, user_id: int = Depends(get_current_user_id)):
    """T-3b — the BOE-502-D's availability and remaining asks.

    Its own endpoint rather than a polymorphic one: this attaches to the
    death-affidavit family, draws on entirely different facts (decedent,
    date of death) and asks the officer entirely different questions than
    the PCOR does. Two named routes read more honestly than one that
    changes meaning depending on what it is pointed at.
    """
    row = _pcor_deed_row(deed_id, user_id)
    from services.county_forms import lookup_form
    from services.boe_form_fill import values_from_affidavit

    form = lookup_form(row.get("county") or "", "BOE-502-D")
    if form is None:
        return {
            "available": False,
            "county": row.get("county"),
            "reason": f"No BOE-502-D on file for {row.get('county') or 'this county'}.",
        }
    _values, asks = values_from_affidavit(row)
    return {
        "available": True,
        "county": form.county,
        "form_code": form.form_code,
        "revision": form.revision,
        "county_revision": form.county_revision,
        "url": f"/deeds/{deed_id}/death-statement.pdf",
        "still_needed": asks,
    }


@router.get("/deeds/{deed_id}/death-statement.pdf")
def death_statement_download_endpoint(deed_id: int, user_id: int = Depends(get_current_user_id)):
    """Stream the filled 502-D — unflattened, like the PCOR."""
    from services.boe_form_fill import PcorUnavailable, fill_death_statement

    row = _pcor_deed_row(deed_id, user_id)
    try:
        pdf_bytes, _asks = fill_death_statement(row)
    except PcorUnavailable as e:
        raise HTTPException(status_code=404, detail=str(e))

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition":
                 f'attachment; filename="BOE-502-D-deed-{deed_id}.pdf"'},
    )


@router.get("/deeds/{deed_id}/download")
def download_deed_endpoint(deed_id: int, user_id: int = Depends(get_current_user_id)):
    """Stream the stored deed PDF; render+store on first request for legacy rows."""
    if not db.conn:
        raise HTTPException(status_code=500, detail="Database connection not available")
    try:
        cursor = db.conn.cursor()
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
        # Diagnostic surfacing: this is the self-heal retry path — an
        # authenticated owner needs the real reason, not a shrug.
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate deed PDF — {type(e).__name__}: {str(e)[:200]}",
        )


# ─────────────────────────────────────────────────────────────────────
# RED-S4 — recording, as the officer's statement
# ─────────────────────────────────────────────────────────────────────

class RecordingAssertion(BaseModel):
    """What she says happened at the recorder.

    Not what we observed. There is no e-recording integration, and
    inventing one — deriving "recorded" from anything we can see — would
    be the fabricated-success disease in the one place it would do the
    most damage.

    Same posture the notary handoff was ruled into: the system NEVER
    auto-asserts that a document was recorded. Completion is always
    someone's recorded statement, attributable to them.
    """
    recorded_at: str = Field(..., description="Date the county recorded it (ISO or YYYY-MM-DD)")
    instrument_number: str = Field(..., min_length=1, max_length=64)


@router.post("/deeds/{deed_id}/recording")
def assert_recording(deed_id: int, payload: RecordingAssertion,
                     user_id: int = Depends(get_current_user_id)):
    """Record that this deed was recorded — as HER statement.

    Why this matters beyond bookkeeping (RED0 R3-8): `supersession.py`
    reasons about "instruments that already exist in the world" and
    enforces it with `status == 'completed'`, which means only that a PDF
    was rendered. Until now nothing could distinguish a deed that
    recorded last Tuesday from one generated, previewed and discarded —
    so `walk_chain` returned a lineage that looked authoritative while
    answering the drafting history rather than the county's record.

    ONE ASSERTION, like the artifact it describes. A recording that is
    already asserted is not silently overwritten; changing it is a
    correction, and corrections are supersession's business (§9's posture
    applied to the statement rather than the bytes).
    """
    from datetime import datetime as _dt

    if not db.conn:
        raise HTTPException(status_code=500, detail="Database connection not available")

    try:
        when = _dt.fromisoformat(payload.recorded_at.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400,
                            detail="recorded_at must be a date (YYYY-MM-DD or ISO timestamp)")

    with db.conn.cursor() as cur:
        cur.execute("SELECT user_id, status, recorded_at, instrument_number "
                    "FROM deeds WHERE id = %s", (deed_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Deed not found")
        if (row["user_id"] if isinstance(row, dict) else row[0]) != user_id:
            raise HTTPException(status_code=403, detail="Not your deed")

        status_ = row["status"] if isinstance(row, dict) else row[1]
        already = row["recorded_at"] if isinstance(row, dict) else row[2]
        existing_no = row["instrument_number"] if isinstance(row, dict) else row[3]

        if status_ != "completed":
            # A draft has not been executed, notarised or taken anywhere.
            raise HTTPException(
                status_code=400,
                detail="Only a generated document can be marked recorded. "
                       "A draft has not been executed yet.")

        if already is not None:
            raise HTTPException(
                status_code=409,
                detail=f"This deed is already recorded as instrument "
                       f"{existing_no} on {already.date().isoformat()}. "
                       f"If that is wrong, the correction is a new "
                       f"instrument that supersedes this one.")

        cur.execute("""
            UPDATE deeds
            SET recorded_at = %s,
                instrument_number = %s,
                recording_asserted_by = %s,
                recording_asserted_at = NOW()
            WHERE id = %s
        """, (when, payload.instrument_number.strip(), user_id, deed_id))
        db.conn.commit()

    return {
        "success": True,
        "deed_id": deed_id,
        "recorded_at": when.isoformat(),
        "instrument_number": payload.instrument_number.strip(),
        # Said plainly in the response, because the UI should say it too.
        "note": "Recorded per your entry. DeedPro does not verify this "
                "with the county.",
    }
