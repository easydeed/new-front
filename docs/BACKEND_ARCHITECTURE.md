# ⚙️ Backend Architecture Guide

## 🎯 Overview

Complete guide to the DeedPro backend architecture built with FastAPI, PostgreSQL, and modern Python patterns.

**Technology Stack:**
- **Framework**: FastAPI 0.104+
- **Language**: Python 3.8+
- **Database**: PostgreSQL 12+ with psycopg2
- **Authentication**: JWT tokens with bcrypt hashing
- **Template Engine**: Jinja2 for deed generation
- **PDF Generation**: WeasyPrint for document creation
- **Payments**: Stripe API integration
- **External APIs**: SoftPro 360 & Qualia integrations

---

## 📁 Directory Structure

```
backend/
├── main.py                          # FastAPI application entry point
├── auth.py                          # Authentication & JWT utilities
├── database.py                      # Database connection & models
├── ai_assist.py                     # AI assistance router & logic
├── external_api.py                  # External integrations API
├── start_external_api.py            # External API startup script
├── requirements.txt                 # Python dependencies
├── external_requirements.txt        # External API dependencies
├── .env                            # Environment variables
├── scripts/                        # Database utilities
│   ├── init_db.py                  # Database initialization
│   ├── add_addon.py                # Widget addon setup
│   ├── add_pricing.py              # Pricing table setup
│   ├── setup_database.py           # Simple database setup
│   ├── fix_database.py             # Database repairs
│   └── reset_and_fix.py            # Database reset utility
└── EXTERNAL_API_README.md          # External API documentation
```

---

## 🏗️ Application Architecture

### Main Application (`main.py`)

```python
# Core imports and setup
import os
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import stripe
import psycopg2
from jinja2 import Environment, FileSystemLoader

# Load environment variables
load_dotenv()

# FastAPI application instance
app = FastAPI(title="DeedPro API", version="1.0.0")

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection
DB_URL = os.getenv("DATABASE_URL") or os.getenv("DB_URL")
conn = psycopg2.connect(DB_URL) if DB_URL else None

# Jinja2 environment for deed templates
env = Environment(loader=FileSystemLoader('../templates'))

# Stripe configuration
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
```

### Database Layer (`database.py`)

```python
import psycopg2
import os
from typing import Optional, List, Dict, Any

def get_db_connection():
    """Get database connection with error handling"""
    try:
        db_url = os.getenv("DATABASE_URL") or os.getenv("DB_URL")
        return psycopg2.connect(db_url)
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

def create_tables():
    """Initialize database schema with all required tables"""
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # Users table with authentication and plan management
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL,
                company_name VARCHAR(255),
                company_type VARCHAR(50),
                phone VARCHAR(20),
                state CHAR(2) NOT NULL,
                subscribe BOOLEAN DEFAULT FALSE,
                plan VARCHAR(50) DEFAULT 'free',
                stripe_customer_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                verified BOOLEAN DEFAULT FALSE,
                last_login TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                widget_access BOOLEAN DEFAULT FALSE
            )
        """)
        
        # Deeds table for document management
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS deeds (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                deed_type VARCHAR(100) NOT NULL,
                property_address TEXT NOT NULL,
                apn VARCHAR(50),
                county VARCHAR(100),
                legal_description TEXT,
                owner_type VARCHAR(100),
                sales_price DECIMAL(15,2),
                grantee_name VARCHAR(255),
                vesting VARCHAR(255),
                status VARCHAR(50) DEFAULT 'draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                grantor_name VARCHAR(255),
                recording_requested_by VARCHAR(255),
                mail_to TEXT,
                order_no VARCHAR(100),
                escrow_no VARCHAR(100),
                documentary_tax VARCHAR(50),
                city VARCHAR(100),
                date_field DATE,
                grantor_signature VARCHAR(255),
                county_notary VARCHAR(100),
                notary_date DATE,
                notary_name VARCHAR(255),
                appeared_before_notary VARCHAR(255),
                notary_signature VARCHAR(255)
            )
        """)
        
        # Plan limits configuration
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS plan_limits (
                id SERIAL PRIMARY KEY,
                plan_name VARCHAR(50) UNIQUE NOT NULL,
                max_deeds_per_month INTEGER,
                api_calls_per_month INTEGER,
                ai_assistance BOOLEAN DEFAULT TRUE,
                integrations_enabled BOOLEAN DEFAULT FALSE,
                priority_support BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Subscriptions for Stripe integration
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS subscriptions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                stripe_subscription_id VARCHAR(255) UNIQUE,
                status VARCHAR(50) NOT NULL,
                current_period_start TIMESTAMP,
                current_period_end TIMESTAMP,
                plan_name VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        return True
        
    except Exception as e:
        print(f"Error creating tables: {e}")
        return False
    finally:
        cursor.close()
        conn.close()
```

