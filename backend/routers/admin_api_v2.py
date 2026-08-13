# FastAPI additive admin routes (no conflicts with existing /admin handlers)
from fastapi import APIRouter, Depends, HTTPException, Query, Response, Body
from typing import Optional, List, Dict, Any
import os, csv, io

# Import project-specific helpers (adjust if your module paths differ)
try:
    from auth import (ADMIN_ROLES, ASSIGNABLE_ROLES as _ASSIGNABLE_ROLES,
                      get_current_admin, is_admin_role)  # existing dependency
except Exception:
    # If project uses package style imports
    from backend.auth import get_current_admin  # type: ignore

# RED-H1.2: this module opened EIGHTEEN connections and closed TWO. Every
# admin page view leaked Postgres backends until the instance hit
# max_connections. All seventeen call sites now take `db_connection()`,
# which closes on every exit — including the `raise HTTPException(404)`
# paths, which is where most of them were escaping.
try:
    from database import db_connection
except Exception:
    from backend.database import db_connection  # type: ignore

router = APIRouter(prefix="/admin", tags=["Admin v2"])

# Note: connections use RealDictCursor, so fetchall() already returns dicts
# No need for a _dictify helper function

# ── Sort whitelists (ADMIN1.5 frictions) ─────────────────────────────
#
# Both lists were hard-sorted `created_at DESC` with nothing on screen
# saying so, which is a small dishonesty of the same family as an
# unlabelled denominator: the operator reads an order into a list that
# the list never claimed. The console now names its sort and can change
# it — through these maps and ONLY these maps.
#
# The ORDER BY fragment is interpolated into an f-string (the WHERE
# clause already is), so an unmapped key must never reach SQL. A dict
# lookup with a default, not a format of user input: an allowlist that
# cannot be spelled around is the difference between a sort control and
# an injection point.
USER_SORTS: Dict[str, str] = {
    "newest": "u.created_at DESC NULLS LAST",
    "oldest": "u.created_at ASC NULLS LAST",
    "email": "LOWER(u.email) ASC",
    "deeds": "deed_count DESC, u.created_at DESC",
    "last_login": "u.last_login DESC NULLS LAST",
}
DEED_SORTS: Dict[str, str] = {
    "newest": "d.created_at DESC NULLS LAST",
    "oldest": "d.created_at ASC NULLS LAST",
    "updated": "d.updated_at DESC NULLS LAST",
    "type": "d.deed_type ASC, d.created_at DESC",
}
DEFAULT_SORT = "newest"


def _order_by(sorts: Dict[str, str], requested: Optional[str]) -> str:
    """Resolve a sort key to SQL, or 400. Never interpolate the input."""
    key = (requested or DEFAULT_SORT).lower()
    if key not in sorts:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown sort '{requested}'. Valid: {', '.join(sorted(sorts))}",
        )
    return sorts[key]

