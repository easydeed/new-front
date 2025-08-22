import os
from fastapi import FastAPI, HTTPException, Depends, Query, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Optional, List
import stripe
import psycopg2
from datetime import datetime, timedelta
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML
import base64
import tempfile
import json
from database import (
    create_user, get_user_by_email, create_deed, get_user_deeds,
    get_user_profile, update_user_profile, get_cached_property, 
    cache_property_data, get_recent_properties
)
from ai_assist import ai_router, suggest_defaults, validate_deed_data
from auth import (
    get_password_hash, verify_password, create_access_token, 
    get_current_user_id, get_current_user_email, AuthUtils, get_current_admin
)

load_dotenv()

app = FastAPI(title="DeedPro API", version="2.0.0-dynamic-wizard")
# Updated for new-front monorepo with pricing management

# Include AI assistance router
app.include_router(ai_router)

# Include Property Integration API router
try:
    from api.property_endpoints import router as property_router
    app.include_router(property_router)
    print("✅ Property integration endpoints loaded successfully")
except ImportError as e:
    print(f"⚠️ Property integration endpoints not available: {e}")
    print("⚠️ Core functionality will work without property integration")
except Exception as e:
    print(f"❌ Error loading property endpoints: {e}")
    print("⚠️ Core functionality will work without property integration")

# Include new dynamic wizard API routers
try:
    from api.ai_assist import router as ai_assist_router
    app.include_router(ai_assist_router, prefix="/api/ai", tags=["AI Assistant"])
    print("✅ AI assist endpoints loaded successfully")
except ImportError as e:
    print(f"⚠️ AI assist endpoints not available: {e}")
except Exception as e:
    print(f"❌ Error loading AI assist endpoints: {e}")

try:
    from api.property_search import router as property_search_router
    app.include_router(property_search_router, prefix="/api/property", tags=["Property Search"])
    print("✅ Property search endpoints loaded successfully")
except ImportError as e:
    print(f"⚠️ Property search endpoints not available: {e}")
except Exception as e:
    print(f"❌ Error loading property search endpoints: {e}")

try:
    from api.generate_deed import router as generate_deed_router
    app.include_router(generate_deed_router, prefix="/api", tags=["Document Generation"])
    print("✅ Document generation endpoints loaded successfully")
except ImportError as e:
    print(f"⚠️ Document generation endpoints not available: {e}")
except Exception as e:
    print(f"❌ Error loading document generation endpoints: {e}")

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

# Stripe configuration
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

# Database connection
DB_URL = os.getenv("DATABASE_URL") or os.getenv("DB_URL")
if DB_URL:
    conn = psycopg2.connect(DB_URL)
else:
    conn = None
    print("Warning: No database connection URL found")

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

class AdminUserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    is_active: Optional[bool] = None
    subscription_status: Optional[str] = None

class DeedCreate(BaseModel):
    deed_type: str
    property_address: Optional[str] = None
    apn: Optional[str] = None
    county: Optional[str] = None
    legal_description: Optional[str] = None
    owner_type: Optional[str] = None
    sales_price: Optional[float] = None
    grantee_name: Optional[str] = None
    vesting: Optional[str] = None

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

class ShareDeedCreate(BaseModel):
    deed_id: int
    recipient_name: str
    recipient_email: str
    recipient_role: str
    message: Optional[str] = None
    expires_in_days: int = 7

class ApprovalResponse(BaseModel):
    approved: bool
    comments: Optional[str] = None

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

class DeedData(BaseModel):
    deed_type: str
    data: dict

class UserLogin(BaseModel):
    email: str
    password: str

class UpgradeRequest(BaseModel):
    plan: str  # 'professional', 'enterprise'

class PlanLimits(BaseModel):
    max_deeds_per_month: int
    api_calls_per_month: int
    ai_assistance: bool
    integrations_enabled: bool
    priority_support: bool

# Mock admin check (in production, use JWT token verification)
def verify_admin():
    # In production, verify admin role from JWT token
    return True

# Health check
@app.get("/health")
def health():
    return {"status": "ok", "message": "DeedPro API is running"}

# ============================================================================
# AUTHENTICATION & REGISTRATION ENDPOINTS
# ============================================================================

