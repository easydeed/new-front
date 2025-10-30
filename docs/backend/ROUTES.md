# 🗺️ Backend API Routes Reference

**Last Updated**: October 30, 2025  
**Purpose**: Complete reference for all DeedPro backend API endpoints

---

## 📋 **TABLE OF CONTENTS**

1. [Authentication & Users](#authentication--users)
2. [Property Integration](#property-integration)
3. [PDF Generation](#pdf-generation)
4. [Partners](#partners)
5. [Admin & Analytics](#admin--analytics)
6. [Payments & Billing](#payments--billing)

---

## 🔐 **Authentication & Users**

### **POST `/users/register`**
**Purpose**: Create new user account  
**Auth**: None  
**Request**:
```json
{
  "email": "user@example.com",
  "password": "securepass123",
  "full_name": "John Doe"
}
```
**Response**: `{ "id": 1, "email": "...", "access_token": "..." }`

---

### **POST `/users/login`**
**Purpose**: Authenticate user and get JWT token  
**Auth**: None  
**Request**:
```json
{
  "email": "user@example.com",
  "password": "securepass123"
}
```
**Response**: `{ "access_token": "...", "token_type": "bearer" }`

---

### **GET `/users/profile`**
**Purpose**: Get current user profile  
**Auth**: Required (Bearer token)  
**Response**: `{ "id": 1, "email": "...", "full_name": "...", "role": "user" }`

---

## 🏠 **Property Integration**

### **POST `/api/property/validate`**
**Purpose**: Validate address using Google Places API  
**Auth**: Required  
**Request**:
```json
{
  "address": "1358 5th St, La Verne, CA 91750"
}
```
**Response**:
```json
{
  "success": true,
  "fullAddress": "1358 5th St, La Verne, CA 91750, USA",
  "placeId": "ChIJ...",
  "street": "1358 5th Street",
  "city": "La Verne",
  "state": "CA",
  "zip": "91750"
}
```

---

### **POST `/api/property/enrich`**
**Purpose**: Enrich property with SiteX data  
**Auth**: Required  
**File**: `backend/api/property_endpoints.py`  
**Request**:
```json
{
  "placeId": "ChIJ...",
  "fullAddress": "1358 5th St, La Verne, CA 91750, USA"
}
```

**Response** (Phase 16 Updated):
```json
{
  "success": true,
  "apn": "8381-021-001",
  "county": "LOS ANGELES",  // ← Phase 19: From CountyName field
  "legalDescription": "TRACT NO 6654 LOT 44",  // ← Phase 16: From LegalDescriptionInfo.LegalBriefDescription
  "currentOwnerPrimary": "HERNANDEZ GERARDO J; MENDOZA YESSICA S",
  "propertyType": "Single Family Residence"
}
```

**Key Fields** (Phase 16-19 Discoveries):
- ✅ **County**: Extracted from `CountyName` or `SiteCountyName` (NOT `County`)
- ✅ **Legal Description**: Extracted from `LegalDescriptionInfo.LegalBriefDescription` (NOT `LegalDescription`)
- ✅ **Owner**: From `OwnerInformation.OwnerFullName`

**See**: [docs/wizard/SITEX_FIELD_MAPPING.md](../wizard/SITEX_FIELD_MAPPING.md) for complete field reference

---

### **POST `/api/property/sitex/address-search`**
**Purpose**: Direct SiteX address search (production flow)  
**Auth**: Required  
**Request**:
```json
{
  "address": {
    "street": "1358 5th Street",
    "city": "La Verne",
    "state": "CA",
    "zip": "91750"
  }
}
```

---

### **POST `/api/property/sitex/apn-search`**
**Purpose**: Direct SiteX APN lookup  
**Auth**: Required  
**Request**:
```json
{
  "apn": "8381-021-001",
  "county": "Los Angeles"
}
```

---

## 📄 **PDF Generation**

### **POST `/api/generate/grant-deed-ca`**
**Purpose**: Generate Grant Deed (California) PDF  
**Auth**: Required  
**File**: `backend/routers/deeds.py`  
**Template**: `templates/grant_deed_ca/index.jinja2`  
**Request**:
```json
{
  "requested_by": "Pacific Coast Title",
  "apn": "8381-021-001",
  "county": "LOS ANGELES",
  "property_address": "1358 5th St, La Verne, CA 91750, USA",
  "legal_description": "TRACT NO 6654 LOT 44",
  "grantors_text": "HERNANDEZ GERARDO J; MENDOZA YESSICA S",
  "grantees_text": "JOHN SMITH"
}
```
**Response**: PDF bytes (StreamingResponse)

---

### **POST `/api/generate/quitclaim-deed-ca`**
**Purpose**: Generate Quitclaim Deed (California) PDF  
**Auth**: Required  
**File**: `backend/routers/deeds_extra.py`  
**Template**: `templates/quitclaim_deed_ca/index.jinja2`  
**Added**: Phase 17-19  
**Request**: Same structure as Grant Deed

**Phase 19 Notes**:
- ✅ Pydantic validators are permissive (allow empty fields)
- ✅ Jinja context includes `now()` and `datetime` functions
- ✅ Template handles blank fields gracefully

---

### **POST `/api/generate/interspousal-transfer-ca`**
**Purpose**: Generate Interspousal Transfer Deed (California) PDF  
**Auth**: Required  
**File**: `backend/routers/deeds_extra.py`  
**Template**: `templates/interspousal_transfer_ca/index.jinja2`  
**Added**: Phase 17-19

---

### **POST `/api/generate/warranty-deed-ca`**
**Purpose**: Generate Warranty Deed (California) PDF  
**Auth**: Required  
**File**: `backend/routers/deeds_extra.py`  
**Template**: `templates/warranty_deed_ca/index.jinja2`  
**Added**: Phase 17-19

---

### **POST `/api/generate/tax-deed-ca`**
**Purpose**: Generate Tax Deed (California) PDF  
**Auth**: Required  
**File**: `backend/routers/deeds_extra.py`  
**Template**: `templates/tax_deed_ca/index.jinja2`  
**Added**: Phase 17-19

---

## 🤝 **Partners**

### **GET `/partners/selectlist/`**
**Purpose**: Get list of partner companies for "Requested By" dropdown  
**Auth**: Required  
**File**: `backend/routers/partners.py`  
**Mounted**: `/partners` prefix (NOT `/api/partners`)  
**Response**:
```json
[
  { "id": 1, "name": "Pacific Coast Title" },
  { "id": 2, "name": "First American Title" }
]
```

**Phase 16 Fix**: 
- Backend mounts at `/partners/selectlist/`
- Frontend calls `${API_BASE}/partners/selectlist/` (no `/api` prefix)
- Previously caused 404 error due to path mismatch

**See**: [BREAKTHROUGHS.md → Discovery #1](../../BREAKTHROUGHS.md#discovery-1-partners-api-404-error)

---

## 📊 **Admin & Analytics**

### **GET `/admin/users`**
**Purpose**: List all users (admin only)  
**Auth**: Required (admin role)  
**Response**: Array of user objects with deed counts

---

### **GET `/admin/analytics`**
**Purpose**: Get system analytics dashboard data  
**Auth**: Required (admin role)  
**Response**: User counts, deed counts, revenue metrics

---

## 💳 **Payments & Billing**

### **POST `/payments/webhook`**
**Purpose**: Handle Stripe webhook events  
**Auth**: Stripe signature verification  
**Events**: `checkout.session.completed`, `customer.subscription.updated`, etc.

---

### **POST `/users/upgrade`**
**Purpose**: Create Stripe Checkout session for plan upgrade  
**Auth**: Required  
**Request**:
```json
{
  "price_id": "price_xxx"
}
```
**Response**: `{ "sessionId": "cs_test_...", "url": "https://checkout.stripe.com/..." }`

---

## 📝 **Deed Management**

### **POST `/api/deeds/create`**
**Purpose**: Save deed metadata to database  
**Auth**: Required  
**File**: `backend/main.py` and `backend/database.py`  
**Request** (Phase 16-19 Format):
```json
{
  "deed_type": "quitclaim-deed",
  "property_address": "1358 5th St, La Verne, CA 91750, USA",
  "apn": "8381-021-001",
  "county": "LOS ANGELES",
  "legal_description": "TRACT NO 6654 LOT 44",
  "grantor_name": "HERNANDEZ GERARDO J; MENDOZA YESSICA S",
  "grantee_name": "JOHN SMITH",
  "vesting": "",
  "requested_by": "Pacific Coast Title",
  "source": "modern-canonical"
}
```

**Response**: `{ "success": true, "deed_id": 123 }`

**Phase 16 Addition**: `requested_by` field for "Recording Requested By"  
**Phase 19 Addition**: `county` field properly saved

---

### **GET `/deeds`**
**Purpose**: List current user's deeds  
**Auth**: Required  
**Response**: Array of deed objects with metadata

---

### **GET `/deeds/{deed_id}`**
**Purpose**: Get specific deed details  
**Auth**: Required (owner or shared recipient)  
**Response**: Deed object with all metadata

---

## 🔍 **Key Implementation Details**

### **Router Mounting** (`backend/main.py`):
```python
# Property integration
app.include_router(property_router, prefix="/api/property", tags=["Property"])

# PDF generation
app.include_router(deeds_router, prefix="/api/generate", tags=["Deeds"])
app.include_router(deeds_extra_router, prefix="/api/generate", tags=["Deeds Extra"])

# Partners (Phase 16 Fix: No /api prefix!)
app.include_router(partners_router, prefix="/partners", tags=["Partners"])
```

---

### **Common Request Headers**:
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

---

### **Error Responses**:
```json
{
  "detail": "Error message here"
}
```

**Common Status Codes**:
- `200 OK`: Success
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions (e.g., admin-only route)
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error (check logs)
- `503 Service Unavailable`: External API (SiteX/TitlePoint) unavailable

---

## 🎓 **For Developers**

### **Adding a New Endpoint**:
1. Create endpoint in appropriate router file
2. Add authentication if needed: `Depends(get_current_user_id)`
3. Register router in `backend/main.py`
4. Document request/response format here
5. Test with Postman or `pytest`

### **Testing Endpoints**:
```bash
# Start backend
cd backend
python main.py

# Test with curl
curl -X POST http://localhost:8000/api/property/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"address": "1358 5th St, La Verne, CA 91750"}'
```

### **Related Documentation**:
- [PDF_GENERATION_SYSTEM.md](PDF_GENERATION_SYSTEM.md) → PDF generation details
- [SITEX_FIELD_MAPPING.md](../wizard/SITEX_FIELD_MAPPING.md) → SiteX API response structure
- [BREAKTHROUGHS.md](../../BREAKTHROUGHS.md) → Recent discoveries and fixes

---

**Last Major Updates**:
- **Phase 16**: Partners API fix, Legal Description extraction fix, `requested_by` field
- **Phase 17-19**: Multi-deed type support (Quitclaim, Interspousal, Warranty, Tax)
- **Phase 19**: County field fix (`CountyName` vs `County`), Pydantic validator fixes
