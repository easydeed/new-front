# 📚 DeedPro API Reference

## 🎯 Overview

Complete API reference for the DeedPro platform including authentication, user management, deed generation, payments, and admin endpoints.

**Base URLs:**
- **Development**: http://localhost:8000
- **Production**: https://deedpro-main-api.onrender.com
- **External API**: https://deedpro-external-api.onrender.com

---

## 🔐 Authentication

### JWT Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Authentication Endpoints

#### Register User
```http
POST /users/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "full_name": "John Doe",
  "role": "real_estate_agent",
  "company_name": "ABC Realty",
  "company_type": "title_company",
  "phone": "+1234567890",
  "state": "CA",
  "subscribe": false
}
```

#### Login User
```http
POST /users/login
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe",
    "plan": "free"
  }
}
```

---

## 👤 User Management

### Get User Profile
```http
GET /users/profile
Authorization: Bearer <token>
```

### Update User Profile
```http
PUT /users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "full_name": "Updated Name",
  "phone": "+1987654321"
}
```

### Upgrade User Plan
```http
POST /users/upgrade
Authorization: Bearer <token>
Content-Type: application/json

{
  "plan": "professional"
}
```

---

## 📄 Deed Management

### Create Deed
```http
POST /deeds
Authorization: Bearer <token>
Content-Type: application/json

{
  "deed_type": "Grant Deed",
  "property_address": "123 Main St, Los Angeles, CA",
  "apn": "123-456-789",
  "county": "Los Angeles",
  "legal_description": "Lot 1, Block 2, Tract 12345",
  "owner_type": "individual",
  "sales_price": 500000.00,
  "grantee_name": "Jane Smith",
  "vesting": "Sole Ownership"
}
```

### List User Deeds
```http
GET /deeds
Authorization: Bearer <token>
```

### Get Deed Details
```http
GET /deeds/{deed_id}
Authorization: Bearer <token>
```

### Update Deed Status
```http
PUT /deeds/{deed_id}/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "completed"
}
```

### Delete Deed
```http
DELETE /deeds/{deed_id}
Authorization: Bearer <token>
```

### Download Deed PDF
```http
GET /deeds/{deed_id}/download
Authorization: Bearer <token>
```

**Response:**
```json
{
  "pdf_base64": "JVBERi0xLjQK...",
  "deed_type": "Grant Deed",
  "deed_id": 123,
  "status": "success"
}
```

---

## 🏗️ Deed Generation

### Generate Deed Preview (AI-Enhanced) ✨
```http
POST /generate-deed-preview
Content-Type: application/json

{
  "deed_type": "grant_deed",
  "data": {
    // Core fields with AI enhancement
    "recording_requested_by": "John Doe",
    "mail_to": "123 Main St, Los Angeles, CA 90001",
    "order_no": "ORD-123",
    "escrow_no": "ESC-456", 
    "apn": "123-456-789",
    "documentary_tax": "55.00",  // Auto-calculated from sales_price
    "city": "Los Angeles",
    "grantor": "John Doe",
    "grantee": "Jane Smith",
    "county": "Los Angeles",
    "property_description": "Lot 1, Block 2, Tract 12345\n\nVesting: Joint Tenancy",
    "date": "08/07/2025",  // Auto-formatted MM/DD/YYYY
    
    // Enhanced dynamic features
    "tax_computed_full_value": true,   // ✓ Dynamic checkbox
    "tax_computed_less_liens": false,  // Dynamic checkbox
    "is_unincorporated": false,        // ✓ Dynamic checkbox
    "vesting_description": "Joint Tenancy",
    "calculated_documentary_tax": "55.00",
    "formatted_date": "08/07/2025",
    
    // Notary section
    "county_notary": "Los Angeles",
    "notary_date": "08/07/2025",
    "notary_name": "Alex Notary",
    "appeared_before_notary": "John Doe",
    "notary_signature": "Alex Notary"
  }
}
```

