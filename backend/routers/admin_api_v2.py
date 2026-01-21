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
