# 🔍 **SYSTEMATIC DEBUG REPORT: NULL GRANTOR_NAME**

## 📋 **EXECUTIVE SUMMARY**
- **Issue**: `NotNullViolation: null value in column "grantor_name" violates not-null constraint`
- **Root Cause**: Grantor data is collected in the wizard but NOT sent to the database
- **Impact**: All deed types fail at finalize step
- **Fix Complexity**: LOW (2 small patches)

---

## 🔎 **DATA FLOW TRACE**

### ✅ **Layer 1: Frontend Wizard (WORKING)**
**File**: `frontend/src/features/wizard/steps/Step4PartiesProperty.tsx`

```typescript
// Lines 25-30
const [local, setLocal] = useState<Step4Data>({
  grantorsText: step4Data?.grantorsText ?? "",  // ✅ Grantors collected here (from SiteX or manual)
  granteesText: step4Data?.granteesText ?? "",
  county: step4Data?.county ?? step1Data?.county ?? "",
  legalDescription: step4Data?.legalDescription ?? ""
});
```

**Status**: ✅ Wizard correctly collects grantor names in Step 4
**Note**: Grantors auto-fill from SiteX property search (current owner data)

---

### ✅ **Layer 2: Context Adapter (WORKING)**
**File**: `frontend/src/features/wizard/context/buildContext.ts`

```typescript
// Lines 103-121
function getGrantorsText(s: WizardStore): string {
  // Priority: step4 → titlePoint owners → formData
  if (s.grantDeed?.step4?.grantorsText) {
    return s.grantDeed.step4.grantorsText;  // ✅ Extracted correctly
  }
  // ... fallback logic ...
}

// Lines 161-186
export function toBaseContext(s: WizardStore) {
  return {
    // ... other fields ...
    grantors_text: getGrantorsText(s),  // ✅ Available in context
    grantees_text: getGranteesText(s),
    // ...
  };
}
```

**Status**: ✅ Context adapter correctly extracts `grantors_text`

---

### ❌ **Layer 3: Finalize Payload (BROKEN)**
**File**: `frontend/src/features/wizard/steps/Step5PreviewFixed.tsx`

```typescript
// Lines 123-135
const contextData = contextBuilder(wizardData);

const payload = {
  deed_type: docType,
  property_address: contextData.property_address || '',
  apn: contextData.apn || '',
  county: contextData.county || '',
  legal_description: contextData.legal_description || '',
  grantee_name: contextData.grantees_text || '',  // ✅ Has grantees
  // ❌ MISSING: grantor_name: contextData.grantors_text || '',
  vesting: '',
  owner_type: '',
  sales_price: null,
};
```

**Problem**: 
- `contextData.grantors_text` exists but is NOT added to `payload`
- Backend receives no grantor information

---

### ❌ **Layer 4: Database Insert (BROKEN)**
**File**: `backend/database.py`

```python
# Lines 210-226
cursor.execute("""
    INSERT INTO deeds (user_id, deed_type, property_address, apn, county, 
                     legal_description, owner_type, sales_price, grantee_name, vesting)
    # ❌ MISSING: grantor_name NOT in INSERT!
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    RETURNING *
""", (
    user_id, 
    deed_data.get('deed_type'),
    deed_data.get('property_address') or 'Unknown',
    deed_data.get('apn'),
    deed_data.get('county'),
    deed_data.get('legal_description'),
    deed_data.get('owner_type'),
    deed_data.get('sales_price'),
    deed_data.get('grantee_name'),  # ✅ Has grantee
    # ❌ MISSING: deed_data.get('grantor_name')
    deed_data.get('vesting')
))
```

**Problem**: 
- `grantor_name` column exists in table (NOT NULL constraint)
- INSERT statement doesn't include it
- Database rejects with `NotNullViolation`

---

## 🛠️ **SURGICAL FIX PLAN**

### **Fix 1: Frontend - Add grantor_name to payload**
**File**: `frontend/src/features/wizard/steps/Step5PreviewFixed.tsx`
**Line**: 131 (after `legal_description`)

```typescript
const payload = {
  deed_type: docType,
  property_address: contextData.property_address || '',
  apn: contextData.apn || '',
  county: contextData.county || '',
  legal_description: contextData.legal_description || '',
  grantor_name: contextData.grantors_text || '',  // ✨ ADD THIS LINE
  grantee_name: contextData.grantees_text || '',
  vesting: '',
  owner_type: '',
  sales_price: null,
};
```

---

### **Fix 2: Backend - Add grantor_name to INSERT**
**File**: `backend/database.py`
**Lines**: 211-212, 226

```python
cursor.execute("""
    INSERT INTO deeds (user_id, deed_type, property_address, apn, county, 
                     legal_description, owner_type, sales_price, 
                     grantor_name, grantee_name, vesting)  -- ✨ ADD grantor_name
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)   -- ✨ Now 11 values
    RETURNING *
""", (
    user_id, 
    deed_data.get('deed_type'),
    deed_data.get('property_address') or 'Unknown',
    deed_data.get('apn'),
    deed_data.get('county'),
    deed_data.get('legal_description'),
    deed_data.get('owner_type'),
    deed_data.get('sales_price'),
    deed_data.get('grantor_name'),  # ✨ ADD THIS VALUE
    deed_data.get('grantee_name'),
    deed_data.get('vesting')
))
```

---

## ✅ **EXPECTED RESULTS AFTER FIX**

### **Before Fix**:
```json
{
  "deed_type": "quitclaim",
  "property_address": "",
  "apn": "8381-021-001",
  "county": "Los Angeles County",
  "legal_description": "Not availableretertert",
  "grantee_name": "ertertertert",
  // ❌ NO grantor_name
}
```

### **After Fix**:
```json
{
  "deed_type": "quitclaim",
  "property_address": "",
  "apn": "8381-021-001",
  "county": "Los Angeles County",
  "legal_description": "Not availableretertert",
  "grantor_name": "John Doe; Jane Smith",  // ✅ FROM TitlePoint or Step 4
  "grantee_name": "ertertertert"
}
```

---

## 📊 **TESTING CHECKLIST**

After deploying fix:
- [ ] Test Quitclaim Deed (the failing case)
- [ ] Test Interspousal Transfer
- [ ] Test Warranty Deed
- [ ] Test Tax Deed
- [ ] Test Grant Deed (should still work)
- [ ] Verify grantor appears in Past Deeds
- [ ] Verify grantor appears in PDF

---

## 🎯 **ROLLBACK PLAN**
If the fix causes issues:
1. Revert both patches using Git
2. Database schema is unchanged (safe)
3. No data migration needed

---

**Priority**: P0 - Blocks all deed creation
**Complexity**: Low (2 lines frontend + 2 lines backend)
**Risk**: Minimal (additive change, no schema alteration)
**Testing Time**: 5 minutes (create 1 deed)

---

**Next Steps**: Apply fixes → Deploy → Test 1 Quitclaim deed → Verify in Past Deeds

