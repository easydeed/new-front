"""
Document Verification API Router
Public endpoints for verifying document authenticity via QR code or manual entry.
Admin endpoints for managing verified documents.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import logging

from database import get_db_connection

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/verify", tags=["verification"])

# Admin router for verification management
admin_router = APIRouter(prefix="/admin/verification", tags=["Admin Verification"])


# ==========================================
# Response Models
# ==========================================

class DocumentInfo(BaseModel):
    id: str
    type: str
    propertyAddress: Optional[str] = None
    apn: Optional[str] = None
    county: Optional[str] = None
    grantor: Optional[str] = None
    grantee: Optional[str] = None
    generatedAt: str
    contentHash: str
    verificationCount: int


class VerificationResponse(BaseModel):
    valid: bool
    status: str  # "valid", "revoked", "not_found"
    message: str
    document: Optional[DocumentInfo] = None


class RevokedDocumentInfo(BaseModel):
    type: str
    revokedAt: str
    reason: Optional[str] = None


class RevokedResponse(BaseModel):
    valid: bool = False
    status: str = "revoked"
    message: str
    document: RevokedDocumentInfo


# ==========================================
# Helper Functions
# ==========================================

def format_document_type(doc_type: str) -> str:
    """Format document type for display."""
    mapping = {
        'grant_deed': 'Grant Deed',
        'quitclaim_deed': 'Quitclaim Deed',
        'interspousal_transfer': 'Interspousal Transfer Deed',
        'warranty_deed': 'Warranty Deed',
        'tax_deed': 'Tax Deed',
    }
    return mapping.get(doc_type, doc_type.replace('_', ' ').title())


def log_verification(cursor, doc_id: Optional[str], short_code: str, method: str, result: str):
    """Log verification attempt for audit trail."""
    try:
        cursor.execute("""
            INSERT INTO verification_log 
                (document_id, verification_method, result)
            VALUES 
                (%s, %s, %s)
        """, (doc_id, method, result))
    except Exception as e:
        # Don't fail the whole request if logging fails
        logger.warning(f"Failed to log verification: {e}")


# ==========================================
# Public Verification Endpoint (No Auth)
# ==========================================

@router.get("/{short_code}", response_model=VerificationResponse)
async def verify_document(short_code: str, method: str = "manual"):
    """
    Public endpoint to verify document authenticity.
    No authentication required.
    
    Args:
        short_code: Document ID (e.g., "DOC-2026-A7X9K")
        method: How the verification was initiated ("qr_scan", "manual", "api")
    
    Returns:
        VerificationResponse with document details if valid
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Normalize short code (uppercase)
        short_code = short_code.upper().strip()
        
        # Look up document
        cursor.execute("""
            SELECT 
                id, short_code, document_type, property_address, property_apn,
                county, grantor_display, grantee_display, content_hash,
                generated_at, status, revoked_at, revoked_reason,
                verification_count
            FROM document_authenticity
            WHERE short_code = %s
        """, (short_code,))
        
        row = cursor.fetchone()
        
        if not row:
            # Document not found
            log_verification(cursor, None, short_code, method, 'not_found')
            conn.commit()
            return VerificationResponse(
                valid=False,
                status="not_found",
                message="Document not found. Please check the ID and try again."
            )
        
        # Convert row to dict (psycopg2 returns tuples by default)
        columns = [
            'id', 'short_code', 'document_type', 'property_address', 'property_apn',
            'county', 'grantor_display', 'grantee_display', 'content_hash',
            'generated_at', 'status', 'revoked_at', 'revoked_reason',
            'verification_count'
        ]
        doc = dict(zip(columns, row))
        
        if doc['status'] == 'revoked':
            # Document was revoked
            log_verification(cursor, str(doc['id']), short_code, method, 'revoked')
            conn.commit()
            
            revoked_at = doc['revoked_at']
            if isinstance(revoked_at, datetime):
                revoked_at_str = revoked_at.strftime('%B %d, %Y')
                revoked_at_iso = revoked_at.isoformat()
            else:
                revoked_at_str = str(revoked_at)
                revoked_at_iso = str(revoked_at)
            
            return VerificationResponse(
                valid=False,
                status="revoked",
                message=f"This document was revoked on {revoked_at_str}.",
                document=DocumentInfo(
                    id=doc['short_code'],
                    type=format_document_type(doc['document_type']),
                    generatedAt=doc['generated_at'].isoformat() if isinstance(doc['generated_at'], datetime) else str(doc['generated_at']),
                    contentHash="REVOKED",
                    verificationCount=doc['verification_count'] or 0
                )
            )
        
        # Valid document - update verification stats
        cursor.execute("""
            UPDATE document_authenticity
            SET 
                verification_count = verification_count + 1,
                last_verified_at = NOW(),
                first_verified_at = COALESCE(first_verified_at, NOW())
            WHERE id = %s
        """, (doc['id'],))
        
        log_verification(cursor, str(doc['id']), short_code, method, 'valid')
        conn.commit()
        
        # Format generated_at
        generated_at = doc['generated_at']
        if isinstance(generated_at, datetime):
            generated_at_iso = generated_at.isoformat()
        else:
            generated_at_iso = str(generated_at)
        
        # Abbreviate hash for display
        content_hash = doc['content_hash'] or ""
        content_hash_display = content_hash[:16] + "..." if len(content_hash) > 16 else content_hash
        
        return VerificationResponse(
            valid=True,
            status="valid",
            message="Document verified successfully.",
            document=DocumentInfo(
                id=doc['short_code'],
                type=format_document_type(doc['document_type']),
                propertyAddress=doc['property_address'],
                apn=doc['property_apn'],
                county=doc['county'],
                grantor=doc['grantor_display'],
                grantee=doc['grantee_display'],
                generatedAt=generated_at_iso,
                contentHash=content_hash_display,
                verificationCount=(doc['verification_count'] or 0) + 1
            )
        )
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Verification error for {short_code}: {e}")
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")
    finally:
        cursor.close()
        conn.close()


