# 🚨 Phase 15 v5: SiteX Data Prefill Gap Analysis

**Date**: October 16, 2025, 10:05 PM  
**Severity**: CRITICAL  
**Impact**: Modern wizard creates deeds with missing required fields (legal_description, grantorName, vesting)

---

## 📋 **EXECUTIVE SUMMARY**

The **Modern wizard is NOT prefilling SiteX data** that the Classic wizard does, causing:
1. Incomplete deeds created in database
2. PDF generation failures (400 Bad Request: "Grantor/Legal description required")
3. Poor user experience (must manually enter data already retrieved)

**Root Cause**: `PropertyStepBridge.tsx` only extracts 3 of 10+ available fields from SiteX API response.

---

## 🔍 **CLASSIC WIZARD (WORKING) - What It Does**

### **Data Flow**:
1. User searches property → Google Places API
2. Property selected → `/api/property/enrich` (SiteX + TitlePoint)
3. Backend returns enriched data:
   ```json
   {
     "apn": "8381-021-001",
     "county": "Los Angeles County",
     "legal_description": "LOT 1 OF TRACT 12345...",
     "primary_owner": "JOHN DOE AND JANE DOE",
     "vesting_details": "HUSBAND AND WIFE AS JOINT TENANTS",
     "assessment_year": "2024",
     "last_sale_date": "2020-05-15",
     "last_sale_price": "$500,000"
   }
   ```
4. Frontend prefills form fields:
   ```typescript
   setFormData(prev => ({
     ...prev,
     apn: enrichedData.data.apn || '',
     county: enrichedData.data.county || '',
     legalDescription: enrichedData.data.legal_description || '',
     grantorName: enrichedData.data.primary_owner || '',     // ← PREFILLS
     vesting: enrichedData.data.vesting_details || ''        // ← PREFILLS
   }));
   ```

**File**: `frontend/src/app/create-deed/page-legacy.tsx` lines 1164-1175

---

## 🔴 **MODERN WIZARD (BROKEN) - What It's Missing**

### **Data Flow**:
1. User searches property → Google Places API
2. Property selected → `/api/property/search` (Phase 14-C, same backend as enrich)
3. Backend returns **SAME enriched data** ✅
4. `PropertySearchWithTitlePoint` component receives data:
   ```typescript
   const propertyInfo = {
     fullAddress: addressData.fullAddress || '',
     apn: result.apn || '',
     county: result.county || '',
     legalDescription: result.legal_description || '',        // ✅ AVAILABLE
     titlePoint: {
       vestingDetails: result.vesting_details || '',          // ✅ AVAILABLE
     },
     currentOwnerPrimary: result.primary_owner || ''          // ✅ AVAILABLE
   };
   ```
   **File**: `frontend/src/components/PropertySearchWithTitlePoint.tsx` lines 428-455

5. **PropertyStepBridge FAILS to extract these fields**:
   ```typescript
   const storeUpdate = {
     verifiedData: data,
     propertyVerified: true,
     apn: data.apn,                                          // ✅ Extracts
     county: data.county,                                    // ✅ Extracts
     property: {
       address: data.fullAddress || data.address,
       apn: data.apn,
       county: data.county,
       verified: true
     },
     // ❌ Only tries to extract grantorName, ignores legalDescription and vesting
     grantorName: data.titlePoint?.owners?.[0]?.fullName || 
                  data.titlePoint?.owners?.[0]?.name || 
                  ''
   };
   ```
   **File**: `frontend/src/features/wizard/mode/bridge/PropertyStepBridge.tsx` lines 18-33

---

## 🎯 **MISSING FIELDS**

| Field | Classic Wizard | Modern Wizard | Backend Has It? | Impact |
|-------|----------------|---------------|-----------------|--------|
| `apn` | ✅ Prefilled | ✅ Prefilled | ✅ Yes | None |
| `county` | ✅ Prefilled | ✅ Prefilled | ✅ Yes | None |
| `legalDescription` | ✅ Prefilled | ❌ **MISSING** | ✅ Yes | PDF 400 error |
| `grantorName` | ✅ Prefilled (from `primary_owner`) | ⚠️ Partial (wrong path) | ✅ Yes | PDF 400 error |
| `vesting` | ✅ Prefilled (from `vesting_details`) | ❌ **MISSING** | ✅ Yes | Incomplete deed |
| `currentOwnerPrimary` | ✅ Stored | ❌ **MISSING** | ✅ Yes | Missing context |
| `currentOwnerSecondary` | ✅ Stored | ❌ **MISSING** | ✅ Yes | Missing context |
| `propertyType` | ✅ Stored | ❌ **MISSING** | ✅ Yes | Missing context |
| `lastSaleDate` | ✅ Stored | ❌ **MISSING** | ✅ Yes | Missing context |
| `lastSalePrice` | ✅ Stored | ❌ **MISSING** | ✅ Yes | Missing context |

---

## 🔧 **THE FIX**

