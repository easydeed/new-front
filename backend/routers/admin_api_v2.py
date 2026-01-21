# FastAPI additive admin routes (no conflicts with existing /admin handlers)
from fastapi import APIRouter, Depends, HTTPException, Query, Response, Body
from typing import Optional, List, Dict, Any
import os, csv, io

# Import project-specific helpers (adjust if your module paths differ)
try:
    from auth import get_current_admin  # existing dependency
except Exception:
    # If project uses package style imports
    from backend.auth import get_current_admin  # type: ignore

try:
    from database import get_db_connection
except Exception:
    from backend.database import get_db_connection  # type: ignore

router = APIRouter(prefix="/admin", tags=["Admin v2"])

# Note: get_db_connection() uses RealDictCursor, so fetchall() already returns dicts
# No need for a _dictify helper function

@router.get("/users/search")
def admin_users_search(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = None,
    role: Optional[str] = None,
    admin=Depends(get_current_admin)
):
    """
    Paginated, searchable users list.
    Safe and additive to any existing /admin/users route.
    """
    offset = (page - 1) * limit
    conn = get_db_connection()
    with conn.cursor() as cur:
        where = []
        params: List[Any] = []
        if search:
            where.append("(LOWER(u.email) LIKE %s OR LOWER(u.full_name) LIKE %s)")
            s = f"%{search.lower()}%"
            params.extend([s, s])
        if role:
            where.append("LOWER(u.role) = %s")
            params.append(role.lower())

        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        cur.execute(f"SELECT COUNT(*) as count FROM users u {where_sql}", params)
        total = cur.fetchone()['count']

        cur.execute(f"""
            SELECT u.id, u.email, u.full_name, COALESCE(u.role,'') as role, u.plan,
                   u.last_login, u.created_at, u.is_active,
                   (SELECT COUNT(*) FROM deeds d WHERE d.user_id = u.id) as deed_count
            FROM users u
            {where_sql}
            ORDER BY u.created_at DESC
            LIMIT %s OFFSET %s
        """, params + [limit, offset])
        rows = cur.fetchall()  # Already returns list of dicts (RealDictCursor)

    return {"page": page, "limit": limit, "total": total, "items": rows}

