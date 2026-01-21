# DeedPro Public API Specification
> **Version 1.0** — Production-Ready API for Deed Generation

---

## Overview

The DeedPro API allows authorized partners to programmatically generate California deed documents. Each generated deed receives a unique document ID, QR code for verification, and is stored for retrieval.

**Base URL:** `https://deedpro-main-api.onrender.com/api/v1`

---

## Authentication

All API requests require an API key passed in the header:

```
Authorization: Bearer dp_live_xxxxxxxxxxxxxxxxxxxx
```

**Key Format:**
- Live keys: `dp_live_` prefix
- Test keys: `dp_test_` prefix (sandbox, no real documents)

**Key Storage:** API keys are stored in the `api_keys` table, hashed with bcrypt.

---

## Rate Limiting

| Plan | Requests/Hour | Requests/Day |
|------|---------------|--------------|
| Standard | 100 | 1,000 |
| Professional | 500 | 5,000 |
| Enterprise | Unlimited | Unlimited |

Rate limit headers included in every response:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706054400
```

---

## Endpoints

### 1. Generate Deed

**`POST /api/v1/deeds`**

Generate a new deed document.

#### Request

```json
{
  "deed_type": "grant_deed",
  "property": {
    "address": "123 Main Street",
    "city": "Los Angeles",
    "state": "CA",
    "zip": "90001",
    "county": "Los Angeles",
    "apn": "5432-001-012",
    "legal_description": "LOT 1 OF TRACT NO. 12345, IN THE CITY OF LOS ANGELES..."
  },
  "grantor": {
    "name": "JOHN SMITH AND JANE SMITH, HUSBAND AND WIFE",
    "address": {
      "line1": "456 Oak Avenue",
      "city": "Los Angeles",
      "state": "CA",
      "zip": "90002"
    }
  },
  "grantee": {
    "name": "ROBERT JOHNSON, A SINGLE MAN",
    "vesting": "a single man"
  },
  "transfer_tax": {
    "exempt": false,
    "value": 750000,
    "computed_amount": "825.00",
    "basis": "full_value",
    "city_tax": true,
    "city_name": "Los Angeles"
  },
  "recording": {
    "requested_by": "ABC Title Company",
    "return_to": {
      "name": "Jane Doe",
      "company": "ABC Title Company",
      "address": "789 Business Blvd, Suite 100",
      "city": "Los Angeles",
      "state": "CA",
      "zip": "90003"
    },
    "title_order_no": "TO-2026-12345",
    "escrow_no": "ESC-2026-67890"
  },
  "options": {
    "include_notary_page": true,
    "include_qr_code": true
  }
}
```

#### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `deed_type` | string | Yes | One of: `grant_deed`, `quitclaim_deed`, `interspousal_transfer`, `warranty_deed`, `tax_deed` |
| `property.address` | string | Yes | Street address |
| `property.city` | string | Yes | City name |
| `property.state` | string | Yes | State (must be "CA") |
| `property.zip` | string | Yes | ZIP code |
| `property.county` | string | Yes | County name |
| `property.apn` | string | Yes | Assessor's Parcel Number |
| `property.legal_description` | string | Yes | Full legal description |
| `grantor.name` | string | Yes | Grantor name(s), uppercase |
| `grantor.address` | object | No | Grantor mailing address |
| `grantee.name` | string | Yes | Grantee name(s), uppercase |
| `grantee.vesting` | string | Yes | Vesting clause (e.g., "a married couple as joint tenants") |
| `transfer_tax.exempt` | boolean | Yes | Is transfer tax exempt? |
| `transfer_tax.exempt_code` | string | If exempt | R&T code (e.g., "R&T 11927") |
| `transfer_tax.value` | number | If not exempt | Transfer value in dollars |
| `transfer_tax.computed_amount` | string | If not exempt | Computed tax amount |
| `transfer_tax.basis` | string | If not exempt | `full_value` or `less_liens` |
| `transfer_tax.city_tax` | boolean | If not exempt | Does city tax apply? |
| `transfer_tax.city_name` | string | If city_tax | City name |
| `recording.requested_by` | string | Yes | Name of requesting party |
| `recording.return_to` | object | Yes | Return address for recorded document |
| `recording.title_order_no` | string | No | Title order number |
| `recording.escrow_no` | string | No | Escrow number |
| `options.include_notary_page` | boolean | No | Include notary acknowledgment (default: true) |
| `options.include_qr_code` | boolean | No | Include QR verification code (default: true) |

#### Response (Success)

```json
{
  "success": true,
  "data": {
    "deed_id": "deed_abc123def456",
    "document_id": "DOC-2026-A7X9K",
    "deed_type": "grant_deed",
    "status": "completed",
    "created_at": "2026-01-21T15:30:00Z",
    "urls": {
      "pdf": "https://deedpro-main-api.onrender.com/api/v1/deeds/deed_abc123def456/pdf",
      "verification": "https://deedpro.com/verify/DOC-2026-A7X9K"
    },
    "property": {
      "address": "123 Main Street, Los Angeles, CA 90001",
      "apn": "5432-001-012",
      "county": "Los Angeles"
    },
    "parties": {
      "grantor": "JOHN SMITH AND JANE SMITH",
      "grantee": "ROBERT JOHNSON"
    },
    "transfer_tax": {
      "amount": "$825.00",
      "exempt": false
    }
  }
}
```

#### Response (Error)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "field": "property.apn",
        "message": "APN is required"
      },
      {
        "field": "grantee.vesting",
        "message": "Vesting clause is required"
      }
    ]
  }
}
```