@app.post("/users/register")
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
        
        # Insert user into database
        if conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO users (email, password_hash, full_name, role, company_name, 
                                     company_type, phone, state, subscribe, plan)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    user.email.lower(), hashed_password, user.full_name, user.role,
                    user.company_name, user.company_type, user.phone, user.state.upper(),
                    user.subscribe, 'free'
                ))
                conn.commit()
        
        return {
            "message": "User registered successfully", 
            "email": user.email,
            "plan": "free"
        }
        
    except psycopg2.IntegrityError:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Email already exists")
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@app.post("/users/login")
async def login_user(credentials: UserLogin = Body(...)):
    """Authenticate user and return JWT token"""
    try:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection not available")
        
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, password_hash, full_name, plan, is_active 
                FROM users WHERE email = %s
            """, (credentials.email.lower(),))
            user = cur.fetchone()
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        user_id, password_hash, full_name, plan, is_active = user
        
        if not is_active:
            raise HTTPException(status_code=401, detail="Account is deactivated")
        
        if not verify_password(credentials.password, password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Update last login
        with conn.cursor() as cur:
            cur.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = %s", (user_id,))
            conn.commit()
        
        # Create access token
        access_token = create_access_token(
            data={"sub": str(user_id), "email": credentials.email.lower()}
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
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

@app.get("/users/profile")
async def get_user_profile(user_id: int = Depends(get_current_user_id)):
    """Get current user's profile information"""
    try:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection not available")
        
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, email, full_name, role, company_name, company_type, 
                       phone, state, plan, created_at, last_login
                FROM users WHERE id = %s AND is_active = TRUE
            """, (user_id,))
            user = cur.fetchone()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get plan limits
        with conn.cursor() as cur:
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
        raise HTTPException(status_code=500, detail=f"Failed to get profile: {str(e)}")

@app.post("/users/upgrade")
async def upgrade_plan(req: UpgradeRequest, user_id: int = Depends(get_current_user_id)):
    """Initiate plan upgrade via Stripe Checkout"""
    try:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection not available")
        
        # Get user info
        with conn.cursor() as cur:
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
            with conn.cursor() as cur:
                cur.execute("UPDATE users SET stripe_customer_id = %s WHERE id = %s", (customer_id, user_id))
                conn.commit()
        
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

@app.post("/payments/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    if not webhook_secret:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")
    
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    try:
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            user_id = int(session['client_reference_id'])
            plan = session['metadata']['plan']
            
            # Update user plan in database
            if conn:
                with conn.cursor() as cur:
                    cur.execute("UPDATE users SET plan = %s WHERE id = %s", (plan, user_id))
                    conn.commit()
        
        elif event['type'] == 'invoice.payment_succeeded':
            invoice = event['data']['object']
            customer_id = invoice['customer']
            
            # Update subscription status
            if conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        UPDATE users SET updated_at = CURRENT_TIMESTAMP 
                        WHERE stripe_customer_id = %s
                    """, (customer_id,))
                    conn.commit()
        
        elif event['type'] == 'customer.subscription.deleted':
            subscription = event['data']['object']
            customer_id = subscription['customer']
            
            # Downgrade to free plan
            if conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        UPDATE users SET plan = 'free' 
                        WHERE stripe_customer_id = %s
                    """, (customer_id,))
                    conn.commit()
        
        return {"status": "success"}
        
    except Exception as e:
        print(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")

@app.post("/payments/create-portal-session")
async def create_portal_session(user_id: int = Depends(get_current_user_id)):
    """Create Stripe customer portal session for subscription management"""
    try:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection not available")
        
        with conn.cursor() as cur:
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

# ============================================================================
# PLAN LIMITS & USAGE TRACKING
# ============================================================================

def check_plan_limits(user_id: int, action: str = "deed_creation") -> dict:
    """Check if user has reached plan limits"""
    if not conn:
        return {"allowed": True, "message": "Database not available"}
    
    try:
        with conn.cursor() as cur:
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

# ============================================================================
# ADMIN ENDPOINTS - Platform Management
# ============================================================================

@app.get("/admin/dashboard")
def admin_dashboard():
    """Get admin dashboard overview with key metrics"""
    if not verify_admin():
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection not available")
        
        with conn.cursor() as cur:
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
        print(f"Error fetching admin dashboard: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch dashboard data: {str(e)}")

@app.get("/admin/users")
def admin_list_all_users(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None
):
    """List all users with pagination and filtering"""
    if not verify_admin():
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Query real user data from database
    try:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection not available")
        
        with conn.cursor() as cur:
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
        print(f"Error fetching admin users: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch users: {str(e)}")

@app.get("/admin/users/{user_id}")
def admin_get_user_details(user_id: int):
    """Get detailed information about a specific user"""
    if not verify_admin():
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Mock user detail data
    user_details = {
        "id": user_id,
        "email": "john@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "username": "johndoe",
        "city": "Los Angeles",
        "country": "USA",
        "created_at": "2024-01-01T00:00:00Z",
        "last_login": "2024-01-15T09:30:00Z",
        "is_active": True,
        "subscription_plan": "pro",
        "subscription_status": "active",
        "subscription_start": "2024-01-01T00:00:00Z",
        "next_billing_date": "2024-02-01T00:00:00Z",
        "total_revenue": 89.97,
        "payment_methods": [
            {"id": "pm_123", "brand": "visa", "last4": "1234", "is_default": True}
        ],
        "deed_statistics": {
            "total_deeds": 12,
            "completed_deeds": 10,
            "draft_deeds": 2,
            "shared_deeds": 8,
            "approved_deeds": 6
        },
        "activity_log": [
            {"action": "login", "timestamp": "2024-01-15T09:30:00Z", "ip": "192.168.1.1"},
            {"action": "deed_created", "timestamp": "2024-01-14T14:20:00Z", "deed_id": 1234},
            {"action": "deed_shared", "timestamp": "2024-01-13T11:15:00Z", "deed_id": 1233}
        ]
    }
    
    return user_details

@app.put("/admin/users/{user_id}")
def admin_update_user(user_id: int, user_update: AdminUserUpdate):
    """Update user information (admin only)"""
    if not verify_admin():
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # In production, update user in database
    return {
        "success": True,
        "message": f"User {user_id} updated successfully",
        "updated_fields": user_update.dict(exclude_unset=True)
    }

@app.delete("/admin/users/{user_id}")
def admin_delete_user(user_id: int):
    """Delete/deactivate a user (admin only)"""
    if not verify_admin():
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # In production, soft delete or deactivate user
    return {
        "success": True,
        "message": f"User {user_id} has been deactivated"
    }

@app.get("/admin/deeds")
def admin_list_all_deeds(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = None,
    user_id: Optional[int] = None
):
    """List all deeds across all users"""
    if not verify_admin():
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Query real deed data from database
    try:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection not available")
        
        with conn.cursor() as cur:
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
        print(f"Error fetching admin deeds: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch deeds: {str(e)}")

@app.get("/admin/revenue")
def admin_revenue_analytics():
    """Get detailed revenue analytics"""
    if not verify_admin():
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Mock revenue data - in production, calculate from database/Stripe
    revenue_data = {
        "overview": {
            "total_revenue": 45230.50,
            "monthly_revenue": 8750.25,
            "daily_revenue": 291.67,
            "average_revenue_per_user": 36.29
        },
        "monthly_breakdown": [
            {"month": "2024-01", "revenue": 8750.25, "new_subscriptions": 23, "cancellations": 5},
            {"month": "2023-12", "revenue": 8120.00, "new_subscriptions": 19, "cancellations": 8},
            {"month": "2023-11", "revenue": 7890.75, "new_subscriptions": 31, "cancellations": 3}
        ],
        "subscription_revenue": {
            "free": {"count": 456, "revenue": 0.00},
            "basic": {"count": 523, "revenue": 5229.77},
            "pro": {"count": 268, "revenue": 8032.32}
        },
        "payment_methods": {
            "credit_card": {"count": 678, "revenue": 12450.23},
            "paypal": {"count": 113, "revenue": 1300.86}
        },
        "top_paying_users": [
            {"user_id": 1, "email": "john@example.com", "total_paid": 359.88},
            {"user_id": 45, "email": "sarah@lawfirm.com", "total_paid": 299.88},
            {"user_id": 23, "email": "mike@realty.com", "total_paid": 239.91}
        ],
        "refunds": {
            "total_refunded": 234.50,
            "refund_count": 8,
            "refund_rate": 0.52  # percentage
        }
    }
    
    return revenue_data

@app.get("/admin/analytics")
def admin_platform_analytics():
    """Get comprehensive platform analytics"""
    if not verify_admin():
        raise HTTPException(status_code=403, detail="Admin access required")
    
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

@app.get("/admin/system-health")
def admin_system_health():
    """Get system health and status information"""
    if not verify_admin():
        raise HTTPException(status_code=403, detail="Admin access required")
    
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

# ============================================================================
# USER ENDPOINTS - Regular User Operations
# ============================================================================

@app.post("/users")
def create_user_endpoint(user: UserCreate):
    """Create a new user"""
    # Check if user already exists
    existing_user = get_user_by_email(user.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    new_user = create_user(
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        username=user.username,
        city=user.city,
        country=user.country
    )
    
    if not new_user:
        raise HTTPException(status_code=500, detail="Failed to create user")
    
    return new_user

@app.get("/users/{email}")
def get_user_endpoint(email: str):
    """Get user by email"""
    user = get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.get("/user/me")
def get_current_user(user_id: int = Depends(get_current_user_id)):
    """Get current user information from JWT token"""
    try:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection not available")
        
        with conn.cursor() as cur:
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
        print(f"Error fetching current user: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch user: {str(e)}")

# Deed endpoints
@app.post("/deeds")
def create_deed_endpoint(deed: DeedCreate):
    """Create a new deed"""
    # In production, get user_id from JWT token
    user_id = 1  # Placeholder
    
    deed_data = deed.dict()
    new_deed = create_deed(user_id, deed_data)
    
    if not new_deed:
        raise HTTPException(status_code=500, detail="Failed to create deed")
    
    return new_deed

@app.get("/deeds")
def list_deeds_endpoint(user_id: int = Depends(get_current_user_id)):
    """List all deeds for current user"""
    try:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection not available")
        
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, deed_type, property_address, grantor_name, grantee_name, 
                       created_at, updated_at
                FROM deeds 
                WHERE user_id = %s 
                ORDER BY created_at DESC
            """, (user_id,))
            
            deeds = cur.fetchall()
            
            # Format deeds for frontend
            formatted_deeds = []
            for deed in deeds:
                formatted_deeds.append({
                    "id": deed[0],
                    "deed_type": deed[1],
                    "address": deed[2],
                    "grantor": deed[3],
                    "grantee": deed[4],
                    "date": deed[5].strftime("%Y-%m-%d") if deed[5] else None,
                    "status": "completed",  # Default status - you can add a status column later
                    "recorded": False  # Default - you can add a recorded column later
                })
            
            return {"deeds": formatted_deeds}
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching deeds: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch deeds: {str(e)}")

