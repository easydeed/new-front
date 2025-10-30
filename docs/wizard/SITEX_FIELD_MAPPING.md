# SiteX Property Data → Deed Generation Field Mapping

**Last Updated:** October 30, 2025  
**Status:** ✅ Implemented & Updated (Phase 16-19 Critical Fixes)

---

## Overview

This document maps how property data from **SiteX Pro (ICE) REST API** flows through the wizard architecture into final deed documents. Understanding this flow ensures that regardless of which document type users select, the correct fields auto-populate from Step 1 property search.

---

## End-to-End Data Flow

```mermaid
flowchart LR
    A[Step 1: User enters address] --> B[Google Places API]
    B --> C[/api/property/search]
    C --> D[SiteX Pro REST API]
    D --> E[Backend: Feed.PropertyProfile]
    E --> F[Backend: map_sitex_feed_to_ui]
    F --> G[Frontend: PropertyDetails]
    G --> H[Wizard Store: verifiedData]
    H --> I[Step 3: Document Generation]
    I --> J[deedDataMapper.ts]
    J --> K[/api/generate-deed or /api/generate/grant-deed-ca]
    K --> L[PDF with populated fields]
```

---

## 🚨 **CRITICAL PHASE 16-19 DISCOVERIES**

### **Issue #1: Legal Description is NESTED** (Phase 16)
**❌ WRONG**:
```python
profile.get('LegalDescription', '')  # This doesn't exist!
```

**✅ CORRECT**:
```python
legal_info = profile.get('LegalDescriptionInfo', {})
legal_desc = legal_info.get('LegalBriefDescription', '')
```

**Why**: SiteX returns legal description in a NESTED object, not at root level.

---

### **Issue #2: County Field Name** (Phase 19)
**❌ WRONG**:
```python
profile.get('County', '')  # This field doesn't exist!
```

**✅ CORRECT**:
```python
profile.get('CountyName', '') or profile.get('SiteCountyName', '')
```

**Why**: SiteX uses `CountyName`, NOT `County`.

**See**: [../../BREAKTHROUGHS.md](../../BREAKTHROUGHS.md) → Discovery #2 & #7

---

## SiteX API Response Structure

**CORRECTED** based on Phase 16-19 analysis:

```json
{
  "Locations": [...],
  "Feed": {
    "@Name": "Title Profile_144",
    "@Version": 1,
    "PropertyProfile": {
      "APN": "6327-030-021",
      "PropertyAddress": {
        "FullAddress": "6616 WALKER AVE, BELL, CA 90201",
        "APNFormatted": "6327-030-021"
      },
      "OwnerInformation": {
        "OwnerFullName": "MAJESTIC ENTERPRISES LP"
      },
      "PropertyInfo": {
        "PropertyType": "Apartment house (5+ units)"
      },
      "LegalDescriptionInfo": {
        "LegalBriefDescription": "LOT 5 BLK 2 TRACT 12345"
      },
      "CountyName": "LOS ANGELES",
      "SiteCountyName": "LOS ANGELES",
      "FIPS": "06037",
      "LastSaleRecordingDate": "2020-05-15"
    }
  }
}
```

**Key Changes** (Phase 16-19):
- ✅ `LegalDescriptionInfo.LegalBriefDescription` → NOT `LegalDescription`
- ✅ `CountyName` or `SiteCountyName` → NOT `County`
- ✅ `OwnerInformation.OwnerFullName` → Nested owner data
- ✅ `PropertyAddress.APNFormatted` → Nested APN

---

## Backend Field Mapping

**File:** `backend/api/property_endpoints.py` (Lines 576-597)  
**Phase 16-19 CORRECTED**:

