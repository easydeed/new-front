import os
from fastapi import FastAPI, HTTPException, Depends, Query, Request, Body, Response
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel, Field, field_validator
# Phase 24-G: Updated PDF templates with adjusted margins (trigger deploy)
from typing import Optional, List, Dict
import stripe
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
from time import time
from collections import defaultdict
from jinja2 import Environment, FileSystemLoader
from pdf_engine import render_pdf, render_pdf_async
import base64
import tempfile
import json
from database import (
    create_user, get_user_by_email, create_deed, get_user_deeds,
    get_user_profile, update_user_profile, get_cached_property,
    cache_property_data, get_recent_properties
)
from ai_assist import suggest_defaults, validate_deed_data
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user_id, get_current_user_email, AuthUtils, get_current_admin
)
from middleware.qa_instrumentation import QAInstrumentationMiddleware, get_qa_health_status

load_dotenv()

app = FastAPI(title="DeedPro API", version="2.0.0-dynamic-wizard")
# Updated for new-front monorepo with pricing management

# Add QA instrumentation middleware for staging environment
if os.getenv("ENVIRONMENT") == "staging":
    app.add_middleware(
        QAInstrumentationMiddleware,
        enable_detailed_logging=True
    )

# Allow CORS for local dev and frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://deedpro-frontend-new.vercel.app",
        "https://deedpro-frontend-new-*.vercel.app",  # Preview deployments
        "*"  # Fallback for development
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Phase 6-2: Metrics tracking middleware
@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    """Track request metrics for admin monitoring"""
    t0 = time()
    app_state.METRICS['requests_total'] += 1
    try:
        response = await call_next(request)
        app_state.METRICS[f"status_{response.status_code}"] += 1
        return response
    finally:
        dur = time() - t0
        app_state.METRICS['latency_ms_sum'] += int(dur * 1000)
        app_state.LAST_REQUEST_TS = time()

# Stripe configuration
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# T8: DB connection (module-level conn + get_db_connection) lives in db.py.
# Always access the connection as db.conn — get_db_connection() rebinds the
# global on reconnect, so a from-import would go stale.
import db

# T8: shared mutable metrics state lives in app_state.py (module-attribute
# access required — LAST_REQUEST_TS is rebound on every request).
import app_state

# ============================================================================
# Router mounts (T8): every mount is a DIRECT import + include_router.
# The old try/except-around-mount pattern silently skipped routers when an
# import failed (the T7 incident) — a broken router must now fail loudly at
# startup instead of quietly dropping its routes.
# Mount order preserves the pre-split registration order: billing first,
# then the existing includes in their original sequence, then the routers
# extracted from main.py's inline sections in the order those sections
# appeared (decorator routes were registered after all includes).
# ============================================================================

# PHASE 23-B: Include billing & reporting routers (October 30, 2025)
from phase23_billing.app_include import include_billing_routers
include_billing_routers(app)
print("✅ Phase 23-B billing & reporting endpoints loaded successfully")

# T4: the legacy no-auth ai_router (root ai_assist.py) was removed — its
# POST /api/ai/assist shadowed api/ai_assist.py's and had no consumers.
# /api/ai/* is owned solely by api/ai_assist.py (mounted below).

# Include Property Integration API router
from api.property_endpoints import router as property_router
app.include_router(property_router)
print("✅ Property integration endpoints loaded successfully")

# Include new dynamic wizard API routers
from api.ai_assist import router as ai_assist_router
app.include_router(ai_assist_router, prefix="/api/ai", tags=["AI Assistant"])
print("✅ AI assist endpoints loaded successfully")

from api.generate_deed import router as generate_deed_router
app.include_router(generate_deed_router, prefix="/api", tags=["Document Generation"])
print("✅ Document generation endpoints loaded successfully")

# Include new Grant Deed CA router
from routers.deeds import router as deeds_router
app.include_router(deeds_router, prefix="/api")
print("✅ Grant Deed CA endpoints loaded successfully")

# Include PHASE 8 extra deed types router
from routers.deeds_extra import router as deeds_extra_router
ENABLE_EXTRA_DEEDS = os.getenv("ENABLE_DEED_TYPES_EXTRA", "false").lower() == "true"
if ENABLE_EXTRA_DEEDS:
    app.include_router(deeds_extra_router)
    print("✅ Extra Deed Types endpoints loaded successfully (Quitclaim, Interspousal, Warranty, Tax)")
