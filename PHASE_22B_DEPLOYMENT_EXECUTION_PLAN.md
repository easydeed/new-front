# 🚀 PHASE 22-B: EXTERNAL API DEPLOYMENT - STEP-BY-STEP

**Date**: October 30, 2025, 5:30 AM PST  
**Plan**: Option A - Deploy External API to Render  
**Alignment**: ✅ **100% ALIGNED** with provided plan  
**Time**: ~20 minutes  
**Philosophy**: Clean, fast, reversible

---

## ✅ **ALIGNMENT VERIFICATION**

### **What Matches Your Plan**:
1. ✅ `phase22-api-patch/` structure matches exactly
2. ✅ All 3 migrations exist (001, 002, 003)
3. ✅ External API code at `phase22-api-patch/external_api/`
4. ✅ Hybrid architecture (calls Main API)
5. ✅ All Phase 22.1 fixes included

### **Minor Adjustments Needed**:
1. ⚠️ `phase22-api-patch/` needs to be moved to `backend/external_api/`
2. ⚠️ `backend/requirements.txt` needs External API deps added
3. ✅ Everything else is ready!

**Verdict**: **READY TO DEPLOY** with minor prep! 🎯

---

## 📋 **STEP 0: PREP (Repo + Deps)** ✅

### **Step 0.1: Move External API to Backend** (2 min)

**Why**: Your plan expects `backend/external_api/`, but we have `phase22-api-patch/external_api/`

**Action**:
```powershell
# Create backend/external_api directory
New-Item -ItemType Directory -Force -Path "backend/external_api"

# Copy all files from phase22-api-patch/external_api to backend/external_api
Copy-Item -Path "phase22-api-patch/external_api/*" -Destination "backend/external_api/" -Recurse -Force

# Copy migrations to backend/migrations (create if doesn't exist)
New-Item -ItemType Directory -Force -Path "backend/migrations"
Copy-Item -Path "phase22-api-patch/migrations/*" -Destination "backend/migrations/" -Force

# Verify
Get-ChildItem -Path "backend/external_api" -Recurse
Get-ChildItem -Path "backend/migrations"
```

**Expected Output**:
```
backend/
  external_api/
    __init__.py (create if missing)
    app.py
    deps.py
    models.py
    rate_limit.py
    routers/
      admin.py
      partners.py
    security/
      apikey.py
      hmac.py
    services/
      deed_generation.py
    storage/
      s3_storage.py
  migrations/
    001_api_keys.sql
    002_api_usage.sql
    003_external_deeds.sql
```

---

### **Step 0.2: Update Backend Requirements** (1 min)

**Check current requirements**:
```powershell
Get-Content backend/requirements.txt
```

**Add these dependencies** (if missing):
```txt
# Phase 22-B: External API Dependencies
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
pydantic-settings>=2.0.0
SQLAlchemy>=2.0.0
psycopg[binary]>=3.1.0
httpx>=0.25.0
boto3>=1.28.0
python-dotenv>=1.0.0
python-multipart>=0.0.6
# Optional (for rate limiting):
redis>=5.0.0
```

**Update requirements.txt**:
```powershell
# Append to backend/requirements.txt
@"

# Phase 22-B: External API Dependencies (October 30, 2025)
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
pydantic-settings>=2.0.0
SQLAlchemy>=2.0.0
psycopg[binary]>=3.1.0
httpx>=0.25.0
boto3>=1.28.0
python-dotenv>=1.0.0
python-multipart>=0.0.6
redis>=5.0.0
"@ | Add-Content -Path "backend/requirements.txt"
```

---

## 🗄️ **STEP 1: DB MIGRATIONS** ✅

### **Step 1.1: Connect to Production Postgres**

**Get your DATABASE_URL from Render**:
1. Go to: https://dashboard.render.com
2. Select your database: `deedpro-db`
3. Copy "External Database URL" or "Internal Database URL"

**Format**:
```
postgresql://username:password@hostname:port/database
```

---

### **Step 1.2: Run Migrations**

**Option A: Using Render Shell** (Recommended):
```bash
# 1. Go to Render Dashboard
# 2. Select: deedpro-main-api
# 3. Click: "Shell" tab
# 4. Run these commands:

cd backend/migrations

# Enable UUID extension
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

# Run migrations
psql $DATABASE_URL -f 001_api_keys.sql
psql $DATABASE_URL -f 002_api_usage.sql
psql $DATABASE_URL -f 003_external_deeds.sql

# Verify tables created
psql $DATABASE_URL -c "\dt api_keys"
psql $DATABASE_URL -c "\dt api_usage"
psql $DATABASE_URL -c "\dt external_deeds"
```

