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

@router.put("/admin/users/{user_id}", dependencies=[Depends(get_current_admin)])
def admin_update_user(user_id: int, user_update: AdminUserUpdate):
    """Update user information (admin only)"""
    # In production, update user in database
    return {
        "success": True,
        "message": f"User {user_id} updated successfully",
        "updated_fields": user_update.dict(exclude_unset=True)
    }

@router.delete("/admin/users/{user_id}", dependencies=[Depends(get_current_admin)])
def admin_delete_user(user_id: int):
    """Delete/deactivate a user (admin only)"""
    # In production, soft delete or deactivate user
    return {
        "success": True,
        "message": f"User {user_id} has been deactivated"
    }

@router.get("/admin/deeds", dependencies=[Depends(get_current_admin)])
def admin_list_all_deeds(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = None,
    user_id: Optional[int] = None
):
    """List all deeds across all users"""
    # Query real deed data from database
    try:
        if not db.conn:
            raise HTTPException(status_code=500, detail="Database connection not available")

        with db.conn.cursor() as cur:
            # Build query with filters
            where_conditions = ["TRUE"]
            params = []

            if user_id:
                where_conditions.append("d.user_id = %s")
                params.append(user_id)

            # Note: status filter can be added when status column is added to deeds table

            where_clause = " AND ".join(where_conditions)

            # Get total count for pagination
            count_query = f"SELECT COUNT(*) FROM deeds d WHERE {where_clause}"
            cur.execute(count_query, params)
            total_count = cur.fetchone()[0]

            # Get deeds with user information
            offset = (page - 1) * limit
            query = f"""
                SELECT d.id, d.user_id, d.deed_type, d.property_address,
                       d.grantor_name, d.grantee_name, d.created_at, d.updated_at,
                       u.email, u.full_name
                FROM deeds d
                JOIN users u ON d.user_id = u.id
                WHERE {where_clause}
                ORDER BY d.created_at DESC
                LIMIT %s OFFSET %s
            """
            params.extend([limit, offset])
            cur.execute(query, params)
            deeds = cur.fetchall()

            # Format deeds for response
            formatted_deeds = []
            for deed in deeds:
                formatted_deeds.append({
                    "id": deed[0],
                    "user_id": deed[1],
                    "deed_type": deed[2],
                    "property_address": deed[3],
                    "grantor_name": deed[4],
                    "grantee_name": deed[5],
                    "created_at": deed[6].isoformat() if deed[6] else None,
                    "updated_at": deed[7].isoformat() if deed[7] else None,
                    "user_email": deed[8],
                    "user_name": deed[9],
                    "status": "completed",  # Default - can add status column later
                    "recorded": False,      # Default - can add recorded column later
                    "shared_count": 0,      # Default - can add sharing tracking later
                    "approval_count": 0     # Default - can add approval tracking later
                })

            return {
                "deeds": formatted_deeds,
                "total": total_count,
                "page": page,
                "limit": limit,
                "total_pages": (total_count + limit - 1) // limit
            }

    except HTTPException:
        raise
    except Exception as e:
        db.conn.rollback()  # Phase 14-B: Prevent transaction cascade failures
        print(f"Error fetching admin deeds: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch deeds: {str(e)}")