else:
    print("⚠️ Extra Deed Types endpoints disabled via ENABLE_DEED_TYPES_EXTRA flag")

# Document types API for dynamic wizard
from api.doc_types import router as doc_types_router
app.include_router(doc_types_router, prefix="/api", tags=["Doc Types"])
print("✅ Document types endpoints loaded successfully")

# T4: routers/ai.py removed (chain-of-title / profile-request) — no frontend
# consumers; called TitlePoint's SOAP endpoint directly, bypassing the service.

# AUTH HARDENING: Password reset, email verification, refresh tokens
from routers.auth_extra import router as auth_extra_router
app.include_router(auth_extra_router, prefix="", tags=["Auth Extra"])
print("✅ Auth hardening endpoints loaded successfully (password reset, email verification)")

# ADMIN HONESTY PASS: Real admin endpoints with pagination, search, exports
from routers.admin_api_v2 import router as admin_api_v2_router
app.include_router(admin_api_v2_router, prefix="", tags=["Admin v2"])
print("✅ Admin v2 endpoints loaded successfully (users/deeds search, detail, exports)")

# PHASE 7.5: Notifications System (gap-plan)
from routers.notifications import router as notifications_router
app.include_router(notifications_router, prefix="/notifications", tags=["Notifications"])
print("✅ Phase 7.5: Notifications system loaded (feature flag: NOTIFICATIONS_ENABLED)")

# T3: the flag-gated "enhanced sharing" and "/deed-shares feedback" routers
# were removed — no frontend consumer ever called them. The live sharing
# stack is the /shared-deeds + /approve/{token} endpoints (routers/sharing.py),
# (deed_shares table), which now also serve feedback and revoke.

# PATCH 5: Industry Partners API (Full Stack - org-scoped with admin)
from routers.partners import router as partners_router
from routers.admin_partners import router as admin_partners_router
app.include_router(partners_router, prefix="/partners", tags=["Partners"])
app.include_router(admin_partners_router, prefix="/admin/partners", tags=["Admin Partners"])
print("✅ Patch 5: Industry Partners API loaded (org-scoped, user CRUD + admin panel)")

# QR Verification System (Public endpoint - no auth required)
from routers.verification import router as verification_router, admin_router as verification_admin_router
app.include_router(verification_router, tags=["Document Verification"])
app.include_router(verification_admin_router, tags=["Admin Verification"])
print("✅ QR Verification System loaded (/api/verify/{code} - public, /admin/verification/* - admin)")

# Public API v1 (Partner API for deed generation)
from routers.api_v1.router import router as api_v1_router
app.include_router(api_v1_router, tags=["Public API v1"])
print("✅ Public API v1 loaded (/api/v1/deeds - partner deed generation)")

# T8: routers extracted from main.py's former inline sections, mounted in the
# order the sections appeared in the pre-split file.
from routers.system import router as system_router
app.include_router(system_router)

from routers.users_auth import router as users_auth_router
app.include_router(users_auth_router)

from routers.admin_inline import router as admin_inline_router
app.include_router(admin_inline_router)

from routers.deeds_crud import router as deeds_crud_router
app.include_router(deeds_crud_router)

from routers.sharing import router as sharing_router
app.include_router(sharing_router)

from routers.pricing import router as pricing_router
app.include_router(pricing_router)

from routers.property_cache_routes import router as property_cache_routes_router
app.include_router(property_cache_routes_router)

# Jinja2 environment for deed templates
# Use absolute path that works both locally and on Render
import os
template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'templates')
if not os.path.exists(template_dir):
    # Fallback for different deployment structures
    template_dir = os.path.join(os.getcwd(), 'templates')
    if not os.path.exists(template_dir):
        template_dir = '../templates'  # Original fallback

env = Environment(loader=FileSystemLoader(template_dir))