**Option B: Using Local psql** (If you have it installed):
```powershell
# Set DATABASE_URL
$env:DATABASE_URL="postgresql://user:pass@hostname:port/database"

# Run migrations
psql $env:DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
psql $env:DATABASE_URL -f backend/migrations/001_api_keys.sql
psql $env:DATABASE_URL -f backend/migrations/002_api_usage.sql
psql $env:DATABASE_URL -f backend/migrations/003_external_deeds.sql

# Verify
psql $env:DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_name IN ('api_keys', 'api_usage', 'external_deeds');"
```

**Expected Output**:
```
CREATE EXTENSION
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE INDEX
```

**Verification**:
```sql
-- Should return 3 rows
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('api_keys', 'api_usage', 'external_deeds');
```

---

## 🏗️ **STEP 2: UPDATE RENDER.YAML** ✅

### **Step 2.1: Backup Current Config**

```powershell
Copy-Item -Path "render.yaml" -Destination "render.yaml.backup"
```

---

### **Step 2.2: Add External API Service**

**Current `render.yaml`** (keep this):
```yaml
services:
- type: web
  name: deedpro-main-api
  env: python
  plan: free
  repo: https://github.com/easydeed/new-front
  branch: main
  rootDir: backend
  buildCommand: pip install -r requirements.txt
  startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
  envVars:
    - key: DATABASE_URL
      fromDatabase:
        name: deedpro-db
    # ... rest of your env vars ...
```

**Add this second service** (after main-api):
```yaml
- type: web
  name: deedpro-external-api
  env: python
  plan: free
  repo: https://github.com/easydeed/new-front
  branch: main
  rootDir: backend
  buildCommand: pip install -r requirements.txt
  startCommand: python -m uvicorn external_api.app:app --host 0.0.0.0 --port $PORT
  healthCheckPath: /healthz
  autoDeploy: true
  envVars:
    # Database (same as main API)
    - key: DATABASE_URL
      fromDatabase:
        name: deedpro-db
    
    # Main API Connection (CRITICAL!)
    - key: MAIN_API_BASE_URL
      value: https://deedpro-main-api.onrender.com
    - key: MAIN_API_INTERNAL_TOKEN
      sync: false  # Set manually in Render dashboard
    
    # Admin Secret (must match frontend!)
    - key: ADMIN_SETUP_SECRET
      sync: false  # Set manually: deedpro-admin-secret-2025
    
    # API Key Config
    - key: API_KEY_MIN_PREFIX
      value: dp_pk_
    - key: EXTERNAL_API_DEBUG
      value: "false"
    
    # Storage (start with local, upgrade to S3 later)
    - key: STORAGE_DRIVER
      value: local
    # OR for S3:
    # - key: STORAGE_DRIVER
    #   value: s3
    # - key: S3_BUCKET
    #   sync: false
    # - key: S3_REGION
    #   value: us-west-1
    # - key: AWS_ACCESS_KEY_ID
    #   sync: false
    # - key: AWS_SECRET_ACCESS_KEY
    #   sync: false
    
    # Rate Limiting
    - key: RATE_LIMIT_REQUESTS_PER_MINUTE
      value: "120"
    # Optional Redis:
    # - key: RATE_LIMIT_REDIS_URL
    #   sync: false
    
    # Webhook Secrets (optional, for partners)
    # - key: SOFTPRO_WEBHOOK_SECRET
    #   sync: false
    # - key: QUALIA_WEBHOOK_SECRET
    #   sync: false
```

---

### **Step 2.3: Set Manual Environment Variables in Render**

**After deploying, go to Render Dashboard**:

1. Navigate to: `deedpro-external-api` service
2. Click: "Environment" tab
3. Set these manual values:

```
ADMIN_SETUP_SECRET = deedpro-admin-secret-2025
MAIN_API_INTERNAL_TOKEN = <generate a secure token, e.g., random 32-char string>

# Optional (if using S3):
S3_BUCKET = your-s3-bucket-name
AWS_ACCESS_KEY_ID = your-aws-key
AWS_SECRET_ACCESS_KEY = your-aws-secret

# Optional (if using Redis):
RATE_LIMIT_REDIS_URL = redis://your-redis-url

# Optional (partner webhooks):
SOFTPRO_WEBHOOK_SECRET = <secure random string>
QUALIA_WEBHOOK_SECRET = <secure random string>
```

