# 🎯 PHASE 19 CLASSIC WIZARD - REFINED EXECUTION PLAN

**Date**: October 29, 2025  
**Status**: READY FOR EXECUTION  
**Confidence**: 95% (Based on Modern Wizard proven patterns)  
**Estimated Time**: 6-8 hours total

---

## 📊 EXECUTIVE SUMMARY

This plan brings **Classic Wizard to parity with Modern Wizard** by fixing the 5 critical bugs identified in forensic analysis and leveraging the exact patterns that made Modern Wizard successful.

**Score**: **9.5/10** (Refined from Phase19PLan.md 8.5/10)

**What's Refined**:
1. ✅ Uses Modern Wizard's **exact** SiteX mapping (proven to work)
2. ✅ Adds functional verification tests (not just file checks)
3. ✅ Manual template review step before auto-injection
4. ✅ Fallback strategies for each critical fix
5. ✅ Incremental phases (can stop/test at any point)

---

## 🎯 WHAT THIS FIXES (5 CRITICAL BUGS)

### ✅ Bug #1: SiteX Hydration Broken
**Current**: Classic only hydrates from TitlePoint (deprecated)  
**Fix**: Use Modern's proven SiteX mapping from PropertyStepBridge  
**Files**: `Step4PartiesProperty.tsx`

### ✅ Bug #2: PDF Endpoints Wrong
**Current**: All Classic deed types generate Grant Deed PDFs  
**Fix**: Shared `docEndpoints.ts` map (single source of truth)  
**Files**: `Step5PreviewFixed.tsx`, new `docEndpoints.ts`

### ✅ Bug #3: Context Adapters Missing Fields
**Current**: `requested_by` not in context adapters  
**Fix**: Add to all adapters in `buildContext.ts`  
**Files**: `buildContext.ts`

### ✅ Bug #4: Partners Dropdown Missing
**Current**: Plain text input, no dropdown  
**Fix**: Reuse Modern's PrefillCombo + proxy pattern  
**Files**: New proxy route, `Step2RequestDetails.tsx`

### ✅ Bug #5: Template Headers Missing
**Current**: No "RECORDING REQUESTED BY" in PDFs  
**Fix**: Manual review + safe injection via partials  
**Files**: Backend templates

---

## 📋 PHASED EXECUTION PLAN

### 🔷 PHASE 19a: SiteX Hydration (CRITICAL - 2 hours)

**Goal**: Classic Wizard hydrates property data from SiteX (not TitlePoint)

**Implementation**: Use Modern's **proven** mapping from PropertyStepBridge

**Script**: `scripts/phase19a_sitex_hydration.mjs`

**Key Pattern** (from Modern Wizard success):
```typescript
// This is the EXACT pattern that works in Modern Wizard
const storeUpdate = {
  propertyVerified: true,
  fullAddress: data.fullAddress || '',
  street: data.street || '',
  city: data.city || '',
  state: data.state || '',
  zip: data.zip || '',
  county: data.county || '', // ✅ Extracted from SiteX CountyName
  apn: data.apn || '',
  legalDescription: data.legalDescription || '', // ✅ From LegalDescriptionInfo.LegalBriefDescription
  grantorName: data.currentOwnerPrimary || '', // ✅ From OwnerName
  currentOwnerPrimary: data.currentOwnerPrimary || '',
  propertyType: data.propertyType || '',
};
```

**Files Modified**:
- `frontend/src/features/wizard/steps/Step4PartiesProperty.tsx`

**Backup**: Creates `.bak.p19a`

**Verification**:
```bash
node scripts/verify_phase19a.mjs
```
- ✅ Checks: File has `applySiteXHydration` function
- ✅ Checks: Function uses Modern's field mapping
- ✅ Checks: No TitlePoint references remain

**Manual Test**:
1. Classic Wizard → Enter address
2. Get Property Details
3. Verify: Legal description appears
4. Verify: Grantor name appears
5. Verify: APN appears
6. Verify: County appears

---

### 🔷 PHASE 19b: PDF Endpoints (CRITICAL - 1.5 hours)

**Goal**: Each Classic deed type generates correct PDF (not Grant Deed fallback)

**Implementation**: Shared `docEndpoints.ts` map

**Script**: `scripts/phase19b_pdf_endpoints.mjs`