# -----------------------
# Recorder/tax profiles
# -----------------------
RECORDER_PROFILES = {
    "Los Angeles": {
        "top_margin_in": 2.0,
        "left_margin_in": 0.5,
        "right_margin_in": 0.5,
        "bottom_margin_in": 0.5,
        # CA Documentary Transfer Tax guideline (commonly $1.10 per $1,000);
        # fall back to $0.55 per $500 if provided as sales price string.
        "doc_tax_per_1000": 1.10,
        "city_rates": {
            # Optional city-specific add-ons
        },
    }
}

def compute_doc_transfer_tax(sales_price: str | float | None, county: str | None, city: str | None) -> dict:
    """Compute CA-style documentary transfer tax with simple county/city profile.
    Returns dict with county_amount, city_amount, total, computed_on.
    """
    try:
        if sales_price is None or sales_price == "":
            return {"county_amount": 0.0, "city_amount": 0.0, "total": 0.0, "computed_on": "none"}
        if isinstance(sales_price, str):
            clean = sales_price.replace("$", "").replace(",", "").strip()
            amount = float(clean) if clean else 0.0
        else:
            amount = float(sales_price)
    except Exception:
        return {"county_amount": 0.0, "city_amount": 0.0, "total": 0.0, "computed_on": "invalid"}

    profile = RECORDER_PROFILES.get((county or "").strip(), RECORDER_PROFILES.get("Los Angeles"))
    county_rate = (profile or {}).get("doc_tax_per_1000", 1.10)
    city_rates = (profile or {}).get("city_rates", {})
    city_rate = city_rates.get((city or "").strip(), 0.0)

    county_amount = (amount / 1000.0) * county_rate
    city_amount = (amount / 1000.0) * city_rate
    total = round(county_amount + city_amount, 2)
    return {
        "county_amount": round(county_amount, 2),
        "city_amount": round(city_amount, 2),
        "total": total,
        "computed_on": "full_value",
    }

def needs_exhibit_a(legal_description: str | None, threshold_chars: int = 600) -> bool:
    """Simple heuristic to move long legal descriptions to Exhibit A."""
    if not legal_description:
        return False
    return len(legal_description.strip()) >= threshold_chars

# Pydantic models
class UserCreate(BaseModel):
    email: str
    first_name: str
    last_name: str
    username: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None

class PaymentMethodCreate(BaseModel):
    payment_method_id: str
    set_as_default: bool = False

class Recipient(BaseModel):
    name: str
    email: str
    role: str

class RecipientsCreate(BaseModel):
    deed_id: int
    recipients: List[Recipient]

class DeedData(BaseModel):
    deed_type: str
    data: dict

class PlanLimits(BaseModel):
    max_deeds_per_month: int
    api_calls_per_month: int
    ai_assistance: bool
    integrations_enabled: bool
    priority_support: bool

# ============================================================================
# PLAN LIMITS & USAGE TRACKING
# ============================================================================

def check_plan_limits(user_id: int, action: str = "deed_creation") -> dict:
    """Check if user has reached plan limits"""
    if not db.conn:
        return {"allowed": True, "message": "Database not available"}

    try:
        with db.conn.cursor() as cur:
            # Get user plan
            cur.execute("SELECT plan FROM users WHERE id = %s", (user_id,))
            result = cur.fetchone()
            if not result:
                return {"allowed": False, "message": "User not found"}

            plan = result[0]

            # Get plan limits
            cur.execute("""
                SELECT max_deeds_per_month, api_calls_per_month
                FROM plan_limits WHERE plan_name = %s
            """, (plan,))
            limits = cur.fetchone()

            if not limits:
                return {"allowed": True, "message": "No limits configured"}

            max_deeds, max_api_calls = limits

            if action == "deed_creation" and max_deeds > 0:
                # Check monthly deed count
                cur.execute("""
                    SELECT COUNT(*) FROM deeds
                    WHERE user_id = %s AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
                """, (user_id,))
                deed_count = cur.fetchone()[0]

                if deed_count >= max_deeds:
                    return {
                        "allowed": False,
                        "message": f"Monthly deed limit reached ({max_deeds}). Upgrade your plan for unlimited deeds.",
                        "current_usage": deed_count,
                        "limit": max_deeds
                    }

            return {"allowed": True, "message": "Within limits"}

    except Exception as e:
        print(f"Limit check error: {str(e)}")
        return {"allowed": True, "message": "Limit check failed, allowing action"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
