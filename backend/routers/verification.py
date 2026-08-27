"""
Document Verification Admin Router

Public lookups live only at the minimized, rate-limited
``/api/v1/verify/{document_id}`` contract.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, Any, List
from datetime import datetime, timedelta
import logging

from database import get_db_connection

logger = logging.getLogger(__name__)

admin_router = APIRouter(prefix="/admin/verification", tags=["Admin Verification"])


# ==========================================
# Admin Verification Endpoints
# ==========================================

try:
    from auth import get_current_admin
except ImportError:
    from backend.auth import get_current_admin


class VerificationStats(BaseModel):
    total_documents: int
    active_documents: int
    revoked_documents: int
    total_scans_today: int
    total_scans_week: int


class AdminVerificationDocument(BaseModel):
    id: str
    short_code: str
    document_type: str
    property_address: Optional[str]
    county: Optional[str]
    grantor_display: Optional[str]
    grantee_display: Optional[str]
    status: str
    verification_count: int
    generated_at: Optional[str]
    last_verified_at: Optional[str]


class RevokeRequest(BaseModel):
    reason: str


@admin_router.get("/stats", response_model=VerificationStats)
async def get_verification_stats(admin=Depends(get_current_admin)):
    """Get verification statistics for admin dashboard."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Total documents
        cursor.execute("SELECT COUNT(*) FROM document_authenticity")
        total = cursor.fetchone()[0] or 0
        
        # Active documents
        cursor.execute("SELECT COUNT(*) FROM document_authenticity WHERE status = 'active'")
        active = cursor.fetchone()[0] or 0
        
        # Revoked documents
        cursor.execute("SELECT COUNT(*) FROM document_authenticity WHERE status = 'revoked'")
        revoked = cursor.fetchone()[0] or 0
        
        # Scans today
        cursor.execute("""
            SELECT COUNT(*) FROM verification_log 
            WHERE verified_at >= CURRENT_DATE
        """)
        scans_today = cursor.fetchone()[0] or 0
        
        # Scans this week
        cursor.execute("""
            SELECT COUNT(*) FROM verification_log 
            WHERE verified_at >= CURRENT_DATE - INTERVAL '7 days'
        """)
        scans_week = cursor.fetchone()[0] or 0
        
        return VerificationStats(
            total_documents=total,
            active_documents=active,
            revoked_documents=revoked,
            total_scans_today=scans_today,
            total_scans_week=scans_week
        )
        
    finally:
        cursor.close()
        conn.close()


@admin_router.get("/documents")
async def list_verification_documents(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = None,
    admin=Depends(get_current_admin)
):
    """List all verified documents with pagination."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        offset = (page - 1) * limit
        
        # Build query
        where_clause = ""
        params: List[Any] = []
        
        if status:
            where_clause = "WHERE status = %s"
            params.append(status)
        
        # Get total count
        cursor.execute(f"SELECT COUNT(*) FROM document_authenticity {where_clause}", params)
        total = cursor.fetchone()[0] or 0
        
        # Get documents
        cursor.execute(f"""
            SELECT 
                id::text, short_code, document_type, property_address, county,
                grantor_display, grantee_display, status, verification_count,
                generated_at, last_verified_at
            FROM document_authenticity
            {where_clause}
            ORDER BY generated_at DESC
            LIMIT %s OFFSET %s
        """, params + [limit, offset])
        
        columns = [
            'id', 'short_code', 'document_type', 'property_address', 'county',
            'grantor_display', 'grantee_display', 'status', 'verification_count',
            'generated_at', 'last_verified_at'
        ]
        
        items = []
        for row in cursor.fetchall():
            doc = dict(zip(columns, row))
            # Format timestamps
            if doc['generated_at']:
                doc['generated_at'] = doc['generated_at'].isoformat()
            if doc['last_verified_at']:
                doc['last_verified_at'] = doc['last_verified_at'].isoformat()
            items.append(doc)
        
        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit
        }
        
    finally:
        cursor.close()
        conn.close()


@admin_router.get("/documents/{short_code}")
async def get_verification_document(short_code: str, admin=Depends(get_current_admin)):
    """Get details of a specific verified document."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT 
                id::text, short_code, document_type, property_address, property_apn,
                county, grantor_display, grantee_display, content_hash, status,
                verification_count, generated_at, first_verified_at, last_verified_at,
                revoked_at, revoked_reason
            FROM document_authenticity
            WHERE short_code = %s
        """, (short_code.upper(),))
        
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Document not found")
        
        columns = [
            'id', 'short_code', 'document_type', 'property_address', 'property_apn',
            'county', 'grantor_display', 'grantee_display', 'content_hash', 'status',
            'verification_count', 'generated_at', 'first_verified_at', 'last_verified_at',
            'revoked_at', 'revoked_reason'
        ]
        doc = dict(zip(columns, row))
        
        # Format timestamps
        for key in ['generated_at', 'first_verified_at', 'last_verified_at', 'revoked_at']:
            if doc.get(key):
                doc[key] = doc[key].isoformat()
        
        return doc
        
    finally:
        cursor.close()
        conn.close()


@admin_router.post("/documents/{short_code}/revoke")
async def revoke_verification_document(
    short_code: str, 
    request: RevokeRequest,
    admin=Depends(get_current_admin)
):
    """Revoke a verified document (mark as invalid)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check document exists and is active
        cursor.execute("""
            SELECT id, status FROM document_authenticity
            WHERE short_code = %s
        """, (short_code.upper(),))
        
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Document not found")
        
        if row[1] == 'revoked':
            raise HTTPException(status_code=400, detail="Document is already revoked")
        
        # Revoke the document
        cursor.execute("""
            UPDATE document_authenticity
            SET status = 'revoked',
                revoked_at = NOW(),
                revoked_reason = %s
            WHERE short_code = %s
        """, (request.reason, short_code.upper()))
        
        conn.commit()
        
        return {"success": True, "message": f"Document {short_code} has been revoked"}
        
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Error revoking document {short_code}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()
