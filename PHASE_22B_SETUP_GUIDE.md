# 🔧 PHASE 22-B SETUP GUIDE - Fix 500 Errors

**Issue**: Partners API returning 500 errors  
**Root Cause**: Missing environment variables in `frontend/.env.local`  
**Time to Fix**: 2 minutes ⚡

---

## 🚨 **THE PROBLEM**

Your browser console shows:
```
/api/partners/admin/list: 500 (Internal Server Error)
/api/partners/admin/bootstrap: 500 (Internal Server Error)
```

**Why?** The frontend API routes need to call the External API (port 8001), but they're missing:
1. `EXTERNAL_API_BASE_URL` (where is the External API?)
2. `EXTERNAL_API_ADMIN_SETUP_SECRET` (admin authentication)

---

## ✅ **THE SOLUTION** (2 Steps)

### **Step 1: Update `frontend/.env.local`**

Add these two lines to your existing `frontend/.env.local`:

```bash
# Existing content
NEXT_PUBLIC_DIAG=1

# ✅ ADD THESE LINES (Phase 22-B):
EXTERNAL_API_BASE_URL=http://localhost:8001
EXTERNAL_API_ADMIN_SETUP_SECRET=deedpro-admin-secret-2025

# OR if using production External API:
# EXTERNAL_API_BASE_URL=https://your-external-api-production.com
# EXTERNAL_API_ADMIN_SETUP_SECRET=your_production_secret_here
```

**Command to add them** (Windows PowerShell):
```powershell
Add-Content -Path "frontend\.env.local" -Value "`n# Phase 22-B: External API Config"
Add-Content -Path "frontend\.env.local" -Value "EXTERNAL_API_BASE_URL=http://localhost:8001"
Add-Content -Path "frontend\.env.local" -Value "EXTERNAL_API_ADMIN_SETUP_SECRET=deedpro-admin-secret-2025"
```

### **Step 2: Start External API** (If not running)

**Check if External API is running**:
```bash
curl http://localhost:8001/health
# Expected: {"status": "healthy"}
```

**If NOT running**, start it:

#### **Option A: Quick Start (Local Storage)**
```bash
cd phase22-api-patch

# Set minimal env vars
$env:STORAGE_DRIVER="local"
$env:LOCAL_STORAGE_DIR="./external_api/storage/files"
$env:ADMIN_SETUP_SECRET="deedpro-admin-secret-2025"
$env:DATABASE_URL="your_postgres_connection_string"
$env:MAIN_API_BASE_URL="http://localhost:8000"

# Run server
uvicorn external_api.app:app --host 0.0.0.0 --port 8001 --reload
```

#### **Option B: Full Setup (With .env file)**

Create `phase22-api-patch/.env`:
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/deedpro

# Main API (your existing backend on port 8000)
MAIN_API_BASE_URL=http://localhost:8000

# Admin Secret (must match frontend)
ADMIN_SETUP_SECRET=deedpro-admin-secret-2025

# Storage (start with local, upgrade to S3 later)
STORAGE_DRIVER=local
LOCAL_STORAGE_DIR=./external_api/storage/files

# Optional: S3 (if you want cloud storage)
# STORAGE_DRIVER=s3
# AWS_ACCESS_KEY_ID=your_key
# AWS_SECRET_ACCESS_KEY=your_secret
# S3_BUCKET_NAME=deedpro-external-deeds
# S3_REGION=us-west-1

# Optional: Redis (for rate limiting)
# REDIS_URL=redis://localhost:6379/0

# Server
HOST=0.0.0.0
PORT=8001
LOG_LEVEL=INFO
```

Then run:
```bash
cd phase22-api-patch
bash scripts/dev_run.sh
# OR on Windows:
python -m uvicorn external_api.app:app --host 0.0.0.0 --port 8001 --reload
```

---

## 🧪 **VERIFY IT WORKS**

### **1. Check External API is Running**
```bash
curl http://localhost:8001/health
# Expected: {"status": "healthy", "version": "1.0.0"}
```

### **2. Restart Frontend Dev Server**
```bash
cd frontend
npm run dev
```

**Why restart?** Next.js only loads `.env.local` at startup!

### **3. Test Partners Page**
1. Go to: `http://localhost:3000/admin-honest-v2`
2. Click **"🤝 API Partners"** button
3. Should see partners list (empty or with existing partners)
4. No more 500 errors! ✅

### **4. Create Test Partner**
1. Click **"+ Add Partner"**
2. Fill form:
   - Company: "Test Company"
   - Scopes: [✓] deed:create [✓] deed:read
   - Rate Limit: 120
3. Click **"Generate API Key"**
4. Should see key: `dp_pk_abc123...`
5. Copy key and save it!

---

## 🐛 **TROUBLESHOOTING**

### **Issue: Still getting 500 errors**

**Check 1**: Did you restart the frontend?
```bash
# Stop npm run dev (Ctrl+C)
cd frontend
npm run dev
```

**Check 2**: Verify env vars are set
```bash
# In frontend directory
Get-Content .env.local
# Should show EXTERNAL_API_BASE_URL and EXTERNAL_API_ADMIN_SETUP_SECRET
```

**Check 3**: Check browser console for exact error
```javascript
// Open DevTools (F12) → Console
// Look for detailed error message
```