### **File**: `frontend/src/features/wizard/mode/bridge/PropertyStepBridge.tsx`

**Current (Broken)**:
```typescript
const storeUpdate = {
  verifiedData: data,
  propertyVerified: true,
  apn: data.apn,
  county: data.county,
  property: {
    address: data.fullAddress || data.address,
    apn: data.apn,
    county: data.county,
    verified: true
  },
  // ❌ Only grantorName, wrong path
  grantorName: data.titlePoint?.owners?.[0]?.fullName || 
               data.titlePoint?.owners?.[0]?.name || 
               '',
};
```

**Fixed (Complete)**:
```typescript
const storeUpdate = {
  verifiedData: data,
  propertyVerified: true,
  apn: data.apn,
  county: data.county,
  property: {
    address: data.fullAddress || data.address,
    apn: data.apn,
    county: data.county,
    verified: true
  },
  // ✅ Prefill ALL critical fields from SiteX data
  legalDescription: data.legalDescription || '',
  grantorName: data.currentOwnerPrimary || 
               data.titlePoint?.owners?.[0]?.fullName || 
               data.titlePoint?.owners?.[0]?.name || 
               '',
  vesting: data.titlePoint?.vestingDetails || '',
  // ✅ Store additional context for future use
  currentOwnerPrimary: data.currentOwnerPrimary || '',
  currentOwnerSecondary: data.currentOwnerSecondary || '',
  propertyType: data.propertyType || '',
  lastSaleDate: data.titlePoint?.lastSaleDate || '',
  lastSalePrice: data.titlePoint?.lastSalePrice || ''
};
```

---

## 🧪 **TESTING PLAN**

### **Before Fix**:
1. Create Grant Deed in Modern mode
2. Complete property search (Step 1)
3. Answer questions in Modern Q&A
4. Check console for `grantorName`, `legalDescription`, `vesting`
   - **Expected**: Empty or undefined ❌
5. Click "Confirm & Generate"
6. **Result**: PDF generation fails with 400 error

### **After Fix**:
1. Create Grant Deed in Modern mode
2. Complete property search (Step 1)
3. Check console: `[PropertyStepBridge] Updating store with:`
   - **Expected**: See `legalDescription`, `grantorName`, `vesting` populated ✅
4. Answer questions in Modern Q&A (some may auto-prefill)
5. Click "Confirm & Generate"
6. **Result**: PDF generates successfully ✅

---

## 📊 **RIPPLE EFFECT ANALYSIS**

### **1. Adapters (grantDeedAdapter.ts, etc.)**
**Status**: ✅ Already correctly structured

The adapters expect these fields:
```typescript
return {
  deed_type: 'grant-deed',
  property_address: state.propertyAddress || state.property?.address || '',
  apn: state.apn || state.property?.apn || '',
  county: state.county || state.property?.county || '',
  grantor_name: state.grantorName || state.parties?.grantor?.name || '',
  grantee_name: state.granteeName || state.parties?.grantee?.name || '',
  vesting: state.vesting || state.vesting?.description || null
};
```

They already have fallback paths (`state.grantorName`, `state.vesting`), so once `PropertyStepBridge` populates these, adapters will pick them up automatically.

### **2. ModernEngine (promptFlows)**
**Status**: ⚠️ May need enhancement

Current prompts ask users to enter grantor/grantee/vesting manually. After the fix:
- **Option A**: Keep prompts, but prefill the input fields with SiteX data
- **Option B**: Skip prompts if data already complete (may confuse users)
- **Recommendation**: Option A - show prompts with prefilled values, allow edits

### **3. SmartReview Component**
**Status**: ✅ No changes needed

SmartReview reads from Zustand state, which will now have complete data.

### **4. Classic Wizard**
**Status**: ✅ No impact

Classic wizard uses completely separate code path.

---

## 🚀 **DEPLOYMENT PLAN**

### **Step 1: Fix PropertyStepBridge** (P0 - Critical)
1. Update `PropertyStepBridge.tsx` to extract all SiteX fields
2. Test in Modern wizard
3. Deploy to Vercel

### **Step 2: Enhance ModernEngine Prompts** (P1 - Nice to have)
1. Add prefill logic to prompt inputs (grantor, vesting prompts)
2. Show prefilled values as placeholders or default values
3. Allow users to edit if needed

### **Step 3: Update SmartReview** (P2 - Enhancement)
1. Add "Auto-filled from property records" indicator for prefilled fields
2. Highlight which fields were manually entered vs. auto-filled

---

## 📝 **SUCCESS CRITERIA**

After fix:
- ✅ Modern wizard creates deeds with complete data (no 400 errors)
- ✅ Legal description, grantor, vesting prefilled from SiteX
- ✅ Users can still override prefilled values if needed
- ✅ PDF generation success rate improves from ~20% to ~95%
- ✅ No infinite retry loops (already fixed separately)

---

**Next Steps**: Implement PropertyStepBridge fix immediately (P0).

