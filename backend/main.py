import os
from fastapi import FastAPI, HTTPException, Depends, Query, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Optional, List
import stripe
import psycopg2
from datetime import datetime, timedelta
from database import (
    create_user, get_user_by_email, create_deed, get_user_deeds
)
from ai_assist import ai_router
from auth import (
    get_password_hash, verify_password, create_access_token, 
    get_current_user_id, get_current_user_email, AuthUtils
)

load_dotenv()

app = FastAPI(title="DeedPro API", version="1.0.0")

# Include AI assistance router
app.include_router(ai_router)

# Allow CORS for local dev and frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
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
    
    # In production, calculate real metrics from database
    dashboard_data = {
        "total_users": 1247,
        "active_users": 892,
        "total_deeds": 3456,
        "deeds_this_month": 234,
        "total_revenue": 45230.50,
        "monthly_revenue": 8750.25,
        "subscription_breakdown": {
            "free": 456,
            "basic": 523,
            "pro": 268
        },
        "recent_activity": [
            {"type": "user_signup", "user": "john@example.com", "timestamp": "2024-01-15T10:30:00Z"},
            {"type": "deed_created", "user": "jane@company.com", "deed_id": 1234, "timestamp": "2024-01-15T09:45:00Z"},
            {"type": "subscription", "user": "bob@firm.com", "plan": "pro", "timestamp": "2024-01-15T08:20:00Z"}
        ],
        "growth_metrics": {
            "user_growth_rate": 12.5,  # % this month
            "revenue_growth_rate": 8.3,
            "deed_completion_rate": 87.2
        }
    }
    
    return dashboard_data

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
    
    # Mock user data - in production, query from database
    all_users = [
        {
            "id": 1,
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
            "total_deeds": 12,
            "monthly_revenue": 29.99
        },
        {
            "id": 2,
            "email": "jane@company.com",
            "first_name": "Jane",
            "last_name": "Smith",
            "username": "janesmith",
            "city": "San Francisco",
            "country": "USA",
            "created_at": "2024-01-05T00:00:00Z",
            "last_login": "2024-01-14T15:20:00Z",
            "is_active": True,
            "subscription_plan": "basic",
            "subscription_status": "active",
            "total_deeds": 8,
            "monthly_revenue": 9.99
        },
        {
            "id": 3,
            "email": "bob@firm.com",
            "first_name": "Bob",
            "last_name": "Wilson",
            "username": "bobwilson",
            "city": "Chicago",
            "country": "USA",
            "created_at": "2024-01-10T00:00:00Z",
            "last_login": "2024-01-13T11:45:00Z",
            "is_active": False,
            "subscription_plan": "free",
            "subscription_status": "cancelled",
            "total_deeds": 3,
            "monthly_revenue": 0.00
        }
    ]
    
    # Apply filters (in production, use database queries)
    filtered_users = all_users
    if search:
        filtered_users = [u for u in filtered_users if search.lower() in u['email'].lower() or search.lower() in f"{u['first_name']} {u['last_name']}".lower()]
    if status:
        filtered_users = [u for u in filtered_users if u['subscription_status'] == status]
    
    # Pagination
    start = (page - 1) * limit
    end = start + limit
    paginated_users = filtered_users[start:end]
    
    return {
        "users": paginated_users,
        "total": len(filtered_users),
        "page": page,
        "limit": limit,
        "total_pages": (len(filtered_users) + limit - 1) // limit
    }

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
    
    # Mock deed data - in production, query from database
    all_deeds = [
        {
            "id": 1,
            "user_id": 1,
            "user_email": "john@example.com",
            "user_name": "John Doe",
            "deed_type": "Quitclaim Deed",
            "property_address": "123 Main St, Los Angeles, CA",
            "apn": "123-456-789",
            "status": "completed",
            "created_at": "2024-01-10T00:00:00Z",
            "completed_at": "2024-01-12T00:00:00Z",
            "recorded": True,
            "shared_count": 2,
            "approval_count": 1
        },
        {
            "id": 2,
            "user_id": 2,
            "user_email": "jane@company.com",
            "user_name": "Jane Smith",
            "deed_type": "Grant Deed",
            "property_address": "456 Oak Ave, Beverly Hills, CA",
            "apn": "987-654-321",
            "status": "draft",
            "created_at": "2024-01-14T00:00:00Z",
            "completed_at": None,
            "recorded": False,
            "shared_count": 0,
            "approval_count": 0
        }
    ]
    
    # Apply filters
    filtered_deeds = all_deeds
    if status:
        filtered_deeds = [d for d in filtered_deeds if d['status'] == status]
    if user_id:
        filtered_deeds = [d for d in filtered_deeds if d['user_id'] == user_id]
    
    # Pagination
    start = (page - 1) * limit
    end = start + limit
    paginated_deeds = filtered_deeds[start:end]
    
    return {
        "deeds": paginated_deeds,
        "total": len(filtered_deeds),
        "page": page,
        "limit": limit,
        "total_pages": (len(filtered_deeds) + limit - 1) // limit
    }

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
def get_current_user():
    """Get current user (placeholder - would use JWT token in production)"""
    # For demo purposes, return a sample user
    return {
        "id": 1,
        "email": "john@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "username": "johndoe",
        "city": "Los Angeles",
        "country": "USA"
    }

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
def list_deeds_endpoint():
    """List all deeds for current user"""
    # In production, get user_id from JWT token
    user_id = 1  # Placeholder
    
    # Sample data with various statuses for testing
    sample_deeds = [
        {
            "id": 1,
            "date": "2024-01-15",
            "apn": "123-456-789",
            "address": "123 Main St, Los Angeles, CA",
            "escrow_number": "ESC001",
            "deed_type": "Quitclaim Deed",
            "status": "completed",
            "recorded": True
        },
        {
            "id": 2,
            "date": "2024-01-10",
            "apn": "987-654-321",
            "address": "456 Oak Ave, Beverly Hills, CA",
            "escrow_number": "ESC002",
            "deed_type": "Grant Deed",
            "status": "draft",
            "recorded": False
        },
        {
            "id": 3,
            "date": "2024-01-08",
            "apn": "555-777-999",
            "address": "789 Pine Rd, Santa Monica, CA",
            "escrow_number": "ESC003",
            "deed_type": "Warranty Deed",
            "status": "pending",
            "recorded": False
        }
    ]
    
    return {"deeds": sample_deeds}

@app.get("/deeds/available")
def list_available_deeds_for_sharing():
    """List deeds available for sharing (completed deeds)"""
    # Sample data of completed deeds that can be shared
    available_deeds = [
        { "id": 105, "address": "100 New St, LA, CA", "deed_type": "Quitclaim Deed" },
        { "id": 106, "address": "200 Fresh Ave, LA, CA", "deed_type": "Grant Deed" },
        { "id": 107, "address": "300 Clean Rd, LA, CA", "deed_type": "Warranty Deed" },
        { "id": 1, "address": "123 Main St, Los Angeles, CA", "deed_type": "Quitclaim Deed" }
    ]
    return {"available_deeds": available_deeds}

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 