@app.get("/deeds/available")
def list_available_deeds_for_sharing(user_id: int = Depends(get_current_user_id)):
    """List deeds available for sharing (completed deeds)"""
    try:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection not available")
        
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, property_address, deed_type
                FROM deeds 
                WHERE user_id = %s 
                ORDER BY created_at DESC
            """, (user_id,))
            
            deeds = cur.fetchall()
            
            # Format for sharing dropdown
            available_deeds = []
            for deed in deeds:
                available_deeds.append({
                    "id": deed[0],
                    "address": deed[1],
                    "deed_type": deed[2]
                })
            
            return {"available_deeds": available_deeds}
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching available deeds: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch available deeds: {str(e)}")

@app.get("/deeds/{deed_id}")
def get_deed_endpoint(deed_id: int):
    """Get a specific deed"""
    # Placeholder - would implement get_deed_by_id in database.py
    return {
        "id": deed_id,
        "deed_type": "Quitclaim Deed",
        "property_address": "123 Success Ave",
        "status": "completed"
    }

@app.put("/deeds/{deed_id}/status")
def update_deed_status(deed_id: int, status: str):
    """Update deed status"""
    # Placeholder for updating deed status
    valid_statuses = ["draft", "completed", "pending", "recorded"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    return {"message": f"Deed {deed_id} status updated to {status}"}

# Shared Deeds endpoints
@app.post("/shared-deeds")
def share_deed_for_approval(share_data: ShareDeedCreate):
    """Share a deed with someone for approval"""
    # In production:
    # 1. Create shared deed record in database
    # 2. Generate unique approval link
    # 3. Send email to recipient
    # 4. Return shared deed details
    
    expires_at = datetime.now() + timedelta(days=share_data.expires_in_days)
    approval_token = f"token_{share_data.deed_id}_{share_data.recipient_email.replace('@', '_at_')}"
    
    shared_deed = {
        "id": 101,  # Would be auto-generated
        "deed_id": share_data.deed_id,
        "shared_by_user_id": 1,  # From JWT token
        "recipient_name": share_data.recipient_name,
        "recipient_email": share_data.recipient_email,
        "recipient_role": share_data.recipient_role,
        "message": share_data.message,
        "status": "sent",
        "approval_token": approval_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now().isoformat(),
        "approval_url": f"https://deedpro.com/approve/{approval_token}"
    }
    
    # Simulate email sending
    email_sent = True  # Would use actual email service
    
    if not email_sent:
        raise HTTPException(status_code=500, detail="Failed to send approval email")
    
    return {
        "success": True,
        "message": "Deed shared successfully! Approval email sent.",
        "shared_deed": shared_deed
    }

@app.get("/shared-deeds")
def list_shared_deeds():
    """List all shared deeds for current user"""
    # Sample data showing various approval statuses
    shared_deeds = [
        {
            "id": 1,
            "date_shared": "2024-01-15",
            "deed_id": 101,
            "apn": "123-456-789",
            "address": "123 Main St, Los Angeles, CA",
            "deed_type": "Quitclaim Deed",
            "shared_with": "John Smith",
            "recipient_email": "john@titleco.com",
            "recipient_role": "Title Officer",
            "status": "approved",
            "response_date": "2024-01-16",
            "comments": "Looks good to proceed",
            "expires_at": "2024-01-22"
        },
        {
            "id": 2,
            "date_shared": "2024-01-14",
            "deed_id": 102,
            "apn": "987-654-321",
            "address": "456 Oak Ave, Beverly Hills, CA",
            "deed_type": "Grant Deed",
            "shared_with": "Jane Doe",
            "recipient_email": "jane@lender.com",
            "recipient_role": "Lender",
            "status": "viewed",
            "expires_at": "2024-01-21"
        },
        {
            "id": 3,
            "date_shared": "2024-01-13",
            "deed_id": 103,
            "apn": "555-777-999",
            "address": "789 Pine Rd, Santa Monica, CA",
            "deed_type": "Warranty Deed",
            "shared_with": "Bob Wilson",
            "recipient_email": "bob@escrow.com",
            "recipient_role": "Escrow Officer",
            "status": "sent",
            "expires_at": "2024-01-20"
        },
        {
            "id": 4,
            "date_shared": "2024-01-10",
            "deed_id": 104,
            "apn": "111-222-333",
            "address": "321 Cedar St, Pasadena, CA",
            "deed_type": "Trust Deed",
            "shared_with": "Sarah Johnson",
            "recipient_email": "sarah@notary.com",
            "recipient_role": "Notary",
            "status": "rejected",
            "response_date": "2024-01-11",
            "comments": "Please revise the legal description section",
            "expires_at": "2024-01-17"
        }
    ]
    
    return {"shared_deeds": shared_deeds}

@app.post("/shared-deeds/{shared_deed_id}/resend")
def resend_approval_email(shared_deed_id: int):
    """Resend approval email reminder"""
    # In production, resend the approval email
    return {
        "success": True,
        "message": f"Reminder email sent for shared deed {shared_deed_id}"
    }

@app.delete("/shared-deeds/{shared_deed_id}")
def revoke_shared_deed(shared_deed_id: int):
    """Revoke access to a shared deed"""
    # In production:
    # 1. Mark shared deed as revoked
    # 2. Invalidate approval token
    # 3. Send notification email (optional)
    
    return {
        "success": True,
        "message": f"Access to shared deed {shared_deed_id} has been revoked"
    }

# Public approval endpoint (for recipients)
@app.get("/approve/{approval_token}")
def view_shared_deed(approval_token: str):
    """Public endpoint for recipients to view shared deed"""
    # In production:
    # 1. Validate token
    # 2. Check if not expired
    # 3. Mark as "viewed" if first time
    # 4. Return deed details
    
    # Simulate token validation
    if not approval_token.startswith("token_"):
        raise HTTPException(status_code=404, detail="Invalid approval link")
    
    # Sample deed data for approval
    deed_data = {
        "deed_id": 101,
        "deed_type": "Quitclaim Deed",
        "property_address": "123 Main St, Los Angeles, CA",
        "apn": "123-456-789",
        "shared_by": "DeedPro User",
        "message": "Please review and approve this deed",
        "expires_at": "2024-01-22",
        "can_approve": True  # Check if not expired
    }
    
    return deed_data

@app.post("/approve/{approval_token}")
def submit_approval_response(approval_token: str, response: ApprovalResponse):
    """Submit approval or rejection response"""
    # In production:
    # 1. Validate token
    # 2. Check if not expired
    # 3. Update shared deed status
    # 4. Notify deed owner via email
    
    if not approval_token.startswith("token_"):
        raise HTTPException(status_code=404, detail="Invalid approval link")
    
    status = "approved" if response.approved else "rejected"
    
    # Update shared deed status (would update database)
    result = {
        "success": True,
        "message": f"Thank you! Your response has been recorded.",
        "status": status,
        "comments": response.comments
    }
    
    return result

# Recipients endpoints (from previous implementation)
@app.post("/deeds/{deed_id}/recipients")
def save_recipients_endpoint(deed_id: int, recipients_data: RecipientsCreate):
    """Save recipients for a deed"""
    # In production, save to database and send emails
    return {
        "success": True,
        "message": f"Recipients added successfully for deed {deed_id}",
        "recipients_count": len(recipients_data.recipients)
    }

@app.get("/deeds/{deed_id}/recipients")
def get_recipients_endpoint(deed_id: int):
    """Get recipients for a deed"""
    # Placeholder data
    sample_recipients = [
        {"name": "John Smith", "email": "john@titleco.com", "role": "title_officer"},
        {"name": "Jane Doe", "email": "jane@lender.com", "role": "lender"},
        {"name": "Bob Wilson", "email": "bob@escrow.com", "role": "escrow_officer"}
    ]
    
    return {
        "success": True,
        "recipients": sample_recipients
    }

@app.delete("/deeds/{deed_id}")
def delete_deed_endpoint(deed_id: int):
    """Delete a deed"""
    # In production, soft delete or permanent delete based on business rules
    return {"message": f"Deed {deed_id} deleted successfully"}

@app.get("/deeds/{deed_id}/download")
def download_deed_endpoint(deed_id: int):
    """Generate and download deed document"""
    # In production, generate PDF and return file
    return {
        "download_url": f"https://api.deedpro.io/files/deed_{deed_id}.pdf",
        "expires_at": "2024-02-01T12:00:00Z"
    }

# Payment endpoints
@app.post("/payment-methods")
def create_payment_method_endpoint(payment_method: PaymentMethodCreate):
    """Add a new payment method via Stripe"""
    try:
        # Get the payment method from Stripe
        stripe_pm = stripe.PaymentMethod.retrieve(payment_method.payment_method_id)
        
        # In production, get user_id from JWT token and save to database
        user_id = 1  # Placeholder
        
        return {
            "id": stripe_pm.id,
            "card_brand": stripe_pm.card.brand,
            "last_four": stripe_pm.card.last4,
            "is_default": payment_method.set_as_default
        }
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/payment-methods")
def list_payment_methods_endpoint():
    """List all payment methods for current user"""
    # Placeholder data
    return {
        "payment_methods": [
            {
                "id": "pm_1234567890",
                "card_brand": "visa",
                "last_four": "1234",
                "is_default": True
            }
        ]
    }

@app.delete("/payment-methods/{payment_method_id}")
def delete_payment_method_endpoint(payment_method_id: str):
    """Remove a payment method"""
    try:
        # Detach from Stripe
        stripe.PaymentMethod.detach(payment_method_id)
        # Would also remove from database in production
        return {"message": "Payment method removed successfully"}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

# Subscription endpoints
@app.post("/subscriptions")
def create_subscription_endpoint():
    """Create a new subscription"""
    # Placeholder for Stripe subscription creation
    return {
        "subscription_id": "sub_1234567890",
        "status": "active",
        "plan": "pro"
    }

@app.get("/subscriptions")
def get_subscription_endpoint():
    """Get current user's subscription"""
    # Placeholder data
    return {
        "subscription_id": "sub_1234567890",
        "status": "active",
        "plan": "pro",
        "current_period_end": "2024-02-01"
    }