---

### 2. Get Deed

**`GET /api/v1/deeds/{deed_id}`**

Retrieve deed metadata and status.

#### Response

```json
{
  "success": true,
  "data": {
    "deed_id": "deed_abc123def456",
    "document_id": "DOC-2026-A7X9K",
    "deed_type": "grant_deed",
    "status": "completed",
    "created_at": "2026-01-21T15:30:00Z",
    "urls": {
      "pdf": "https://deedpro-main-api.onrender.com/api/v1/deeds/deed_abc123def456/pdf",
      "verification": "https://deedpro.com/verify/DOC-2026-A7X9K"
    },
    "property": {
      "address": "123 Main Street, Los Angeles, CA 90001",
      "apn": "5432-001-012",
      "county": "Los Angeles"
    },
    "parties": {
      "grantor": "JOHN SMITH AND JANE SMITH",
      "grantee": "ROBERT JOHNSON"
    }
  }
}
```

---

### 3. Download PDF

**`GET /api/v1/deeds/{deed_id}/pdf`**

Download the generated PDF document.

#### Response

- **Content-Type:** `application/pdf`
- **Content-Disposition:** `attachment; filename="DOC-2026-A7X9K.pdf"`

Returns the PDF binary directly.

---

### 4. List Deeds

**`GET /api/v1/deeds`**

List all deeds created by your API key.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page (max 100) |
| `deed_type` | string | all | Filter by deed type |
| `status` | string | all | Filter by status |
| `from_date` | string | — | Filter from date (ISO 8601) |
| `to_date` | string | — | Filter to date (ISO 8601) |

#### Response

```json
{
  "success": true,
  "data": {
    "deeds": [
      {
        "deed_id": "deed_abc123def456",
        "document_id": "DOC-2026-A7X9K",
        "deed_type": "grant_deed",
        "status": "completed",
        "created_at": "2026-01-21T15:30:00Z",
        "property_address": "123 Main Street, Los Angeles, CA 90001"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "total_pages": 8
    }
  }
}
```

---

### 5. Verify Document

**`GET /api/v1/verify/{document_id}`**

Public endpoint (no auth required) to verify document authenticity.

#### Response