**Enhanced Response:**
```json
{
  "html": "<html>...with dynamic ✓ checkboxes...</html>",
  "deed_type": "grant_deed",
  "status": "success"
}
```

### API Enhancements (August 2025)

- **Recorder Profiles & Margins**: Preview and PDF now accept dynamic recorder page margins via template variables `page_margin_top|left|right|bottom`. Defaults are applied from county profiles when not provided by the client.
- **Transfer Tax Computation**: If not provided by the client, the server computes California-style Documentary Transfer Tax from `sales_price|salesPrice|consideration` using a county profile. Result is injected as `transfer_tax` with keys: `county_amount`, `city_amount`, `total`, `computed_on`.
- **Auto Exhibit A**: If `legal_description|legalDescription` exceeds a length threshold, `attach_exhibit_a` is set and `grant_deed/exhibit_a.html` is included automatically. Clients can override by sending `attach_exhibit_a` and/or a custom `exhibit_label`.
- **Backward Compatible**: Any client-sent values for `transfer_tax`, margin variables, and `attach_exhibit_a` take precedence over computed defaults.

**Key Features:**
- 🎯 **Smart Data Mapping**: Uses `deedDataMapper.ts` for comprehensive field validation
- ✅ **Dynamic Checkboxes**: Templates show ✓ marks based on user selections
- 🧮 **Auto-Calculations**: Documentary tax computed automatically ($0.55 per $500 CA)
- 📅 **Date Formatting**: Legal date format (MM/DD/YYYY) applied
- 🔍 **Real-Time Validation**: Pre-submission validation prevents errors

---

## 🤝 Shared Deeds & Collaboration

### Share Deed for Approval
```http
POST /shared-deeds
Authorization: Bearer <token>
Content-Type: application/json

{
  "deed_id": 123,
  "recipient_email": "approver@example.com",
  "recipient_name": "Jane Approver",
  "message": "Please review and approve this deed."
}
```

### List Shared Deeds
```http
GET /shared-deeds
Authorization: Bearer <token>
```

### Resend Approval Email
```http
POST /shared-deeds/{id}/resend
Authorization: Bearer <token>
```

### Revoke Shared Deed Access
```http
DELETE /shared-deeds/{id}
Authorization: Bearer <token>
```

### Public Approval View
```http
GET /approve/{token}
```

### Submit Approval Response
```http
POST /approve/{token}
Content-Type: application/json

{
  "approved": true,
  "comments": "Looks good, approved!"
}
```

---

## 💳 Payment & Subscriptions

### Stripe Webhook Handler
```http
POST /payments/webhook
Content-Type: application/json
Stripe-Signature: <stripe_signature>

[Stripe webhook payload]
```

### Create Billing Portal Session
```http
POST /payments/create-portal-session
Authorization: Bearer <token>
```

**Response:**
```json
{
  "url": "https://billing.stripe.com/session/..."
}
```

---

## 🤖 AI Assistance

### Dynamic Wizard AI Assistant

#### Button Prompts
Execute predefined data pulls using button prompts:

```http
POST /api/ai/assist
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "vesting",                    // Button prompt type
  "docType": "grant_deed",
  "verifiedData": {                     // Property data from Step 1
    "address": "123 Main St, Los Angeles, CA",
    "apn": "123-456-789"
  },
  "currentData": {}                     // Current form data
}
```

**Supported Button Types:**
- `vesting` - Current ownership and vesting information
- `grant_deed` - Recent deed transfers and sale prices  
- `tax_roll` - Assessed values and tax information
- `chain_of_title` - 🆕 Complete ownership history with title analysis
- `all` - Comprehensive data pull for Property Profile reports

#### Custom Prompts
Natural language requests for data:

```http
POST /api/ai/assist
Authorization: Bearer <token>
Content-Type: application/json

{
  "prompt": "pull chain of title",     // Natural language prompt
  "docType": "grant_deed",
  "verifiedData": {
    "address": "123 Main St, Los Angeles, CA",
    "apn": "123-456-789"
  },
  "currentData": {}
}
```