@router.get("/admin/revenue", dependencies=[Depends(get_current_admin)])
def admin_revenue_analytics():
    """Get real revenue analytics from Stripe"""
    try:
        # Calculate time ranges
        now = datetime.now()
        start_of_month = datetime(now.year, now.month, 1)
        start_of_month_ts = int(start_of_month.timestamp())

        # Get active subscriptions for MRR
        subscriptions = stripe.Subscription.list(status="active", limit=100)
        mrr_cents = sum(sub.plan.amount for sub in subscriptions.data if sub.plan)

        # Get charges this month
        charges = stripe.Charge.list(created={"gte": start_of_month_ts}, limit=100)
        monthly_revenue_cents = sum(c.amount for c in charges.data if c.paid and not c.refunded)
        stripe_fees_cents = sum(c.balance_transaction.fee if hasattr(c, 'balance_transaction') and c.balance_transaction else 0 for c in charges.data if c.paid)

        # Get refunds this month
        refunds = stripe.Refund.list(created={"gte": start_of_month_ts}, limit=100)
        refunds_cents = sum(r.amount for r in refunds.data)

        # Get all-time charges for total revenue (last 12 months to keep it manageable)
        twelve_months_ago = int((now - timedelta(days=365)).timestamp())
        all_charges = stripe.Charge.list(created={"gte": twelve_months_ago}, limit=100)
        total_revenue_cents = sum(c.amount for c in all_charges.data if c.paid and not c.refunded)

        # Build monthly breakdown (last 6 months)
        monthly_breakdown = []
        for i in range(6):
            month_date = now - timedelta(days=30 * i)
            month_str = month_date.strftime("%Y-%m")
            month_start = datetime(month_date.year, month_date.month, 1)
            month_end = (month_start + timedelta(days=32)).replace(day=1)

            month_charges = stripe.Charge.list(
                created={"gte": int(month_start.timestamp()), "lt": int(month_end.timestamp())},
                limit=100
            )
            revenue = sum(c.amount for c in month_charges.data if c.paid and not c.refunded)

            monthly_breakdown.append({
                "month": month_str,
                "revenue_cents": revenue,
                "revenue_dollars": revenue / 100
            })

        revenue_data = {
            "overview": {
                "total_revenue_cents": total_revenue_cents,
                "monthly_revenue_cents": monthly_revenue_cents,
                "stripe_fees_cents": stripe_fees_cents,
                "refunds_cents": refunds_cents,
                "net_monthly_revenue_cents": monthly_revenue_cents - stripe_fees_cents - refunds_cents
            },
            "monthly_breakdown": monthly_breakdown,
            "mrr_arr": {
                "mrr_cents": mrr_cents,
                "mrr_dollars": mrr_cents / 100,
                "arr_cents": mrr_cents * 12,
                "arr_dollars": (mrr_cents * 12) / 100
            }
        }

        return revenue_data

    except stripe.error.StripeError as e:
        print(f"Stripe error: {e}")
        # Return zero values if Stripe fails
        return {
            "overview": {
                "total_revenue_cents": 0,
                "monthly_revenue_cents": 0,
                "stripe_fees_cents": 0,
                "refunds_cents": 0,
                "net_monthly_revenue_cents": 0
            },
            "monthly_breakdown": [],
            "mrr_arr": {
                "mrr_cents": 0,
                "mrr_dollars": 0,
                "arr_cents": 0,
                "arr_dollars": 0
            }
        }
    except Exception as e:
        print(f"Revenue analytics error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch revenue data: {str(e)}")

@router.get("/admin/analytics", dependencies=[Depends(get_current_admin)])
def admin_platform_analytics():
    """Get comprehensive platform analytics"""
    analytics_data = {
        "user_metrics": {
            "total_users": 1247,
            "active_users_30d": 892,
            "new_users_7d": 23,
            "user_retention_rate": 78.5,
            "average_session_duration": "12:34"
        },
        "deed_metrics": {
            "total_deeds": 3456,
            "completed_deeds": 2891,
            "draft_deeds": 565,
            "completion_rate": 83.6,
            "average_completion_time": "2.3 days"
        },
        "sharing_metrics": {
            "total_shares": 1234,
            "approval_rate": 76.8,
            "average_response_time": "1.2 days",
            "most_shared_deed_type": "Quitclaim Deed"
        },
        "geographic_distribution": [
            {"state": "California", "user_count": 423, "deed_count": 1234},
            {"state": "Texas", "user_count": 298, "deed_count": 876},
            {"state": "Florida", "user_count": 187, "deed_count": 543}
        ],
        "performance_metrics": {
            "api_response_time": "145ms",
            "uptime": "99.8%",
            "error_rate": "0.12%"
        }
    }

    return analytics_data

@router.get("/admin/system-health", dependencies=[Depends(get_current_admin)])
def admin_system_health():
    """Get system health and status information"""
    health_data = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "api": {"status": "up", "response_time": "145ms"},
            "database": {"status": "up", "connections": 23, "max_connections": 100},
            "stripe": {"status": "up", "last_webhook": "2024-01-15T09:45:00Z"},
            "email": {"status": "up", "queue_size": 5}
        },
        "resources": {
            "cpu_usage": "34%",
            "memory_usage": "67%",
            "disk_usage": "45%"
        },
        "recent_errors": [
            {"timestamp": "2024-01-15T08:30:00Z", "level": "warning", "message": "High memory usage detected"},
            {"timestamp": "2024-01-14T22:15:00Z", "level": "error", "message": "Payment webhook failed for user 456"}
        ]
    }

    return health_data


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
