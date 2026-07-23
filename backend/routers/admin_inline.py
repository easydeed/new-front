"""Inline /admin/* endpoints (T8 split — moved verbatim from main.py)."""
import os
from datetime import datetime, timedelta
from typing import Optional

import stripe
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

import app_state
import db
from auth import get_current_admin

router = APIRouter()

class AdminUserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    is_active: Optional[bool] = None
    subscription_status: Optional[str] = None

# ============================================================================
# ADMIN ENDPOINTS - Platform Management
# ============================================================================

@router.get("/admin/dashboard", dependencies=[Depends(get_current_admin)])
def admin_dashboard():
    """Get admin dashboard overview with key metrics"""
    try:
        if not db.conn:
            raise HTTPException(status_code=500, detail="Database connection not available")

        with db.conn.cursor() as cur:
            # Get total users
            cur.execute("SELECT COUNT(*) FROM users")
            total_users = cur.fetchone()[0]

            # Get active users (logged in within 30 days)
            cur.execute("""
                SELECT COUNT(*) FROM users
                WHERE is_active = TRUE AND (last_login > NOW() - INTERVAL '30 days' OR last_login IS NULL)
            """)
            active_users = cur.fetchone()[0]

            # Get total deeds
            cur.execute("SELECT COUNT(*) FROM deeds")
            total_deeds = cur.fetchone()[0]

            # Get deeds this month
            cur.execute("""
                SELECT COUNT(*) FROM deeds
                WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
            """)
            deeds_this_month = cur.fetchone()[0]

            # Get subscription breakdown
            cur.execute("""
                SELECT plan, COUNT(*)
                FROM users
                WHERE is_active = TRUE
                GROUP BY plan
            """)
            plan_counts = dict(cur.fetchall())

            # Calculate estimated revenue (simplified calculation)
            professional_users = plan_counts.get('professional', 0)
            enterprise_users = plan_counts.get('enterprise', 0)
            monthly_revenue = (professional_users * 29.99) + (enterprise_users * 99.99)
            total_revenue = monthly_revenue * 12  # Simplified annual estimate

            # Get recent activity (recent user signups and deed creations)
            cur.execute("""
                SELECT 'user_signup' as type, email as user, created_at as timestamp, NULL as deed_id
                FROM users
                WHERE created_at >= NOW() - INTERVAL '7 days'
                UNION ALL
                SELECT 'deed_created' as type, u.email as user, d.created_at as timestamp, d.id as deed_id
                FROM deeds d
                JOIN users u ON d.user_id = u.id
                WHERE d.created_at >= NOW() - INTERVAL '7 days'
                ORDER BY timestamp DESC
                LIMIT 10
            """)
            recent_activity = []
            for row in cur.fetchall():
                activity = {
                    "type": row[0],
                    "user": row[1],
                    "timestamp": row[2].isoformat() if row[2] else None
                }
                if row[3]:  # deed_id
                    activity["deed_id"] = row[3]
                recent_activity.append(activity)

        dashboard_data = {
            "total_users": total_users,
            "active_users": active_users,
            "total_deeds": total_deeds,
            "deeds_this_month": deeds_this_month,
            "total_revenue": total_revenue,
            "monthly_revenue": monthly_revenue,
            "subscription_breakdown": {
                "free": plan_counts.get('free', 0),
                "professional": plan_counts.get('professional', 0),
                "enterprise": plan_counts.get('enterprise', 0)
            },
            "recent_activity": recent_activity,
            "growth_metrics": {
                "user_growth_rate": 0.0,  # Would need historical data
                "revenue_growth_rate": 0.0,  # Would need historical data
                "deed_completion_rate": 100.0 if total_deeds > 0 else 0  # Simplified
            }
        }

        return dashboard_data

    except HTTPException:
        raise
    except Exception as e:
        db.conn.rollback()  # Phase 14-B: Prevent transaction cascade failures
        print(f"Error fetching admin dashboard: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch dashboard data: {str(e)}")

