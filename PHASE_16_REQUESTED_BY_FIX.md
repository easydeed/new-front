# Phase 16 - Add requested_by Column (Option A)

**Date**: October 23, 2025  
**Status**: 🏗️ IN PROGRESS  
**Approach**: Add database column + update all layers

---

## 🎯 Changes Required (5 Files)

### 1. Database Migration
**File**: `backend/migrations/add_requested_by_column.sql` (NEW)
**Action**: Add column to deeds table

### 2. Database Layer
**File**: `backend/database.py`
**Action**: Update create_deed() to save requested_by

### 3. API Layer
**File**: `backend/main.py`
**Action**: Update DeedCreate Pydantic model to accept requested_by

### 4. Frontend Preview
**File**: `frontend/src/app/deeds/[id]/preview/page.tsx`
**Action**: Send requested_by to PDF endpoint

### 5. Frontend Type Definition
**File**: `frontend/src/app/deeds/[id]/preview/page.tsx`
**Action**: Add requested_by to DeedData interface

---

## 📝 Implementation Steps

### Step 1: Create Migration SQL ✅
### Step 2: Update Backend Database Layer ✅
### Step 3: Update Backend API Model ✅
### Step 4: Update Frontend Preview Page ✅
### Step 5: Deploy & Test ⏳

---

**Let's start!**