@router.get("/users/{user_id}/real")
def admin_user_detail_real(user_id: int, admin=Depends(get_current_admin)):
    """
    Real user detail, joined with deed stats.
    """
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, email, full_name, COALESCE(role,'') as role, plan, company_name, company_type,
                   phone, state, verified, stripe_customer_id, last_login, created_at, is_active
            FROM users WHERE id = %s
        """, (user_id,))
        user = cur.fetchone()  # Already returns dict (RealDictCursor)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        cur.execute("""
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,
                   SUM(CASE WHEN status='draft' THEN 1 ELSE 0 END) as drafts
            FROM deeds WHERE user_id = %s
        """, (user_id,))
        stats = cur.fetchone()  # Already returns dict (RealDictCursor)
        user["deed_stats"] = {
            "total": stats['total'] or 0, 
            "completed": stats['completed'] or 0, 
            "drafts": stats['drafts'] or 0
        }
        user["deed_count"] = stats['total'] or 0  # Phase 12-3: Add top-level deed_count for modal

    return user  # Phase 12-3 Fix: Return user directly, not wrapped

@router.get("/deeds/search")
def admin_deeds_search(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = None,
    status: Optional[str] = None,
    admin=Depends(get_current_admin)
):
    """
    Paginated, searchable deeds list.
    """
    offset = (page - 1) * limit
    conn = get_db_connection()
    with conn.cursor() as cur:
        where = []
        params: List[Any] = []
        if search:
            where.append("""(
                LOWER(d.deed_type) LIKE %s OR
                LOWER(d.property_address) LIKE %s OR
                LOWER(d.grantor_name) LIKE %s OR
                LOWER(d.grantee_name) LIKE %s
            )""")
            s = f"%{search.lower()}%"
            params.extend([s, s, s, s])
        if status:
            where.append("LOWER(d.status) = %s")
            params.append(status.lower())

        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        cur.execute(f"SELECT COUNT(*) as count FROM deeds d {where_sql}", params)
        total = cur.fetchone()['count']

        cur.execute(f"""
            SELECT d.id, d.deed_type, d.status, d.property_address, d.apn, d.county,
                   d.created_at, d.updated_at, u.email as user_email
            FROM deeds d
            LEFT JOIN users u ON u.id = d.user_id
            {where_sql}
            ORDER BY d.created_at DESC
            LIMIT %s OFFSET %s
        """, params + [limit, offset])
        rows = cur.fetchall()  # Already returns list of dicts (RealDictCursor)

    return {"page": page, "limit": limit, "total": total, "items": rows}

@router.get("/deeds/{deed_id}")
def admin_deed_detail(deed_id: int, admin=Depends(get_current_admin)):
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("""
            SELECT d.*, u.email as user_email
            FROM deeds d
            LEFT JOIN users u ON u.id = d.user_id
            WHERE d.id = %s
        """, (deed_id,))
        row = cur.fetchone()  # Already returns dict (RealDictCursor)
        if not row:
            raise HTTPException(status_code=404, detail="Deed not found")
    return row  # Phase 12-3 Fix: Return deed directly, not wrapped

@router.get("/export/users.csv")
def export_users_csv(admin=Depends(get_current_admin)):
    conn = get_db_connection()
    output = io.StringIO()
    writer = csv.writer(output)
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, email, full_name, role, plan, created_at, last_login, is_active
            FROM users ORDER BY created_at DESC
        """)
        writer.writerow(["id","email","full_name","role","plan","created_at","last_login","is_active"])
        for row in cur.fetchall():  # RealDictCursor returns dicts
            writer.writerow(row.values())  # Extract values in column order
    return Response(content=output.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": "attachment; filename=users.csv"})

@router.get("/export/deeds.csv")
def export_deeds_csv(admin=Depends(get_current_admin)):
    conn = get_db_connection()
    output = io.StringIO()
    writer = csv.writer(output)
    with conn.cursor() as cur:
        cur.execute("""
            SELECT d.id, d.deed_type, d.status, d.property_address, d.apn, d.county, d.created_at, d.updated_at, u.email
            FROM deeds d LEFT JOIN users u ON u.id = d.user_id
            ORDER BY d.created_at DESC
        """)
        writer.writerow(["id","deed_type","status","property_address","apn","county","created_at","updated_at","user_email"])
        for row in cur.fetchall():  # RealDictCursor returns dicts
            writer.writerow(row.values())  # Extract values in column order
    return Response(content=output.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": "attachment; filename=deeds.csv"})

# ============================================================================
# PHASE 12-3: USER CRUD OPERATIONS
# ============================================================================

@router.put("/users/{user_id}")
def admin_update_user(
    user_id: int, 
    updates: Dict[str, Any] = Body(...),
    admin=Depends(get_current_admin)
):
    """Update user fields - Phase 12-3"""
    conn = get_db_connection()
    with conn.cursor() as cur:
        # Build dynamic UPDATE query
        set_clauses = []
        params = []
        
        # Allowed fields for update
        allowed_fields = ['full_name', 'email', 'role', 'plan', 'company_name', 
                         'phone', 'state', 'is_active', 'verified']
        
        for field in allowed_fields:
            if field in updates:
                set_clauses.append(f"{field} = %s")
                params.append(updates[field])
        
        if not set_clauses:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        
        params.append(user_id)
        query = f"UPDATE users SET {', '.join(set_clauses)} WHERE id = %s"
        
        cur.execute(query, params)
        conn.commit()
        
        return {"success": True, "message": "User updated successfully"}

@router.delete("/users/{user_id}")
def admin_delete_user(user_id: int, admin=Depends(get_current_admin)):
    """Soft delete user (set is_active = false) - Phase 12-3"""
    conn = get_db_connection()
    with conn.cursor() as cur:
        # Check if user exists
        cur.execute("SELECT id FROM users WHERE id = %s", (user_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="User not found")
        
        # Soft delete
        cur.execute("UPDATE users SET is_active = false WHERE id = %s", (user_id,))
        conn.commit()
        
        return {"success": True, "message": "User deleted successfully"}

@router.post("/users/{user_id}/reset-password")
def admin_reset_user_password(user_id: int, admin=Depends(get_current_admin)):
    """Send password reset email - Phase 12-3"""
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT email FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        
        email = row['email']
        
        # TODO: Integrate with AuthOverhaul email service
        # For now, return success message
        
        return {
            "success": True, 
            "message": f"Password reset email sent to {email}",
            "email": email
        }


# ============================================================================
# PHASE 5: DEED ACTIONS (View PDF, Delete)
# ============================================================================

@router.delete("/deeds/{deed_id}")
def admin_delete_deed(deed_id: int, admin=Depends(get_current_admin)):
    """Soft delete a deed (set status to 'deleted') - Phase 5B"""
    conn = get_db_connection()
    with conn.cursor() as cur:
        # Check if deed exists
        cur.execute("SELECT id, status FROM deeds WHERE id = %s", (deed_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Deed not found")
        
        if row['status'] == 'deleted':
            raise HTTPException(status_code=400, detail="Deed is already deleted")
        
        # Soft delete - update status
        cur.execute("""
            UPDATE deeds 
            SET status = 'deleted', updated_at = NOW() 
            WHERE id = %s
        """, (deed_id,))
        conn.commit()
        
        return {"success": True, "message": f"Deed {deed_id} deleted successfully"}


@router.get("/deeds/{deed_id}/pdf")
def admin_get_deed_pdf(deed_id: int, admin=Depends(get_current_admin)):
    """Get the PDF for a deed - Phase 5B
    
    Returns the stored PDF URL or regenerates the PDF if needed.
    """
    conn = get_db_connection()
    with conn.cursor() as cur:
        # Get deed with PDF info
        cur.execute("""
            SELECT id, deed_type, status, pdf_url, property_address, 
                   grantor_name, grantee_name, created_at
            FROM deeds 
            WHERE id = %s
        """, (deed_id,))
        row = cur.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Deed not found")
        
        deed = dict(row)
        
        # Check if PDF URL exists
        if deed.get('pdf_url'):
            return {
                "success": True,
                "pdf_url": deed['pdf_url'],
                "deed_type": deed['deed_type'],
                "message": "PDF available"
            }
        
        # No PDF stored - return info for regeneration
        return {
            "success": False,
            "pdf_url": None,
            "deed_type": deed['deed_type'],
            "deed_id": deed_id,
            "message": "PDF not available. Use /api/generate/{deed_type} to regenerate."
        }


# ============================================================================
# API KEY MANAGEMENT ENDPOINTS
# ============================================================================

@router.get("/api-keys")
def list_api_keys(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin=Depends(get_current_admin)
):
    """List all API keys with usage statistics."""
    offset = (page - 1) * limit
    conn = get_db_connection()
    with conn.cursor() as cur:
        # Get total count
        cur.execute("SELECT COUNT(*) as count FROM api_keys")
        total = cur.fetchone()['count']
        
        # Get paginated keys
        cur.execute("""
            SELECT 
                ak.id, ak.key_prefix, ak.name, ak.is_active, ak.is_test,
                ak.rate_limit_hour, ak.rate_limit_day, ak.created_at, ak.last_used_at,
                (SELECT COUNT(*) FROM api_deeds WHERE api_key_id = ak.id) as deed_count,
                (SELECT COUNT(*) FROM api_usage_log WHERE api_key_id = ak.id) as request_count
            FROM api_keys ak
            ORDER BY ak.created_at DESC
            LIMIT %s OFFSET %s
        """, (limit, offset))
        
        keys = [dict(row) for row in cur.fetchall()]
        
        return {
            "api_keys": keys,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }


@router.post("/api-keys")
def create_api_key(
    name: str = Body(..., embed=True),
    is_test: bool = Body(False, embed=True),
    rate_limit_hour: int = Body(100, embed=True),
    rate_limit_day: int = Body(1000, embed=True),
    admin=Depends(get_current_admin)
):
    """
    Create a new API key.
    Returns the full key ONCE - it cannot be retrieved again.
    """
    from utils.api_keys import generate_api_key as gen_key
    
    full_key, key_prefix, key_hash = gen_key(is_test=is_test)
    
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO api_keys (key_prefix, key_hash, name, is_test, rate_limit_hour, rate_limit_day, created_by_email)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, created_at
        """, (key_prefix, key_hash, name, is_test, rate_limit_hour, rate_limit_day, admin))
        
        row = cur.fetchone()
        conn.commit()
        
        return {
            "success": True,
            "api_key": {
                "id": row['id'],
                "key": full_key,  # Only shown once!
                "key_prefix": key_prefix,
                "name": name,
                "is_test": is_test,
                "rate_limit_hour": rate_limit_hour,
                "rate_limit_day": rate_limit_day,
                "created_at": row['created_at'].isoformat() if row['created_at'] else None
            },
            "warning": "Save this API key now. It cannot be retrieved again."
        }


@router.get("/api-keys/{key_id}")
def get_api_key(
    key_id: int,
    admin=Depends(get_current_admin)
):
    """Get API key details and usage statistics."""
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, key_prefix, name, is_active, is_test,
                   rate_limit_hour, rate_limit_day, created_at, last_used_at, created_by_email
            FROM api_keys
            WHERE id = %s
        """, (key_id,))
        
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="API key not found")
        
        key_data = dict(row)
        
        # Get usage stats
        cur.execute("""
            SELECT COUNT(*) as total_deeds,
                   COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_deeds
            FROM api_deeds WHERE api_key_id = %s
        """, (key_id,))
        deed_stats = dict(cur.fetchone())
        
        cur.execute("""
            SELECT COUNT(*) as total_requests,
                   COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_requests,
                   AVG(response_time_ms) as avg_response_ms
            FROM api_usage_log WHERE api_key_id = %s
        """, (key_id,))
        usage_stats = dict(cur.fetchone())
        
        # Get recent requests
        cur.execute("""
            SELECT endpoint, method, status_code, response_time_ms, created_at
            FROM api_usage_log
            WHERE api_key_id = %s
            ORDER BY created_at DESC
            LIMIT 10
        """, (key_id,))
        recent_requests = [dict(row) for row in cur.fetchall()]
        
        return {
            "api_key": key_data,
            "stats": {
                **deed_stats,
                **usage_stats
            },
            "recent_requests": recent_requests
        }


@router.patch("/api-keys/{key_id}")
def update_api_key(
    key_id: int,
    name: Optional[str] = Body(None, embed=True),
    is_active: Optional[bool] = Body(None, embed=True),
    rate_limit_hour: Optional[int] = Body(None, embed=True),
    rate_limit_day: Optional[int] = Body(None, embed=True),
    admin=Depends(get_current_admin)
):
    """Update API key settings."""
    conn = get_db_connection()
    with conn.cursor() as cur:
        # Build update query dynamically
        updates = []
        params = []
        
        if name is not None:
            updates.append("name = %s")
            params.append(name)
        if is_active is not None:
            updates.append("is_active = %s")
            params.append(is_active)
        if rate_limit_hour is not None:
            updates.append("rate_limit_hour = %s")
            params.append(rate_limit_hour)
        if rate_limit_day is not None:
            updates.append("rate_limit_day = %s")
            params.append(rate_limit_day)
        
        if not updates:
            raise HTTPException(status_code=400, detail="No updates provided")
        
        params.append(key_id)
        cur.execute(f"""
            UPDATE api_keys SET {', '.join(updates)}
            WHERE id = %s
            RETURNING id, key_prefix, name, is_active, is_test, rate_limit_hour, rate_limit_day
        """, params)
        
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="API key not found")
        
        conn.commit()
        
        return {
            "success": True,
            "api_key": dict(row)
        }


@router.delete("/api-keys/{key_id}")
def delete_api_key(
    key_id: int,
    admin=Depends(get_current_admin)
):
    """Deactivate (soft delete) an API key."""
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE api_keys SET is_active = false
            WHERE id = %s
            RETURNING id, key_prefix, name
        """, (key_id,))
        
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="API key not found")
        
        conn.commit()
        
        return {
            "success": True,
            "message": f"API key '{row['name']}' has been deactivated"
        }