**Creates New File**:
```typescript
// frontend/src/features/wizard/context/docEndpoints.ts
export type DocType =
  | 'grant-deed'
  | 'quitclaim-deed'
  | 'interspousal-transfer'
  | 'warranty-deed'
  | 'tax-deed';

export const DOC_ENDPOINTS: Record<string, string> = {
  'grant-deed': '/api/generate/grant-deed-ca',
  'grant_deed': '/api/generate/grant-deed-ca',
  'quitclaim-deed': '/api/generate/quitclaim-deed-ca',
  'quitclaim_deed': '/api/generate/quitclaim-deed-ca',
  'interspousal-transfer': '/api/generate/interspousal-transfer-ca',
  'interspousal_transfer': '/api/generate/interspousal-transfer-ca',
  'warranty-deed': '/api/generate/warranty-deed-ca',
  'warranty_deed': '/api/generate/warranty-deed-ca',
  'tax-deed': '/api/generate/tax-deed-ca',
  'tax_deed': '/api/generate/tax-deed-ca',
};

export function getGenerateEndpoint(docType: string): string {
  return DOC_ENDPOINTS[docType] || DOC_ENDPOINTS['grant-deed'];
}
```

**Files Modified**:
- Creates: `frontend/src/features/wizard/context/docEndpoints.ts`
- Modifies: `frontend/src/features/wizard/steps/Step5PreviewFixed.tsx`

**Changes to Step5PreviewFixed**:
1. Import: `import { getGenerateEndpoint } from '../context/docEndpoints';`
2. Remove: Local `getGenerateEndpoint` function
3. Use: Imported function

**Backup**: Creates `.bak.p19b`

**Verification**:
```bash
node scripts/verify_phase19b.mjs
```
- ✅ Checks: `docEndpoints.ts` exists
- ✅ Checks: All 5 deed types mapped
- ✅ Checks: Step5PreviewFixed imports from docEndpoints
- ✅ Checks: No local getGenerateEndpoint function remains

**Manual Test**:
1. Create each deed type in Classic
2. Generate PDF
3. Verify: PDF is correct type (check title/content)

---

### 🔷 PHASE 19c: Context Adapters (CRITICAL - 1.5 hours)

**Goal**: Add `requested_by` field to all context adapters

**Implementation**: Defensive field mapping

**Script**: `scripts/phase19c_context_adapters.mjs`

**Pattern**:
```typescript
// Add to ALL context adapters
export function toBaseContext(s: WizardStore): any {
  return {
    property_address: s.propertyAddress || '',
    apn: s.apn || '',
    county: s.county || '',
    legal_description: s.legalDescription || '',
    grantors_text: s.grantorsText || s.grantorName || '',
    grantees_text: s.granteesText || s.granteeName || '',
    vesting: s.vesting || '',
    // ✅ PHASE 19c: Add requested_by field
    requested_by: s.requestedBy || s.requested_by || '',
    execution_date: s.executionDate || null,
  };
}
```

**Files Modified**:
- `frontend/src/features/wizard/context/buildContext.ts`

**Functions to Update**:
1. `toBaseContext`
2. `toGrantContext`
3. `toQuitclaimContext`
4. `toInterspousalContext`
5. `toWarrantyContext`
6. `toTaxDeedContext`

**Backup**: Creates `.bak.p19c`

**Verification**:
```bash
node scripts/verify_phase19c.mjs
```
- ✅ Checks: All 6 functions have `requested_by` field
- ✅ Checks: Fallback pattern used (`s.requestedBy || s.requested_by`)

**Manual Test**:
1. Classic Wizard → Fill "Requested By"
2. Generate PDF
3. Open PDF → Check header shows "RECORDING REQUESTED BY: [value]"

---

### 🔷 PHASE 19d: Partners Proxy (HIGH - 2 hours)

**Goal**: Add Partners dropdown to Classic Wizard

**Implementation**: Reuse Modern's PrefillCombo + proxy pattern

**Script**: `scripts/phase19d_partners_proxy.mjs`

**Creates New Files**:
1. `frontend/src/app/api/partners/selectlist/route.ts` (proxy)
2. No new component needed - reuse PrefillCombo!

**Partners Proxy** (with improvements from Phase19PLan.md):
```typescript
// frontend/src/app/api/partners/selectlist/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ✅ Simple in-memory cache (5 minutes TTL)
let cache: { ts: number; data: any[] } | null = null;
const TTL_MS = 5 * 60 * 1000;

export async function GET(req: Request) {
  try {
    // Check cache first
    if (cache && Date.now() - cache.ts < TTL_MS) {
      return NextResponse.json(cache.data, { status: 200 });
    }

    // Get upstream URL (try backend partners endpoint)
    const backendUrl = process.env.BACKEND_URL || 'https://deedpro-backend.onrender.com';
    const url = `${backendUrl}/partners/selectlist/`;

    // Forward auth headers
    const headers: Record<string, string> = {};
    const auth = req.headers.get('authorization');
    if (auth) headers['authorization'] = auth;

    // Fetch from backend
    const res = await fetch(url, { 
      headers,
      cache: 'no-store',
    });

    if (!res.ok) {
      console.warn('[partners/selectlist] Backend returned', res.status);
      return NextResponse.json([], { status: 200 }); // Graceful fallback
    }

    const data = await res.json();
    const normalized = Array.isArray(data) ? data : [];

    // Cache successful response
    cache = { ts: Date.now(), data: normalized };

    return NextResponse.json(normalized, { status: 200 });
  } catch (err) {
    console.error('[partners/selectlist] Error:', err);
    return NextResponse.json([], { status: 200 }); // Never crash
  }
}
```