**Supported Custom Prompts:**
- `"pull chain of title"` - Complete ownership history analysis
- `"deed history"` - Same as chain of title
- `"ownership history"` - Transfer timeline with durations
- `"get lien information"` - Active liens and encumbrances

#### 🆕 Chain of Title Response
```json
{
  "success": true,
  "data": {
    "chainOfTitle": [
      {
        "date": "2020-05-15",
        "grantor": "John Smith",
        "grantee": "Mary Johnson", 
        "deed_type": "Grant Deed",
        "document_number": "2020-123456",
        "consideration": "$750,000",
        "legal_description": "Lot 1, Block 2..."
      }
    ],
    "ownershipDuration": [
      {
        "owner": "Mary Johnson",
        "start_date": "2020-05-15",
        "end_date": "Current",
        "duration_years": 3.7
      }
    ],
    "titleIssues": [
      "Found 1 quitclaim deed(s) - verify clear title"
    ],
    "totalTransfers": 5,
    "currentOwner": "Mary Johnson",
    "lastTransferDate": "2020-05-15"
  }
}
```

### Legacy Field Suggestions
Field-specific suggestions (for backward compatibility):

```http
POST /api/ai/assist
Content-Type: application/json

{
  "deed_type": "Grant Deed",
  "field": "property_address",
  "input": "123 main st los angeles"
}
```

**Response:**
```json
{
  "suggestion": "123 Main Street, Los Angeles, CA 90210",
  "confidence": 0.95
}
```

---

## 🤖 AI-Enhanced Features

### AI Deed Suggestions
Get real-time AI suggestions for deed form fields based on user profile and cached data.

```http
POST /ai/deed-suggestions
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "deedType": "grant_deed",
  "propertySearch": "123 Main St, Los Angeles, CA",
  "grantorName": "John Doe",
  "granteeName": "Jane Smith",
  "county": "Los Angeles"
}
```

**Response:**
```json
{
  "suggestions": {
    "recordingRequestedBy": "ABC Escrow Services - Escrow Officer",
    "mailTo": "123 Business St, Los Angeles, CA 90210",
    "county": "Los Angeles",
    "deedType": "grant_deed",
    "ai_tips": [
      "💡 Start by searching for the property address - I'll auto-populate other fields!",
      "📋 Don't forget to add your order number for proper tracking!"
    ]
  },
  "validation": {
    "is_valid": true,
    "warnings": [],
    "suggestions": ["Consider adding a legal description for better document accuracy"],
    "missing_required": []
  },
  "profile_available": true,
  "cached_data_available": false
}
```

### Enhanced User Profile Management

#### Get Enhanced User Profile
```http
GET /users/profile/enhanced
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "profile": {
    "company_name": "ABC Escrow Services",
    "business_address": "123 Business St, Los Angeles, CA 90210",
    "license_number": "ESC123456",
    "role": "escrow_officer",
    "default_county": "Los Angeles",
    "preferred_deed_type": "grant_deed",
    "auto_populate_company_info": true
  },
  "recent_properties": [
    {
      "property_address": "456 Oak Ave, Los Angeles, CA 90210",
      "legal_description": "Lot 5, Block 3, Tract 54321...",
      "county": "Los Angeles",
      "city": "Los Angeles"
    }
  ],
  "ai_enabled": true
}
```

#### Update Enhanced User Profile
```http
POST /users/profile/enhanced
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "company_name": "ABC Escrow Services",
  "business_address": "123 Business St, Los Angeles, CA 90210",
  "license_number": "ESC123456",
  "role": "escrow_officer",
  "default_county": "Los Angeles",
  "preferred_deed_type": "grant_deed",
  "auto_populate_company_info": true
}
```

**Response:**
```json
{
  "status": "updated",
  "message": "Profile updated successfully - AI suggestions will improve!"
}
```

### Property Intelligence