# Property search endpoint (placeholder)
@app.get("/property/search")
def search_property_endpoint(address: str):
    """Search for property information"""
    # Placeholder - would integrate with property data API
    return {
        "results": [
            {
                "address": address,
                "apn": "123-456-789",
                "county": "Los Angeles",
                "city": "Los Angeles",
                "legal_description": "Lot 1, Block 2, Tract 12345"
            }
        ]
    }

# Enhanced deed preview endpoint with AI suggestions
@app.post("/generate-deed-preview")
async def generate_deed_preview(deed: DeedData, user_id: int = Depends(get_current_user_id)):
    """Generate HTML preview of deed with AI-enhanced suggestions and validation"""
    try:
        # Debug: Check the incoming data structure
        print(f"DEBUG: Received deed object type: {type(deed)}")
        print(f"DEBUG: deed.data type: {type(deed.data)}")
        print(f"DEBUG: deed.deed_type: {deed.deed_type}")
        
        # Ensure we have proper data structure
        if not isinstance(deed.data, dict):
            raise ValueError(f"Invalid deed.data type: {type(deed.data)}, expected dict")
        
        deed_data = deed.data
        deed_type = deed.deed_type
        
        # Initialize AI data to prevent issues
        ai_suggestions = {}
        validation = {'is_valid': True, 'warnings': [], 'suggestions': []}
        profile = None
        cached_property = None
        
        try:
            # Get user profile (wrapped in try-catch to prevent blocking the main flow)
            profile = get_user_profile(user_id)
        except Exception as profile_error:
            print(f"DEBUG: Profile fetch failed: {profile_error}")
        
        try:
            # Look for cached property data if address is provided
            if deed_data.get('propertySearch'):
                cached_property = get_cached_property(user_id, deed_data['propertySearch'])
        except Exception as cache_error:
            print(f"DEBUG: Property cache fetch failed: {cache_error}")
        
        try:
            # Prepare user data for AI suggestions
            user_data = {
                'profile': profile,
                'cached_property': cached_property
            }
            
            # Generate AI suggestions and validation (with fallbacks)
            ai_suggestions = suggest_defaults(user_data, deed_data)
            validation = validate_deed_data(deed_data, deed_type)
        except Exception as ai_error:
            print(f"DEBUG: AI processing failed: {ai_error}")
            # Continue without AI suggestions
        
        # Merge AI suggestions with existing data (don't override user input)
        enhanced_data = {**ai_suggestions, **deed_data}  # User data takes precedence
        
        # Get the template for the specified deed type
        try:
            template = env.get_template(f"{deed_type}.html")
        except Exception as template_error:
            print(f"DEBUG: Template loading failed: {template_error}")
            # Try to list available templates
            try:
                import os
                available_templates = os.listdir(template_dir)
                print(f"DEBUG: Available templates: {available_templates}")
            except:
                pass
            raise HTTPException(status_code=500, detail=f"Template not found: {deed_type}.html")
        
        # Recorder profile + tax computations
        county = enhanced_data.get("county") or enhanced_data.get("County")
        city = enhanced_data.get("city") or enhanced_data.get("City")
        sales_price = enhanced_data.get("sales_price") or enhanced_data.get("salesPrice") or enhanced_data.get("consideration")
        tax = compute_doc_transfer_tax(sales_price, county, city)

        # Auto Exhibit A if legal is long
        legal = enhanced_data.get("legal_description") or enhanced_data.get("legalDescription")
        attach_exhibit = needs_exhibit_a(legal)

        if "transfer_tax" not in enhanced_data:
            enhanced_data["transfer_tax"] = tax
        if "attach_exhibit_a" not in enhanced_data:
            enhanced_data["attach_exhibit_a"] = attach_exhibit
        if "exhibit_label" not in enhanced_data:
            enhanced_data["exhibit_label"] = "Exhibit A - Legal Description"

        # Apply page margins from recorder profile if available
        profile = RECORDER_PROFILES.get((county or "").strip()) or RECORDER_PROFILES.get("Los Angeles")
        if profile:
            if "page_margin_top" not in enhanced_data:
                enhanced_data["page_margin_top"] = f"{profile.get('top_margin_in', 1.0)}in"
            if "page_margin_left" not in enhanced_data:
                enhanced_data["page_margin_left"] = f"{profile.get('left_margin_in', 1.0)}in"
            if "page_margin_right" not in enhanced_data:
                enhanced_data["page_margin_right"] = f"{profile.get('right_margin_in', 1.0)}in"
            if "page_margin_bottom" not in enhanced_data:
                enhanced_data["page_margin_bottom"] = f"{profile.get('bottom_margin_in', 1.0)}in"

        # Render HTML with enhanced data
        html_content = template.render(enhanced_data)
        
        # Return HTML with AI suggestions and validation
        return {
            "html": html_content,
            "deed_type": deed_type,
            "status": "preview_ready",
            "ai_suggestions": ai_suggestions,
            "validation": validation,
            "user_profile_applied": bool(profile)
        }
        
    except Exception as e:
        print(f"DEBUG: Full error details: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Deed preview failed: {str(e)}")