### **Issue: External API not starting**

**Error: `ModuleNotFoundError: No module named 'fastapi'`**

**Fix**: Install dependencies
```bash
cd phase22-api-patch
pip install fastapi "uvicorn[standard]" pydantic-settings SQLAlchemy psycopg[binary] httpx boto3 python-dotenv python-multipart
```

**Error: `psycopg.OperationalError: could not connect to server`**

**Fix**: Check DATABASE_URL
```bash
# In phase22-api-patch/.env
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/your_database

# Test connection
psql "$DATABASE_URL" -c "SELECT 1"
```

**Error: `Port 8001 already in use`**

**Fix**: Kill existing process
```powershell
# Find process on port 8001
Get-Process -Id (Get-NetTCPConnection -LocalPort 8001).OwningProcess

# Kill it
Stop-Process -Id <process_id>
```

### **Issue: External API running, but 500 errors persist**

**Check**: Admin secret mismatch

```bash
# Frontend expects:
cat frontend/.env.local | grep ADMIN_SETUP_SECRET
# EXTERNAL_API_ADMIN_SETUP_SECRET=deedpro-admin-secret-2025

# External API expects:
cat phase22-api-patch/.env | grep ADMIN_SETUP_SECRET
# ADMIN_SETUP_SECRET=deedpro-admin-secret-2025

# ✅ They MUST MATCH exactly (case-sensitive!)
```

---

## 📊 **AFTER SETUP CHECKLIST**

- [ ] `frontend/.env.local` has `EXTERNAL_API_BASE_URL`
- [ ] `frontend/.env.local` has `EXTERNAL_API_ADMIN_SETUP_SECRET`
- [ ] `phase22-api-patch/.env` has `ADMIN_SETUP_SECRET` (matching frontend)
- [ ] `phase22-api-patch/.env` has `DATABASE_URL`
- [ ] `phase22-api-patch/.env` has `MAIN_API_BASE_URL`
- [ ] External API running on port 8001 (`curl http://localhost:8001/health`)
- [ ] Frontend dev server restarted (to load new env vars)
- [ ] Partners page loads without 500 errors
- [ ] Can create test partner successfully

---

## 🎯 **QUICK COPY-PASTE COMMANDS**

**For Windows PowerShell** (run from project root):

```powershell
# 1. Update frontend/.env.local
Add-Content -Path "frontend\.env.local" -Value "`n# Phase 22-B: External API Config"
Add-Content -Path "frontend\.env.local" -Value "EXTERNAL_API_BASE_URL=http://localhost:8001"
Add-Content -Path "frontend\.env.local" -Value "EXTERNAL_API_ADMIN_SETUP_SECRET=deedpro-admin-secret-2025"

# 2. Create phase22-api-patch/.env
@"
DATABASE_URL=postgresql://user:pass@localhost:5432/deedpro
MAIN_API_BASE_URL=http://localhost:8000
ADMIN_SETUP_SECRET=deedpro-admin-secret-2025
STORAGE_DRIVER=local
LOCAL_STORAGE_DIR=./external_api/storage/files
HOST=0.0.0.0
PORT=8001
LOG_LEVEL=INFO
"@ | Out-File -FilePath "phase22-api-patch\.env" -Encoding UTF8

# 3. Start External API (in separate terminal)
cd phase22-api-patch
python -m uvicorn external_api.app:app --host 0.0.0.0 --port 8001 --reload

# 4. Restart Frontend (in separate terminal)
cd frontend
npm run dev
```

**For Linux/Mac** (run from project root):

```bash
# 1. Update frontend/.env.local
cat >> frontend/.env.local << 'EOF'

# Phase 22-B: External API Config
EXTERNAL_API_BASE_URL=http://localhost:8001
EXTERNAL_API_ADMIN_SETUP_SECRET=deedpro-admin-secret-2025
EOF

# 2. Create phase22-api-patch/.env
cat > phase22-api-patch/.env << 'EOF'
DATABASE_URL=postgresql://user:pass@localhost:5432/deedpro
MAIN_API_BASE_URL=http://localhost:8000
ADMIN_SETUP_SECRET=deedpro-admin-secret-2025
STORAGE_DRIVER=local
LOCAL_STORAGE_DIR=./external_api/storage/files
HOST=0.0.0.0
PORT=8001
LOG_LEVEL=INFO
EOF

# 3. Start External API (in separate terminal)
cd phase22-api-patch
bash scripts/dev_run.sh

# 4. Restart Frontend (in separate terminal)
cd frontend
npm run dev
```

---

## 🚀 **NEXT STEPS**

After setup works:
1. ✅ Create test partner
2. ✅ Generate API key
3. ✅ Test API key with curl
4. ✅ View usage analytics
5. ✅ Test revoke functionality

Then you can onboard real partners (SoftPro, Qualia, etc.)!

---

**Need Help?** Check the detailed docs:
- `docs/ADMIN_API_MANAGEMENT.md` (comprehensive guide)
- `PHASE_22B_EXECUTION_SUMMARY.md` (implementation details)
- `phase22-api-patch/README.md` (External API setup)

**Status**: ✅ **READY TO DEBUG**  
**Time to Fix**: ~2 minutes (just env vars!)  
**Confidence**: 100% 🎯