@router.get("/users/search")
def admin_users_search(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = None,
    role: Optional[str] = None,
    sort: Optional[str] = Query(None, description="newest|oldest|email|deeds|last_login"),
    admin=Depends(get_current_admin)
):
    """
    Paginated, searchable users list.
    Safe and additive to any existing /admin/users route.
    """
    order_sql = _order_by(USER_SORTS, sort)
    offset = (page - 1) * limit
    with db_connection() as conn, conn.cursor() as cur:
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
            SELECT u.id, u.email, u.full_name, COALESCE(u.role,'') as role,
                   u.job_title, u.plan,
                   u.last_login, u.created_at, u.is_active,
                   (SELECT COUNT(*) FROM deeds d WHERE d.user_id = u.id) as deed_count
            FROM users u
            {where_sql}
            ORDER BY {order_sql}
            LIMIT %s OFFSET %s
        """, params + [limit, offset])
        rows = cur.fetchall()  # Already returns list of dicts (RealDictCursor)

    return {"page": page, "limit": limit, "total": total,
            "sort": (sort or DEFAULT_SORT).lower(), "items": rows}

@router.get("/users/{user_id}")
def admin_user_detail(user_id: int, admin=Depends(get_current_admin)):
    """User detail, joined with deed stats.

    ADMIN1.5: this route was `/users/{user_id}/real` — a fossil of a
    mock/real serializer split. The "mock" half lived in admin_inline
    (hardcoded per-user revenue, `shared_deeds: 0`, an empty
    `activity_log`) and is deleted, so the honest one takes the plain
    path and sits alongside the PUT and DELETE already there.
    """
    with db_connection() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT id, email, full_name, COALESCE(role,'') as role, job_title,
                   plan, company_name, company_type,
                   interest_state,
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
    user_id: Optional[int] = None,
    sort: Optional[str] = Query(None, description="newest|oldest|updated|type"),
    admin=Depends(get_current_admin)
):
    """
    Paginated, searchable deeds list (per-user via user_id).
    """
    order_sql = _order_by(DEED_SORTS, sort)
    offset = (page - 1) * limit
    with db_connection() as conn, conn.cursor() as cur:
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
        if user_id is not None:
            where.append("d.user_id = %s")
            params.append(user_id)

        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        cur.execute(f"SELECT COUNT(*) as count FROM deeds d {where_sql}", params)
        total = cur.fetchone()['count']

        cur.execute(f"""
            SELECT d.id, d.deed_type, d.status, d.property_address, d.apn, d.county,
                   d.created_at, d.updated_at, u.email as user_email
            FROM deeds d
            LEFT JOIN users u ON u.id = d.user_id
            {where_sql}
            ORDER BY {order_sql}
            LIMIT %s OFFSET %s
        """, params + [limit, offset])
        rows = cur.fetchall()  # Already returns list of dicts (RealDictCursor)

    return {"page": page, "limit": limit, "total": total,
            "sort": (sort or DEFAULT_SORT).lower(), "items": rows}

@router.get("/deeds/{deed_id}")
def admin_deed_detail(deed_id: int, admin=Depends(get_current_admin)):
    with db_connection() as conn, conn.cursor() as cur:
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
    output = io.StringIO()
    writer = csv.writer(output)
    with db_connection() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT id, email, full_name, role, job_title, plan, created_at,
                   last_login, is_active
            FROM users ORDER BY created_at DESC
        """)
        writer.writerow(["id","email","full_name","role","job_title","plan",
                         "created_at","last_login","is_active"])
        for row in cur.fetchall():  # RealDictCursor returns dicts
            writer.writerow(row.values())  # Extract values in column order
    return Response(content=output.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": "attachment; filename=users.csv"})

@router.get("/export/deeds.csv")
def export_deeds_csv(admin=Depends(get_current_admin)):
    output = io.StringIO()
    writer = csv.writer(output)
    with db_connection() as conn, conn.cursor() as cur:
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
# ADMIN3 — the email ledger, readable
# ============================================================================
#
# Persistence without a reader is the defect this ticket exists to kill,
# in a new costume: /admin/dashboard computed a 7-day activity feed for
# three phases and no screen rendered it, so it may as well not have run.
# A transport log nobody can open answers the 3 AM question exactly as
# well as the stdout it replaced.

EMAIL_SORTS: Dict[str, str] = {
    "newest": "created_at DESC",
    "oldest": "created_at ASC",
}


@router.get("/emails")
def admin_email_log(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = Query(None, description="sent|failed"),
    template: Optional[str] = None,
    search: Optional[str] = Query(None, description="recipient substring"),
    sort: Optional[str] = None,
    admin=Depends(get_current_admin),
):
    """Every send attempt we managed to record, newest first."""
    order_sql = _order_by(EMAIL_SORTS, sort)
    offset = (page - 1) * limit
    with db_connection() as conn, conn.cursor() as cur:
        where, params = [], []
        if status:
            if status.lower() not in ("sent", "failed"):
                raise HTTPException(status_code=400, detail="status must be sent or failed")
            where.append("status = %s")
            params.append(status.lower())
        if template:
            where.append("template = %s")
            params.append(template)
        if search:
            where.append("LOWER(recipient) LIKE %s")
            params.append(f"%{search.lower()}%")
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""

        cur.execute(f"SELECT COUNT(*) AS count FROM email_log {where_sql}", params)
        total = cur.fetchone()["count"]

        cur.execute(f"""
            SELECT id, template, recipient, subject, status, reason,
                   user_id, context, created_at
            FROM email_log
            {where_sql}
            ORDER BY {order_sql}
            LIMIT %s OFFSET %s
        """, params + [limit, offset])
        rows = cur.fetchall()

    return {"page": page, "limit": limit, "total": total,
            "sort": (sort or DEFAULT_SORT).lower(), "items": rows}


@router.get("/emails/stats")
def admin_email_stats(days: int = Query(7, ge=1, le=90),
                      admin=Depends(get_current_admin)):
    """Sent/failed counts over a window, plus what actually went wrong.

    `failures_by_reason` is the part worth having. A count of failures
    tells an operator that something is broken; the S1 reason string
    tells them it is an unverified sender identity, which is a fix
    rather than an investigation.
    """
    with db_connection() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) FILTER (WHERE status = 'sent')   AS sent,
                   COUNT(*) FILTER (WHERE status = 'failed') AS failed,
                   COUNT(*)                                  AS total,
                   MIN(created_at)                           AS first_recorded
            FROM email_log
            WHERE created_at >= NOW() - (%s || ' days')::interval
        """, (days,))
        totals = cur.fetchone()

        cur.execute("""
            SELECT template,
                   COUNT(*) FILTER (WHERE status = 'sent')   AS sent,
                   COUNT(*) FILTER (WHERE status = 'failed') AS failed
            FROM email_log
            WHERE created_at >= NOW() - (%s || ' days')::interval
            GROUP BY template
            ORDER BY COUNT(*) DESC
        """, (days,))
        by_template = cur.fetchall()

        cur.execute("""
            SELECT reason, COUNT(*) AS count
            FROM email_log
            WHERE status = 'failed' AND reason IS NOT NULL
              AND created_at >= NOW() - (%s || ' days')::interval
            GROUP BY reason
            ORDER BY COUNT(*) DESC
            LIMIT 10
        """, (days,))
        failures_by_reason = cur.fetchall()

        # The window's oldest row overall — so the UI can say "we
        # have only been recording since X" instead of letting a
        # young table read as a quiet one.
        cur.execute("SELECT MIN(created_at) AS since FROM email_log")
        since = cur.fetchone()["since"]

    return {
        "window_days": days,
        "sent": totals["sent"] or 0,
        "failed": totals["failed"] or 0,
        "total": totals["total"] or 0,
        "recording_since": since.isoformat() if since else None,
        "by_template": by_template,
        "failures_by_reason": failures_by_reason,
    }


# ============================================================================
# PHASE 12-3: USER CRUD OPERATIONS
# ============================================================================

#: What the admin console may ASSIGN to `users.role` — `user` or `admin`,
#: and nothing else.
#:
#: ROLE1 step 3 landed, so this is now the whole vocabulary rather than
#: the subset it was: registration writes the job title to its own
#: column and the authorization column from a literal, so `role` no
#: longer receives free text from anywhere and a closed set costs
#: nothing.
#:
#: It narrowed from five values to two in the same move. The other three
#: were `administrator`, `superadmin` and `super_admin` — spellings the
#: gates RECOGNIZE (ADMIN_ROLES, for rows history already wrote) but
#: which this console has no business creating more of. Offering four
#: ways to spell one thing is the defect ROLE1 opened with.
#:
#: The console's own <select> has offered exactly User and Admin the
#: whole time. The API accepted three values its only caller never sent.
ASSIGNABLE_ROLES = _ASSIGNABLE_ROLES


def _validate_role_change(cur, target_user_id: int, admin_email: str,
                          new_role) -> None:
    """Refuse a role the product does not use, and refuse a self-lockout."""
    value = (new_role or '').strip()
    if not value:
        raise HTTPException(
            status_code=400,
            detail="A role cannot be blank. Use 'user' for no special access.")

    if value.lower() not in ASSIGNABLE_ROLES:
        raise HTTPException(
            status_code=400,
            detail=(f"'{value}' would grant nothing. This field is access, "
                    f"and it takes {' or '.join(sorted(ASSIGNABLE_ROLES))}. "
                    f"A job title belongs to the person it describes and is "
                    f"edited in their profile, not here."),
        )

    # ── THE SELF-LOCKOUT ─────────────────────────────────────────────
    #
    # Checked by EMAIL because that is what the admin dependency returns
    # — `get_current_admin` yields `user_email` from the token, not an
    # id. Comparing the target row's email to it is the comparison that
    # is actually available, and it is the one that is true.
    if is_admin_role(new_role):
        return  # Promoting or keeping admin can never lock anybody out.
    cur.execute("SELECT email, role FROM users WHERE id = %s", (target_user_id,))
    row = cur.fetchone()
    target = dict(row) if row else {}
    if (target.get('email') or '').lower() == (admin_email or '').lower() \
            and is_admin_role(target.get('role')):
        raise HTTPException(
            status_code=409,
            detail=("You are removing your own admin access. Ask another "
                    "admin to do it, so you are not locked out of the console "
                    "you would need to undo it."),
        )


@router.put("/users/{user_id}")
def admin_update_user(
    user_id: int, 
    updates: Dict[str, Any] = Body(...),
    admin=Depends(get_current_admin)
):
    """Update user fields - Phase 12-3.

    ═══ ROLE1 — THE UNGUARDED PATH ═══

    `role` was editable here with NO validation of the value and no
    self-demotion guard. Three things followed, and none of them said
    anything out loud:

      - `Administrator` created a PARTIAL ADMIN — the console opened and
        two gates inside it refused. (Fixed at the source: all three
        gates now read `ADMIN_ROLES`.)
      - `adminn` granted nothing, silently. An admin form that accepts a
        typo and reports success is invariant #4 wearing a suit: the
        product declined and did not say so.
      - An admin could demote THEMSELVES and lose the console with no
        warning. That is a lockout, not a decision.

    The registration guard was the loud path and it was already closed.
    This was the quiet one.
    """
    with db_connection() as conn, conn.cursor() as cur:
        # Build dynamic UPDATE query
        set_clauses = []
        params = []
        
        # Allowed fields for update.
        #
        # `job_title` is deliberately NOT here. The refusal above tells an
        # admin that a job title is edited in the person's own profile,
        # and a console that says that while also editing it would be
        # saying two things. It is hers; this screen shows it and does
        # not touch it.
        allowed_fields = ['full_name', 'email', 'role', 'plan', 'company_name',
                         'phone', 'state', 'is_active', 'verified']

        if 'role' in updates:
            _validate_role_change(cur, user_id, admin, updates['role'])

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
    with db_connection() as conn, conn.cursor() as cur:
        # Check if user exists
        cur.execute("SELECT id FROM users WHERE id = %s", (user_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="User not found")
        
        # Soft delete
        cur.execute("UPDATE users SET is_active = false WHERE id = %s", (user_id,))
        conn.commit()
        
        return {"success": True, "message": "User deleted successfully"}

# (reset-password endpoint removed — it returned success without sending
# anything. Ledger: wire real reset when email infra is decided.)

@router.delete("/deeds/{deed_id}")
def admin_delete_deed(deed_id: int, admin=Depends(get_current_admin)):
    """Soft delete a deed (set status to 'deleted') - Phase 5B"""
    with db_connection() as conn, conn.cursor() as cur:
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
    """Where an admin can get this deed's document, if it has one.

    ═══ THIS USED TO GIVE ADVICE THAT COULD NOT WORK ═══

    When no PDF was stored it said: *"PDF not available. Use
    /api/generate/{deed_type} to regenerate."*

    Those handlers take a RENDER CONTEXT rather than a deed id, and they
    render and stream **storing nothing**. So an admin who followed the
    instruction got a document that is not the instrument, and the deed
    still had no stored PDF afterwards — the advice could not fix the
    problem it was offered for.

    It is the same defect DEEDPREVIEW-FIX closed on the officer's side
    (a re-render standing in for the recorded document), arriving as a
    help string. §4 reaches messages: a refusal that names the wrong
    remedy is worse than one that names none, because it spends
    somebody's afternoon before failing.

    The endpoint that actually repairs this is `/deeds/{id}/download`,
    which self-heals a deed that HAS an instrument whose bytes were
    never captured. Whether this deed is such a row is
    `deed_pdf.may_self_heal` — the same rule the download endpoint asks,
    not a second opinion about it.
    """
    from services.deed_pdf import may_self_heal

    with db_connection() as conn, conn.cursor() as cur:
        # `completed_at` is read because may_self_heal needs it: a row
        # stamped complete has been through generation whatever its
        # status column now says.
        cur.execute("""
            SELECT id, deed_type, status, pdf_url, property_address,
                   grantor_name, grantee_name, created_at, completed_at
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
        
        # Nothing stored. Two different situations, and telling them
        # apart is the whole point — one is recoverable and one is not a
        # fault at all.
        if may_self_heal(deed):
            return {
                "success": False,
                "pdf_url": None,
                "deed_type": deed['deed_type'],
                "deed_id": deed_id,
                "message": (
                    f"No PDF stored for a completed deed. GET /deeds/{deed_id}/download "
                    "serves it and stores the bytes on the way through, which repairs "
                    "this row permanently."
                ),
            }
        return {
            "success": False,
            "pdf_url": None,
            "deed_type": deed['deed_type'],
            "deed_id": deed_id,
            # Neutral phrasing, and NOT a stylistic preference: the §11.1
            # sweep caught "on her behalf" in this very string. Rendered
            # copy names the role, never a pronoun for it.
            "message": (
                "This deed is a draft and has no document yet, which is not a "
                "fault. Generating one is the officer's act, in the builder, and "
                "it happens once — no admin tool should produce it for them."
            ),
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
    with db_connection() as conn, conn.cursor() as cur:
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
    
    with db_connection() as conn, conn.cursor() as cur:
        # Use gen_random_uuid() for UUID id
        cur.execute("""
            INSERT INTO api_keys (id, key_prefix, key_hash, name, is_test, rate_limit_hour, rate_limit_day, created_by_email, is_active, created_at)
            VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, %s, %s, true, NOW())
            RETURNING id, created_at
        """, (key_prefix, key_hash, name, is_test, rate_limit_hour, rate_limit_day, admin))
        
        row = cur.fetchone()
        conn.commit()
        
        return {
            "success": True,
            "api_key": {
                "id": str(row['id']),  # UUID to string
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
    key_id: str,  # UUID as string
    admin=Depends(get_current_admin)
):
    """Get API key details and usage statistics."""
    with db_connection() as conn, conn.cursor() as cur:
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
    key_id: str,  # UUID as string
    name: Optional[str] = Body(None, embed=True),
    is_active: Optional[bool] = Body(None, embed=True),
    rate_limit_hour: Optional[int] = Body(None, embed=True),
    rate_limit_day: Optional[int] = Body(None, embed=True),
    admin=Depends(get_current_admin)
):
    """Update API key settings."""
    with db_connection() as conn, conn.cursor() as cur:
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
    key_id: str,  # UUID as string
    admin=Depends(get_current_admin)
):
    """Deactivate (soft delete) an API key."""
    with db_connection() as conn, conn.cursor() as cur:
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