# Optional: Full deed generation endpoint with PDF
@app.post("/generate-deed")
async def generate_deed(deed: DeedData):
    """Generate pixel-perfect HTML and PDF deed using Jinja2 templates and WeasyPrint"""
    try:
        # Get the template for the specified deed type
        template = env.get_template(f"{deed.deed_type}.html")
        
        # Recorder profile + tax computations
        data = dict(deed.data)
        county = data.get("county") or data.get("County")
        city = data.get("city") or data.get("City")
        sales_price = data.get("sales_price") or data.get("salesPrice") or data.get("consideration")
        tax = compute_doc_transfer_tax(sales_price, county, city)
        legal = data.get("legal_description") or data.get("legalDescription")
        attach_exhibit = needs_exhibit_a(legal)
        if "transfer_tax" not in data:
            data["transfer_tax"] = tax
        if "attach_exhibit_a" not in data:
            data["attach_exhibit_a"] = attach_exhibit
        if "exhibit_label" not in data:
            data["exhibit_label"] = "Exhibit A - Legal Description"

        # Apply page margins from recorder profile if available
        profile = RECORDER_PROFILES.get((county or "").strip()) or RECORDER_PROFILES.get("Los Angeles")
        if profile:
            if "page_margin_top" not in data:
                data["page_margin_top"] = f"{profile.get('top_margin_in', 1.0)}in"
            if "page_margin_left" not in data:
                data["page_margin_left"] = f"{profile.get('left_margin_in', 1.0)}in"
            if "page_margin_right" not in data:
                data["page_margin_right"] = f"{profile.get('right_margin_in', 1.0)}in"
            if "page_margin_bottom" not in data:
                data["page_margin_bottom"] = f"{profile.get('bottom_margin_in', 1.0)}in"

        # Render HTML with data injection
        html_content = template.render(data)
        
        # Generate PDF using WeasyPrint
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
            HTML(string=html_content).write_pdf(tmp_file.name)
            tmp_file.seek(0)
            
            # Read PDF content and encode as base64
            with open(tmp_file.name, 'rb') as f:
                pdf_bytes = f.read()
            
            # Clean up temporary file
            os.unlink(tmp_file.name)
            
        # Return both HTML and PDF
        return {
            "html": html_content,
            "pdf_base64": base64.b64encode(pdf_bytes).decode(),
            "deed_type": deed.deed_type,
            "status": "success"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deed generation failed: {str(e)}")

# Pricing Management Models
class PriceUpdate(BaseModel):
    plan_name: str
    price: float
    features: List[str]

class NewPlan(BaseModel):
    plan_name: str
    price: float
    features: List[str]

# Pricing Endpoints
@app.get("/pricing")
async def get_pricing():
    """Get all pricing plans for the landing page"""
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT plan_name, price, features, is_active 
                FROM pricing 
                WHERE is_active = TRUE 
                ORDER BY price ASC
            """)
            rows = cur.fetchall()
            return [
                {
                    "name": row[0],
                    "price": float(row[1]),
                    "features": row[2] if row[2] else [],
                    "popular": row[0] == "professional"  # Mark professional as popular
                }
                for row in rows
            ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch pricing: {str(e)}")

@app.get("/pricing/plans")
async def get_pricing_plans():
    """Get all pricing plans - alternative endpoint for consistency"""
    return await get_pricing()

@app.post("/admin/create-plan")
async def create_plan(plan: NewPlan, admin: str = Depends(get_current_admin)):
    """Create new Stripe product/price and save to database"""
    try:
        # Create Stripe product
        product = stripe.Product.create(
            name=plan.plan_name.capitalize(),
            type="service",
            description=f"{plan.plan_name.capitalize()} plan with {len(plan.features)} features"
        )
        
        # Create Stripe price
        price = stripe.Price.create(
            product=product.id,
            unit_amount=int(plan.price * 100),  # Convert to cents
            currency="usd",
            recurring={"interval": "month"},
            nickname=plan.plan_name
        )
        
        # Save to database
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO pricing (plan_name, price, stripe_product_id, stripe_price_id, features, last_synced) 
                VALUES (%s, %s, %s, %s, %s::jsonb, CURRENT_TIMESTAMP)
                ON CONFLICT (plan_name) DO UPDATE SET 
                    price = EXCLUDED.price,
                    stripe_price_id = EXCLUDED.stripe_price_id,
                    stripe_product_id = EXCLUDED.stripe_product_id,
                    features = EXCLUDED.features,
                    last_synced = CURRENT_TIMESTAMP
            """, (plan.plan_name, plan.price, product.id, price.id, plan.features))
            conn.commit()
            
        return {
            "status": "created",
            "plan_name": plan.plan_name,
            "stripe_price_id": price.id,
            "stripe_product_id": product.id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create plan: {str(e)}")

@app.post("/admin/sync-pricing")
async def sync_pricing(admin: str = Depends(get_current_admin)):
    """Sync pricing from Stripe to database"""
    try:
        # Get all active prices from Stripe
        prices = stripe.Price.list(active=True, limit=100).data
        
        synced_count = 0
        with conn.cursor() as cur:
            for price in prices:
                if price.nickname:  # Only sync prices with nicknames (our plans)
                    # Get product details
                    product = stripe.Product.retrieve(price.product)
                    
                    # Update database
                    cur.execute("""
                        UPDATE pricing 
                        SET price = %s, 
                            stripe_price_id = %s,
                            stripe_product_id = %s,
                            last_synced = CURRENT_TIMESTAMP
                        WHERE plan_name = %s
                    """, (
                        price.unit_amount / 100,  # Convert from cents
                        price.id,
                        product.id,
                        price.nickname.lower()
                    ))
                    
                    if cur.rowcount > 0:
                        synced_count += 1
                        
            conn.commit()
            
        return {
            "status": "synced", 
            "synced_count": synced_count,
            "message": f"Successfully synced {synced_count} plans from Stripe"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync pricing: {str(e)}")

@app.post("/admin/update-price")
async def update_price(update: PriceUpdate, admin: str = Depends(get_current_admin)):
    """Update price in both Stripe and database"""
    try:
        # Get current Stripe price ID from database
        with conn.cursor() as cur:
            cur.execute("""
                SELECT stripe_price_id, stripe_product_id 
                FROM pricing 
                WHERE plan_name = %s
            """, (update.plan_name,))
            
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Plan not found")
                
            old_price_id, product_id = result
        
        # Create new price in Stripe (prices are immutable)
        new_price = stripe.Price.create(
            product=product_id,
            unit_amount=int(update.price * 100),  # Convert to cents
            currency="usd",
            recurring={"interval": "month"},
            nickname=update.plan_name
        )
        
        # Deactivate old price
        if old_price_id:
            stripe.Price.modify(old_price_id, active=False)
        
        # Update database
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE pricing 
                SET price = %s, 
                    features = %s::jsonb,
                    stripe_price_id = %s,
                    last_synced = CURRENT_TIMESTAMP
                WHERE plan_name = %s
            """, (update.price, update.features, new_price.id, update.plan_name))
            conn.commit()
            
        return {
            "status": "updated",
            "plan_name": update.plan_name,
            "new_price": update.price,
            "new_stripe_price_id": new_price.id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update price: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 
# Widget Add-on Endpoints

@app.get("/check-widget-access")
async def check_widget_access(user_id: str = Depends(get_current_user_id)):
    with conn.cursor() as cur:
        cur.execute("SELECT widget_addon FROM users WHERE id = %s", (user_id,))
        addon = cur.fetchone()[0]
        if addon:
            return {"access": True}
        raise HTTPException(403, "No access - upgrade")

@app.post("/admin/toggle-addon")
async def toggle_addon(data: dict = Body(...), admin: str = Depends(get_current_admin)):
    with conn.cursor() as cur:
        cur.execute("UPDATE users SET widget_addon = %s WHERE id = %s", (data['enabled'], data['user_id']))
        conn.commit()
    return {"status": "updated"}

# AI-Enhanced User Profile Endpoints
@app.get("/users/profile/enhanced")
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

@app.post("/users/profile/enhanced")
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

# Property Caching Endpoints
@app.post("/property/cache")
async def cache_property(
    property_data: dict = Body(...),
    user_id: int = Depends(get_current_user_id)
):
    """Cache property data for future AI suggestions"""
    try:
        success = cache_property_data(user_id, property_data)
        if success:
            return {"status": "cached", "message": "Property data cached for future suggestions"}
        else:
            raise HTTPException(status_code=500, detail="Failed to cache property data")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Property caching failed: {str(e)}")

@app.get("/property/suggestions")
async def get_property_suggestions(
    address: str = Query(..., description="Partial address to search for"),
    user_id: int = Depends(get_current_user_id)
):
    """Get property suggestions based on cached data and address search"""
    try:
        # Look for cached properties matching the address
        cached_property = get_cached_property(user_id, address)
        recent_properties = get_recent_properties(user_id, limit=3)
        
        suggestions = []
        
        if cached_property:
            suggestions.append({
                "type": "cached_exact",
                "property": cached_property,
                "confidence": 0.95
            })
        
        # Add recent properties as suggestions
        for prop in recent_properties:
            if address.lower() in prop.get('property_address', '').lower():
                suggestions.append({
                    "type": "recent_match",
                    "property": prop,
                    "confidence": 0.8
                })
        
        return {
            "suggestions": suggestions,
            "total": len(suggestions)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Property suggestions failed: {str(e)}")

# AI Suggestions Endpoint (Real-time)
@app.post("/ai/deed-suggestions")
async def get_deed_suggestions(
    deed_data: dict = Body(...),
    user_id: int = Depends(get_current_user_id)
):
    """Get real-time AI suggestions for deed form fields"""
    try:
        # Get user profile and cached property data
        profile = get_user_profile(user_id)
        cached_property = None
        
        if deed_data.get('propertySearch'):
            cached_property = get_cached_property(user_id, deed_data['propertySearch'])
        
        user_data = {
            'profile': profile,
            'cached_property': cached_property
        }
        
        # Generate suggestions and validation
        suggestions = suggest_defaults(user_data, deed_data)
        validation = validate_deed_data(deed_data, deed_data.get('deedType', 'grant_deed'))
        
        return {
            "suggestions": suggestions,
            "validation": validation,
            "profile_available": bool(profile),
            "cached_data_available": bool(cached_property)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI suggestions failed: {str(e)}")
