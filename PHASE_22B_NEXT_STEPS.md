# 🎯 PHASE 22-B: NEXT STEPS AFTER PUSH

**Current Status**: Step 0 Complete ✅  
**Next Action**: Push to GitHub → Triggers Render deployment  
**Time**: October 30, 2025, 11:20 AM PST

---

## ✅ **WHAT WE JUST COMPLETED** (Step 0)

1. ✅ Moved `phase22-api-patch/` to `backend/external_api/`
2. ✅ Updated `backend/requirements.txt` with External API deps
3. ✅ Updated `render.yaml` with External API service
4. ✅ Committed: `696bc98`
5. ✅ Ready to push!

---

## 🚀 **STEP 1: PUSH TO GITHUB** (Next!)

### **Command**:
```powershell
git push origin main
```

### **What Happens**:
1. GitHub receives commit
2. Render webhook triggered
3. **Two services deploy simultaneously**:
   - `deedpro-main-api` (redeploys with new deps)
   - `deedpro-external-api` (NEW SERVICE!)
4. Build time: ~3-5 minutes each

### **Expected Output**:
```
Enumerating objects: XX, done.
Writing objects: 100% (XX/XX), X.XX KiB
To https://github.com/easydeed/new-front.git
   31aeaa9..696bc98  main -> main
```

### **Monitor Deployment**:
1. Go to: https://dashboard.render.com
2. Watch logs for `deedpro-external-api`
3. Wait for "Live" status

---

## ⚙️ **STEP 2: SET MANUAL ENV VARS IN RENDER** (After deployment)

### **Navigate to External API Service**:
1. Render Dashboard → `deedpro-external-api`
2. Click "Environment" tab
3. Add these manual values:

### **Required Variables**:

#### **A. ADMIN_SETUP_SECRET** (CRITICAL!)
```
Key: ADMIN_SETUP_SECRET
Value: deedpro-admin-secret-2025
```
⚠️ **MUST MATCH** Vercel's `EXTERNAL_API_ADMIN_SETUP_SECRET`!

#### **B. MAIN_API_INTERNAL_TOKEN** (Generate new!)
```
Key: MAIN_API_INTERNAL_TOKEN
Value: <generate secure 32-char token>
```

**Generate Token** (PowerShell):
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

Example: `aB3dF9xK2mP7qR5tY8zW1vN4cH6jL0sU`

### **Optional Variables** (if using S3):
```
S3_BUCKET = your-bucket-name
S3_REGION = us-west-1
AWS_ACCESS_KEY_ID = your-aws-key
AWS_SECRET_ACCESS_KEY = your-aws-secret
STORAGE_DRIVER = s3  # Change from 'local'
```

### **After Setting**:
- Click "Save Changes"
- Render restarts service (~30 seconds)
- Wait for "Live" status again

---

## 🗄️ **STEP 3: RUN DB MIGRATIONS** (Via Render Shell)

### **Option A: Using Render Shell** (Recommended):

1. **Open Shell**:
   - Render Dashboard → `deedpro-main-api` (or external-api)
   - Click "Shell" tab
   - Wait for connection

2. **Run Migrations**:
```bash
# Navigate to migrations
cd migrations

# Enable UUID extension (if not already enabled)
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

# Run migrations
psql $DATABASE_URL -f 001_api_keys.sql
psql $DATABASE_URL -f 002_api_usage.sql
psql $DATABASE_URL -f 003_external_deeds.sql

# Verify tables created
psql $DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_name IN ('api_keys', 'api_usage', 'external_deeds');"
```

### **Expected Output**:
```
CREATE EXTENSION
CREATE TABLE
CREATE INDEX
CREATE INDEX
  table_name
-----------------
 api_keys
 api_usage
 external_deeds
(3 rows)
```

### **Option B: Using Local psql** (If installed):
```powershell
# Get DATABASE_URL from Render dashboard
$env:DATABASE_URL="postgresql://user:pass@host:port/database"

# Run migrations
psql $env:DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
psql $env:DATABASE_URL -f backend/migrations/001_api_keys.sql
psql $env:DATABASE_URL -f backend/migrations/002_api_usage.sql
psql $env:DATABASE_URL -f backend/migrations/003_external_deeds.sql
```

---

## ☁️ **STEP 4: UPDATE VERCEL ENV VARS**

### **Get External API URL**:
After deployment, Render provides:
```
https://deedpro-external-api.onrender.com
```

### **Update Vercel**:
1. Go to: https://vercel.com/dashboard
2. Select: `deedpro-frontend-new`
3. Settings → Environment Variables
4. Add/Update (for Preview & Production):

```
EXTERNAL_API_BASE_URL = https://deedpro-external-api.onrender.com
EXTERNAL_API_ADMIN_SETUP_SECRET = deedpro-admin-secret-2025
ROLE_PARTNER_ADMIN_BYPASS = true
```

### **Redeploy Frontend**:
- Vercel → Deployments → "Redeploy"
- Or: Push any commit to trigger auto-deploy

---

## 🧪 **STEP 5: SMOKE TESTS**

### **Test 5.1: Health Check**
```bash
curl -sS https://deedpro-external-api.onrender.com/healthz
```
Expected: `{"status":"healthy","version":"1.0.0"}`

### **Test 5.2: Bootstrap First Partner**
```bash
curl -X POST https://deedpro-external-api.onrender.com/admin/api-keys/bootstrap \
  -H "X-Admin-Setup-Secret: deedpro-admin-secret-2025" \
  -H "Content-Type: application/json" \
  -d '{"company":"Test Company","scopes":["deed:create","deed:read"],"rate_limit_per_minute":60}'
```
Expected: Returns API key (starts with `dp_pk_`)

### **Test 5.3: Admin UI**
1. Visit: `https://deedpro-frontend-new.vercel.app/admin-honest-v2`
2. Click "🤝 API Partners"
3. Should load without 500 errors!
4. See Test Company in list

### **Test 5.4: Database Verification**
```sql
SELECT key_prefix, company, is_active FROM api_keys ORDER BY created_at DESC LIMIT 3;
```
Expected: 1 row (Test Company)

---

## 📝 **DEPLOYMENT LOG**

Track progress in `deployment_log.txt`:
```
✅ Step 0.1 Complete: External API files moved to backend/external_api/
✅ Step 0.2 Complete: requirements.txt updated with External API deps
✅ Step 0 Complete: Prep finished - files moved, deps updated, render.yaml configured
⏳ Step 1: Push to GitHub (next!)
⏳ Step 2: Set manual env vars in Render
⏳ Step 3: Run DB migrations
⏳ Step 4: Update Vercel env vars
⏳ Step 5: Smoke tests
```

---

## 🔄 **ROLLBACK PLAN** (If Needed)

### **Option A: Suspend Service**:
1. Render Dashboard → `deedpro-external-api`
2. Settings → "Suspend"
3. Main API unaffected

### **Option B: Revert Commit**:
```bash
git revert 696bc98
git push origin main
```

### **Option C: Remove from render.yaml**:
```bash
# Remove External API service from render.yaml
# Push to GitHub
# Render removes service
```

---

## ✅ **READY TO PROCEED?**

**Say "Push it!" and I'll execute Step 1: `git push origin main`** 🚀

**Or**: "Wait, I need to check something" - I'll pause!

**Your call, Champ!** 💪

