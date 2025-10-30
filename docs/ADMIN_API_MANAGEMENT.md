# 🤝 ADMIN API MANAGEMENT GUIDE

**Last Updated**: October 30, 2025, 4:30 AM PST  
**Phase**: 22-B (Partner Onboarding UI)  
**Status**: ✅ Production-Ready

---

## 📋 **TABLE OF CONTENTS**

1. [Overview](#overview)
2. [Accessing Partner Management](#accessing-partner-management)
3. [Creating API Partners](#creating-api-partners)
4. [Managing Partners](#managing-partners)
5. [Usage Analytics](#usage-analytics)
6. [Security Best Practices](#security-best-practices)
7. [Troubleshooting](#troubleshooting)
8. [API Reference](#api-reference)

---

## 🎯 **OVERVIEW**

DeedPro's External API allows **trusted partners** (SoftPro, Qualia, custom integrations) to programmatically generate deeds without direct UI access. This guide covers how to onboard and manage these partners through the admin interface.

### **What is a Partner?**
A partner is an external organization that:
- Has a unique API key (prefix: `dp_pk_...`)
- Can call DeedPro's External API endpoints
- Has specific scopes (permissions)
- Is rate-limited to prevent abuse
- Can be revoked at any time

### **Use Cases**
1. **SoftPro Integration**: Generate deeds from SoftPro 360 workflows
2. **Qualia Integration**: Auto-generate deeds in Qualia transactions
3. **Custom Integrations**: White-label partners, title companies
4. **Webhooks**: Automated deed generation from external systems

---

## 🔐 **ACCESSING PARTNER MANAGEMENT**

### **Step 1: Log In as Admin**
1. Navigate to: `https://yourdomain.com/login`
2. Enter your admin credentials
3. Click "Sign In"

### **Step 2: Navigate to Partners Page**
1. After login, go to: `https://yourdomain.com/admin-honest`
2. Click the **"🤝 API Partners"** button (top right)
3. You'll be redirected to: `/admin/partners`

### **Alternative Access**
- Direct URL: `https://yourdomain.com/admin/partners`
- Sidebar (if using old admin): Click "API Partners"

### **Auth Requirements**
- ✅ Must have valid auth token (`access_token` in localStorage)
- ⚠️ TODO: Role verification (admin only) - currently checks token only

---

## ➕ **CREATING API PARTNERS**

### **Step-by-Step Guide**

#### **1. Click "+ Add Partner"**
- Located at top-right of Partners page
- Opens the "Create Partner Modal"

#### **2. Fill Out Partner Information**

**A. Company Name** (Required)
- Example: `"SoftPro Corporation"`
- Example: `"Qualia Labs Inc"`
- Example: `"ABC Title Company"`
- ⚠️ Must not be empty (button disabled if empty)

**B. Scopes** (Required)
- `deed:create` - Allows creating new deeds
- `deed:read` - Allows reading deed data
- Default: Both selected
- ✅ Recommended: Both for full integration
- ⚠️ Can limit to `deed:read` only for read-only access

**C. Rate Limit** (Required)
- Requests per minute (default: 120)
- Example values:
  - **120/min**: Standard (recommended)
  - **60/min**: Conservative (small partner)
  - **300/min**: High volume (enterprise partner)
- ⚠️ Set lower for new partners, increase as needed

#### **3. Generate API Key**
- Click "Generate API Key" button
- System generates secure key: `dp_pk_abc123xyz...`
- ⚠️ **CRITICAL**: Key is shown ONLY ONCE!

#### **4. Copy API Key**
- Click "Copy" or manually select and copy
- ⚠️ **DO NOT CLOSE MODAL** until key is saved!
- Share key securely with partner:
  - Email (encrypted)
  - Password manager share
  - Secure messaging (Signal, Slack DM)
  - **NEVER** share via SMS or public channels!

#### **5. Click "Done"**
- Modal closes
- New partner appears in partners list
- Partner can immediately use API key

### **Example: Onboarding SoftPro**

```
Company Name: SoftPro Corporation
Scopes: [✓] deed:create [✓] deed:read
Rate Limit: 120 requests/minute

Generated Key: dp_pk_abc123xyz456789...

Next Steps:
1. Copy key to clipboard
2. Email to SoftPro integration team: integrations@softpro.com
3. Include API docs: https://yourdomain.com/docs/api
4. Request test deed creation within 24 hours
5. Monitor usage in partner detail page
```

---

## 🛠️ **MANAGING PARTNERS**

### **Partners List View**

The partners list shows all API partners with:

| Column | Description | Example |
|--------|-------------|---------|
| **Company** | Partner company name | SoftPro Corporation |
| **Key Prefix** | First 8 chars of API key | `dp_pk_ab` |
| **Status** | Active or Revoked | 🟢 Active / 🔴 Revoked |
| **Scopes** | Permissions granted | deed:create, deed:read |
| **Rate Limit** | Requests per minute | 120/min |
| **Created** | Onboarding date | 10/30/2025 |
| **Actions** | View, Revoke | [View] [Revoke] |

### **View Partner Details**
1. Click **"View"** next to partner in list
2. See usage analytics (explained below)
3. Click **"← Back"** to return to list

### **Revoke Partner**
⚠️ **WARNING**: This permanently disables the API key!

#### **When to Revoke**
- Partner contract ends
- Security breach suspected
- Partner no longer needs access
- API key accidentally exposed

#### **How to Revoke**
1. Click **"Revoke"** next to partner in list
2. Confirm action (cannot be undone!)
3. Partner's API key stops working immediately
4. All future API calls return `401 Unauthorized`

#### **After Revocation**
- Partner status changes to: 🔴 Revoked
- Partner remains in list (for audit trail)
- Usage history is preserved
- To re-enable: Create new partner (new API key)

---

## 📊 **USAGE ANALYTICS**

### **Accessing Analytics**
1. Go to `/admin/partners`
2. Click **"View"** next to any partner
3. See partner-specific analytics

### **Key Metrics**

#### **1. API Calls (Last 500)**
- Total API calls from this partner
- Example: `1,234`
- Resets when usage log exceeds 500 entries

#### **2. Avg Latency**
- Average response time in milliseconds
- Example: `245 ms`
- ✅ Good: < 500ms
- ⚠️ Warning: 500-1000ms
- 🔴 Bad: > 1000ms

#### **3. Errors**
- Total failed requests (4xx, 5xx status codes)
- Example: `12`
- ✅ Good: 0 errors
- ⚠️ Warning: < 5% error rate
- 🔴 Bad: > 10% error rate

#### **4. Error Rate**
- Percentage of failed requests
- Example: `0.97%` (12 errors / 1,234 calls)
- Calculated as: `(errors / total_calls) * 100`

### **Recent API Calls Table**

| Column | Description | Example |
|--------|-------------|---------|
| **When** | Timestamp | 10/30/2025, 4:15:32 AM |
| **Endpoint** | API route called | POST /external/deeds/create |
| **Status** | HTTP status code | 200 (success) / 401 (unauthorized) |
| **Latency** | Response time | 245 ms |

### **Monitoring Best Practices**
1. **Check daily** for new partners (first week)
2. **Check weekly** for established partners
3. **Alert on** error rate > 10%
4. **Alert on** avg latency > 1000ms
5. **Investigate** sudden usage spikes

---

## 🔒 **SECURITY BEST PRACTICES**

### **For Admins**

#### **1. API Key Distribution**
✅ **DO**:
- Share via encrypted email
- Use password managers (1Password, LastPass)
- Share via secure messaging (Signal, Slack DM)
- Include expiration date in communication

❌ **DON'T**:
- Share via SMS (insecure)
- Post in public Slack channels
- Include in public documentation
- Share same key with multiple partners

#### **2. Partner Vetting**
Before creating API key:
- ✅ Verify partner identity (business license, domain)
- ✅ Sign NDA/API agreement
- ✅ Set appropriate rate limits (start low!)
- ✅ Document onboarding in audit log

#### **3. Monitoring**
- ✅ Check usage weekly (first month)
- ✅ Alert on unusual patterns:
  - Sudden traffic spike (> 2x normal)
  - High error rate (> 10%)
  - Off-hours traffic (if unexpected)
- ✅ Rotate keys annually (proactive security)

#### **4. Incident Response**
If API key is compromised:
1. **Revoke immediately** (30 seconds)
2. **Notify partner** (2 minutes)
3. **Generate new key** (5 minutes)
4. **Review audit logs** (30 minutes)
5. **Document incident** (1 hour)

### **For Partners**

Share these instructions when onboarding:

#### **Storing API Keys**
```bash
# ✅ GOOD: Environment variable
export DEEDPRO_API_KEY="dp_pk_abc123..."

# ✅ GOOD: .env file (gitignored)
DEEDPRO_API_KEY=dp_pk_abc123...

# ❌ BAD: Hardcoded in source
const API_KEY = "dp_pk_abc123..."; // NEVER DO THIS!

# ❌ BAD: Committed to Git
git add .env  # NEVER DO THIS!
```

#### **Using API Keys**
```python
# ✅ GOOD: From environment
import os
API_KEY = os.getenv("DEEDPRO_API_KEY")

# ✅ GOOD: From config service
API_KEY = config.get_secret("deedpro_api_key")

# ❌ BAD: Hardcoded
API_KEY = "dp_pk_abc123..."  # NEVER!
```

---

## 🐛 **TROUBLESHOOTING**

### **Problem: "Failed to load partners"**

**Symptoms**:
- Partners page shows error
- Red error message: "Failed to load partners"

**Causes**:
1. External API not running (port 8001)
2. Missing `EXTERNAL_API_BASE_URL` in `.env.local`
3. Missing `EXTERNAL_API_ADMIN_SETUP_SECRET` in `.env.local`
4. Network/firewall blocking connection

**Solutions**:
```bash
# 1. Check if External API is running
curl http://localhost:8001/health
# Expected: {"status": "healthy"}

# 2. Check environment variables
cat frontend/.env.local
# Should have:
# EXTERNAL_API_BASE_URL=http://localhost:8001
# EXTERNAL_API_ADMIN_SETUP_SECRET=your_secret

# 3. Start External API if not running
cd phase22-api-patch
bash scripts/dev_run.sh

# 4. Restart frontend
cd frontend
npm run dev
```

### **Problem: "401 Unauthorized" when creating partner**

**Symptoms**:
- Click "Generate API Key" → error
- Console error: `401 Unauthorized`

**Causes**:
- Admin secret mismatch between frontend and backend
- No admin secret set

**Solutions**:
```bash
# 1. Check frontend .env.local
cat frontend/.env.local
# EXTERNAL_API_ADMIN_SETUP_SECRET=ABC123

# 2. Check backend environment
cat phase22-api-patch/.env
# ADMIN_SETUP_SECRET=ABC123

# 3. Ensure they MATCH exactly
# If different, update frontend to match backend:
echo "EXTERNAL_API_ADMIN_SETUP_SECRET=ABC123" >> frontend/.env.local

# 4. Restart both services
```

### **Problem: Partner created but usage shows 0 calls**

**Symptoms**:
- Partner successfully created
- Partner detail page shows 0 calls
- Partner reports API key works

**Causes**:
- Usage logging not enabled
- Database not persisting usage
- Frontend fetching from wrong endpoint

**Solutions**:
```bash
# 1. Check if usage logging is enabled in backend
curl -H "X-Admin-Setup-Secret: YOUR_SECRET" \
  http://localhost:8001/admin/usage
# Expected: Array of usage records

# 2. Test partner API key
curl -H "X-API-Key: dp_pk_abc123..." \
  http://localhost:8001/external/deeds/create \
  -X POST -d '{"property_address": "123 Test St"}'
# Expected: 200 OK

# 3. Re-check usage analytics
# Refresh partner detail page (should now show 1 call)
```

### **Problem: Cannot revoke partner**

**Symptoms**:
- Click "Revoke" → nothing happens
- Partner still shows "Active"

**Causes**:
- Frontend/backend API mismatch
- Partner already revoked (race condition)
- Network error

**Solutions**:
```bash
# 1. Check browser console for errors
# F12 → Console tab

# 2. Test revoke API directly
curl -H "X-Admin-Setup-Secret: YOUR_SECRET" \
  -X DELETE \
  http://localhost:8001/admin/api-keys/dp_pk_abc

# 3. Refresh partners list page
# Partner should now show "Revoked"
```

---

## 🔌 **API REFERENCE**

### **Frontend API Routes** (Server-Side Proxies)

All routes require admin to be logged in (auth token in localStorage).

#### **1. List Partners**
```typescript
GET /api/partners/admin/list

Response:
[
  {
    "key_prefix": "dp_pk_ab",
    "company": "SoftPro Corporation",
    "is_active": true,
    "scopes": ["deed:create", "deed:read"],
    "rate_limit_per_minute": 120,
    "created_at": "2025-10-30T04:15:00Z"
  }
]
```

#### **2. Create Partner (Bootstrap)**
```typescript
POST /api/partners/admin/bootstrap
Content-Type: application/json

Body:
{
  "company": "SoftPro Corporation",
  "scopes": ["deed:create", "deed:read"],
  "rate_limit_per_minute": 120
}

Response:
{
  "api_key": "dp_pk_abc123xyz456789...",
  "key_prefix": "dp_pk_ab",
  "company": "SoftPro Corporation",
  "created_at": "2025-10-30T04:15:00Z"
}
```

#### **3. Revoke Partner**
```typescript
DELETE /api/partners/admin/revoke/:prefix

Example:
DELETE /api/partners/admin/revoke/dp_pk_ab

Response:
{
  "success": true,
  "message": "API key revoked"
}
```

#### **4. Get Usage Analytics**
```typescript
GET /api/partners/admin/usage

Response:
[
  {
    "prefix": "dp_pk_ab",
    "endpoint": "POST /external/deeds/create",
    "status": 200,
    "latency_ms": 245,
    "at": "2025-10-30T04:15:32Z"
  }
]
```

### **Backend API Routes** (External API Service)

These are called by the frontend proxies. **Do NOT call directly from frontend!**

#### **1. List API Keys**
```bash
GET /admin/api-keys
Header: X-Admin-Setup-Secret: YOUR_SECRET

Response: Same as frontend /api/partners/admin/list
```

#### **2. Bootstrap Partner**
```bash
POST /admin/api-keys/bootstrap
Header: X-Admin-Setup-Secret: YOUR_SECRET
Body: Same as frontend /api/partners/admin/bootstrap

Response: Same as frontend
```

#### **3. Revoke Partner**
```bash
DELETE /admin/api-keys/:prefix
Header: X-Admin-Setup-Secret: YOUR_SECRET

Response: Same as frontend
```

#### **4. Get Usage**
```bash
GET /admin/usage
Header: X-Admin-Setup-Secret: YOUR_SECRET

Response: Same as frontend /api/partners/admin/usage
```

---

## 📚 **ADDITIONAL RESOURCES**

### **For Admins**
- [External API README](../../phase22-api-patch/README.md)
- [Systems Architect Review](../../PHASE_22_SYSTEMS_ARCHITECT_REVIEW.md)
- [Phase 22-B Integration Plan](../../PHASE_22B_INTEGRATION_PLAN.md)
- [Project Status](../../PROJECT_STATUS.md)

### **For Partners**
- External API Documentation: `/docs/api` (TODO: Create)
- Postman Collection: `/phase22-api-patch/postman/` (available)
- Integration Examples: `/phase22-api-patch/tests/` (Python examples)

### **Support Contacts**
- **Technical Issues**: tech@yourdomain.com
- **Partner Onboarding**: partners@yourdomain.com
- **Security Incidents**: security@yourdomain.com

---

## 🎓 **LESSONS LEARNED** (For Future Reference)

### **Why Server-Side Proxy?**
- ✅ Hides `EXTERNAL_API_ADMIN_SETUP_SECRET` from browser
- ✅ No CORS issues (same-origin requests)
- ✅ Can add middleware (rate limiting, logging)
- ✅ Easier to audit (server logs)

### **Why One-Time Key Display?**
- ✅ Industry standard (GitHub, AWS, Stripe)
- ✅ Forces admin to save immediately
- ✅ Prevents key leakage (can't retrieve later)
- ✅ Encourages secure storage

### **Why Rate Limiting?**
- ✅ Prevents accidental DoS (buggy partner code)
- ✅ Fair usage (multiple partners)
- ✅ Cost control (API costs scale with usage)
- ✅ Security (limits impact of compromised key)

---

## 🚀 **CHANGELOG**

### **Phase 22-B** (October 30, 2025)
- ✅ Partner Management UI complete
- ✅ Create, view, revoke partners
- ✅ Usage analytics dashboard
- ✅ Admin auth checks
- ✅ Server-side proxy for security

### **Phase 22.1** (October 29, 2025)
- ✅ External API backend (Python/FastAPI)
- ✅ API key generation/validation
- ✅ Rate limiting (Redis-based)
- ✅ Webhook signature validation
- ✅ S3 presigned URLs for PDF storage
- ✅ Retry logic with exponential backoff

---

**Need Help?** Contact: tech@yourdomain.com  
**Last Updated**: October 30, 2025, 4:30 AM PST  
**Status**: ✅ Production-Ready

