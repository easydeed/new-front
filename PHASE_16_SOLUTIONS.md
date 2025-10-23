# Phase 16 - Solutions for 3 Issues

**Date**: October 23, 2025  
**Status**: 🟡 SOLUTIONS IDENTIFIED

---

## Issue #2: Partners Dropdown Not Showing (CHECK FIRST)

**Status**: ✅ FIX DEPLOYED (needs verification)

**What Was Fixed**:
- Added `Authorization: Bearer ${token}` header to PartnersContext.refresh()
- This should fix the 403 error

**Next Step**: User needs to verify if dropdown now shows partners after refresh

**If still broken, possible causes**:
1. Partners not actually saved to partners table
2. PrefillCombo not using PartnersContext correctly
3. Field mapping issue

---

## Issue #3: Requested By Not Appearing on PDF ⚠️ **DATABASE ISSUE**

**Root Cause**: `deeds` table has NO `requested_by` column!

**Current Database Schema**:
```sql
CREATE TABLE deeds (
  ...
  grantor_name VARCHAR(255),
  grantee_name VARCHAR(255),
  vesting VARCHAR(255),
  -- NO requested_by column! ❌
  metadata JSONB  -- Could store it here as workaround
)
```

**PDF Models Expect** (backend/models/grant_deed.py):
```python
class GrantDeedRenderContext(BaseModel):
    requested_by: Optional[str] = None  # ✅ PDF template expects this
```

**Solution Options**:

### Option A: Add Column (PROPER FIX) ⭐ Recommended
```sql
ALTER TABLE deeds ADD COLUMN requested_by VARCHAR(255);
```

**Changes Needed**:
1. Backend database migration (add column)
2. Update `database.py` create_deed() to save requested_by
3. Update `backend/main.py` DeedCreate model to accept requested_by
4. Update preview page to send requested_by to PDF endpoint

### Option B: Use metadata JSONB (QUICK FIX)
Store in existing `metadata` column:
```python
metadata = {
  'requested_by': 'Partner Name',
  'source': 'modern-canonical'
}
```

**Changes Needed**:
1. Update create_deed() to store in metadata
2. Update preview page to extract from metadata and send to PDF
3. No database migration needed

---

## Issue #1: Partners Table - Columns Not Sortable

**Status**: 🟡 UI Enhancement Needed

**Location**: `/partners` page

**Solution**: Add sortable table component

**Options**:
1. Use existing table library (e.g., TanStack Table, react-table)
2. Build custom sortable headers
3. Add sort icons and state management

**Priority**: Low (UI enhancement, not blocking)

---

## 🎯 Recommended Order of Fixes

1. ✅ **First**: Verify Issue #2 fix worked (check if partners show in dropdown)
2. ⚠️ **Second**: Fix Issue #3 (requested_by not saved) - Choose Option A or B
3. 🟢 **Third**: Fix Issue #1 (sortable table) - UI enhancement

---

## 🤔 Decision Needed from User

**For Issue #3 (Requested By not on PDF)**:

**Which solution do you prefer?**

**Option A (Proper Fix)**:
- ✅ Clean database design
- ✅ Easier to query later
- ⚠️ Requires database migration
- ⚠️ More files to change

**Option B (Quick Fix)**:
- ✅ No database migration
- ✅ Uses existing metadata column
- ⚠️ Harder to query
- ⚠️ Less discoverable

**My Recommendation**: **Option A** (add column) - It's the proper solution and not much harder.

---

**What would you like to tackle first?**