| SiteX Field | Backend Mapping | Purpose | Phase |
|-------------|----------------|---------|-------|
| `Feed.PropertyProfile.APN` OR `PropertyAddress.APNFormatted` | `apn` | Assessor's Parcel Number | ✅ |
| `Feed.PropertyProfile.OwnerInformation.OwnerFullName` | `grantorName`, `currentOwnerPrimary` | Current property owner | ✅ |
| `Feed.PropertyProfile.PropertyAddress.FullAddress` | `fullAddress` | Complete address | ✅ |
| `Feed.PropertyProfile.PropertyInfo.PropertyType` | `propertyType` | Property type | ✅ |
| `Feed.PropertyProfile.LegalDescriptionInfo.LegalBriefDescription` | `legalDescription` | Legal description | ✅ Phase 16 |
| `Feed.PropertyProfile.CountyName` OR `SiteCountyName` | `county` | County name | ✅ Phase 19 |
| `Feed.PropertyProfile.FIPS` | `fips` | County FIPS code | ✅ |

**Critical Code** (`backend/api/property_endpoints.py`):
```python
# Phase 16 FIX: Legal Description is NESTED
legal_info = profile.get('LegalDescriptionInfo', {})
legal_desc = legal_info.get('LegalBriefDescription', '') if legal_info else ''

# Phase 19 FIX: County field name
county = profile.get('CountyName', '') or profile.get('SiteCountyName', '')

# Map to frontend contract
return {
    'apn': profile.get('APN', '') or profile.get('PropertyAddress', {}).get('APNFormatted', ''),
    'legalDescription': legal_desc,  # ← NESTED extraction
    'county': county,                # ← Correct field name
    'grantorName': profile.get('OwnerInformation', {}).get('OwnerFullName', ''),
    'currentOwnerPrimary': profile.get('OwnerInformation', {}).get('OwnerFullName', ''),
    'propertyType': profile.get('PropertyInfo', {}).get('PropertyType', ''),
    # ... etc
}
```

**Backend Response Format:**
```python
{
    'success': True,
    'apn': '6327-030-021',
    'grantorName': 'MAJESTIC ENTERPRISES LP',
    'county': 'LOS ANGELES',
    'city': 'BELL',
    'state': 'CA',
    'zip': '90201',
    'legalDescription': 'LOT 5 BLK 2 TRACT 12345',
    'propertyType': 'Apartment house (5+ units)',
    'fullAddress': '6616 WALKER AVE, BELL, CA 90201',
    'fips': '06037',
    'source': 'sitex',
    'confidence': 0.95
}
```

---

## Frontend Property Data Interface

**File:** `frontend/src/components/PropertySearchWithTitlePoint.tsx`

```typescript
interface PropertyData {
  fullAddress: string;           // Full formatted address
  street: string;                // Street address
  city: string;                  // City name
  state: string;                 // State code (CA)
  zip: string;                   // ZIP code
  neighborhood?: string;         // Neighborhood (optional)
  county?: string;               // County name
  placeId: string;              // Google Places ID
  
  // SiteX enriched data
  apn?: string;                 // Assessor's Parcel Number
  legalDescription?: string;    // Legal description
  grantorName?: string;         // Current owner (Grantor)
  currentOwnerPrimary?: string; // Mapped from grantorName
  currentOwnerSecondary?: string; // Secondary owner (if exists)
  propertyType?: string;        // Property type
}
```

---

## Deed Generation Field Mapping

**File:** `frontend/src/utils/deedDataMapper.ts` → `mapWizardDataToTemplate()`

### Template Data Structure

```typescript
interface TemplateData {
  // Core deed fields
  apn: string;                     // From PropertyData.apn
  county: string;                  // From PropertyData.county
  city: string;                    // From PropertyData.city
  grantor: string;                 // From PropertyData.grantorName
  property_description: string;    // From PropertyData.legalDescription
  
  // Additional fields
  recording_requested_by: string;
  mail_to: string;                 // Defaults to fullAddress
  order_no: string;
  escrow_no: string;
  documentary_tax: string;
  grantee: string;                 // User enters in wizard
  date: string;
  grantor_signature: string;
  
  // Notary section
  county_notary: string;           // Defaults to county
  notary_date: string;
  notary_name: string;
  appeared_before_notary: string;
  notary_signature: string;
}
```

