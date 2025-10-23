# Phase 16 - Issues Found After Partners Fix

**Date**: October 23, 2025  
**Status**: 🔴 3 NEW ISSUES IDENTIFIED

---

## Issue #1: Partners Table - Columns Not Sortable
**Status**: 🟡 UI Enhancement Needed  
**Priority**: Medium  
**Location**: `/partners` page

**Expected**: Click column headers to sort  
**Actual**: Headers not clickable/sortable

---

## Issue #2: Partners Dropdown Not Showing Saved Partners
**Status**: 🔴 CRITICAL - Data Not Loading  
**Priority**: HIGH  
**Location**: Modern Wizard → "Requested By" field

**Expected**: Dropdown shows partners from Partners page  
**Actual**: Dropdown is empty (no partners showing)

**Possible Causes**:
1. 403 fix didn't work (still blocked)
2. Partners loading but not being passed to dropdown
3. PartnersContext not being used in wizard
4. Wrong field mapping

---

## Issue #3: Requested By Not Appearing on PDF
**Status**: 🔴 CRITICAL - Data Loss  
**Priority**: HIGH  
**Location**: Generated PDF deed

**Expected**: "Requested By" field value appears on PDF  
**Actual**: Field is missing from generated deed

**Data Flow**:
1. User types/selects partner in wizard ✅
2. Data saved to database? ❓
3. Data included in PDF payload? ❓
4. PDF template renders field? ❓

---

## 🔍 Investigation Plan

### For Issue #2 (Dropdown Empty):
1. Check browser console for errors
2. Verify partners actually saved to database
3. Check if PartnersContext.refresh() is being called
4. Verify dropdown is looking for partners in correct location

### For Issue #3 (PDF Missing Field):
1. Check if `requestedBy` is in deed database record
2. Check if preview page includes `requestedBy` in PDF payload
3. Check if PDF template has `requested_by` field
4. Check field name mapping

---

**Let's investigate Issue #2 and #3 first (data issues), then Issue #1 (UI enhancement)**