### Authentication Layer (`auth.py`)

```python
import jwt
import bcrypt
from datetime import datetime, timedelta
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import os

# Security configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

security = HTTPBearer()

class AuthUtils:
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password using bcrypt"""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    @staticmethod
    def verify_password(password: str, hashed: str) -> bool:
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def verify_token(token: str) -> dict:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired"
            )
        except jwt.JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Extract user ID from JWT token"""
    token = credentials.credentials
    payload = AuthUtils.verify_token(token)
    user_id = payload.get("sub")
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    return user_id

def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Verify admin role from JWT token"""
    token = credentials.credentials
    payload = AuthUtils.verify_token(token)
    user_role = payload.get("role")
    
    if user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return payload.get("sub")
```

---

## 📊 Database Schema

### Core Tables

#### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    company_name VARCHAR(255),
    company_type VARCHAR(50),
    phone VARCHAR(20),
    state CHAR(2) NOT NULL,
    subscribe BOOLEAN DEFAULT FALSE,
    plan VARCHAR(50) DEFAULT 'free',
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    widget_access BOOLEAN DEFAULT FALSE
);
```

#### Deeds Table
```sql
CREATE TABLE deeds (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    deed_type VARCHAR(100) NOT NULL,
    property_address TEXT NOT NULL,
    apn VARCHAR(50),
    county VARCHAR(100),
    legal_description TEXT,
    owner_type VARCHAR(100),
    sales_price DECIMAL(15,2),
    grantee_name VARCHAR(255),
    vesting VARCHAR(255),
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Additional deed-specific fields
    grantor_name VARCHAR(255),
    recording_requested_by VARCHAR(255),
    mail_to TEXT,
    order_no VARCHAR(100),
    escrow_no VARCHAR(100),
    documentary_tax VARCHAR(50),
    city VARCHAR(100),
    date_field DATE,
    grantor_signature VARCHAR(255),
    county_notary VARCHAR(100),
    notary_date DATE,
    notary_name VARCHAR(255),
    appeared_before_notary VARCHAR(255),
    notary_signature VARCHAR(255)
);
```

#### Plan Limits Table
```sql
CREATE TABLE plan_limits (
    id SERIAL PRIMARY KEY,
    plan_name VARCHAR(50) UNIQUE NOT NULL,
    max_deeds_per_month INTEGER,
    api_calls_per_month INTEGER,
    ai_assistance BOOLEAN DEFAULT TRUE,
    integrations_enabled BOOLEAN DEFAULT FALSE,
    priority_support BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Subscriptions Table
```sql
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    status VARCHAR(50) NOT NULL,
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    plan_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Pricing Table
```sql
CREATE TABLE pricing (
    id SERIAL PRIMARY KEY,
    plan_name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    features TEXT[],
    stripe_price_id VARCHAR(255),
    stripe_product_id VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🛠️ API Endpoints Structure

### Authentication Endpoints
```python
@app.post("/users/register")
async def register_user(user: UserRegister = Body(...)):
    """Register a new user with plan assignment"""
    # Validate email uniqueness
    # Hash password with bcrypt
    # Create user record
    # Generate JWT token
    # Return user data and token

@app.post("/users/login")
async def login_user(credentials: LoginRequest = Body(...)):
    """Authenticate user and return JWT token"""
    # Verify email exists
    # Check password hash
    # Update last_login timestamp
    # Generate JWT token
    # Return user data and token

@app.get("/users/profile")
async def get_user_profile(user_id: str = Depends(get_current_user_id)):
    """Get current user profile with plan information"""
    # Fetch user data from database
    # Include plan limits and usage
    # Return profile data
```

### Deed Management Endpoints
```python
@app.post("/deeds")
async def create_deed(deed_data: DeedCreate, user_id: str = Depends(get_current_user_id)):
    """Create a new deed with plan limit checking"""
    # Check user's plan limits
    # Validate deed data
    # Insert deed record
    # Update user's deed count
    # Return deed information

@app.get("/deeds")
async def list_user_deeds(user_id: str = Depends(get_current_user_id)):
    """List all deeds for authenticated user"""
    # Query deeds by user_id
    # Apply pagination
    # Return deed list

@app.get("/deeds/{deed_id}/download")
async def download_deed_pdf(deed_id: int, user_id: str = Depends(get_current_user_id)):
    """Generate and return deed PDF"""
    # Verify deed ownership
    # Load deed template
    # Generate PDF with WeasyPrint
    # Return base64 encoded PDF
```

### Template Generation System
```python
@app.post("/generate-deed-preview")
async def generate_deed_preview(deed_data: DeedData):
    """Generate HTML preview of deed without authentication"""
    # Load appropriate template
    # Render with Jinja2
    # Return HTML content

def render_deed_template(deed_type: str, data: dict) -> str:
    """Render deed template with provided data"""
    try:
        template = env.get_template(f"{deed_type.lower().replace(' ', '_')}.html")
        return template.render(**data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Template error: {str(e)}")

def generate_pdf_from_html(html_content: str) -> str:
    """Convert HTML to PDF and return base64 encoded string"""
    try:
        pdf_bytes = HTML(string=html_content).write_pdf()
        return base64.b64encode(pdf_bytes).decode('utf-8')
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation error: {str(e)}")
```

---

## 💳 Stripe Integration

### Payment Endpoints
```python
@app.post("/users/upgrade")
async def upgrade_user_plan(
    plan_request: PlanUpgrade,
    user_id: str = Depends(get_current_user_id)
):
    """Create Stripe checkout session for plan upgrade"""
    # Get or create Stripe customer
    # Create checkout session
    # Set success/cancel URLs
    # Return checkout URL

@app.post("/payments/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    # Verify webhook signature
    # Process different event types:
    #   - checkout.session.completed
    #   - invoice.payment_succeeded
    #   - customer.subscription.deleted
    # Update user plan and subscription status

@app.post("/payments/create-portal-session")
async def create_portal_session(user_id: str = Depends(get_current_user_id)):
    """Create Stripe billing portal session"""
    # Get user's Stripe customer ID
    # Create portal session
    # Return portal URL
```

### Stripe Webhook Processing
```python
def handle_checkout_completed(session):
    """Process successful checkout completion"""
    customer_id = session['customer']
    subscription_id = session['subscription']
    
    # Update user plan
    # Create subscription record
    # Send confirmation email

def handle_invoice_payment_succeeded(invoice):
    """Process successful payment"""
    subscription_id = invoice['subscription']
    
    # Update subscription status
    # Extend plan period
    # Log payment

def handle_subscription_deleted(subscription):
    """Process subscription cancellation"""
    subscription_id = subscription['id']
    
    # Downgrade user to free plan
    # Update subscription status
    # Send cancellation notification
```

---

## 🧠 AI Assistance Integration

### AI Router (`ai_assist.py`)
```python
from fastapi import APIRouter, HTTPException
from openai import OpenAI
import os

ai_router = APIRouter(prefix="/api/ai", tags=["AI Assistance"])

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY")) if os.getenv("OPENAI_API_KEY") else None

@ai_router.post("/assist")
async def get_ai_assistance(request: AIAssistRequest):
    """Get AI suggestions for deed form fields"""
    if not client:
        # Return mock response if OpenAI not configured
        return {
            "suggestion": f"Suggested: {request.input.title()}",
            "confidence": 0.8
        }
    
    try:
        # Create AI prompt based on deed type and field
        prompt = create_ai_prompt(request.deed_type, request.field, request.input)
        
        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            temperature=0.3
        )
        
        return {
            "suggestion": response.choices[0].message.content.strip(),
            "confidence": 0.9
        }
        
    except Exception as e:
        return {
            "suggestion": f"Enhanced: {request.input}",
            "confidence": 0.7
        }

def create_ai_prompt(deed_type: str, field: str, input_text: str) -> str:
    """Create contextual AI prompt for deed assistance"""
    prompts = {
        "property_address": f"Format this property address for a {deed_type}: {input_text}",
        "legal_description": f"Improve this legal description for a {deed_type}: {input_text}",
        "grantor": f"Format this grantor name properly: {input_text}",
        "grantee": f"Format this grantee name properly: {input_text}"
    }
    
    return prompts.get(field, f"Improve this {field} for a {deed_type}: {input_text}")
```

---

## 🏢 External API Integration

### SoftPro 360 Integration
```python
@external_app.post("/api/v1/softpro/webhook")
async def softpro_webhook(
    order_data: SoftProOrder,
    api_key_info: dict = Depends(verify_api_key)
):
    """Receive order data from SoftPro 360"""
    # Validate order data
    # Generate deed automatically
    # Return PDF URL to SoftPro
    
    try:
        # Extract deed information
        deed_data = {
            "deed_type": order_data.deed_type,
            "grantor": order_data.seller_name,
            "grantee": order_data.buyer_name,
            "property_address": order_data.property_address,
            "sales_price": order_data.sales_price
        }
        
        # Generate deed
        html = render_deed_template(deed_data["deed_type"], deed_data)
        pdf_base64 = generate_pdf_from_html(html)
        
        # Log integration activity
        log_integration_activity(api_key_info, "softpro", "deed_generated")
        
        return {
            "status": "success",
            "deed_id": f"SP_{order_data.order_id}",
            "pdf_url": f"data:application/pdf;base64,{pdf_base64}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### Qualia Integration
```python
@external_app.post("/api/v1/qualia/import-order")
async def import_qualia_order(
    order_data: QualiaOrder,
    api_key_info: dict = Depends(verify_api_key)
):
    """Import order from Qualia platform"""
    # Process Qualia order format
    # Create deed from order data
    # Return deed information
    
@external_app.post("/api/v1/qualia/export-deed")
async def export_deed_to_qualia(
    export_data: QualiaExport,
    api_key_info: dict = Depends(verify_api_key)
):
    """Export completed deed to Qualia"""
    # Upload deed to Qualia via GraphQL
    # Update order status
    # Return confirmation
```

---

## 👑 Admin System

### Admin Dashboard Endpoints
```python
@app.get("/admin/dashboard")
async def admin_dashboard(admin_id: str = Depends(get_current_admin)):
    """Get comprehensive admin dashboard metrics"""
    return {
        "users": get_user_metrics(),
        "deeds": get_deed_metrics(),
        "revenue": get_revenue_metrics(),
        "api_calls": get_api_usage_metrics(),
        "system_health": get_system_health(),
        "integrations": get_integration_status()
    }

def get_user_metrics() -> dict:
    """Calculate user statistics"""
    with conn.cursor() as cur:
        # Total users
        cur.execute("SELECT COUNT(*) FROM users WHERE is_active = true")
        total_users = cur.fetchone()[0]
        
        # New users this month
        cur.execute("""
            SELECT COUNT(*) FROM users 
            WHERE is_active = true 
            AND created_at >= date_trunc('month', CURRENT_DATE)
        """)
        new_this_month = cur.fetchone()[0]
        
        # Users by plan
        cur.execute("SELECT plan, COUNT(*) FROM users WHERE is_active = true GROUP BY plan")
        by_plan = dict(cur.fetchall())
        
        return {
            "total": total_users,
            "new_this_month": new_this_month,
            "by_plan": by_plan
        }

@app.get("/admin/users")
async def list_all_users(
    role: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    admin_id: str = Depends(get_current_admin)
):
    """List all users with filtering and pagination"""
    # Build query with filters
    # Apply pagination
    # Return user list with metadata

@app.put("/admin/users/{user_id}")
async def update_user_admin(
    user_id: int,
    updates: AdminUserUpdate,
    admin_id: str = Depends(get_current_admin)
):
    """Update user role, plan, or status"""
    # Validate update permissions
    # Update user record
    # Log admin action
    # Return updated user data
```

---

## 🔄 Background Tasks & Cron Jobs

### Database Maintenance
```python
from fastapi import BackgroundTasks
import asyncio
from datetime import datetime, timedelta

async def cleanup_expired_tokens():
    """Remove expired authentication tokens"""
    # Clean up expired shared deed tokens
    # Remove old session data
    # Log cleanup activity

async def update_usage_metrics():
    """Update monthly usage counters"""
    # Reset monthly deed counts
    # Calculate API usage statistics
    # Update plan usage tracking

async def backup_database():
    """Create automated database backup"""
    # Export critical tables
    # Store backup securely
    # Notify administrators

# Schedule background tasks
@app.on_event("startup")
async def startup_tasks():
    """Initialize background task scheduler"""
    # Schedule daily cleanup
    # Schedule monthly usage reset
    # Schedule weekly backups
```

---

## 🔒 Security Implementation

### Input Validation
```python
from pydantic import BaseModel, validator, EmailStr
from typing import List, Optional

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str
    state: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain number')
        return v
    
    @validator('state')
    def validate_state(cls, v):
        valid_states = ['CA', 'NY', 'TX', 'FL']  # Add all states
        if v not in valid_states:
            raise ValueError('Invalid state code')
        return v

class DeedCreate(BaseModel):
    deed_type: str
    property_address: str
    apn: Optional[str]
    county: str
    
    @validator('deed_type')
    def validate_deed_type(cls, v):
        valid_types = ['Grant Deed', 'Quitclaim Deed', 'Warranty Deed']
        if v not in valid_types:
            raise ValueError('Invalid deed type')
        return v
```

### SQL Injection Prevention
```python
def create_deed_safe(deed_data: dict, user_id: int) -> int:
    """Create deed with parameterized queries"""
    with conn.cursor() as cur:
        # Always use parameterized queries
        cur.execute("""
            INSERT INTO deeds (
                user_id, deed_type, property_address, 
                apn, county, legal_description
            ) VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            user_id,
            deed_data['deed_type'],
            deed_data['property_address'],
            deed_data.get('apn'),
            deed_data['county'],
            deed_data.get('legal_description')
        ))
        
        return cur.fetchone()[0]
```

### CORS & Security Headers
```python
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://deedpro-frontend-new.vercel.app",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Trusted host middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["deedpro-main-api.onrender.com", "localhost"]
)

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000"
    return response
```

---

## 📊 Monitoring & Logging

### Request Logging
```python
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all API requests"""
    start_time = datetime.utcnow()
    
    # Log request
    logger.info(f"Request: {request.method} {request.url}")
    
    # Process request
    response = await call_next(request)
    
    # Calculate duration
    duration = (datetime.utcnow() - start_time).total_seconds()
    
    # Log response
    logger.info(f"Response: {response.status_code} - {duration:.3f}s")
    
    return response

def log_user_action(user_id: str, action: str, details: dict = None):
    """Log user actions for audit trail"""
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO audit_logs (user_id, action, details, timestamp)
            VALUES (%s, %s, %s, %s)
        """, (user_id, action, json.dumps(details), datetime.utcnow()))
```

### Health Monitoring
```python
@app.get("/health")
async def health_check():
    """Comprehensive health check endpoint"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "checks": {
            "database": check_database_health(),
            "stripe": check_stripe_health(),
            "templates": check_template_health(),
            "external_apis": check_external_api_health()
        }
    }
    
    # Return 503 if any critical service is down
    if any(not check["healthy"] for check in health_status["checks"].values()):
        raise HTTPException(status_code=503, detail=health_status)
    
    return health_status

def check_database_health() -> dict:
    """Check database connectivity"""
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            return {"healthy": True, "message": "Database connected"}
    except Exception as e:
        return {"healthy": False, "message": str(e)}
```

---

## 🚀 Performance Optimization

### Database Connection Pooling
```python
import psycopg2.pool
from contextlib import contextmanager

# Create connection pool
connection_pool = psycopg2.pool.ThreadedConnectionPool(
    1, 20,  # min and max connections
    dsn=DB_URL
)

@contextmanager
def get_db_cursor():
    """Get database cursor from connection pool"""
    conn = connection_pool.getconn()
    try:
        with conn.cursor() as cursor:
            yield cursor
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        connection_pool.putconn(conn)

# Usage
async def create_deed_pooled(deed_data: dict, user_id: int):
    """Create deed using connection pool"""
    with get_db_cursor() as cur:
        cur.execute("""
            INSERT INTO deeds (user_id, deed_type, property_address)
            VALUES (%s, %s, %s) RETURNING id
        """, (user_id, deed_data['deed_type'], deed_data['property_address']))
        
        return cur.fetchone()[0]
```

### Caching Strategy
```python
from functools import lru_cache
import redis
import json

# Redis cache for session data
redis_client = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))

@lru_cache(maxsize=100)
def get_template_cached(template_name: str):
    """Cache compiled templates in memory"""
    return env.get_template(template_name)

def cache_user_data(user_id: str, data: dict, expire: int = 3600):
    """Cache user data in Redis"""
    redis_client.setex(f"user:{user_id}", expire, json.dumps(data))

def get_cached_user_data(user_id: str) -> dict:
    """Get cached user data"""
    cached = redis_client.get(f"user:{user_id}")
    return json.loads(cached) if cached else None
```

---

## 📞 Development Guidelines

### Code Structure
- Follow FastAPI best practices
- Use type hints for all functions
- Implement proper error handling
- Use dependency injection for services
- Follow RESTful API conventions

### Database Operations
- Always use parameterized queries
- Implement proper transaction handling
- Use connection pooling for performance
- Create proper indexes for queries
- Handle database errors gracefully

### Security Practices
- Validate all input data
- Use JWT for authentication
- Implement proper authorization
- Log security events
- Follow OWASP guidelines

### Testing Strategy
- Write unit tests for business logic
- Implement integration tests for APIs
- Test database operations
- Mock external services
- Use pytest for testing framework

---

**Last Updated:** January 2025  
**Backend Version:** FastAPI 1.0.0