```json
{
  "valid": true,
  "document": {
    "document_id": "DOC-2026-A7X9K",
    "deed_type": "Grant Deed",
    "status": "active",
    "created_at": "2026-01-21T15:30:00Z",
    "property": {
      "address": "123 Main Street, Los Angeles, CA 90001",
      "county": "Los Angeles"
    },
    "parties": {
      "grantor": "JOHN S.",
      "grantee": "ROBERT J."
    }
  }
}
```

---

### 6. Calculate Transfer Tax

**`POST /api/v1/transfer-tax/calculate`**

Calculate documentary transfer tax for a given value and location.

#### Request

```json
{
  "value": 750000,
  "city": "Los Angeles",
  "county": "Los Angeles",
  "less_liens": 0
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "taxable_value": 750000,
    "county_tax": 825.00,
    "city_tax": 3375.00,
    "total_tax": 4200.00,
    "breakdown": {
      "county": {
        "name": "Los Angeles County",
        "rate": "$1.10 per $1,000",
        "amount": 825.00
      },
      "city": {
        "name": "Los Angeles",
        "rate": "$4.50 per $1,000",
        "amount": 3375.00,
        "notes": "Measure ULA may apply for properties over $5M"
      }
    }
  }
}
```

---

### 7. Property Lookup (Optional Add-on)

**`POST /api/v1/property/lookup`**

Look up property details from address.

#### Request