#### Get Property Suggestions
```http
GET /property/suggestions?address=123%20Main%20St
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "suggestions": [
    {
      "type": "cached_exact",
      "property": {
        "property_address": "123 Main St, Los Angeles, CA 90210",
        "legal_description": "Lot 1, Block 2, Tract 12345...",
        "apn": "123-456-789",
        "county": "Los Angeles",
        "city": "Los Angeles",
        "state": "CA",
        "zip_code": "90210"
      },
      "confidence": 0.95
    },
    {
      "type": "recent_match",
      "property": {
        "property_address": "125 Main St, Los Angeles, CA 90210",
        "legal_description": "Lot 3, Block 2, Tract 12345...",
        "county": "Los Angeles",
        "city": "Los Angeles"
      },
      "confidence": 0.8
    }
  ],
  "total": 2
}
```

#### Cache Property Data
```http
POST /property/cache
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "property_address": "123 Main St, Los Angeles, CA 90210",
  "legal_description": "Lot 1, Block 2, Tract 12345...",
  "apn": "123-456-789",
  "county": "Los Angeles",
  "city": "Los Angeles",
  "state": "CA",
  "zip_code": "90210"
}
```

**Response:**
```json
{
  "status": "cached",
  "message": "Property data cached for future suggestions"
}
```

### Enhanced Deed Generation

#### AI-Enhanced Deed Preview
The existing `/generate-deed-preview` endpoint now includes AI enhancements:

```http
POST /generate-deed-preview
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "deed_type": "grant_deed",
  "data": {
    "recording_requested_by": "ABC Escrow Services",
    "grantor": "John Doe",
    "grantee": "Jane Smith",
    "property_description": "123 Main St, Los Angeles, CA 90210",
    "county": "Los Angeles"
  }
}
```

**Enhanced Response:**
```json
{
  "html": "<html>...deed preview HTML...</html>",
  "deed_type": "grant_deed",
  "status": "preview_ready",
  "ai_suggestions": {
    "recordingRequestedBy": "ABC Escrow Services - Escrow Officer",
    "mailTo": "123 Business St, Los Angeles, CA 90210",
    "notaryCounty": "Los Angeles"
  },
  "validation": {
    "is_valid": true,
    "warnings": [],
    "suggestions": [],
    "missing_required": []
  },
  "user_profile_applied": true
}
```

### AI Assistance for Form Fields

#### Get Field-Specific AI Assistance
```http
POST /api/ai/assist
Content-Type: application/json

{
  "deed_type": "Grant Deed",
  "field": "legal_description",
  "input": "123-456-789"
}
```

**Response:**
```json
{
  "suggestion": "Legal Description: The real property situated in the County of Los Angeles, State of California, described as: APN 123-456-789...",
  "confidence": 0.85
}
```

#### Supported Field Types
- `property_address`: Format addresses for legal documents
- `legal_description`: Generate proper legal descriptions
- `grantee_name`: Format names for legal use
- `grantor_name`: Format grantor names properly
- `vesting`: Suggest appropriate vesting language

---

## 👑 Admin Endpoints

**Note:** All admin endpoints require admin role authentication.

### Admin Dashboard Overview
```http
GET /admin/dashboard
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "users": {
    "total": 1250,
    "new_this_month": 85,
    "by_plan": {
      "free": 950,
      "professional": 250,
      "enterprise": 50
    }
  },
  "deeds": {
    "total": 5420,
    "this_month": 342,
    "by_status": {
      "completed": 4890,
      "draft": 425,
      "in_progress": 105
    }
  },
  "revenue": {
    "total": 45600.00,
    "this_month": 8950.00,
    "by_plan": {
      "professional": 7250.00,
      "enterprise": 4950.00
    }
  }
}
```

### List All Users
```http
GET /admin/users?role=admin&page=1&limit=50
Authorization: Bearer <admin_token>
```

### Get User Details
```http
GET /admin/users/{id}
Authorization: Bearer <admin_token>
```

### Update User Role/Permissions
```http
PUT /admin/users/{id}
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "role": "admin",
  "plan": "enterprise",
  "is_active": true
}
```

### Deactivate User
```http
DELETE /admin/users/{id}
Authorization: Bearer <admin_token>
```

