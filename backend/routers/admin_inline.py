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

# ADMIN1.5: two superseded GET endpoints were removed here —
# `/admin/users` (list) and `/admin/users/{user_id}` (detail). Both were
# orphaned (no frontend caller) and both emitted fabricated values: a
# per-user `monthly_revenue` derived from plan-name times a hardcoded
# price, `"shared_deeds": 0  # TODO`, and `"activity_log": []  # TODO`.
# The live equivalents are `/admin/users/search` and `/admin/users/{id}`
# in admin_api_v2 — the latter being the route formerly suffixed
# `/real`, a fossil of the mock/real split these endpoints were the
# "mock" half of.

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

    # PDF engine — WeasyPrint is THE engine (PS2; PDFShift removed).
    #
    # ADMIN1 kill-list item 1: this used to be the literal
    # `{"status": "up"}` with no probe of any kind, so the engine
    # rendered green on the one screen an operator opens during an
    # incident — even if WeasyPrint could not render a page. It is a
    # real probe now: render a minimal document and see if bytes come
    # back. Cheap (a few ms, no network) and it fails the way the real
    # thing fails, because it IS the real thing.
    pdf_primary = "WeasyPrint"
    pdf_status = "down"
    pdf_probe_error = None
    try:
        from pdf_engine import render_pdf
        probe = render_pdf("<html><body>ok</body></html>")
        pdf_status = "up" if probe[:5] == b"%PDF-" else "down"
        if pdf_status == "down":
            pdf_probe_error = "renderer returned non-PDF bytes"
    except Exception as e:
        pdf_probe_error = f"{type(e).__name__}: {str(e)[:200]}"
        print(f"PDF engine health check failed: {pdf_probe_error}")

    # ADMIN1 kill-list items 2 and 3.
    #
    # `weasyprint_count` was assigned `= total_generated` — an assertion
    # dressed as a measurement — and `total_generated` itself counted
    # deeds in status 'completed', which is deed STATE, not evidence a
    # PDF exists. `deed_pdfs` is the table that knows: one row per deed
    # whose bytes we actually stored. Counting there also makes the
    # stuck-deed gap visible (completed deeds with no stored artifact),
    # which is one of the recurring shell pastes ADMIN0 catalogued.
    #
    # `avg_time_ms` was initialised to 0 and never assigned. Nothing in
    # the platform times a render, so there is no honest number to show:
    # it is reported as null and the UI renders an em-dash. An absence
    # stated is worth more than a zero that reads as a measurement.
    pdf_stats = {
        "stored_pdfs": 0,
        "completed_deeds": 0,
        "completed_without_pdf": 0,
        "avg_time_ms": None,  # not measured anywhere — see above
        "engine": pdf_primary,
        "by_type": {}
    }

    try:
        with db.conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM deed_pdfs")
            pdf_stats["stored_pdfs"] = cur.fetchone()[0] or 0

            cur.execute("SELECT COUNT(*) FROM deeds WHERE status = 'completed'")
            pdf_stats["completed_deeds"] = cur.fetchone()[0] or 0

            # The H1 silent-store class, finally countable from the console.
            cur.execute("""
                SELECT COUNT(*) FROM deeds d
                LEFT JOIN deed_pdfs p ON p.deed_id = d.id
                WHERE d.status = 'completed' AND p.deed_id IS NULL
            """)
            pdf_stats["completed_without_pdf"] = cur.fetchone()[0] or 0

            cur.execute("""
                SELECT d.deed_type, COUNT(*) as count
                FROM deed_pdfs p JOIN deeds d ON d.id = p.deed_id
                GROUP BY d.deed_type
                ORDER BY count DESC
            """)
            for row in cur.fetchall():
                pdf_stats["by_type"][row[0]] = row[1]

    except Exception as e:
        # Not swallowed into zeros: the caller is told the numbers are
        # unavailable rather than shown a confident 0.
        print(f"PDF stats error: {e}")
        pdf_stats = {**pdf_stats, "error": f"{type(e).__name__}: {str(e)[:200]}"}

    return {
        "health": {
            "database": {"status": db_status, "latency_ms": db_latency},
            "pdf_engine": {"status": pdf_status, "primary": pdf_primary,
                           "error": pdf_probe_error},
            # SiteX has no health probe. Rather than reporting a
            # hardcoded "unknown" that looks like a checked result, say
            # plainly that nothing checks it.
            "sitex": {"status": "not_monitored",
                      "note": "no health probe exists for this integration"},
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