@router.get("/admin/users", dependencies=[Depends(get_current_admin)])
def admin_list_all_users(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None
):
    """List all users with pagination and filtering"""
    # Query real user data from database
    try:
        if not db.conn:
            raise HTTPException(status_code=500, detail="Database connection not available")

        with db.conn.cursor() as cur:
            # Build query with filters
            where_conditions = ["TRUE"]
            params = []

            if search:
                where_conditions.append("(email ILIKE %s OR full_name ILIKE %s)")
                params.extend([f"%{search}%", f"%{search}%"])

            if status == "active":
                where_conditions.append("is_active = TRUE")
            elif status == "inactive":
                where_conditions.append("is_active = FALSE")

            where_clause = " AND ".join(where_conditions)

            # Get total count for pagination
            count_query = f"SELECT COUNT(*) FROM users WHERE {where_clause}"
            cur.execute(count_query, params)
            total_count = cur.fetchone()[0]

            # Get users with pagination
            offset = (page - 1) * limit
            query = f"""
                SELECT id, email, full_name, role, company_name, phone, state, plan,
                       created_at, last_login, is_active
                FROM users
                WHERE {where_clause}
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
            """
            params.extend([limit, offset])
            cur.execute(query, params)
            users = cur.fetchall()

            # Get deed counts for each user
            user_ids = [user[0] for user in users]
            deed_counts = {}
            if user_ids:
                cur.execute("""
                    SELECT user_id, COUNT(*)
                    FROM deeds
                    WHERE user_id = ANY(%s)
                    GROUP BY user_id
                """, (user_ids,))
                deed_counts = dict(cur.fetchall())

            # Format users for response
            formatted_users = []
            for user in users:
                # Split full_name into first and last name
                full_name = user[2] or ""
                name_parts = full_name.split(" ", 1)
                first_name = name_parts[0] if name_parts else ""
                last_name = name_parts[1] if len(name_parts) > 1 else ""

                formatted_users.append({
                    "id": user[0],
                    "email": user[1],
                    "first_name": first_name,
                    "last_name": last_name,
                    "full_name": user[2],
                    "role": user[3],
                    "company_name": user[4],
                    "phone": user[5],
                    "state": user[6],
                    "subscription_plan": user[7],
                    "subscription_status": "active" if user[10] else "inactive",
                    "created_at": user[8].isoformat() if user[8] else None,
                    "last_login": user[9].isoformat() if user[9] else None,
                    "is_active": user[10],
                    "total_deeds": deed_counts.get(user[0], 0),
                    "monthly_revenue": 29.99 if user[7] == "professional" else 99.99 if user[7] == "enterprise" else 0.00
                })

            return {
                "users": formatted_users,
                "total": total_count,
                "page": page,
                "limit": limit,
                "total_pages": (total_count + limit - 1) // limit
            }

    except HTTPException:
        raise
    except Exception as e:
        db.conn.rollback()  # Phase 14-B: Prevent transaction cascade failures
        print(f"Error fetching admin users: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch users: {str(e)}")

@router.get("/admin/users/{user_id}", dependencies=[Depends(get_current_admin)])
def admin_get_user_details(user_id: int):
    """Get detailed information about a specific user - Phase 6-2: Real data"""
    if not db.conn:
        raise HTTPException(status_code=500, detail="Database connection not available")

    try:
        with db.conn.cursor() as cur:
            # Get user basic info
            cur.execute("""
                SELECT id, email, full_name, role, company_name, phone,
                       state, plan, is_active, stripe_customer_id,
                       created_at, last_login, updated_at
                FROM users
                WHERE id = %s
            """, (user_id,))

            user_row = cur.fetchone()
            if not user_row:
                raise HTTPException(status_code=404, detail=f"User {user_id} not found")

            # Parse user data
            user_id, email, full_name, role, company_name, phone, state, plan, is_active, stripe_customer_id, created_at, last_login, updated_at = user_row

            # Get deed statistics
            cur.execute("""
                SELECT
                    COUNT(*) as total_deeds,
                    COUNT(*) FILTER (WHERE deed_type IS NOT NULL) as completed_deeds,
                    0 as draft_deeds
                FROM deeds
                WHERE user_id = %s AND COALESCE(status, '') <> 'deleted'
            """, (user_id,))

            deed_stats = cur.fetchone()
            total_deeds, completed_deeds, draft_deeds = deed_stats if deed_stats else (0, 0, 0)

            # Parse name (split full_name if available)
            name_parts = full_name.split(' ', 1) if full_name else ['', '']
            first_name = name_parts[0] if len(name_parts) > 0 else ''
            last_name = name_parts[1] if len(name_parts) > 1 else ''

            # Build response with real data
            user_details = {
                "id": user_id,
                "email": email or "",
                "first_name": first_name,
                "last_name": last_name,
                "username": email.split('@')[0] if email else "",
                "city": "",  # Not in current schema
                "country": "USA",  # Default
                "state": state or "",
                "company_name": company_name or "",
                "phone": phone or "",
                "created_at": created_at.isoformat() if created_at else "",
                "last_login": last_login.isoformat() if last_login else "",
                "is_active": bool(is_active),
                "role": role or "user",
                "subscription_plan": plan or "free",
                "subscription_status": "active" if is_active else "inactive",
                "stripe_customer_id": stripe_customer_id or "",
                "deed_statistics": {
                    "total_deeds": total_deeds,
                    "completed_deeds": completed_deeds,
                    "draft_deeds": draft_deeds,
                    "shared_deeds": 0,  # TODO: Implement when shared_deeds table exists
                    "approved_deeds": completed_deeds
                },
                "activity_log": []  # TODO: Implement activity tracking table
            }

            return user_details

    except Exception as e:
        db.conn.rollback()  # Phase 14-B: Prevent transaction cascade failures
        print(f"Error fetching user details: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching user details: {str(e)}")