### List All Deeds
```http
GET /admin/deeds?status=completed&page=1&limit=50
Authorization: Bearer <admin_token>
```

### Audit Logs
```http
GET /admin/audit-logs?user_id=123&action=login&page=1&limit=100
Authorization: Bearer <admin_token>
```

### System Notifications
```http
GET /admin/notifications
Authorization: Bearer <admin_token>
```

### Revenue Analytics
```http
GET /admin/revenue?start_date=2024-01-01&end_date=2024-12-31
Authorization: Bearer <admin_token>
```

### Platform Analytics
```http
GET /admin/analytics
Authorization: Bearer <admin_token>
```

### System Health
```http
GET /admin/system-health
Authorization: Bearer <admin_token>
```

### Create Manual Backup
```http
POST /admin/backup
Authorization: Bearer <admin_token>
```

### List Backup History
```http
GET /admin/backups
Authorization: Bearer <admin_token>
```

### Export Data
```http
POST /admin/export
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "type": "users",
  "format": "csv",
  "filters": {
    "plan": "professional",
    "created_after": "2024-01-01"
  }
}
```

### Submit Admin Feedback
```http
POST /admin/feedback
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "type": "bug_report",
  "title": "Dashboard loading issue",
  "description": "The admin dashboard takes too long to load.",
  "priority": "high"
}
```

---

## 🏢 External API Endpoints

**Base URL:** https://deedpro-external-api.onrender.com

### SoftPro Integration

#### Webhook Handler
```http
POST /api/v1/softpro/webhook
X-API-Key: softpro_api_key_123
Content-Type: application/json

{
  "order_id": "SP12345",
  "property_address": "123 Main St, Los Angeles, CA",
  "buyer_name": "John Doe",
  "seller_name": "Jane Smith",
  "deed_type": "Grant Deed",
  "escrow_number": "ESC001",
  "sales_price": 500000.00
}
```

#### Get Deed by Order ID
```http
GET /api/v1/softpro/orders/{order_id}/deed
X-API-Key: softpro_api_key_123
```

### Qualia Integration

#### Import Order
```http
POST /api/v1/qualia/import-order
X-API-Key: qualia_api_key_456
Content-Type: application/json

{
  "order_id": "QA67890",
  "property_address": "456 Oak Ave, San Francisco, CA",
  "buyer": {"name": "Alice Johnson"},
  "seller": {"name": "Bob Wilson"}
}
```

#### Export Deed
```http
POST /api/v1/qualia/export-deed
X-API-Key: qualia_api_key_456
Content-Type: application/json

{
  "order_id": "QA67890",
  "deed_pdf_url": "https://api.deedpro.io/deeds/generated.pdf"
}
```

### General Endpoints

#### Health Check
```http
GET /health
```

#### API Status
```http
GET /api/v1/status
```

#### Test Connection
```http
POST /api/v1/test-connection
X-API-Key: your_api_key
```

#### List Deeds
```http
GET /api/v1/deeds?platform=softpro
X-API-Key: your_api_key
```

#### Get API Key Info
```http
GET /api/v1/keys/info
X-API-Key: your_api_key
```

---

## 🔍 Property Data

### Search Property Information
```http
GET /property/search?address=123 Main St Los Angeles CA
```

---

## 📊 Response Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

---

## 🚨 Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "value": "invalid-email"
    }
  }
}
```

---

## 📝 Rate Limiting

- **Default**: 100 requests per minute per IP
- **Authenticated**: 500 requests per minute per user
- **Admin**: 1000 requests per minute
- **External API**: Custom limits per API key

---

## 🔐 Security Headers

All API responses include security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`

---

## 📞 Support

For API support:
- **Documentation Issues**: Check endpoint specifications
- **Authentication Problems**: Verify JWT token and permissions
- **Rate Limiting**: Implement exponential backoff
- **Error Handling**: Follow standard HTTP error codes

---

**Last Updated:** January 2025  
**API Version:** 1.0.0