**Generate secure token** (PowerShell):
```powershell
# Generate random 32-character token for MAIN_API_INTERNAL_TOKEN
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

---

## ☁️ **STEP 3: UPDATE VERCEL ENV VARS** ✅

### **Step 3.1: Get External API URL**

**After deployment, Render will give you**:
```
https://deedpro-external-api.onrender.com
```

---

### **Step 3.2: Update Vercel Environment Variables**

1. Go to: https://vercel.com/dashboard
2. Select: `deedpro-frontend-new` project
3. Click: "Settings" → "Environment Variables"
4. Add/Update these variables:

**For Preview & Production**:
```
EXTERNAL_API_BASE_URL = https://deedpro-external-api.onrender.com
EXTERNAL_API_ADMIN_SETUP_SECRET = deedpro-admin-secret-2025
ROLE_PARTNER_ADMIN_BYPASS = true
```

**⚠️ CRITICAL**: Values must match exactly between Render and Vercel!
- `ADMIN_SETUP_SECRET` (Render) = `EXTERNAL_API_ADMIN_SETUP_SECRET` (Vercel)

---

### **Step 3.3: Redeploy Frontend**

**Trigger new deployment** (to load new env vars):
1. Go to Vercel dashboard → Deployments
2. Click: "Redeploy" on latest deployment
3. Or: Push any commit to GitHub (triggers auto-deploy)

**Why**: Vercel only loads env vars at build time!

---

## 🧪 **STEP 4: SMOKE TESTS** ✅

### **Test 4.1: External API Health Check**

```bash
curl -sS https://deedpro-external-api.onrender.com/healthz
```

**Expected**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-10-30T10:30:00Z"
}
```

---

### **Test 4.2: Bootstrap First Partner**

```bash
curl -X POST https://deedpro-external-api.onrender.com/admin/api-keys/bootstrap \
  -H "X-Admin-Setup-Secret: deedpro-admin-secret-2025" \
  -H "Content-Type: application/json" \
  -d '{
    "company": "Test Company",
    "scopes": ["deed:create", "deed:read"],
    "rate_limit_per_minute": 60
  }'
```

**Expected**:
```json
{
  "api_key": "dp_pk_abc123xyz456...",
  "key_prefix": "dp_pk_ab",
  "company": "Test Company",
  "scopes": ["deed:create", "deed:read"],
  "rate_limit_per_minute": 60,
  "created_at": "2025-10-30T10:30:00Z"
}
```

**⚠️ SAVE THE API KEY!** It's shown only once!

---

### **Test 4.3: Generate Test Deed**

```bash
curl -X POST https://deedpro-external-api.onrender.com/v1/deeds/grant \
  -H "X-API-Key: dp_pk_abc123xyz456..." \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "TEST-001",
    "property_address": "123 Main St, La Verne, CA",
    "parties": {
      "grantor": "Alice Test",
      "grantee": "Bob Test"
    }
  }'
```

**Expected**:
```json
{
  "deed_id": "uuid-here",
  "pdf_url": "https://...",
  "status": "completed",
  "created_at": "2025-10-30T10:30:00Z"
}
```

---

### **Test 4.4: Admin UI End-to-End**

1. **Navigate to Admin**:
   ```
   https://deedpro-frontend-new.vercel.app/admin-honest-v2
   ```

2. **Click "🤝 API Partners"**:
   - Should load without 500 errors ✅
   - Shows partners list (empty or with Test Company)

3. **Click "+ Add Partner"**:
   - Fill form: Company="Real Partner", Scopes=both, Rate=120
   - Click "Generate API Key"
   - Should see key: `dp_pk_...` ✅
   - Copy key

4. **Click "View" on partner**:
   - Should show usage analytics ✅
   - API Calls: 1 (from Test 4.3)
   - Avg Latency: X ms
   - Recent calls table shows POST /v1/deeds/grant

5. **Test Revoke**:
   - Click "Revoke" on Test Company
   - Confirm
   - Status changes to "Revoked" ✅
   - Try using revoked key (should get 401)

---

### **Test 4.5: Database Spot Checks**

**Connect to Postgres**:
```bash
# Via Render Shell or local psql
psql $DATABASE_URL
```

**Check API Keys**:
```sql
SELECT 
  key_prefix, 
  company, 
  is_active, 
  scopes, 
  rate_limit_per_minute, 
  created_at 
FROM api_keys 
ORDER BY created_at DESC 
LIMIT 3;
```

**Expected**: 2 rows (Test Company + Real Partner)