### Field Population Logic

```typescript
// Core property data from Step 1 (SiteX)
apn: (aiSuggestions.apn as string) || formData.apn || '_____________________'
county: (aiSuggestions.county as string) || formData.county || '_____________________'
city: (aiSuggestions.city as string) || formData.taxCityName || formData.city || '_____________________'
grantor: formData.grantorName || '_____________________'  // From SiteX PrimaryOwnerName
property_description: (aiSuggestions.legalDescription as string) || propertyDescription

// Auto-populated defaults
mail_to: formData.mailTo || formData.fullAddress || formData.propertySearch || '_____'
county_notary: formData.notaryCounty || formData.county || '_____'
```

---

## Universal Field Mapping Across All Document Types

The following fields auto-populate from SiteX data **regardless** of which document type the user selects:

| Deed Field | Source | Available In |
|-----------|--------|--------------|
| **APN** | `PropertyData.apn` | ✅ Grant Deed, Quitclaim Deed, All Types |
| **County** | `PropertyData.county` | ✅ All document types |
| **City** | `PropertyData.city` | ✅ All document types |
| **Grantor** | `PropertyData.grantorName` | ✅ All transfer deeds |
| **Legal Description** | `PropertyData.legalDescription` | ✅ All document types |
| **Property Address** | `PropertyData.fullAddress` | ✅ All document types |
| **State** | `PropertyData.state` | ✅ All document types |
| **ZIP** | `PropertyData.zip` | ✅ All document types |
| **Property Type** | `PropertyData.propertyType` | ✅ All document types |
| **Mail To** | `PropertyData.fullAddress` (default) | ✅ All document types |
| **County (Notary)** | `PropertyData.county` (default) | ✅ All notarized documents |

---

## Document Type Specific Usage

### Grant Deed (CA)
**Template:** `templates/grant_deed_ca/grant_deed_ca.jinja2`

**SiteX Fields Used:**
- ✅ APN → Required for recording
- ✅ County → Required for transfer tax calculation
- ✅ Grantor (PrimaryOwnerName) → Current owner transferring property
- ✅ Legal Description → Complete property identification (Civil Code §1092)
- ✅ City → Transfer tax jurisdiction
- ✅ Property Address → Mailing and recording reference

### Quitclaim Deed
**Template:** `templates/quitclaim_deed.html`

**SiteX Fields Used:**
- ✅ APN → Required for recording
- ✅ County → Recording jurisdiction
- ✅ Grantor → Party quitclaiming interest
- ✅ Legal Description → Property identification
- ✅ Property Address → Reference

### Interspousal Transfer Deed
**SiteX Fields Used:**
- ✅ APN → Required
- ✅ County → Exempt from transfer tax
- ✅ Legal Description → Property identification

### Tax Deed / Warranty Deed
**SiteX Fields Used:**
- ✅ All standard fields (APN, County, Legal, Grantor)

---

## Validation Requirements

### Required Fields (Per California Civil Code §1092)

For any deed to be recordable in California:

1. **✅ APN** - Assessor's Parcel Number (from SiteX)
2. **✅ County** - Recording jurisdiction (from SiteX)
3. **✅ Legal Description** - Complete property identification (from SiteX)
4. **✅ Grantor** - Current owner (from SiteX PrimaryOwnerName)
5. **User Input Required:** Grantee, Date, Signatures

**File:** `frontend/src/utils/deedDataMapper.ts` → `validatePreviewData()`

```typescript
// Critical required fields
if (!formData.county?.trim()) {
  missingFields.push('County');
}

if (!formData.legalDescription?.trim() && 
    !formData.fullAddress?.trim() && 
    !formData.propertySearch?.trim()) {
  missingFields.push('Property Description');
}

// Warning for optional but recommended
if (!formData.apn?.trim()) {
  warnings.push('APN number not provided - may be required by county recorder');
}
```

---

## AI Assist Integration

When users click AI assist buttons in Step 2, the system can leverage SiteX data:

