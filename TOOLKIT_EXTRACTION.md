# DeedPro Reusable Toolkit Extraction

> **Comprehensive documentation of reusable patterns, integrations, and utilities**  
> Generated: January 2026

---

## Table of Contents

1. [API Integrations](#api-integrations)
   - [SiteX Property Client](#1-sitex-property-client)
   - [PDFShift Client](#2-pdfshift-client)
   - [TitlePoint SOAP Client](#3-titlepoint-soap-client)
   - [Google Places Client](#4-google-places-client)
   - [SendGrid Email Service](#5-sendgrid-email-service)
   - [Stripe Billing & Webhooks](#6-stripe-billing--webhooks)
   - [OpenAI AI Assist](#7-openai-ai-assist)
2. [Authentication & Security](#authentication--security)
   - [JWT Auth System (Python)](#8-jwt-auth-system-python)
   - [Auth Manager (TypeScript)](#9-auth-manager-typescript)
   - [Admin Role Guard](#10-admin-role-guard)
3. [Document Generation](#document-generation)
   - [PDF Engine (Multi-Backend)](#11-pdf-engine-multi-backend)
   - [Jinja2 Legal Templates](#12-jinja2-legal-templates)
   - [QR Code Generator](#13-qr-code-generator)
   - [Short Code Generator](#14-short-code-generator)
4. [Frontend Utilities](#frontend-utilities)
   - [API Client Wrapper](#15-api-client-wrapper)
   - [AI Helpers (Vesting/Tax)](#16-ai-helpers-vestingtax)
   - [AI Assistant Service](#17-ai-assistant-service)
   - [cn() Classname Merge](#18-cn-classname-merge)
5. [UI Components](#ui-components)
   - [Button (CVA Variants)](#19-button-cva-variants)
   - [AI Card Component](#20-ai-card-component)
   - [Input Underline](#21-input-underline)
   - [Money Input](#22-money-input)
   - [Vesting Input](#23-vesting-input)
6. [Data Models & Patterns](#data-models--patterns)
   - [Property Data Model](#24-property-data-model)
   - [OAuth Token Manager](#25-oauth-token-manager)
   - [Multi-Path Field Extraction](#26-multi-path-field-extraction)

---

# API Integrations

---

## 1. SiteX Property Client

**Type:** Integration  
**Location:** `backend/services/sitex_service.py`  
**Dependencies:** `httpx`, `pydantic`

### What It Does

Production-grade MLS/property data client with OAuth2 authentication, thread-safe token management, in-memory caching with TTL, and multi-match handling. Fetches property details including APN, legal descriptions, owner information, and valuations from the SiteX/ICE REST API.

### Key Files

- `backend/services/sitex_service.py` - Main client with OAuth and caching
- `backend/models/property_data.py` - Pydantic response models

### Configuration Required

```env
SITEX_BASE_URL=https://api.bkiconnect.com
SITEX_CLIENT_ID=your_client_id
SITEX_CLIENT_SECRET=your_client_secret
SITEX_FEED_ID=your_feed_id
SITEX_DEBUG=false  # Set true to include raw response in output
```

### Code Preview

```python
class SiteXConfig:
    """Centralized SiteX configuration"""
    
    def __init__(self):
        self.base_url = os.getenv("SITEX_BASE_URL", "https://api.bkiconnect.com").rstrip('/')
        self.client_id = os.getenv("SITEX_CLIENT_ID")
        self.client_secret = os.getenv("SITEX_CLIENT_SECRET")
        self.feed_id = os.getenv("SITEX_FEED_ID")
    
    @property
    def token_url(self) -> str:
        return f"{self.base_url}/ls/apigwy/oauth2/v1/token"
    
    def is_configured(self) -> bool:
        return all([self.client_id, self.client_secret, self.feed_id])


class SiteXTokenManager:
    """Thread-safe OAuth token management with proactive refresh"""
    
    def __init__(self, config: SiteXConfig):
        self.config = config
        self._token: Optional[str] = None
        self._expiry: datetime = datetime.min
        self._lock = asyncio.Lock()
        self._refresh_buffer = timedelta(seconds=60)
    
    async def get_token(self) -> str:
        """Get valid token, refreshing if needed"""
        async with self._lock:
            if self._is_token_valid():
                return self._token
            return await self._refresh_token()
    
    async def _refresh_token(self) -> str:
        credentials = f"{self.config.client_id}:{self.config.client_secret}"
        basic_auth = base64.b64encode(credentials.encode()).decode()
        
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                self.config.token_url,
                headers={
                    "Authorization": f"Basic {basic_auth}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data={"grant_type": "client_credentials"},
            )
            response.raise_for_status()
            data = response.json()
            
            self._token = data["access_token"]
            expires_in = data.get("expires_in", 600)
            self._expiry = datetime.utcnow() + timedelta(seconds=expires_in)
            return self._token


class SiteXService:
    """Production-grade SiteX integration with caching"""
    
    def __init__(self):
        self.config = SiteXConfig()
        self.token_manager = SiteXTokenManager(self.config)
        self._cache: Dict[str, Tuple[PropertyData, datetime]] = {}
        self._cache_ttl = timedelta(hours=1)
    
    async def search_property(
        self,
        address: str,
        city: Optional[str] = None,
        state: str = "CA",
        zip_code: Optional[str] = None,
        use_cache: bool = True
    ) -> PropertySearchResult:
        """Search for property by address and return normalized data."""
        # Check cache first
        cache_key = self._make_cache_key(address, city, state, zip_code)
        if use_cache and cache_key in self._cache:
            data, cached_at = self._cache[cache_key]
            if datetime.utcnow() - cached_at < self._cache_ttl:
                return PropertySearchResult(status="success", data=data)
        
        # Make API request
        raw_response = await self._search_address(address, last_line, client_ref)
        
        # Handle multi-match
        if self._is_multi_match(raw_response):
            matches = self._extract_matches(raw_response)
            return PropertySearchResult(status="multi_match", matches=matches)
        
        # Parse and cache result
        property_data = self._parse_response(raw_response, address)
        self._cache[cache_key] = (property_data, datetime.utcnow())
        
        return PropertySearchResult(status="success", data=property_data)

# Singleton instance
sitex_service = SiteXService()
```

### Extraction Notes

- Remove project-specific `PropertyData` model imports - make generic or include in package
- Make cache backend configurable (memory, Redis, etc.)
- Add retry logic with exponential backoff
- Consider making `_parse_response` field mappings configurable

### Toolkit Category

Would go in: `/integrations/sitex/`

---

## 2. PDFShift Client

**Type:** Integration  
**Location:** `backend/services/pdfshift_service.py`  
**Dependencies:** `httpx`

### What It Does

Chrome-based PDF generation via PDFShift API. Provides pixel-perfect CSS rendering for legal documents with configurable margins, paper size, and print backgrounds. Supports both async and sync operations.

### Key Files

- `backend/services/pdfshift_service.py` - API client
- `backend/pdf_engine.py` - Multi-engine orchestrator

### Configuration Required

```env
PDFSHIFT_API_KEY=your_pdfshift_api_key
PDFSHIFT_TIMEOUT=30
```

### Code Preview

```python
class PDFShiftService:
    """PDFShift API integration for professional PDF generation."""
    
    def __init__(self):
        self.api_key = os.getenv("PDFSHIFT_API_KEY")
        self.base_url = "https://api.pdfshift.io/v3/convert/pdf"
        self.default_timeout = float(os.getenv("PDFSHIFT_TIMEOUT", "30"))
        
    def is_configured(self) -> bool:
        return bool(self.api_key)
    
    async def render_pdf(
        self,
        html: str,
        options: Optional[Dict[str, Any]] = None,
        timeout: Optional[float] = None
    ) -> bytes:
        """Convert HTML to PDF via PDFShift API."""
        if not self.is_configured():
            raise RuntimeError("PDFSHIFT_API_KEY not set")
        
        default_options = {
            "source": html,
            "format": "Letter",
            "margin": {
                "top": "0.5in",
                "right": "0.625in", 
                "bottom": "0.625in",
                "left": "0.75in"
            },
            "printBackground": True,
            "preferCSSPageSize": True,
            "displayHeaderFooter": False,
        }
        
        if options:
            for key, value in options.items():
                if isinstance(value, dict) and key in default_options:
                    default_options[key].update(value)
                else:
                    default_options[key] = value
        
        async with httpx.AsyncClient(timeout=timeout or self.default_timeout) as client:
            response = await client.post(
                self.base_url,
                auth=(self.api_key, ""),
                json=default_options,
                headers={"Content-Type": "application/json", "Accept": "application/pdf"}
            )
            
            if response.status_code == 401:
                raise RuntimeError("PDFShift authentication failed")
            elif response.status_code == 429:
                raise RuntimeError("PDFShift rate limit exceeded")
            
            response.raise_for_status()
            return response.content

# Singleton instance
pdfshift_service = PDFShiftService()
```

### Extraction Notes

- Add retry logic for rate limits (429)
- Consider adding queue support for high-volume scenarios
- Make default margins configurable per document type

### Toolkit Category

Would go in: `/integrations/pdfshift/`

---

## 3. TitlePoint SOAP Client

**Type:** Integration  
**Location:** `backend/services/titlepoint_service.py`  
**Dependencies:** `httpx`, `xmltodict`, `xml.etree.ElementTree`

### What It Does

Property enrichment via TitlePoint's HTTP/SOAP API for vesting, tax, and deed data. Implements Pacific Coast Title's fail-proof methodology with proper polling and result fetching.

### Key Files

- `backend/services/titlepoint_service.py` - Full client implementation

### Configuration Required

```env
TITLEPOINT_USER_ID=your_user_id
TITLEPOINT_PASSWORD=your_password
# Optional endpoint overrides
TP_CREATE_SERVICE_ENDPOINT=https://www.titlepoint.com/TitlePointServices/TpsService.asmx/CreateService3
```

### Code Preview

```python
class TitlePointService:
    """Service for TitlePoint API using HTTP/SOAP methodology"""
    
    def __init__(self):
        self.user_id = os.getenv("TITLEPOINT_USER_ID")
        self.password = os.getenv("TITLEPOINT_PASSWORD")
        self.create_service_endpoint = os.getenv(
            "TP_CREATE_SERVICE_ENDPOINT",
            "https://www.titlepoint.com/TitlePointServices/TpsService.asmx/CreateService3"
        )
        self.max_wait_seconds = 20
        self.poll_interval = 2
    
    async def enrich_property(self, data: Dict) -> Dict:
        """Enrich property data with vesting, tax, and legal description."""
        county = self._normalize_county(data.get('county', ''))
        full_address = data.get('fullAddress', '')
        
        # Build parameters
        parameters = f"Address1={full_address};City={data.get('city', '')};"
        
        # Create service request
        request_id = await self._create_service_get(
            endpoint=self.create_service_endpoint,
            query={
                "userID": self.user_id,
                "password": self.password,
                "serviceType": "TitlePoint.Geo.Property",
                "parameters": parameters,
                "state": data.get('state', 'CA'),
                "county": county,
            }
        )
        
        # Poll for completion
        summary_xml, result_id = await self._wait_for_http_completion(request_id)
        
        # Parse results
        return await self._parse_pacific_coast_result(summary_xml)
    
    def _extract_nested_value(self, data: dict, path: list) -> str:
        """Extract nested value from dictionary using path list"""
        current = data
        for key in path:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return ''
        
        if isinstance(current, dict):
            if '#text' in current:
                return str(current['#text']).strip()
        return str(current).strip() if current else ''
```

### Extraction Notes

- Highly domain-specific (title industry)
- XML parsing logic could be generalized
- Add better error categorization
- Consider making field mappings configurable

### Toolkit Category

Would go in: `/integrations/titlepoint/`

---

## 4. Google Places Client

**Type:** Integration  
**Location:** `backend/services/google_places_service.py`  
**Dependencies:** `httpx`

### What It Does

Address validation and geocoding using Google Places API. Parses address components into structured data with coordinates.

### Key Files

- `backend/services/google_places_service.py` - Full client

### Configuration Required

```env
GOOGLE_API_KEY=your_google_api_key
```

### Code Preview

```python
class GooglePlacesService:
    """Service for Google Places API"""
    
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY")
        self.base_url = "https://maps.googleapis.com/maps/api"
    
    async def validate_address(self, address_data: Dict) -> Dict:
        """Validate and enrich address data"""
        if address_data.get('placeId'):
            return await self._get_place_details(address_data['placeId'])
        return await self._geocode_address(address_data.get('fullAddress', ''))
    
    async def _get_place_details(self, place_id: str) -> Dict:
        """Get detailed information for a place ID"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/place/details/json",
                params={
                    'place_id': place_id,
                    'fields': 'address_components,formatted_address,geometry,name,place_id',
                    'key': self.api_key
                }
            )
            response.raise_for_status()
            return self._parse_place_result(response.json().get('result', {}))
    
    def _parse_place_result(self, result: Dict) -> Dict:
        """Parse Google Places result into standardized format"""
        components = result.get('address_components', [])
        
        return {
            'google_place_id': result.get('place_id'),
            'formatted_address': result.get('formatted_address', ''),
            'street_number': self._get_component(components, 'street_number'),
            'route': self._get_component(components, 'route'),
            'city': self._get_component(components, 'locality'),
            'county': self._get_component(components, 'administrative_area_level_2'),
            'state': self._get_component(components, 'administrative_area_level_1', 'short_name'),
            'zip_code': self._get_component(components, 'postal_code'),
            'latitude': result.get('geometry', {}).get('location', {}).get('lat'),
            'longitude': result.get('geometry', {}).get('location', {}).get('lng'),
        }
    
    def _get_component(self, components: List, component_type: str, name_type: str = 'long_name'):
        """Extract specific component from address_components"""
        for component in components:
            if component_type in component.get('types', []):
                return component.get(name_type)
        return None
```

### Extraction Notes

- Very reusable for any address-related application
- Consider adding Places Autocomplete support
- Add rate limiting

### Toolkit Category

Would go in: `/integrations/google-places/`

---

## 5. SendGrid Email Service

**Type:** Integration  
**Location:** `backend/services/email_service.py`  
**Dependencies:** `sendgrid`

### What It Does

Minimal email sender with SendGrid integration and dry-run fallback for development.

### Key Files

- `backend/services/email_service.py` - Simple wrapper

### Configuration Required

```env
SENDGRID_API_KEY=your_api_key
FROM_EMAIL=noreply@yourapp.com
```

### Code Preview

```python
import os

def send_email(to: str, subject: str, html: str) -> bool:
    """
    Minimal email sender.
    - If SENDGRID_API_KEY present, sends real email
    - Otherwise logs to stdout (dry run)
    """
    api_key = os.getenv("SENDGRID_API_KEY")
    if not api_key:
        print(f"[EMAIL:DRYRUN] To={to} | Subject={subject}\n{html}")
        return True
    
    try:
        import sendgrid
        from sendgrid.helpers.mail import Mail
        
        sg = sendgrid.SendGridAPIClient(api_key)
        message = Mail(
            from_email=os.getenv("FROM_EMAIL", "noreply@app.com"),
            to_emails=to,
            subject=subject,
            html_content=html,
        )
        resp = sg.send(message)
        return resp.status_code in (200, 202)
    except Exception as e:
        print(f"[EMAIL:ERROR] {e}")
        return False
```

### Extraction Notes

- Add async version
- Add template support
- Add batch sending
- Add attachment support

### Toolkit Category

Would go in: `/integrations/sendgrid/`

---

## 6. Stripe Billing & Webhooks

**Type:** Integration  
**Location:** `backend/phase23_billing/`  
**Dependencies:** `stripe`

### What It Does

Complete Stripe integration with webhook handling for subscriptions, invoices, payments, and refunds.

### Key Files

- `backend/phase23_billing/services/stripe_helpers.py` - Initialization and fee calculation
- `backend/phase23_billing/router_webhook.py` - Webhook event handling

### Configuration Required

```env
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Code Preview

```python
# stripe_helpers.py
import stripe
from ..deps import get_settings

def init_stripe():
    s = get_settings()
    if not s.STRIPE_SECRET_KEY:
        raise RuntimeError("STRIPE_SECRET_KEY not set")
    stripe.api_key = s.STRIPE_SECRET_KEY
    return stripe

def calc_stripe_fee(amount_cents: int) -> int:
    """Approximate standard fee (2.9% + $0.30)"""
    return int(round(amount_cents * 0.029 + 30))

# router_webhook.py
@router.post("/payments/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    stripe = init_stripe()
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(
            payload=payload, 
            sig_header=sig_header, 
            secret=settings.STRIPE_WEBHOOK_SECRET
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook verification failed: {e}")
    
    etype = event.get("type")
    obj = event.get("data", {}).get("object", {})
    
    # Handle subscription lifecycle
    if etype in ("customer.subscription.created", "customer.subscription.updated"):
        db.execute(text("""
            UPDATE subscriptions SET status = :status WHERE stripe_subscription_id = :sid
        """), {"status": obj.get("status"), "sid": obj.get("id")})
        db.commit()
    
    # Handle invoice paid
    if etype == "invoice.payment_succeeded":
        # Update invoice status, record payment history
        pass
    
    return {"ok": True}
```

### Extraction Notes

- Database schema is project-specific
- Make table names configurable
- Add Stripe Checkout session creation
- Add customer portal creation

### Toolkit Category

Would go in: `/integrations/stripe/`

---

## 7. OpenAI AI Assist

**Type:** Integration  
**Location:** `backend/ai_assist.py`  
**Dependencies:** `openai`

### What It Does

AI-powered field suggestions for deed forms using OpenAI GPT. Provides context-aware assistance for addresses, legal descriptions, names, and vesting.

### Key Files

- `backend/ai_assist.py` - API router and mock fallbacks

### Configuration Required

```env
OPENAI_API_KEY=your_openai_api_key
```

### Code Preview

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import openai
import os

ai_router = APIRouter(prefix="/api/ai", tags=["AI Assistance"])

FIELD_PROMPTS = {
    "property_address": "Format this property address for legal document use...",
    "legal_description": "Create a properly formatted legal description...",
    "grantee_name": "Format this name(s) for legal document use...",
    "vesting": "Suggest appropriate vesting language for this ownership type...",
}

class AIAssistRequest(BaseModel):
    deed_type: str
    field: str
    input: str

@ai_router.post("/assist")
async def get_ai_assistance(request: AIAssistRequest):
    """Get AI assistance for deed form fields"""
    field_prompt = FIELD_PROMPTS.get(request.field, "Improve this text:")
    
    full_prompt = f"""
{field_prompt}

User input: "{request.input}"

Provide a professionally formatted suggestion.
"""
    
    if openai.api_key:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a legal document assistant."},
                {"role": "user", "content": full_prompt}
            ],
            max_tokens=200,
            temperature=0.3
        )
        suggestion = response.choices[0].message.content.strip()
    else:
        suggestion = get_mock_suggestion(request.field, request.input)
    
    return {"suggestion": suggestion, "confidence": 0.85}
```

### Extraction Notes

- Domain-specific prompts (real estate)
- Add streaming support
- Make model configurable
- Add rate limiting per user

### Toolkit Category

Would go in: `/integrations/openai/`

---

# Authentication & Security

---

## 8. JWT Auth System (Python)

**Type:** Pattern  
**Location:** `backend/auth.py`  
**Dependencies:** `python-jose`, `passlib`, `bcrypt`

### What It Does

Complete JWT authentication with password hashing, token creation/verification, and FastAPI dependency injection.

### Key Files

- `backend/auth.py` - Full auth implementation

### Configuration Required

```env
JWT_SECRET_KEY=your_secret_key_here
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Code Preview

```python
from datetime import datetime, timedelta
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from jose import JWTError, jwt
import os

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("sub") is None:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid credentials")

def get_current_user_id(token_data: dict = Depends(verify_token)) -> int:
    """Extract user ID from token"""
    return int(token_data.get("sub"))

class AuthUtils:
    @staticmethod
    def validate_password_strength(password: str) -> tuple[bool, str]:
        """Validate password strength requirements"""
        if len(password) < 8:
            return False, "Password must be at least 8 characters"
        if not any(c.isupper() for c in password):
            return False, "Password must contain uppercase letter"
        if not any(c.islower() for c in password):
            return False, "Password must contain lowercase letter"
        if not any(c.isdigit() for c in password):
            return False, "Password must contain number"
        return True, "Password is valid"
```

### Extraction Notes

- Very reusable across FastAPI projects
- Consider adding refresh token support
- Add optional 2FA support

### Toolkit Category

Would go in: `/patterns/auth-jwt/python/`

---

## 9. Auth Manager (TypeScript)

**Type:** Pattern  
**Location:** `frontend/src/utils/auth.ts`  
**Dependencies:** None (vanilla TypeScript)

### What It Does

Client-side authentication state management with localStorage, cookie sync, JWT expiration checking, and role-based access control.

### Key Files

- `frontend/src/utils/auth.ts` - Full implementation

### Code Preview

```typescript
export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  plan: string;
}

export class AuthManager {
  private static readonly TOKEN_KEY = 'access_token';
  private static readonly USER_KEY = 'user_data';

  static setAuth(token: string, user?: User): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.TOKEN_KEY, token);
      if (user) localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      document.cookie = `access_token=${token}; path=/; max-age=86400; secure; samesite=strict`;
    }
  }

  static getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  static getUser(): User | null {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem(this.USER_KEY);
      if (userData) {
        try { return JSON.parse(userData); } catch { return null; }
      }
    }
    return null;
  }

  static isAuthenticated(): boolean {
    if (typeof window !== 'undefined') {
      const token = this.getToken();
      if (!token) return false;

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp < Date.now() / 1000) {
          this.logout();
          return false;
        }
        return true;
      } catch {
        this.logout();
        return false;
      }
    }
    return false;
  }

  static logout(redirectPath?: string): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
      document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      window.location.href = redirectPath 
        ? `/login?redirect=${encodeURIComponent(redirectPath)}`
        : '/login';
    }
  }

  static isAdmin(): boolean {
    return this.getUser()?.role === 'admin';
  }

  static hasPremiumAccess(): boolean {
    const plan = this.getUser()?.plan;
    return plan === 'professional' || plan === 'enterprise';
  }
}
```

### Extraction Notes

- Universal for any React/Next.js app
- Consider adding React Context wrapper
- Add session expiry warning

### Toolkit Category

Would go in: `/patterns/auth-jwt/typescript/`

---

## 10. Admin Role Guard

**Type:** Pattern  
**Location:** `backend/auth.py`  
**Dependencies:** `python-jose`

### What It Does

FastAPI dependency for protecting admin-only routes with role checking from JWT payload.

### Code Preview

```python
def is_admin_role(role: str) -> bool:
    """Check if role string indicates admin access"""
    if not role:
        return False
    r = role.strip().lower()
    return r in ('admin', 'administrator', 'superadmin', 'super_admin')

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Verify admin access from JWT token"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_email: str = payload.get("email")
        user_role: str = payload.get("role")
        
        if user_email is None or not is_admin_role(user_role):
            raise HTTPException(status_code=403, detail="Admin access required")
        return user_email
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid credentials")

# Usage in route:
@router.get("/admin/users")
async def list_users(admin_email: str = Depends(get_current_admin)):
    # Only admins can access this
    pass
```

### Extraction Notes

- Make role names configurable
- Add permission-based guards (not just role)

### Toolkit Category

Would go in: `/patterns/auth-jwt/python/`

---

# Document Generation

---

## 11. PDF Engine (Multi-Backend)

**Type:** Utility  
**Location:** `backend/pdf_engine.py`  
**Dependencies:** `weasyprint`, `httpx`, `playwright` (optional)

### What It Does

Triple-backend PDF rendering with automatic fallback: PDFShift (cloud Chrome), WeasyPrint (local), and Chromium/Playwright (local browser).

### Key Files

- `backend/pdf_engine.py` - Multi-engine orchestrator

### Configuration Required

```env
PDF_ENGINE=auto  # Options: auto, pdfshift, weasyprint, chromium
PDFSHIFT_API_KEY=your_key  # For pdfshift engine
```

### Code Preview

```python
def render_pdf(
    html: str, 
    base_url: Optional[str] = None, 
    page_setup: Optional[Dict[str, str]] = None, 
    engine: str = "auto",
) -> bytes:
    """
    Main PDF rendering with triple engine support.
    
    Engine Selection (when 'auto'):
        1. PDFShift - if API key configured (best quality)
        2. WeasyPrint - fallback (fast, local)
    """
    requested_engine = (engine or os.getenv("PDF_ENGINE") or "auto").lower()
    
    # Auto-select based on configuration
    if requested_engine == "auto":
        from services.pdfshift_service import pdfshift_service
        selected_engine = "pdfshift" if pdfshift_service.is_configured() else "weasyprint"
    else:
        selected_engine = requested_engine
    
    # Default margins for legal documents
    if page_setup is None:
        page_setup = {"top": "0.5in", "right": "0.625in", "bottom": "0.625in", "left": "0.75in"}
    
    # Route to engine
    if selected_engine == "weasyprint":
        from weasyprint import HTML
        return HTML(string=html, base_url=base_url).write_pdf()
    
    elif selected_engine == "pdfshift":
        from services.pdfshift_service import pdfshift_service
        return pdfshift_service.render_pdf_sync(html, {"margin": page_setup})
    
    elif selected_engine in ("chromium", "playwright"):
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_context().new_page()
            page.set_content(html, wait_until="networkidle")
            pdf_bytes = page.pdf(format="Letter", margin=page_setup, print_background=True)
            browser.close()
            return pdf_bytes


async def render_pdf_async(html: str, **kwargs) -> bytes:
    """Async version for PDFShift and thread-pooled local engines"""
    # ... async implementation
```

### Extraction Notes

- Very reusable for any PDF generation needs
- Make paper sizes configurable
- Add watermarking support
- Consider adding merge/split operations

### Toolkit Category

Would go in: `/utilities/pdf-engine/`

---

## 12. Jinja2 Legal Templates

**Type:** Pattern  
**Location:** `templates/`  
**Dependencies:** `jinja2`

### What It Does

Legal document templating system using Jinja2 with CSS for print layout. Includes macros for notary acknowledgments and reusable partials.

### Key Files

- `templates/grant_deed_ca/index.jinja2` - Main template
- `templates/_macros/notary_ack.jinja2` - Reusable macros
- `templates/_partials/notary_acknowledgment.jinja2` - Shared partials

### Code Preview (Template Structure)

```jinja2
{# templates/grant_deed_ca/index.jinja2 #}
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Grant Deed - {{ county }} County, California</title>
  <style>
    @page {
      size: letter;
      margin: 0.5in 0.5in 0.75in 1in;
    }
    
    .recorder-box {
      width: 3.5in;
      height: 2.5in;
      border: 2pt solid #000;
    }
    
    .reference-numbers {
      text-align: right;
      font-size: 10pt;
    }
    
    /* ... more CSS */
  </style>
</head>
<body>
  <header class="header-section">
    <div class="recording-info">
      <div class="recording-label">Recording Requested By:</div>
      <div>{{ requested_by or '' }}</div>
    </div>
    
    <div class="right-column">
      <div class="recorder-box">
        <span>Space Above This Line For Recorder's Use</span>
      </div>
      <div class="reference-numbers">
        <div>Order No.: {{ title_order_no or '' }}</div>
        <div>APN: {{ apn or '' }}</div>
      </div>
    </div>
  </header>
  
  <h1>GRANT DEED</h1>
  
  <p>FOR VALUABLE CONSIDERATION, <strong>{{ grantor }}</strong> hereby GRANTS to
  <strong>{{ grantee }}</strong>{% if vesting %}, {{ vesting }}{% endif %}</p>
  
  <div class="legal-description">{{ legal_description }}</div>
  
  {# Include notary acknowledgment #}
  {% include '_partials/notary_acknowledgment.jinja2' %}
</body>
</html>
```

### Extraction Notes

- Template structure is reusable for any legal documents
- CSS print styles are well-structured
- Separate partials for reusable sections

### Toolkit Category

Would go in: `/patterns/legal-templates/`

---

## 13. QR Code Generator

**Type:** Utility  
**Location:** `backend/utils/qr_generator.py`  
**Dependencies:** `qrcode[pil]`

### What It Does

Generates QR codes as base64 data URLs for embedding in HTML/PDF documents. Used for document verification links.

### Code Preview

```python
import io
import base64
import qrcode

def generate_verification_qr(short_code: str, base_url: str = None) -> str:
    """
    Generate QR code as base64 data URL.
    
    Args:
        short_code: Document short code (e.g., "DOC-2026-A7X9K")
        base_url: Base URL for verification
    
    Returns:
        Base64 data URL: "data:image/png;base64,..."
    """
    if not base_url:
        base_url = os.getenv("FRONTEND_URL", "https://yourapp.com")
    
    verification_url = f"{base_url}/verify/{short_code}"
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(verification_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    return f"data:image/png;base64,{img_base64}"

def generate_verification_url(short_code: str, base_url: str = None) -> str:
    """Generate the verification URL for a document."""
    if not base_url:
        base_url = os.getenv("FRONTEND_URL", "https://yourapp.com")
    return f"{base_url}/verify/{short_code}"
```

### Extraction Notes

- Very reusable for any QR code needs
- Add SVG output option
- Add logo embedding support

### Toolkit Category

Would go in: `/utilities/qr-generator/`

---

## 14. Short Code Generator

**Type:** Utility  
**Location:** `backend/utils/short_code.py`  
**Dependencies:** None (stdlib only)

### What It Does

Human-readable document ID generation with unambiguous characters. Also includes content hashing and name abbreviation utilities.

### Code Preview

```python
import random
import string
import hashlib
from datetime import datetime

def generate_short_code() -> str:
    """
    Generate a human-readable document ID.
    Format: DOC-YYYY-XXXXX
    
    Example: DOC-2026-A7X9K
    
    Uses only unambiguous characters (removes 0, O, I, L, 1)
    """
    year = datetime.now().year
    chars = string.ascii_uppercase + string.digits
    chars = chars.replace('0', '').replace('O', '').replace('I', '').replace('L', '').replace('1', '')
    random_part = ''.join(random.choices(chars, k=5))
    return f"DOC-{year}-{random_part}"

def generate_content_hash(content: str) -> str:
    """Generate SHA-256 hash of content."""
    return hashlib.sha256(content.encode('utf-8')).hexdigest()

def abbreviate_name(name: str) -> str:
    """
    Abbreviate name for privacy display.
    
    Examples:
        "JOHN SMITH" -> "JOHN S."
        "JOHN AND JANE SMITH" -> "JOHN AND JANE S."
    """
    if not name:
        return ""
    
    name = name.strip().upper()
    
    # Handle "AND" in names
    if " AND " in name:
        parts = name.split(" AND ")
        if len(parts) == 2:
            last_part_words = parts[1].strip().split()
            if len(last_part_words) >= 2:
                last_name_initial = last_part_words[-1][0] + "."
                first_names = parts[0].strip() + " AND " + " ".join(last_part_words[:-1])
                return f"{first_names} {last_name_initial}"
    
    parts = name.split()
    if len(parts) >= 2:
        return f"{parts[0]} {parts[-1][0]}."
    
    return name
```

### Extraction Notes

- Universal utility for any document system
- Consider adding collision checking
- Add configurable prefix/format

### Toolkit Category

Would go in: `/utilities/identifiers/`

---

# Frontend Utilities

---

## 15. API Client Wrapper

**Type:** Utility  
**Location:** `frontend/src/lib/api.ts`  
**Dependencies:** None (native fetch)

### What It Does

Simple fetch wrapper with consistent error handling and auth token injection.

### Code Preview

```typescript
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.yourapp.com';

export async function apiGet(path: string, token?: string) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: 'no-store',
  });
  if (!res.ok) {
    const error: any = new Error(`GET ${path} failed: ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export async function apiPost(path: string, body: any, token?: string) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error: any = new Error(`POST ${path} failed: ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}
```

### Extraction Notes

- Add PUT, PATCH, DELETE methods
- Add request/response interceptors
- Add retry logic
- Consider using a library base (axios, ky)

### Toolkit Category

Would go in: `/utilities/api-client/`

---

## 16. AI Helpers (Vesting/Tax)

**Type:** Utility  
**Location:** `frontend/src/lib/ai-helpers.ts`  
**Dependencies:** None (TypeScript only)

### What It Does

Client-side intelligence for real estate forms - analyzes ownership patterns, suggests vesting types, identifies tax exemptions, and validates deed data.

### Code Preview

```typescript
export interface AIContext {
  ownershipType: "single" | "married" | "trust" | "entity" | "multiple" | "unknown"
  flags: string[]
}

export function analyzePropertyContext(property: PropertyData | null): AIContext {
  const context: AIContext = { ownershipType: "unknown", flags: [] }
  if (!property?.owner) return context
  
  const owner = property.owner.toUpperCase()

  if (owner.includes("TRUST") || owner.includes("TRUSTEE")) {
    context.ownershipType = "trust"
    context.flags.push("Property is currently held in a trust")
    return context
  }

  if (owner.includes(" LLC") || owner.includes(" INC") || owner.includes(" CORP")) {
    context.ownershipType = "entity"
    context.flags.push("Property owned by business entity")
    return context
  }

  if (owner.includes("HUSBAND AND WIFE") || owner.includes("H/W")) {
    context.ownershipType = "married"
    return context
  }

  if (owner.includes(" AND ") || owner.includes(" & ")) {
    context.ownershipType = "multiple"
    return context
  }

  context.ownershipType = "single"
  return context
}

export function getVestingSuggestion(
  grantee: string,
  granteeCount: number,
  deedType: string
): VestingSuggestion | null {
  if (!grantee?.trim()) return null
  const granteeLower = grantee.toLowerCase()

  // Trust Pattern
  if (granteeLower.includes("trust") || granteeLower.includes("trustee")) {
    const trustMatch = grantee.match(/(.+(?:TRUST|LIVING TRUST))/i)
    return {
      value: `as Trustee(s) of the ${trustMatch?.[1] || "[TRUST NAME]"}`,
      label: "Trustee of Trust",
      reason: "Grantee appears to be a trust",
      confidence: "high",
    }
  }

  // Married couple with same last name
  if (granteeCount === 2 && grantee.includes(" AND ")) {
    const parts = grantee.split(/\s+AND\s+/i)
    const lastName1 = parts[0]?.trim().split(/\s+/).pop()
    const lastName2 = parts[1]?.trim().split(/\s+/).pop()
    if (lastName1 === lastName2) {
      return {
        value: "husband and wife as community property with right of survivorship",
        label: "Community Property with Survivorship",
        reason: "Grantees share the same last name",
        confidence: "medium",
      }
    }
  }

  // ... more patterns
  return null
}

export function getTransferTaxSuggestion(
  deedType: string,
  grantor: string,
  grantee: string
): TransferTaxSuggestion | null {
  // Interspousal transfers exempt
  if (deedType === "interspousal-transfer") {
    return {
      isExempt: true,
      exemptReason: "R&T 11927",
      reason: "Interspousal transfers are exempt",
      confidence: "high",
    }
  }

  // Transfer to own trust
  if (grantee.toUpperCase().includes("TRUST")) {
    const grantorNames = grantor.toUpperCase().split(/\s+/)
    if (grantorNames.some(name => grantee.toUpperCase().includes(name))) {
      return {
        isExempt: true,
        exemptReason: "R&T 11930",
        reason: "Transfer to grantor's own trust is typically exempt",
        confidence: "high",
      }
    }
  }

  return null
}
```

### Extraction Notes

- Domain-specific (California real estate) but pattern is reusable
- Could be generalized with configurable rules
- Add more state support

### Toolkit Category

Would go in: `/utilities/domain-ai/real-estate/`

---

## 17. AI Assistant Service

**Type:** Utility  
**Location:** `frontend/src/services/aiAssistant.ts`  
**Dependencies:** None (TypeScript + fetch)

### What It Does

Frontend service for AI-powered guidance on deed creation. Provides contextual help for vesting, deed types, legal descriptions, and pre-submit validation.

### Code Preview

```typescript
const SYSTEM_PROMPTS = {
  vestingGuidance: `You are an expert California real estate title officer. 
Your role is to help users understand vesting options when transferring property.
Be concise but thorough. Focus on practical implications:
- Tax consequences
- Estate planning effects
- Rights of survivorship
Respond in 2-3 sentences maximum.`,

  preSubmitReview: `You are an expert California real estate title officer.
Check for:
- Consistency between all fields
- Common errors (single grantee with joint tenancy)
- Missing required information
List any issues. If everything looks good, say so briefly.`,
}

class AIAssistantService {
  private baseUrl = "/api/ai/chat"

  async getVestingGuidance(
    vestingType: string,
    granteeCount: number,
    context: Partial<AIContext>
  ): Promise<AIGuidance | null> {
    const prompt = `Creating a ${context.deedType} with ${granteeCount} grantee(s).
Selected vesting: "${vestingType}"
Explain what this means and flag any concerns.`

    const response = await this.makeRequest(SYSTEM_PROMPTS.vestingGuidance, prompt)

    const isWarning = response.toLowerCase().includes("concern") ||
                      response.toLowerCase().includes("error")

    return {
      type: isWarning ? "warning" : "info",
      field: "vesting",
      title: isWarning ? "Vesting Concern" : "About This Vesting",
      message: response,
    }
  }

  async validateBeforeSubmit(context: AIContext): Promise<AIValidation> {
    const prompt = `Review this deed:
Deed Type: ${context.deedType}
GRANTOR: ${context.grantorName}
GRANTEE: ${context.granteeName}
VESTING: ${context.vesting}
List any issues or say "No issues found."`

    const response = await this.makeRequest(SYSTEM_PROMPTS.preSubmitReview, prompt)

    if (response.toLowerCase().includes("no issues found")) {
      return { isValid: true, issues: [] }
    }

    return {
      isValid: false,
      issues: [{ type: "warning", title: "Pre-Submit Review", message: response }]
    }
  }
}

export const aiAssistant = new AIAssistantService()
```

### Extraction Notes

- Prompts are domain-specific but structure is reusable
- Add streaming support
- Add caching for identical queries

### Toolkit Category

Would go in: `/services/ai-assistant/`

---

## 18. cn() Classname Merge

**Type:** Utility  
**Location:** `frontend/src/lib/utils.ts`  
**Dependencies:** `clsx`, `tailwind-merge`

### What It Does

Standard Tailwind className merging utility. Combines clsx for conditional classes with tailwind-merge for deduplication.

### Code Preview

```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Usage:
<div className={cn(
  "base-class",
  isActive && "active-class",
  variant === "primary" ? "bg-blue-500" : "bg-gray-500"
)} />
```

### Extraction Notes

- Standard Shadcn pattern
- Already widely used

### Toolkit Category

Would go in: `/utilities/tailwind/`

---

# UI Components

---

## 19. Button (CVA Variants)

**Type:** Component  
**Location:** `frontend/src/components/ui/button.tsx`  
**Dependencies:** `@radix-ui/react-slot`, `class-variance-authority`

### What It Does

Shadcn-style button component with variant props (default, destructive, outline, secondary, ghost, link) and sizes.

### Code Preview

```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)

export { Button, buttonVariants }
```

### Extraction Notes

- Standard Shadcn component
- Already highly reusable

### Toolkit Category

Would go in: `/components/ui/button/`

---

## 20. AI Card Component

**Type:** Component  
**Location:** `frontend/src/components/ui/AICard.tsx`  
**Dependencies:** `lucide-react`

### What It Does

AI-themed card component with sparkle icon, dismissible state, expandable details, and action buttons. Used for AI guidance messages.

### Code Preview

```tsx
import { useState, useEffect, ReactNode } from "react"
import { Sparkles, X, HelpCircle } from "lucide-react"

interface AICardProps {
  message: string
  details?: string
  action?: { label: string; onClick: () => void }
  secondaryAction?: { label: string; onClick: () => void }
  dismissible?: boolean
  onDismiss?: () => void
  children?: ReactNode
}

export function AICard({ 
  message, details, action, secondaryAction, dismissible = true, onDismiss, children
}: AICardProps) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  if (dismissed) return null

  const handleDismiss = () => {
    setVisible(false)
    setTimeout(() => { setDismissed(true); onDismiss?.() }, 200)
  }

  return (
    <div className={`
      bg-emerald-50 border border-emerald-200 rounded-xl overflow-hidden
      transform transition-all duration-300 ease-out
      ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
    `}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
          </div>
          <div className="flex-1">
            <p className="text-emerald-800 font-medium">{message}</p>
            {children}
            
            <div className="flex items-center gap-3 mt-3">
              {action && (
                <button onClick={action.onClick} className="bg-emerald-600 text-white px-4 py-2 rounded-lg">
                  <Sparkles className="w-4 h-4" />
                  {action.label}
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {details && (
              <button onClick={() => setShowDetails(!showDetails)} className="p-1.5 text-emerald-400">
                <HelpCircle className="w-4 h-4" />
              </button>
            )}
            {dismissible && (
              <button onClick={handleDismiss} className="p-1.5 text-emerald-400">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {details && (
        <div className={`bg-emerald-100/50 border-t transition-all ${showDetails ? 'max-h-48' : 'max-h-0'}`}>
          <p className="p-4 text-sm text-emerald-700">{details}</p>
        </div>
      )}
    </div>
  )
}
```

### Extraction Notes

- Make colors/theme configurable
- Add more animation options
- Consider using Framer Motion

### Toolkit Category

Would go in: `/components/ai/AICard/`

---

## 21. Input Underline

**Type:** Component  
**Location:** `frontend/src/components/ui/InputUnderline.tsx`  
**Dependencies:** None

### What It Does

Minimalist underline-style input with optional label, hint text, and right slot for icons/buttons.

### Code Preview

```tsx
import * as React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  rightSlot?: React.ReactNode;
};

export default function InputUnderline({ label, hint, rightSlot, className, ...props }: Props) {
  const baseClasses = [
    "w-full bg-transparent outline-none border-0 border-b",
    "border-neutral-300 focus:border-neutral-900",
    "placeholder:opacity-60 py-2 transition-colors"
  ].join(" ");

  return (
    <label className="block">
      {label && <span className="block text-sm font-medium mb-1">{label}</span>}
      <div className="flex items-center gap-2">
        <input {...props} className={`${baseClasses} ${className || ''}`} />
        {rightSlot}
      </div>
      {hint && <p className="text-xs opacity-70 mt-1">{hint}</p>}
    </label>
  );
}
```

### Extraction Notes

- Clean, minimal component
- Add error state
- Add focus ring option

### Toolkit Category

Would go in: `/components/ui/input/`

---

## 22. Money Input

**Type:** Component  
**Location:** `frontend/src/components/ui/MoneyInput.tsx`  
**Dependencies:** `InputUnderline`

### What It Does

Currency input with proper input mode for mobile keyboards and dollar sign suffix.

### Code Preview

```tsx
import * as React from "react";
import InputUnderline from "./InputUnderline";

export default function MoneyInput(props: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <InputUnderline
      {...props}
      inputMode="decimal"
      pattern="[0-9]*[.,]?[0-9]*"
      rightSlot={<span className="text-sm opacity-70">$</span>}
    />
  );
}
```

### Extraction Notes

- Add currency formatting on blur
- Add locale support
- Add currency symbol options

### Toolkit Category

Would go in: `/components/ui/input/`

---

## 23. Vesting Input

**Type:** Component  
**Location:** `frontend/src/components/ui/VestingInput.tsx`  
**Dependencies:** `lucide-react`, AI service

### What It Does

Real estate vesting selector with common California options, custom input support, trust name handling, and optional AI guidance integration.

### Code Preview

```tsx
const COMMON_VESTING_OPTIONS = [
  {
    value: "joint_tenants",
    label: "Joint Tenants with Right of Survivorship",
    description: "Equal ownership, automatically transfers to survivor",
    shortLabel: "Joint Tenants",
  },
  {
    value: "community_property",
    label: "Community Property",
    description: "Married couples, equal ownership",
    shortLabel: "Community Property",
  },
  {
    value: "community_property_survivorship",
    label: "Community Property with Right of Survivorship",
    description: "Married couples, avoids probate",
    shortLabel: "Community Property w/ Survivorship",
  },
  {
    value: "trust",
    label: "As Trustee of [Trust Name]",
    description: "Property held in trust",
    requiresInput: true,
    inputPlaceholder: "Enter trust name",
  },
  // ... more options
]

export default function VestingInput({
  value,
  onChange,
  showAIGuidance = false,
  granteeCount = 1,
  deedType = "Grant Deed",
}: VestingInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [trustName, setTrustName] = useState("")
  const [guidance, setGuidance] = useState<AIGuidance | null>(null)

  // Debounced AI guidance
  useEffect(() => {
    if (!showAIGuidance || !value) return
    
    const timer = setTimeout(async () => {
      const result = await aiAssistant.getVestingGuidance(value, granteeCount, { deedType })
      setGuidance(result)
    }, 800)
    
    return () => clearTimeout(timer)
  }, [value, granteeCount, deedType, showAIGuidance])

  return (
    <div className="relative">
      {/* Dropdown trigger */}
      <button onClick={() => setIsOpen(!isOpen)} className="w-full px-4 py-3 text-left rounded-lg border-2">
        {displayValue || "Select vesting type..."}
        <ChevronDown className={`w-5 h-5 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border max-h-96 overflow-y-auto">
          {COMMON_VESTING_OPTIONS.map((option) => (
            <div key={option.value}>
              <button onClick={() => handleSelect(option)} className="w-full px-4 py-3 text-left">
                <div className="font-medium">{option.shortLabel}</div>
                <div className="text-sm text-gray-500">{option.description}</div>
              </button>
              
              {/* Inline input for trust/custom */}
              {selectedType === option.value && option.requiresInput && (
                <input
                  value={option.value === "trust" ? trustName : customValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder={option.inputPlaceholder}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* AI Guidance */}
      {showAIGuidance && guidance && <AIGuidance guidance={guidance} />}
    </div>
  )
}
```

### Extraction Notes

- Domain-specific (California real estate)
- Make vesting options configurable
- Extract dropdown pattern separately

### Toolkit Category

Would go in: `/components/domain/real-estate/`

---

# Data Models & Patterns

---

## 24. Property Data Model

**Type:** Pattern  
**Location:** `backend/models/property_data.py`  
**Dependencies:** `pydantic`

### What It Does

Comprehensive Pydantic models for property data with sensible defaults, nested owner information, and search result handling (single match, multi-match, not found).

### Code Preview

```python
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class PropertyOwner(BaseModel):
    """Structured owner information"""
    full_name: str = ""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    mailing_address: Optional[str] = None
    mailing_city: Optional[str] = None
    mailing_state: Optional[str] = None
    mailing_zip: Optional[str] = None

class PropertyData(BaseModel):
    """Normalized property data with all fields having defaults"""
    # Core identifiers
    apn: str = Field(default="", description="Assessor Parcel Number")
    fips: str = Field(default="", description="FIPS county code")
    
    # Location
    address: str = Field(default="", description="Full street address")
    city: str = ""
    state: str = "CA"
    zip_code: str = ""
    county: str = Field(default="", description="County name")
    
    # Legal
    legal_description: str = Field(default="", description="Brief legal description")
    subdivision_name: Optional[str] = None
    tract_number: Optional[str] = None
    lot_number: Optional[str] = None
    
    # Ownership
    primary_owner: PropertyOwner = Field(default_factory=PropertyOwner)
    secondary_owner: Optional[PropertyOwner] = None
    vesting_type: Optional[str] = None
    
    # Property details
    property_type: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    square_feet: Optional[int] = None
    year_built: Optional[int] = None
    
    # Valuation
    assessed_value: Optional[int] = None
    market_value: Optional[int] = None
    
    # Metadata
    enrichment_source: str = "sitex"
    enrichment_timestamp: datetime = Field(default_factory=datetime.utcnow)
    confidence_score: float = 1.0

class PropertyMatch(BaseModel):
    """Single match candidate for multi-match scenarios"""
    address: str
    city: str = ""
    apn: str = ""
    fips: str = ""
    owner_name: str = ""

class PropertySearchResult(BaseModel):
    """Result from property search (success, multi_match, not_found, error)"""
    status: str
    data: Optional[PropertyData] = None
    matches: Optional[List[PropertyMatch]] = None
    message: str = ""
    match_count: int = 0
```

### Extraction Notes

- Great template for any property/address data
- Make fields configurable per data source
- Add validation rules

### Toolkit Category

Would go in: `/models/property/`

---

## 25. OAuth Token Manager

**Type:** Pattern  
**Location:** `backend/services/sitex_service.py`  
**Dependencies:** `asyncio`, `httpx`

### What It Does

Thread-safe async OAuth2 token management with proactive refresh before expiry.

### Code Preview

```python
import asyncio
from datetime import datetime, timedelta

class OAuthTokenManager:
    """Thread-safe OAuth token management with proactive refresh"""
    
    def __init__(self, token_url: str, client_id: str, client_secret: str):
        self.token_url = token_url
        self.client_id = client_id
        self.client_secret = client_secret
        self._token: Optional[str] = None
        self._expiry: datetime = datetime.min
        self._lock = asyncio.Lock()
        self._refresh_buffer = timedelta(seconds=60)
    
    async def get_token(self) -> str:
        """Get valid token, refreshing if needed"""
        async with self._lock:
            if self._is_token_valid():
                return self._token
            return await self._refresh_token()
    
    def _is_token_valid(self) -> bool:
        return (
            self._token is not None 
            and datetime.utcnow() < (self._expiry - self._refresh_buffer)
        )
    
    async def _refresh_token(self) -> str:
        """Request new OAuth token"""
        import base64
        import httpx
        
        credentials = f"{self.client_id}:{self.client_secret}"
        basic_auth = base64.b64encode(credentials.encode()).decode()
        
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                self.token_url,
                headers={
                    "Authorization": f"Basic {basic_auth}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data={"grant_type": "client_credentials"},
            )
            response.raise_for_status()
            data = response.json()
            
            self._token = data["access_token"]
            expires_in = data.get("expires_in", 600)
            self._expiry = datetime.utcnow() + timedelta(seconds=expires_in)
            
            return self._token
```

### Extraction Notes

- Very reusable for any OAuth2 API
- Add support for different grant types
- Add token refresh callback

### Toolkit Category

Would go in: `/patterns/oauth/`

---

## 26. Multi-Path Field Extraction

**Type:** Pattern  
**Location:** `backend/services/sitex_service.py`  
**Dependencies:** None

### What It Does

Utility for extracting values from nested dictionaries with multiple fallback paths. Essential for parsing inconsistent API responses.

### Code Preview

```python
def _get_nested(self, obj: Dict, paths: List[str], default: Any = None) -> Any:
    """
    Try multiple field paths, return first found value.
    
    Example:
        _get_nested(data, ["SiteCity", "City", "PropertyCity"])
        # Returns value from first path that exists
    """
    for path in paths:
        value = obj.get(path)
        if value is not None and value != "":
            return value
    return default

def _extract_nested_value(self, data: dict, path: list) -> str:
    """
    Extract nested value from dictionary using path list.
    Handles various XML-to-dict text representations.
    
    Example:
        _extract_nested_value(data, ["PropertyProfile", "OwnerName", "Primary"])
    """
    current = data
    for key in path:
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return ''
    
    # Handle different text representations
    if isinstance(current, dict):
        if '#text' in current:
            return str(current['#text']).strip()
        elif '@text' in current:
            return str(current['@text']).strip()
        # Look for any string value
        for v in current.values():
            if isinstance(v, str) and v.strip():
                return v.strip()
        return ''
    
    return str(current).strip() if current else ''
```

### Extraction Notes

- Universal utility for API response parsing
- Add dot notation support ("a.b.c")
- Add array index support

### Toolkit Category

Would go in: `/utilities/data-extraction/`

---

# Summary

## High-Value Extractions (Priority Order)

1. **SiteX Property Client** - Complete OAuth + caching + multi-match
2. **PDF Engine (Multi-Backend)** - Universal document generation
3. **JWT Auth System** - Both Python & TypeScript implementations
4. **OAuth Token Manager** - Reusable async token handling
5. **PDFShift Client** - Cloud PDF generation
6. **Property Data Model** - Comprehensive Pydantic models
7. **API Client Wrapper** - Simple fetch abstraction
8. **AI Helpers** - Domain-specific but pattern is reusable
9. **Stripe Webhooks** - Complete payment event handling
10. **Google Places Client** - Address validation

## Package Structure Recommendation

```
/toolkit
├── /integrations
│   ├── /sitex
│   ├── /pdfshift
│   ├── /titlepoint
│   ├── /google-places
│   ├── /sendgrid
│   ├── /stripe
│   └── /openai
├── /patterns
│   ├── /auth-jwt
│   │   ├── /python
│   │   └── /typescript
│   ├── /oauth
│   └── /legal-templates
├── /utilities
│   ├── /pdf-engine
│   ├── /qr-generator
│   ├── /identifiers
│   ├── /data-extraction
│   ├── /api-client
│   └── /domain-ai
├── /components
│   ├── /ui
│   └── /ai
└── /models
    └── /property
```