# Admin verticalization: removed here — the user edit/delete stubs and the
# shadowed Stripe revenue handler were dead (admin_api_v2 / phase23 own those
# paths); /admin/analytics and /admin/system-health returned hardcoded
# fiction; GET /admin/deeds (faked statuses) is replaced by the real
# /admin/deeds/search. Orders remain out of scope permanently per owner
# decision 2026-07-23: title_order_no is a reference string into the escrow
# officer's own system; DeedPro is a deed preparation engine.








@router.get("/admin/system/overview", dependencies=[Depends(get_current_admin)])
def admin_system_overview():
    """Get system overview with real health checks and PDF stats - Phase 5D"""
    # Check database health
    db_status = "down"
    db_latency = 0
    try:
        import time
        start = time.time()
        with db.conn.cursor() as cur:
            cur.execute("SELECT 1")
            cur.fetchone()
        db_latency = int((time.time() - start) * 1000)
        db_status = "up"
    except Exception as e:
        print(f"DB health check failed: {e}")

    # Check Stripe health
    stripe_status = "down"
    try:
        stripe.Account.retrieve()
        stripe_status = "up"
    except Exception as e:
        print(f"Stripe health check failed: {e}")

    # PDF engine status
    pdf_engine_primary = os.getenv("PDF_ENGINE", "auto")
    use_pdfshift = os.getenv("USE_PDFSHIFT", "false").lower() == "true"
    pdfshift_key = os.getenv("PDFSHIFT_API_KEY")

    if use_pdfshift and pdfshift_key:
        pdf_primary = "PDFShift"
    else:
        pdf_primary = "WeasyPrint"

    # Get PDF generation stats from deeds table
    pdf_stats = {
        "total_generated": 0,
        "pdfshift_count": 0,
        "weasyprint_count": 0,
        "avg_time_ms": 0,
        "by_type": {}
    }

    try:
        with db.conn.cursor() as cur:
            # Total deeds with PDFs (completed deeds)
            cur.execute("SELECT COUNT(*) FROM deeds WHERE status = 'completed'")
            pdf_stats["total_generated"] = cur.fetchone()[0] or 0

            # For now, estimate PDFShift vs WeasyPrint based on deployment date
            # (In future, add pdf_engine column to deeds table)
            if use_pdfshift:
                pdf_stats["pdfshift_count"] = pdf_stats["total_generated"]
                pdf_stats["weasyprint_count"] = 0
            else:
                pdf_stats["pdfshift_count"] = 0
                pdf_stats["weasyprint_count"] = pdf_stats["total_generated"]

            # By deed type
            cur.execute("""
                SELECT deed_type, COUNT(*) as count
                FROM deeds
                WHERE status = 'completed'
                GROUP BY deed_type
                ORDER BY count DESC
            """)
            for row in cur.fetchall():
                pdf_stats["by_type"][row[0]] = row[1]

    except Exception as e:
        print(f"PDF stats error: {e}")

    return {
        "health": {
            "database": {"status": db_status, "latency_ms": db_latency},
            "pdf_engine": {"status": "up", "primary": pdf_primary},
            "sitex": {"status": "unknown", "last_call": None},
            "stripe": {"status": stripe_status}
        },
        "pdf_stats": pdf_stats
    }

@router.get("/admin/system-metrics", dependencies=[Depends(get_current_admin)])
def admin_system_metrics():
    """Get real-time system metrics - Phase 6-2: Real monitoring data"""
    reqs = app_state.METRICS.get('requests_total', 0)
    lat_sum = app_state.METRICS.get('latency_ms_sum', 0)
    avg_ms = int(lat_sum / reqs) if reqs else 0

    return {
        "requests_total": reqs,
        "avg_latency_ms": avg_ms,
        "status": {k: v for k, v in app_state.METRICS.items() if str(k).startswith('status_')},
        "last_request_unix": app_state.LAST_REQUEST_TS,
        "last_request_iso": datetime.fromtimestamp(app_state.LAST_REQUEST_TS).isoformat() if app_state.LAST_REQUEST_TS > 0 else None
    }