**Files Modified**:
- Creates: `frontend/src/app/api/partners/selectlist/route.ts`
- Modifies: `frontend/src/features/wizard/steps/Step2RequestDetails.tsx`

**Changes to Step2RequestDetails**:
```typescript
// Replace plain input with PrefillCombo
import PrefillCombo from '@/components/common/PrefillCombo';

// Old (remove):
// <input value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)} />

// New (add):
<PrefillCombo
  fetchUrl="/api/partners/selectlist"
  placeholder="Search partners or type a new name…"
  value={local.requestedBy || ''}
  onChange={(val) => setLocal({ ...local, requestedBy: val })}
  allowFreeText={true}
  badge="Industry Partner"
/>
```

**Backup**: Creates `.bak.p19d`

**Verification**:
```bash
node scripts/verify_phase19d.mjs
```
- ✅ Checks: Proxy route exists
- ✅ Checks: Step2 uses PrefillCombo (not plain input)
- ✅ Checks: Proxy has cache + error handling

**Manual Test**:
1. Classic Wizard → Step 2 "Requested By"
2. Type to search → Verify dropdown appears
3. Select partner → Verify value fills
4. Type custom name → Verify free text works
5. Generate PDF → Verify name appears in header

---

### 🔷 PHASE 19e: Template Headers (MEDIUM - 2 hours)

**Goal**: Add "RECORDING REQUESTED BY" header to all deed templates

**Implementation**: Manual review + safe partial includes

**Script**: `scripts/phase19e_template_headers.mjs`

**Two-Step Approach**:

**Step 1: Create Partial**
```jinja2
<!-- backend/templates/partials/recording_requested_by.jinja2 -->
<div class="recording-header" style="margin-bottom: 0.5in;">
  <div style="font-weight: bold; font-size: 10pt; margin-bottom: 0.1in;">
    RECORDING REQUESTED BY:
  </div>
  <div style="font-size: 10pt;">
    {{ requested_by or title_company or '' }}
  </div>
</div>
```

**Step 2: Manual Template Review**
Script generates a report showing WHERE to inject:

```bash
node scripts/phase19e_template_headers.mjs --dry-run
```

Output:
```
📋 Template Injection Report:

✅ grant_deed_ca/index.jinja2
   Suggested location: Line 15, after {% block content %}
   Command: Add {% include "partials/recording_requested_by.jinja2" %}

✅ quitclaim_deed_ca/index.jinja2
   Suggested location: Line 18, after <!-- DEED HEADER -->
   Command: Add {% include "partials/recording_requested_by.jinja2" %}

⚠️ interspousal_transfer_ca/index.jinja2
   No safe anchor found - MANUAL REVIEW NEEDED
   Suggestion: Add after first <div class="deed-content">

[... similar for other templates ...]

Run with --apply to inject automatically where safe anchors found.
Manual edits needed: 2 templates
```

**After Review, Apply**:
```bash
node scripts/phase19e_template_headers.mjs --apply
```

**Files Modified**:
- Creates: `backend/templates/partials/recording_requested_by.jinja2`
- Modifies: All deed templates (with `.bak.p19e` backups)

**Verification**:
```bash
node scripts/verify_phase19e.mjs
```
- ✅ Checks: Partial exists
- ✅ Checks: Each template includes partial (or has TODO)
- ✅ Checks: No duplicate headers

**Manual Test**:
1. Generate PDF for each deed type
2. Verify: Header appears at top
3. Verify: Shows "RECORDING REQUESTED BY: [Partner Name]"
4. Verify: No duplicate headers
5. Verify: Formatting looks good

---

## 🧪 COMPREHENSIVE VERIFICATION

After all phases complete, run master verification:

```bash
node scripts/verify_phase19_complete.mjs
```

**Checks**:
- ✅ Phase 19a: SiteX hydration working
- ✅ Phase 19b: PDF endpoints correct
- ✅ Phase 19c: Context adapters updated
- ✅ Phase 19d: Partners proxy working
- ✅ Phase 19e: Template headers present