```json
{
  "address": "123 Main Street",
  "city": "Los Angeles",
  "state": "CA",
  "zip": "90001"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "address": "123 MAIN STREET",
    "city": "LOS ANGELES",
    "state": "CA",
    "zip": "90001",
    "county": "Los Angeles",
    "apn": "5432-001-012",
    "legal_description": "LOT 1 OF TRACT NO. 12345...",
    "owner": "SMITH JOHN AND JANE",
    "property_type": "Single Family Residence"
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing API key |
| `FORBIDDEN` | 403 | API key doesn't have permission |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `NOT_FOUND` | 404 | Resource not found |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Database Schema

### API Keys Table

```sql
CREATE TABLE api_keys (
    id SERIAL PRIMARY KEY,
    key_prefix VARCHAR(12) UNIQUE NOT NULL,     -- "dp_live_abc1" (for lookup)
    key_hash VARCHAR(255) NOT NULL,              -- bcrypt hash of full key
    name VARCHAR(255) NOT NULL,                  -- "ABC Title Company"
    organization_id INTEGER REFERENCES organizations(id),
    
    -- Permissions
    scopes TEXT[] DEFAULT ARRAY['deeds:create', 'deeds:read'],
    
    -- Rate limiting
    rate_limit_hour INTEGER DEFAULT 100,
    rate_limit_day INTEGER DEFAULT 1000,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_test BOOLEAN DEFAULT false,              -- Test mode (no real docs)
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
```

### API Deeds Table (separate from user deeds)

```sql
CREATE TABLE api_deeds (
    id SERIAL PRIMARY KEY,
    deed_id VARCHAR(50) UNIQUE NOT NULL,        -- "deed_abc123def456"
    document_id VARCHAR(20) UNIQUE NOT NULL,    -- "DOC-2026-A7X9K"
    
    -- API Key reference
    api_key_id INTEGER REFERENCES api_keys(id),
    
    -- Deed data
    deed_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'completed',
    
    -- Property
    property_address TEXT,
    property_city VARCHAR(100),
    property_county VARCHAR(100),
    property_apn VARCHAR(50),
    
    -- Parties (abbreviated for display)
    grantor_name TEXT,
    grantee_name TEXT,
    
    -- Transfer tax
    transfer_tax_amount DECIMAL(10,2),
    transfer_tax_exempt BOOLEAN DEFAULT false,
    
    -- Storage
    pdf_data BYTEA,                              -- Stored PDF
    request_data JSONB,                          -- Original request
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Link to verification system
    authenticity_id INTEGER REFERENCES document_authenticity(id)
);

CREATE INDEX idx_api_deeds_deed_id ON api_deeds(deed_id);
CREATE INDEX idx_api_deeds_document_id ON api_deeds(document_id);
CREATE INDEX idx_api_deeds_api_key ON api_deeds(api_key_id);
```

### API Usage Log

```sql
CREATE TABLE api_usage_log (
    id SERIAL PRIMARY KEY,
    api_key_id INTEGER REFERENCES api_keys(id),
    endpoint VARCHAR(100),
    method VARCHAR(10),
    status_code INTEGER,
    response_time_ms INTEGER,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_api_usage_key ON api_usage_log(api_key_id);
CREATE INDEX idx_api_usage_created ON api_usage_log(created_at);
```

---

## Implementation Files

### Backend (FastAPI)

```
backend/
├── routers/
│   └── api_v1/
│       ├── __init__.py
│       ├── router.py           # Main v1 router
│       ├── auth.py             # API key validation
│       ├── deeds.py            # Deed endpoints
│       ├── transfer_tax.py     # Tax calculation
│       ├── property.py         # Property lookup
│       └── verify.py           # Public verification
├── middleware/
│   └── rate_limit.py           # Rate limiting middleware
├── schemas/
│   └── api_v1/
│       ├── deeds.py            # Pydantic models
│       └── responses.py        # Response models
└── utils/
    └── api_keys.py             # Key generation/validation
```

### Key Files to Create

1. **`routers/api_v1/router.py`** — Main router with all endpoints
2. **`routers/api_v1/auth.py`** — API key validation dependency
3. **`routers/api_v1/deeds.py`** — Deed generation logic
4. **`middleware/rate_limit.py`** — Rate limiting
5. **`schemas/api_v1/deeds.py`** — Request/response models
6. **`utils/api_keys.py`** — Key generation utilities

---

## API Key Generation

```python
import secrets
import bcrypt

def generate_api_key(is_test: bool = False) -> tuple[str, str, str]:
    """
    Generate a new API key.
    Returns: (full_key, prefix, hash)
    """
    prefix = "dp_test_" if is_test else "dp_live_"
    random_part = secrets.token_urlsafe(24)  # 32 chars
    full_key = f"{prefix}{random_part}"
    
    # Store only prefix + hash
    key_prefix = full_key[:16]  # "dp_live_abc12345"
    key_hash = bcrypt.hashpw(full_key.encode(), bcrypt.gensalt()).decode()
    
    return full_key, key_prefix, key_hash


def validate_api_key(full_key: str, stored_hash: str) -> bool:
    """Validate an API key against its stored hash."""
    return bcrypt.checkpw(full_key.encode(), stored_hash.encode())
```

---

## Rate Limiting Implementation

```python
from fastapi import Request, HTTPException
from datetime import datetime, timedelta
import redis

class RateLimiter:
    def __init__(self, redis_client):
        self.redis = redis_client
    
    async def check_rate_limit(
        self, 
        api_key_id: int, 
        limit_hour: int, 
        limit_day: int
    ) -> dict:
        now = datetime.utcnow()
        hour_key = f"rate:{api_key_id}:hour:{now.strftime('%Y%m%d%H')}"
        day_key = f"rate:{api_key_id}:day:{now.strftime('%Y%m%d')}"
        
        # Increment counters
        hour_count = await self.redis.incr(hour_key)
        day_count = await self.redis.incr(day_key)
        
        # Set expiry
        await self.redis.expire(hour_key, 3600)
        await self.redis.expire(day_key, 86400)
        
        # Check limits
        if hour_count > limit_hour:
            raise HTTPException(
                status_code=429,
                detail={"code": "RATE_LIMITED", "message": "Hourly rate limit exceeded"}
            )
        
        if day_count > limit_day:
            raise HTTPException(
                status_code=429,
                detail={"code": "RATE_LIMITED", "message": "Daily rate limit exceeded"}
            )
        
        return {
            "limit": limit_hour,
            "remaining": limit_hour - hour_count,
            "reset": int((now + timedelta(hours=1)).timestamp())
        }
```

---

## Admin Integration

Unhide the Partners tab and enhance it for API key management:

```typescript
// featureFlags.ts
PARTNERS_TAB: true,  // Re-enable when API launches
```

**Partners/API Keys Admin Features:**
- Create new API keys
- View usage statistics
- Revoke keys
- Set rate limits
- View request logs

---

## Webhook Support (Future)

```json
POST https://partner-webhook-url.com/deedpro

{
  "event": "deed.created",
  "timestamp": "2026-01-21T15:30:00Z",
  "data": {
    "deed_id": "deed_abc123def456",
    "document_id": "DOC-2026-A7X9K",
    "status": "completed"
  }
}
```

---

## OpenAPI Spec Location

After implementation, generate OpenAPI spec:

```
GET /api/v1/openapi.json
```

Swagger UI:
```
GET /api/v1/docs
```

---

## Testing

### Test Mode

API keys with `dp_test_` prefix:
- Generate real PDFs but don't store permanently
- Don't create verification records
- Don't count toward billing
- Marked clearly as "TEST" in responses

### Sample Test Request

```bash
curl -X POST https://deedpro-main-api.onrender.com/api/v1/deeds \
  -H "Authorization: Bearer dp_test_xxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "deed_type": "grant_deed",
    "property": {
      "address": "123 Test Street",
      "city": "Los Angeles",
      "state": "CA",
      "zip": "90001",
      "county": "Los Angeles",
      "apn": "0000-000-000",
      "legal_description": "TEST LEGAL DESCRIPTION"
    },
    "grantor": { "name": "TEST GRANTOR" },
    "grantee": { "name": "TEST GRANTEE", "vesting": "a test entity" },
    "transfer_tax": { "exempt": true, "exempt_code": "R&T 11911" },
    "recording": {
      "requested_by": "Test Company",
      "return_to": {
        "name": "Test Person",
        "company": "Test Company",
        "address": "123 Test St",
        "city": "Los Angeles",
        "state": "CA",
        "zip": "90001"
      }
    }
  }'
```

---

## Implementation Checklist

### Phase 1: Core API
- [ ] Create `api_keys` table
- [ ] Create `api_deeds` table
- [ ] Create `api_usage_log` table
- [ ] Implement API key generation
- [ ] Implement API key validation middleware
- [ ] Create `POST /api/v1/deeds` endpoint
- [ ] Create `GET /api/v1/deeds/{id}` endpoint
- [ ] Create `GET /api/v1/deeds/{id}/pdf` endpoint
- [ ] Create `GET /api/v1/deeds` (list) endpoint
- [ ] Integrate with document_authenticity (QR codes)

### Phase 2: Supporting Endpoints
- [ ] Create `POST /api/v1/transfer-tax/calculate` endpoint
- [ ] Create `GET /api/v1/verify/{document_id}` endpoint (public)
- [ ] Create `POST /api/v1/property/lookup` endpoint (optional)

### Phase 3: Rate Limiting & Logging
- [ ] Implement rate limiting (in-memory or Redis)
- [ ] Log all API requests
- [ ] Add rate limit headers to responses

### Phase 4: Admin UI
- [ ] Re-enable Partners tab
- [ ] API key creation UI
- [ ] Usage statistics dashboard
- [ ] Request log viewer

### Phase 5: Documentation
- [ ] Generate OpenAPI spec
- [ ] Enable Swagger UI at `/api/v1/docs`
- [ ] Write developer documentation

---

## Summary

This API design:
1. ✅ Returns structured JSON with PDF URL (Option B)
2. ✅ Integrates with QR verification system
3. ✅ Tracks all usage for analytics
4. ✅ Supports rate limiting per partner
5. ✅ Has test mode for development
6. ✅ Is acquisition-ready (clean, documented, scalable)

**Ready for Cursor to implement!**