**Check Usage**:
```sql
SELECT 
  api_key_prefix, 
  endpoint, 
  status_code, 
  latency_ms, 
  created_at 
FROM api_usage 
ORDER BY id DESC 
LIMIT 10;
```

**Expected**: 1 row (POST /v1/deeds/grant, status 200)

**Check Deeds**:
```sql
SELECT 
  partner, 
  order_id, 
  deed_type, 
  pdf_url, 
  created_at 
FROM external_deeds 
ORDER BY created_at DESC 
LIMIT 3;
```

**Expected**: 1 row (Test Company, TEST-001, grant-deed)

---

## 🔄 **STEP 5: ROLLBACK PLAN** ✅

### **If Something Goes Wrong**:

**Option A: Disable External API Service** (safest):
1. Go to Render dashboard
2. Select: `deedpro-external-api`
3. Click: "Suspend"
4. Main API stays up, core deed generation unaffected

**Option B: Revert Git Commits**:
```bash
# Revert render.yaml changes
git revert <commit-hash>
git push origin main

# Render auto-deploys, External API removed
```

**Option C: Remove Vercel Env Vars**:
1. Go to Vercel → Settings → Environment Variables
2. Delete: `EXTERNAL_API_BASE_URL`
3. Redeploy frontend
4. Partners page fails gracefully (no impact on core features)

**No Impact**:
- ✅ Main API stays up
- ✅ Core deed generation unaffected
- ✅ User auth working
- ✅ Frontend working (except partners page)

---

## 🎯 **STEP 6: HARDENING BACKLOG** (Post-Deploy)

### **After Successful Deployment**:

1. **RBAC** (Week 1):
   - Replace `ROLE_PARTNER_ADMIN_BYPASS=true`
   - Add JWT role verification
   - Restrict `/admin/partners` to admins only

2. **Redis** (Week 2 - if scaling):
   - Add Upstash Redis or Render Redis
   - Update `RATE_LIMIT_REDIS_URL`
   - Enables multi-instance rate limiting

3. **S3 Storage** (Week 2 - if needed):
   - Switch from `local` to `s3`
   - Set up S3 bucket + CDN
   - Update env vars

4. **Partner Welcome Pack** (Week 3):
   - Auto-generate Postman collection
   - Email to partner with API key
   - Include docs + examples

5. **Billing** (Month 2 - if monetizing):
   - Tie `api_usage` to Stripe metering
   - Charge partners per API call
   - Monthly invoices

---

## 📊 **DEPLOYMENT CHECKLIST**

### **Pre-Deployment**:
- [ ] Step 0.1: Move `phase22-api-patch/` to `backend/external_api/`
- [ ] Step 0.2: Update `backend/requirements.txt` with deps
- [ ] Step 1: Run DB migrations (3 tables created)
- [ ] Step 2: Update `render.yaml` (add External API service)
- [ ] Commit changes: `git add . && git commit -m "Phase 22-B: Deploy External API"`

### **Deployment**:
- [ ] Push to GitHub: `git push origin main`
- [ ] Render auto-deploys both services (~3 minutes)
- [ ] Set manual env vars in Render (ADMIN_SETUP_SECRET, etc.)
- [ ] Get External API URL from Render

### **Frontend Update**:
- [ ] Add Vercel env vars (EXTERNAL_API_BASE_URL, etc.)
- [ ] Redeploy frontend (trigger via Vercel or git push)

### **Testing**:
- [ ] Test 4.1: Health check (/healthz)
- [ ] Test 4.2: Bootstrap partner (get API key)
- [ ] Test 4.3: Generate test deed
- [ ] Test 4.4: Admin UI end-to-end
- [ ] Test 4.5: Database spot checks

### **Post-Deployment**:
- [ ] Document External API URL in PROJECT_STATUS
- [ ] Update PHASE_22B_SETUP_GUIDE with production URLs
- [ ] Notify team: "Partners feature is live!"
- [ ] Monitor Render logs for errors

---

## 🚀 **READY TO EXECUTE!**

**Estimated Time**:
- Step 0 (Prep): 3 minutes
- Step 1 (Migrations): 2 minutes
- Step 2 (Render): 5 minutes
- Step 3 (Vercel): 3 minutes
- Step 4 (Tests): 7 minutes
- **Total**: ~20 minutes ✅

**Confidence**: 98% (we've done this before!)

**Risk**: Low (clean rollback available)

**Your Call, Champ!** Ready to start Step 0? 💪

---

**Status**: ✅ **PLAN ALIGNED & READY**  
**Next**: Start Step 0.1 (move files) when you say go!