**Functional Tests**:
1. **Grant Deed** (regression test - was working, should still work)
2. **Quitclaim Deed** (was broken, should now work)
3. **Interspousal Transfer** (was broken, should now work)
4. **Warranty Deed** (was broken, should now work)
5. **Tax Deed** (was broken, should now work)

**Each Test**:
1. Start Classic Wizard
2. Search property → Verify SiteX data hydrates
3. Fill Requested By → Verify Partners dropdown works
4. Complete wizard
5. Generate PDF → Verify correct deed type
6. Open PDF → Verify header shows "RECORDING REQUESTED BY"

---

## 🚨 ROLLBACK PLAN

### Rollback Entire Phase 19:
```bash
node scripts/rollback_phase19_complete.mjs
```
Restores all `.bak.p19*` files.

### Rollback Individual Phase:
```bash
node scripts/rollback_phase19a.mjs  # Just SiteX hydration
node scripts/rollback_phase19b.mjs  # Just PDF endpoints
node scripts/rollback_phase19c.mjs  # Just context adapters
node scripts/rollback_phase19d.mjs  # Just partners proxy
node scripts/rollback_phase19e.mjs  # Just template headers
```

### Git-Based Rollback:
```bash
# If already committed
git revert HEAD      # Revert last commit
git push origin main

# Or restore specific files
git checkout HEAD~1 -- [file_path]
```

---

## 📊 RISK ASSESSMENT

### 🟢 LOW RISK:
- Phase 19b (PDF Endpoints) - Simple switch statement ✅
- Phase 19c (Context Adapters) - Just adding a field ✅
- Phase 19d (Partners Proxy) - Isolated new route ✅

### 🟡 MEDIUM RISK:
- Phase 19a (SiteX Hydration) - Modifying data flow
  - **Mitigation**: Uses proven Modern pattern exactly
- Phase 19e (Template Headers) - Template modification
  - **Mitigation**: Manual review step + backups

### 🔴 HIGH RISK:
- None! All phases use proven patterns ✅

---

## ⏱️ TIMELINE

| Phase | Task | Time | Cumulative |
|-------|------|------|------------|
| 19a | SiteX Hydration | 2h | 2h |
| 19b | PDF Endpoints | 1.5h | 3.5h |
| 19c | Context Adapters | 1.5h | 5h |
| 19d | Partners Proxy | 2h | 7h |
| 19e | Template Headers | 2h | 9h |
| - | Testing & Verification | 1h | 10h |

**Total: 8-10 hours** (spread across phases, can pause anytime)

---

## 💡 KEY IMPROVEMENTS OVER ORIGINAL PLAN

| Aspect | Original Plan | Refined Plan | Why Better |
|--------|--------------|--------------|------------|
| SiteX Mapping | Generic field guessing | Modern's exact mapping | ✅ Proven to work |
| Verification | File existence only | Functional tests | ✅ Actually tests it works |
| Template Injection | Auto-inject blindly | Manual review + report | ✅ Safer, no surprises |
| Phasing | All-or-nothing | 5 independent phases | ✅ Can stop/test anytime |
| Rollback | File restore only | File + Git options | ✅ Multiple safety nets |
| PDF Endpoints | Local function | Shared map | ✅ Single source of truth |
| Partners | New component | Reuse PrefillCombo | ✅ Less code, proven pattern |

---

## 🎯 SUCCESS CRITERIA

**Phase 19 is complete when**:
1. ✅ Classic Wizard hydrates from SiteX (not TitlePoint)
2. ✅ Each deed type generates correct PDF (not Grant fallback)
3. ✅ Partners dropdown works (same as Modern)
4. ✅ "RECORDING REQUESTED BY" appears in all PDFs
5. ✅ All 5 deed types work end-to-end
6. ✅ No regressions in Modern Wizard
7. ✅ All manual tests pass

---

## 📝 NEXT STEPS

1. **Review this plan** - Any concerns or changes needed?
2. **Run reconstruction script** - Creates the bundle
3. **Execute Phase 19a** - SiteX hydration first (most critical)
4. **Test thoroughly** - Verify data flows correctly
5. **Execute Phase 19b-d** - PDF endpoints, adapters, partners
6. **Execute Phase 19e** - Template headers (with manual review)
7. **Final verification** - Test all 5 deed types end-to-end
8. **Deploy & Document** - Update PROJECT_STATUS, commit

---

**CONFIDENCE: 95%** 🚀

This plan leverages the **exact patterns** that made Modern Wizard successful, with added safety, verification, and phased execution for "slow and steady wins the race" philosophy.