# ==========================================
# Internal: Create Authenticity Record
# ==========================================

async def create_document_authenticity(
    deed_id: Optional[int],
    document_type: str,
    html_content: str,
    property_address: str,
    apn: str,
    county: str,
    grantor: str,
    grantee: str,
    user_id: int
) -> Dict[str, Any]:
    """
    Create authenticity record and return QR code data.
    Called during deed PDF generation.
    
    Args:
        deed_id: Reference to deeds table (optional)
        document_type: Type of deed (e.g., "grant_deed")
        html_content: Content to hash for verification
        property_address: Property address
        apn: Assessor's Parcel Number
        county: County name
        grantor: Full grantor name (will be abbreviated)
        grantee: Full grantee name (will be abbreviated)
        user_id: Creating user's ID
    
    Returns:
        Dict with id, short_code, qr_code_data, verification_url
    """
    from utils.short_code import generate_short_code, generate_content_hash, abbreviate_name
    from utils.qr_generator import generate_verification_qr, generate_verification_url
    
    short_code = generate_short_code()
    content_hash = generate_content_hash(html_content)
    
    # Abbreviate names for privacy
    grantor_display = abbreviate_name(grantor)
    grantee_display = abbreviate_name(grantee)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Ensure unique short_code (retry if collision)
        max_retries = 5
        for attempt in range(max_retries):
            try:
                cursor.execute("""
                    INSERT INTO document_authenticity (
                        short_code, document_type, property_address, property_apn,
                        county, grantor_display, grantee_display, content_hash,
                        deed_id, created_by_user_id
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, short_code
                """, (
                    short_code, document_type, property_address, apn,
                    county, grantor_display, grantee_display, content_hash,
                    deed_id, user_id
                ))
                break
            except Exception as e:
                if "unique" in str(e).lower() and attempt < max_retries - 1:
                    # Collision - generate new code
                    short_code = generate_short_code()
                    continue
                raise
        
        result = cursor.fetchone()
        conn.commit()
        
        # Generate QR code
        qr_data = generate_verification_qr(short_code)
        verification_url = generate_verification_url(short_code)
        
        return {
            "id": str(result[0]),
            "short_code": result[1],
            "qr_code_data": qr_data,
            "verification_url": verification_url
        }
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Failed to create authenticity record: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


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
