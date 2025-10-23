# Deploy requested_by Fix - Step-by-Step Guide

**Date**: October 23, 2025  
**Status**: 🟡 READY TO DEPLOY

---

## 📋 Files Modified (5 files)

### Backend (3 files):
1. ✅ `backend/database.py` - Added requested_by to INSERT statement
2. ✅ `backend/main.py` - Added requested_by to DeedCreate model
3. ✅ `backend/migrations/add_requested_by_column.sql` - Migration SQL (NEW)
4. ✅ `backend/migrations/run_requested_by_migration.py` - Migration script (NEW)

### Frontend (2 files):
5. ✅ `frontend/src/lib/deeds/finalizeDeed.ts` - Added requested_by to payload
6. ✅ `frontend/src/app/deeds/[id]/preview/page.tsx` - Added requested_by to DeedData and PDF payload

---

## 🚀 Deployment Steps

### Step 1: Commit & Push Code Changes ✅

```bash
git add .
git commit -m "feat(deeds): Add requested_by field support - Phase 16"
git push origin main
```

This will auto-deploy:
- ✅ Frontend to Vercel (~2-3 minutes)
- ✅ Backend to Render (~5-10 minutes)

---

### Step 2: Run Database Migration in Render Shell

**After backend deploys to Render:**

1. Go to Render Dashboard: https://dashboard.render.com/
2. Select your backend service: `deedpro-main-api`
3. Click **"Shell"** tab
4. Run these commands:

```bash
# Navigate to migrations directory
cd migrations

# Run the migration
python run_requested_by_migration.py
```

**Expected Output:**
```
================================================================================
Phase 16: Add requested_by Column to deeds Table
================================================================================

[INFO] Connecting to database...
[SUCCESS] Connected successfully

[INFO] Checking if requested_by column already exists...
[INFO] Column does not exist - running migration...

[INFO] Adding requested_by column...
[SUCCESS] Column added successfully

[INFO] Verifying migration...
[SUCCESS] Verified: requested_by | character varying | Max Length: 255 | Nullable: YES

================================================================================
[SUCCESS] Migration complete!
================================================================================
```

---

### Step 3: Verify the Fix

**Test Modern Wizard:**
1. Go to https://deedpro-frontend-new.vercel.app/create-deed?mode=modern
2. Complete wizard with "Requested By" field
3. Generate PDF
4. **Expected**: "Requested By" appears on the PDF ✅

---

## 📝 What This Fixes

**Before:**
- ❌ requested_by not saved to database
- ❌ requested_by missing from PDF

**After:**
- ✅ requested_by saved in database
- ✅ requested_by sent to PDF endpoint
- ✅ requested_by appears on generated deed

---

## 🔄 Rollback Plan (if needed)

If something breaks:

```sql
-- In Render Shell
ALTER TABLE deeds DROP COLUMN requested_by;
```

Then revert code:
```bash
git revert HEAD
git push origin main
```

---

## ✅ Pre-Deployment Checklist

Before deploying:
- [x] Code changes committed
- [ ] Code pushed to main
- [ ] Vercel deployment complete
- [ ] Render deployment complete  
- [ ] Database migration run in Render shell
- [ ] Tested in production

---

**Ready to deploy when you are!** 🚀

