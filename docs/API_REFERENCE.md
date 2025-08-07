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

### Generate Deed Preview
```http
POST /generate-deed-preview
Content-Type: application/json

{
  "deed_type": "Grant Deed",
  "data": {
    "recording_requested_by": "John Doe",
    "mail_to": "Jane Smith",
    "order_no": "ORD-123",
    "escrow_no": "ESC-456",
    "apn": "123-456-789",
    "documentary_tax": "100.00",
    "city": "Los Angeles",
    "grantor": "John Doe",
    "grantee": "Jane Smith",
    "county": "Los Angeles",
    "property_description": "Lot 1, Block 2, Tract 12345",
    "date": "2024-07-01"
  }
}
```

**Response:**
```json
{
  "html": "<html>...</html>",
  "deed_type": "Grant Deed",
  "status": "success"
}
```

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

### Get AI Suggestions
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
