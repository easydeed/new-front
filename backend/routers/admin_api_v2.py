# FastAPI additive admin routes (no conflicts with existing /admin handlers)
from fastapi import APIRouter, Depends, HTTPException, Query, Response
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

def _dictify(cursor, rows):
    cols = [c[0] for c in cursor.description]
    return [dict(zip(cols, r)) for r in rows]

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
        cur.execute(f"SELECT COUNT(*) FROM users u {where_sql}", params)
        total = cur.fetchone()[0]

        cur.execute(f"""
            SELECT u.id, u.email, u.full_name, COALESCE(u.role,'') as role, u.plan,
                   u.last_login, u.created_at, u.is_active,
                   (SELECT COUNT(*) FROM deeds d WHERE d.user_id = u.id) as deed_count
            FROM users u
            {where_sql}
            ORDER BY u.created_at DESC
            LIMIT %s OFFSET %s
        """, params + [limit, offset])
        rows = cur.fetchall()
        data = _dictify(cur, rows)

    return {"page": page, "limit": limit, "total": total, "users": data}

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
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        cols = [c[0] for c in cur.description]
        user = dict(zip(cols, row))

        cur.execute("""
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,
                   SUM(CASE WHEN status='draft' THEN 1 ELSE 0 END) as drafts
            FROM deeds WHERE user_id = %s
        """, (user_id,))
        stats_row = cur.fetchone()
        user["deed_stats"] = {"total": stats_row[0] or 0, "completed": stats_row[1] or 0, "drafts": stats_row[2] or 0}

    return {"user": user}

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
                LOWER(d.grantors) LIKE %s OR
                LOWER(d.grantees) LIKE %s
            )""")
            s = f"%{search.lower()}%"
            params.extend([s, s, s, s])
        if status:
            where.append("LOWER(d.status) = %s")
            params.append(status.lower())

        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        cur.execute(f"SELECT COUNT(*) FROM deeds d {where_sql}", params)
        total = cur.fetchone()[0]

        cur.execute(f"""
            SELECT d.id, d.deed_type, d.status, d.property_address, d.apn, d.county,
                   d.created_at, d.updated_at, u.email as user_email
            FROM deeds d
            LEFT JOIN users u ON u.id = d.user_id
            {where_sql}
            ORDER BY d.created_at DESC
            LIMIT %s OFFSET %s
        """, params + [limit, offset])
        rows = cur.fetchall()
        cols = [c[0] for c in cur.description]
        deeds = [dict(zip(cols, r)) for r in rows]

    return {"page": page, "limit": limit, "total": total, "deeds": deeds}

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
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Deed not found")
        cols = [c[0] for c in cur.description]
        deed = dict(zip(cols, row))
    return {"deed": deed}

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
        for row in cur.fetchall():
            writer.writerow(row)
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
        for row in cur.fetchall():
            writer.writerow(row)
    return Response(content=output.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": "attachment; filename=deeds.csv"})
