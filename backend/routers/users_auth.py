"""User auth/profile/billing-session endpoints (T8 split — moved verbatim from main.py).

NOTE: the /users/profile handler below is intentionally named
``get_user_profile`` and (exactly as in the pre-split main.py) shadows the
``database.get_user_profile`` import for everything defined after it —
including the /users/profile/enhanced endpoints. Do not "fix" this here;
it is the preserved pre-split behavior.
"""
import os

import psycopg2
import stripe
from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

import db
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user_id, AuthUtils
)
from database import get_user_profile, update_user_profile, get_recent_properties

router = APIRouter()

# New models for registration and plan management
class UserRegister(BaseModel):
    email: str
    password: str
    confirm_password: str
    full_name: str
    role: str
    company_name: Optional[str] = None
    company_type: Optional[str] = None
    phone: Optional[str] = None
    state: str
    agree_terms: bool
    subscribe: bool = False

class UserLogin(BaseModel):
    email: str
    password: str

class UpgradeRequest(BaseModel):
    plan: str  # 'professional', 'enterprise'

# ============================================================================
# AUTHENTICATION & REGISTRATION ENDPOINTS
# ============================================================================

@router.post("/users/register")
async def register_user(user: UserRegister = Body(...)):
    """Register a new user with comprehensive validation"""
    try:
        # Validation
        if not user.agree_terms:
            raise HTTPException(status_code=400, detail="Must agree to terms and conditions")

        if user.password != user.confirm_password:
            raise HTTPException(status_code=400, detail="Passwords do not match")

        # Validate password strength
        is_valid, message = AuthUtils.validate_password_strength(user.password)
        if not is_valid:
            raise HTTPException(status_code=400, detail=message)

        # Validate email format
        if not AuthUtils.validate_email(user.email):
            raise HTTPException(status_code=400, detail="Invalid email format")

        # Validate state code
        if not AuthUtils.validate_state_code(user.state):
            raise HTTPException(status_code=400, detail="Invalid state code")

        # Hash password
        hashed_password = get_password_hash(user.password)

        # PHASE 24-G FIX: Use resilient connection that auto-reconnects
        conn = db.get_db_connection()

        # Insert user into database
        new_user_id = None
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO users (email, password_hash, full_name, role, company_name,
                                 company_type, phone, state, subscribe, plan)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                user.email.lower(), hashed_password, user.full_name, user.role,
                user.company_name, user.company_type, user.phone, user.state.upper(),
                user.subscribe, 'free'
            ))
            result = cur.fetchone()
            if result:
                new_user_id = result[0]
            conn.commit()

        # Phase 7: Send admin notification for new user registration
        try:
            from utils.notifications import notify_new_user_registration

            admin_email = os.getenv('ADMIN_EMAIL', 'admin@deedpro.com')

            notification_sent = notify_new_user_registration(
                admin_email=admin_email,
                user_email=user.email.lower(),
                user_name=user.full_name,
                user_id=new_user_id or 0
            )

            if notification_sent:
                print(f"[Phase 7] ✅ Admin notification sent for new user: {user.email}")
            else:
                print(f"[Phase 7] ⚠️ Failed to send admin notification for new user")
        except Exception as notif_error:
            # Don't fail registration if notification fails
            print(f"[Phase 7] ⚠️ Admin notification error (non-blocking): {notif_error}")

        return {
            "message": "User registered successfully",
            "email": user.email,
            "plan": "free"
        }

    except psycopg2.IntegrityError as ie:
        # PHASE 24-G FIX: Safe rollback that handles closed connections
        try:
            if conn and not conn.closed:
                conn.rollback()
        except Exception as rollback_error:
            print(f"[REGISTER ROLLBACK ERROR] {rollback_error}")
        raise HTTPException(status_code=400, detail="Email already exists")
    except Exception as e:
        # PHASE 24-G FIX: Safe rollback that handles closed connections
        try:
            if conn and not conn.closed:
                conn.rollback()
        except Exception as rollback_error:
            print(f"[REGISTER ROLLBACK ERROR] {rollback_error}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@router.post("/users/login")
async def login_user(credentials: UserLogin = Body(...)):
    """Authenticate user and return JWT token"""
    try:
        # PHASE 24-G FIX: Use resilient connection that auto-reconnects
        conn = db.get_db_connection()

        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, password_hash, full_name, plan, is_active, role
                FROM users WHERE email = %s
            """, (credentials.email.lower(),))
            user = cur.fetchone()

        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Phase 7.5 FIX: Handle both RealDictCursor (dict) and regular cursor (tuple)
        if isinstance(user, dict):
            user_id = user.get('id')
            password_hash = user.get('password_hash')
            full_name = user.get('full_name')
            plan = user.get('plan')
            is_active = user.get('is_active')
            role = user.get('role')
        else:
            user_id, password_hash, full_name, plan, is_active, role = user

        if not is_active:
            raise HTTPException(status_code=401, detail="Account is deactivated")

        if not verify_password(credentials.password, password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Update last login
        with conn.cursor() as cur:
            cur.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = %s", (user_id,))
            conn.commit()

        # Create access token (AdminFix: include role for admin access)
        access_token = create_access_token(
            data={
                "sub": str(user_id),
                "email": credentials.email.lower(),
                "role": role or "user"  # Default to "user" if role is None
            }
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "email": credentials.email.lower(),
                "full_name": full_name,
                "plan": plan
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        # PHASE 24-G FIX: Safe rollback that handles closed connections
        try:
            if conn and not conn.closed:
                conn.rollback()
        except Exception as rollback_error:
            print(f"[LOGIN ROLLBACK ERROR] {rollback_error}")

        print(f"[LOGIN ERROR] {e}")
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

@router.get("/users/profile")
async def get_user_profile(user_id: int = Depends(get_current_user_id)):
    """Get current user's profile information"""
    try:
        if not db.conn:
            raise HTTPException(status_code=500, detail="Database connection not available")

        with db.conn.cursor() as cur:
            cur.execute("""
                SELECT id, email, full_name, role, company_name, company_type,
                       phone, state, plan, created_at, last_login
                FROM users WHERE id = %s AND is_active = TRUE
            """, (user_id,))
            user = cur.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Get plan limits
        with db.conn.cursor() as cur:
            cur.execute("""
                SELECT max_deeds_per_month, api_calls_per_month, ai_assistance,
                       integrations_enabled, priority_support
                FROM plan_limits WHERE plan_name = %s
            """, (user[8],))  # user[8] is plan
            limits = cur.fetchone()

        return {
            "id": user[0],
            "email": user[1],
            "full_name": user[2],
            "role": user[3],
            "company_name": user[4],
            "company_type": user[5],
            "phone": user[6],
            "state": user[7],
            "plan": user[8],
            "created_at": user[9],
            "last_login": user[10],
            "plan_limits": {
                "max_deeds_per_month": limits[0] if limits else 5,
                "api_calls_per_month": limits[1] if limits else 100,
                "ai_assistance": limits[2] if limits else True,
                "integrations_enabled": limits[3] if limits else False,
                "priority_support": limits[4] if limits else False
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        db.conn.rollback()  # Phase 14-B: Prevent transaction cascade failures
        raise HTTPException(status_code=500, detail=f"Failed to get profile: {str(e)}")

@router.post("/users/upgrade")
async def upgrade_plan(req: UpgradeRequest, user_id: int = Depends(get_current_user_id)):
    """Initiate plan upgrade via Stripe Checkout"""
    try:
        if not db.conn:
            raise HTTPException(status_code=500, detail="Database connection not available")

        # Get user info
        with db.conn.cursor() as cur:
            cur.execute("SELECT stripe_customer_id, email, full_name FROM users WHERE id = %s", (user_id,))
            user = cur.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        customer_id, email, full_name = user

        # Create Stripe customer if not exists
        if not customer_id:
            customer = stripe.Customer.create(
                email=email,
                name=full_name,
                metadata={"user_id": str(user_id)}
            )
            customer_id = customer.id

            # Update database with customer ID
            with db.conn.cursor() as cur:
                cur.execute("UPDATE users SET stripe_customer_id = %s WHERE id = %s", (customer_id, user_id))
                db.conn.commit()

        # Map plans to Stripe price IDs (create these in your Stripe dashboard)
        price_map = {
            'professional': os.getenv('STRIPE_PROFESSIONAL_PRICE_ID', 'price_professional_default'),
            'enterprise': os.getenv('STRIPE_ENTERPRISE_PRICE_ID', 'price_enterprise_default')
        }

        if req.plan not in price_map:
            raise HTTPException(status_code=400, detail="Invalid plan selection")

        # Create Stripe Checkout session
        session = stripe.checkout.Session.create(
            customer=customer_id,
            client_reference_id=str(user_id),
            metadata={'plan': req.plan, 'user_id': str(user_id)},
            payment_method_types=['card'],
            line_items=[{
                'price': price_map[req.plan],
                'quantity': 1
            }],
            mode='subscription',
            success_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/account-settings?success=true",
            cancel_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/account-settings?canceled=true",
            allow_promotion_codes=True,
        )

        return {"session_url": session.url, "session_id": session.id}

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upgrade failed: {str(e)}")

# ============================================================================
# STRIPE WEBHOOK & PAYMENT ENDPOINTS
# ============================================================================

# NOTE: POST /payments/webhook is handled by phase23_billing/router_webhook.py
# (registered first in include_billing_routers). The legacy inline handler that
# lived here was shadowed/dead; its users.plan sync logic has been ported there.

@router.post("/payments/create-portal-session")
async def create_portal_session(user_id: int = Depends(get_current_user_id)):
    """Create Stripe customer portal session for subscription management"""
    try:
        if not db.conn:
            raise HTTPException(status_code=500, detail="Database connection not available")

        with db.conn.cursor() as cur:
            cur.execute("SELECT stripe_customer_id FROM users WHERE id = %s", (user_id,))
            result = cur.fetchone()

        if not result or not result[0]:
            raise HTTPException(status_code=404, detail="No billing information found")

        session = stripe.billing_portal.Session.create(
            customer=result[0],
            return_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/account-settings"
        )

        return {"url": session.url}

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Portal session creation failed: {str(e)}")

@router.get("/user/me")
def get_current_user(user_id: int = Depends(get_current_user_id)):
    """Get current user information from JWT token"""
    try:
        if not db.conn:
            raise HTTPException(status_code=500, detail="Database connection not available")

        with db.conn.cursor() as cur:
            cur.execute("""
                SELECT id, email, full_name, role, company_name, phone, state, plan
                FROM users
                WHERE id = %s AND is_active = TRUE
            """, (user_id,))

            user = cur.fetchone()

            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            # Split full_name into first and last name
            full_name = user[2] or ""
            name_parts = full_name.split(" ", 1)
            first_name = name_parts[0] if name_parts else ""
            last_name = name_parts[1] if len(name_parts) > 1 else ""

            return {
                "id": user[0],
                "email": user[1],
                "first_name": first_name,
                "last_name": last_name,
                "full_name": user[2],
                "role": user[3],
                "company": user[4],
                "phone": user[5],
                "state": user[6],
                "plan": user[7]
            }

    except HTTPException:
        raise
    except Exception as e:
        db.conn.rollback()  # Phase 14-B: Prevent transaction cascade failures
        print(f"Error fetching current user: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch user: {str(e)}")

# Widget Add-on Endpoints

@router.get("/check-widget-access")
async def check_widget_access(user_id: str = Depends(get_current_user_id)):
    with db.conn.cursor() as cur:
        cur.execute("SELECT widget_addon FROM users WHERE id = %s", (user_id,))
        addon = cur.fetchone()[0]
        if addon:
            return {"access": True}
        raise HTTPException(403, "No access - upgrade")

# AI-Enhanced User Profile Endpoints
@router.get("/users/profile/enhanced")
async def get_enhanced_user_profile(user_id: int = Depends(get_current_user_id)):
    """Get enhanced user profile including AI preferences and recent properties"""
    try:
        profile = get_user_profile(user_id)
        recent_properties = get_recent_properties(user_id, limit=5)

        return {
            "profile": profile,
            "recent_properties": recent_properties,
            "ai_enabled": profile.get('auto_populate_company_info', True) if profile else True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get enhanced profile: {str(e)}")

@router.post("/users/profile/enhanced")
async def update_enhanced_user_profile(
    profile_data: dict = Body(...),
    user_id: int = Depends(get_current_user_id)
):
    """Update user profile for AI-enhanced deed generation"""
    try:
        success = update_user_profile(user_id, profile_data)
        if success:
            return {"status": "updated", "message": "Profile updated successfully - AI suggestions will improve!"}
        else:
            raise HTTPException(status_code=500, detail="Failed to update profile")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profile update failed: {str(e)}")