**File:** `backend/api/ai_assist.py` → `handle_prompt()`

| Button Type | SiteX Data Used | Purpose |
|-------------|----------------|---------|
| `vesting` | `grantorName`, `legalDescription` | Suggest vesting language |
| `grant_deed` | `grantorName`, `county`, `apn` | Pre-fill grant deed fields |
| `tax_roll` | `county`, `city`, `fips` | Calculate transfer tax |
| `all` | All SiteX fields | Comprehensive data pull |

**AI suggestions respect user edits** - SiteX data provides defaults, but user input always takes precedence:

```typescript
// AI suggestions as fallback, user input primary
apn: (aiSuggestions.apn as string) || formData.apn || '_____'
```

---

## Cache & Performance

**Cache Key Format:** `v2:{fullAddress}`

- Cache duration: **24 hours**
- Cache versioning: Increment `cache_version` when field mappings change
- Cache invalidation: Old data (v1 or no version) automatically expires

**Why versioning matters:**
- SiteX field mapping was corrected (Property.Parcel → Feed.PropertyProfile)
- Old cached data had empty APN/Owner fields
- Version bump forces fresh lookups for better UX

---

## Testing Checklist

- [x] **Step 1:** Property search returns SiteX data (APN, Owner, County, Legal)
- [x] **Frontend:** PropertyData interface receives all fields
- [x] **Wizard Store:** `verifiedData` contains SiteX fields
- [x] **Step 3:** deedDataMapper.ts reads from wizard state
- [x] **Grant Deed:** APN, Owner, Legal Description auto-fill
- [x] **Quitclaim Deed:** Same fields auto-fill
- [x] **AI Assist:** Can leverage SiteX data for suggestions
- [x] **Cache:** Old data invalidated, new searches work
- [ ] **Unit Tests:** Field mapping helpers
- [ ] **Integration Tests:** End-to-end wizard flow
- [ ] **E2E Tests:** Real property → generated PDF

---

## Troubleshooting

### Issue: "APN shows 'Not available'"

**Diagnosis:**
1. Check backend logs for SiteX response structure
2. Verify `Feed.PropertyProfile.APN` exists in response
3. Ensure `map_sitex_feed_to_ui()` extracts from correct path

**Fix:** Update field mapping in `backend/api/property_endpoints.py`

### Issue: "Old searches don't show APN"

**Diagnosis:** Cached data from before field mapping fix

**Fix:** Increment `cache_version` in property search endpoint

### Issue: "Deed shows blank Owner field"

**Diagnosis:**
1. Check if `grantorName` is in `/api/property/search` response
2. Verify `deedDataMapper.ts` reads `formData.grantorName`
3. Ensure wizard state stores property data correctly

**Fix:** Trace data flow from SiteX → Backend → Frontend → Mapper

---

## Related Documentation

- **Architecture:** [`docs/wizard/ARCHITECTURE.md`](./ARCHITECTURE.md)
- **Backend Routes:** [`docs/backend/ROUTES.md`](../backend/ROUTES.md)
- **SiteX Proposal:** [`docs/wizard/Step-1-Proposal/SiteX proposal.md`](./Step-1-Proposal/SiteX%20proposal.md)
- **SiteX Addendum:** [`docs/wizard/Step-1-Proposal/SiteX proposal — Addendum.md`](./Step-1-Proposal/SiteX%20proposal%20—%20Addendum.md)
- **Property Endpoints:** `backend/api/property_endpoints.py` (lines 483-516)
- **Deed Mapper:** `frontend/src/utils/deedDataMapper.ts` (lines 169-220)

---

## Maintenance

**When to update this document:**

1. ✅ **SiteX API changes:** Update response structure section
2. ✅ **New document types added:** Add to "Document Type Specific Usage"
3. ✅ **Field mappings change:** Update backend/frontend tables
4. ✅ **Cache strategy changes:** Update cache section
5. ✅ **Validation rules change:** Update validation requirements

**Document version:** 1.0 (October 6, 2025)
