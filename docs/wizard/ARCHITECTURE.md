# 🏗️ Wizard Architecture

**Last Updated**: October 30, 2025  
**Purpose**: Complete architectural overview of DeedPro's two wizard systems

---

## 🎯 **OVERVIEW**

DeedPro has **TWO wizard implementations**:
1. **Modern Wizard** 🆕 - Dynamic prompt-based flow (recommended)
2. **Classic Wizard** 🏛️ - Traditional 5-step wizard (legacy)

Both wizards generate the same PDF output but have different UX patterns and data flows.

---

## 🔀 **DECISION: Which Wizard?**

### **URL-Based Routing**:
```
/create-deed/grant-deed?mode=modern  → Modern Wizard
/create-deed/grant-deed              → Classic Wizard (default)
```

### **When to Use**:
| Wizard | Best For | User Type |
|--------|----------|-----------|
| **Modern** | New users, AI-assisted workflow | Agents who want guidance |
| **Classic** | Power users, step-by-step control | Agents who know the process |

---

## 🆕 **MODERN WIZARD**

### **Architecture Pattern**: Prompt-Driven Engine

```
Step 0: Property Search (SiteX enrichment)
  ↓
Steps 1-N: Dynamic Q&A (varies by deed type)
  ↓
Final Step: SmartReview (summary of all data)
  ↓
Finalize → Save to DB → Redirect to Preview Page
  ↓
Preview Page: Generate PDF → Download
```

---

### **Key Components**:

#### **1. ModernEngine** (`frontend/src/features/wizard/mode/engines/ModernEngine.tsx`)
**Purpose**: Core wizard orchestrator  
**Responsibilities**:
- Manages current step (`i` state)
- Renders prompts from `promptFlows`
- Handles state updates via `onChange`
- Calls `finalizeDeed` when complete

**Flow**:
```typescript
const flow = promptFlows[docType];  // Get questions for deed type
const steps = flow.steps;            // Array of prompt steps
const current = steps[i];            // Current prompt

// When user answers
onChange(field, value);  // Update state

// When user clicks Next
if (i < total) {
  setI(i + 1);  // Next question
} else {
  finalizeDeed();  // Complete!
}
```

---

#### **2. Prompt Flows** (`frontend/src/features/wizard/mode/flows/promptFlows.ts`)
**Purpose**: Define questions for each deed type  
**Structure**:
```typescript
export const promptFlows: Record<DocType, PromptFlow> = {
  grant_deed: {
    steps: [
      { 
        id: 'grantor',
        question: 'Who is transferring the property?',
        fieldKey: 'grantorName',
        prefillFrom: (data) => data.currentOwnerPrimary
      },
      {
        id: 'grantee',
        question: 'Who is receiving the property?',
        fieldKey: 'granteeName'
      },
      // ... more questions
    ]
  },
  quitclaim: {
    steps: [/* Different questions for quitclaim */]
  }
};
```

**Key Feature**: Each deed type has custom questions tailored to its legal requirements.

---

#### **3. PropertyStepBridge** (`frontend/src/features/wizard/mode/bridge/PropertyStepBridge.tsx`)
**Purpose**: Hydrate wizard state with SiteX property data  
**Flow**:
```typescript
// After property search completes
handlePropertyVerified(data) {
  updateFormData({
    apn: data.apn,
    county: data.county,  // From CountyName field
    legalDescription: data.legalDescription,  // From LegalDescriptionInfo
    grantorName: data.currentOwnerPrimary,
    // ... etc
  });
}
```

**Phase 16 Discovery**: SiteX fields are nested (see SITEX_FIELD_MAPPING.md)

---

#### **4. Canonical Adapters** (`frontend/src/utils/canonicalAdapters/{deed}.ts`)
**Purpose**: Convert UI state → backend schema  
**Why**: Decouples UI from backend requirements

**Example** (`quitclaim.ts`):
```typescript
export function toCanonical(state: any) {
  return {
    deedType: 'quitclaim-deed',  // Backend format
    property: {
      address: state.propertyAddress,
      apn: state.apn,
      county: state.county,
      legalDescription: state.legalDescription,
    },
    parties: {
      grantor: { name: state.grantorName },
      grantee: { name: state.granteeName },
    },
    vesting: { description: state.vesting },
    requestDetails: {
      requestedBy: state.requestedBy,
    },
  };
}
```

**Phase 19 Critical Fix**: Support 3 docType formats (canonical, snake_case, hyphenated)

---

#### **5. finalizeDeed** (`frontend/src/lib/deeds/finalizeDeed.ts`)
**Purpose**: Save deed to database  
**Flow**:
```typescript
// 1. Convert state → canonical format
const canonical = toCanonicalFor(docType, state);

// 2. Convert canonical → backend payload
const backendPayload = {
  deed_type: 'quitclaim-deed',  // Hyphenated
  property_address: canonical.property.address,
  apn: canonical.property.apn,
  county: canonical.property.county,
  // ... etc
};

// 3. Save to database
const response = await fetch('/api/deeds/create', {
  method: 'POST',
  body: JSON.stringify(backendPayload)
});

// 4. Redirect to preview page
router.push(`/deeds/${deedId}/preview?mode=modern`);
```

---

#### **6. Preview Page** (`frontend/src/app/deeds/[id]/preview/page.tsx`)
**Purpose**: Generate and display PDF  
**Flow**:
```
Load deed from database → Display summary → Generate PDF button → Download
```

**Features**:
- Edit deed button (go back to wizard)
- Share deed button
- Download PDF button

---

### **Data Flow Diagram**:
```
User Searches Property
  ↓
Google Places API → SiteX API
  ↓
PropertyStepBridge → updateFormData (Zustand store)
  ↓
ModernEngine renders prompts
  ↓
User answers questions → state updates
  ↓
SmartReview displays all data
  ↓
finalizeDeed → toCanonical → backendPayload
  ↓
POST /api/deeds/create (save to PostgreSQL)
  ↓
Redirect to /deeds/{id}/preview?mode=modern
  ↓
User clicks "Generate PDF"
  ↓
POST /api/generate/{deed-type}-ca → Jinja2 → Weasyprint
  ↓
Download PDF
```

---

### **State Management**:

#### **Zustand Store** (`useWizardStoreBridge`):
**Location**: `frontend/src/features/wizard/mode/bridge/useWizardStoreBridge.tsx`

**Key Functions**:
- `getWizardData()` - Read from localStorage
- `updateFormData(data)` - Write to localStorage (REPLACES state)
- `isPropertyVerified()` - Check if property search complete

**localStorage Key**: `WIZARD_DRAFT_KEY_MODERN` = `'deedWizardDraft_modern'`

**Critical Pattern** (Phase 19):
```typescript
// ✅ CORRECT: REPLACE state
updateFormData(newData);

// ❌ WRONG: Merge with old state (causes data persistence bugs)
updateFormData({ ...prevState, ...newData });
```

---

## 🏛️ **CLASSIC WIZARD**

### **Architecture Pattern**: Multi-Step Form

```
Step 1: Property Search (SiteX enrichment)
  ↓
Step 2: Request Details (APN, Order #, Requested By)
  ↓
Step 3: Mailing Address (Return To)
  ↓
Step 4: Parties & Property (Grantor, Grantee, Legal Desc)
  ↓
Step 5: Preview & Generate PDF
  ↓
Finalize → Download PDF + Save to DB + Redirect to Dashboard
```

---

### **Key Components**:

#### **1. Main Page** (`frontend/src/app/create-deed/[docType]/page.tsx`)
**Purpose**: Classic Wizard container  
**Responsibilities**:
- Manages `currentStep` state
- Renders appropriate step component
- Calls `prefillFromEnrichment` after property search

---

#### **2. Step Components**:
**Location**: `frontend/src/features/wizard/steps/`

```
Step1PropertySearch.tsx     → Property search (reuses PropertySearchWithTitlePoint)
Step2RequestDetails.tsx     → APN, Order #, Requested By (Phase 19: Uses PrefillCombo)
Step3MailingAddress.tsx     → Return To address
Step4PartiesProperty.tsx    → Grantor, Grantee, Legal Desc, County
Step5PreviewFixed.tsx       → Data summary + PDF generation
```

**Phase 19 Fixes**:
- Step 2: Replaced plain input with `PrefillCombo` for Partners integration
- Step 4: Added SiteX hydration (same as Modern Wizard's pattern)
- Step 5: Added data summary card (like Modern's SmartReview)

---

#### **3. prefillFromEnrichment** (`frontend/src/features/wizard/services/propertyPrefill.ts`)
**Purpose**: Hydrate form fields with SiteX data  
**Phase 19 Critical Fix**:
```typescript
// ✅ CORRECT: REPLACE state with fresh SiteX data
setGrantDeed({
  step2: { apn: verifiedData.apn },
  step3: {},  // Empty!
  step4: {
    grantorsText: verifiedData.currentOwnerPrimary,
    county: verifiedData.county,
    legalDescription: verifiedData.legalDescription,
  }
});

// ❌ WRONG: Merge with previous state (preserves old junk data)
setGrantDeed((prev) => ({
  ...prev,  // ← Keeps old data!
  step4: freshData
}));
```

**Why**: Merging causes old data from previous sessions to persist.

---

#### **4. Context Builders** (`frontend/src/features/wizard/context/buildContext.ts`)
**Purpose**: Map wizard state → backend PDF context  
**Example**:
```typescript
export function toBaseContext(s: WizardStore) {
  return {
    requested_by: s.grantDeed?.step2?.requestedBy || '',
    apn: s.step1Data?.apn || '',
    county: s.step1Data?.county || '',
    legal_description: s.grantDeed?.step4?.legalDescription || '',
    grantors_text: s.grantDeed?.step4?.grantorsText || '',
    grantees_text: s.grantDeed?.step4?.granteesText || '',
  };
}
```

---

#### **5. Step5PreviewFixed** (`frontend/src/features/wizard/steps/Step5PreviewFixed.tsx`)
**Purpose**: Generate PDF and finalize deed  
**Flow**:
```typescript
// 1. Build context from wizard data
const contextData = contextBuilder(wizardData);

// 2. Get PDF generation endpoint
const endpoint = getGenerateEndpoint(docType);  // e.g., '/api/generate/quitclaim-deed-ca'

// 3. Generate PDF
const response = await fetch(endpoint, {
  method: 'POST',
  body: JSON.stringify(contextData)
});
const pdfBlob = await response.blob();

// 4. Display PDF preview
setBlobUrl(URL.createObjectURL(pdfBlob));

// 5. On finalize: Download + Save + Clear session
handleFinalize() {
  // Download PDF
  a.href = URL.createObjectURL(blob);
  a.download = 'deed.pdf';
  a.click();
  
  // Save to database
  await saveDeedMetadata(payload);
  
  // Clear localStorage
  localStorage.removeItem(WIZARD_DRAFT_KEY_CLASSIC);
  
  // Redirect to dashboard
  router.push('/past-deeds?success=1');
}
```

---

### **Data Flow Diagram**:
```
User Searches Property
  ↓
Google Places API → SiteX API
  ↓
prefillFromEnrichment → setGrantDeed (REPLACE state)
  ↓
User fills Step 2-4 forms
  ↓
Each step saves to localStorage (WIZARD_DRAFT_KEY_CLASSIC)
  ↓
Step 5: Build context via contextBuilder
  ↓
POST /api/generate/{deed-type}-ca → Generate PDF
  ↓
Display PDF preview in browser
  ↓
User clicks "Finalize Deed"
  ↓
Download PDF + POST /api/deeds/create + Clear localStorage
  ↓
Auto-redirect to /past-deeds
```

---

### **State Management**:

#### **localStorage Key**: `WIZARD_DRAFT_KEY_CLASSIC` = `'deedWizardDraft_classic'`

**Structure**:
```typescript
{
  docType: 'quitclaim',
  currentStep: 3,
  verifiedData: { /* SiteX response */ },
  grantDeed: {
    step2: { requestedBy, apn, orderNo },
    step3: { returnTo },
    step4: { grantorsText, granteesText, county, legalDescription }
  },
  step1Data: { /* Property search results */ }
}
```

**Phase 19 Fix**: `state.ts` was using hardcoded `'deedWizardDraft'` instead of the correct constant.

---

## ⚖️ **MODERN vs CLASSIC COMPARISON**

| Feature | Modern Wizard | Classic Wizard |
|---------|---------------|----------------|
| **UX Pattern** | Dynamic prompts | Fixed 5 steps |
| **Questions** | Varies by deed type | Same for all deed types |
| **State Mgmt** | Zustand + localStorage | React state + localStorage |
| **Data Mapping** | Canonical adapters | Context builders |
| **PDF Generation** | Separate preview page | In-wizard (Step 5) |
| **Finalization** | Save → Redirect → Generate | Generate → Save → Redirect |
| **localStorage Key** | `WIZARD_DRAFT_KEY_MODERN` | `WIZARD_DRAFT_KEY_CLASSIC` |
| **Added** | Phase 14-15 | Phase 11 |
| **Status** | ✅ Recommended | ✅ Stable (legacy) |

---

## 🔑 **KEY ARCHITECTURAL PATTERNS**

### **1. SiteX Hydration** (Both Wizards)
**Purpose**: Auto-fill property fields from SiteX API

**Critical Fields** (Phase 16-19 Discoveries):
- `county`: From `CountyName` or `SiteCountyName` (NOT `County`)
- `legalDescription`: From `LegalDescriptionInfo.LegalBriefDescription` (NOT `LegalDescription`)
- `grantorName`: From `OwnerInformation.OwnerFullName`

**Implementation**:
- Modern: `PropertyStepBridge.tsx`
- Classic: `propertyPrefill.ts`

**See**: [SITEX_FIELD_MAPPING.md](SITEX_FIELD_MAPPING.md)

---

### **2. State Replacement (Not Merging)**
**Phase 19 Critical Discovery**:

```typescript
// ✅ CORRECT
setGrantDeed({ step2: {}, step3: {}, step4: freshData });

// ❌ WRONG (Preserves old data!)
setGrantDeed((prev) => ({ ...prev, step4: freshData }));
```

**Why**: Prevents old data from previous sessions polluting new deeds.

---

### **3. Session Management**
**Modern Wizard**:
```typescript
// After finalization
localStorage.removeItem(WIZARD_DRAFT_KEY_MODERN);
```

**Classic Wizard**:
```typescript
// After finalization
localStorage.removeItem(WIZARD_DRAFT_KEY_CLASSIC);
```

**Document Selector** (Both):
```typescript
// When user clicks "New Deed"
localStorage.removeItem(WIZARD_DRAFT_KEY_MODERN);
localStorage.removeItem(WIZARD_DRAFT_KEY_CLASSIC);
sessionStorage.setItem('deedWizardCleared', 'true');
```

**Phase 19 Fix**: Each wizard now clears its own key after successful finalization.

---

### **4. docType Format Support**
**Three formats used interchangeably**:
- **Canonical**: `'quitclaim'` (from URL param)
- **Snake case**: `'quitclaim_deed'` (internal)
- **Hyphenated**: `'quitclaim-deed'` (backend expects)

**Solution**: All mapping files support ALL 3 formats.

**Files**:
- `canonicalAdapters/index.ts` (Modern)
- `docEndpoints.ts` (Classic & Modern)

**Phase 19 Fix**: Prevents "Wrong PDF Generated" bug.

---

## 🐛 **COMMON ISSUES**

### **Issue #1: Old Data Persisting**
**Symptom**: Fields show data from previous sessions  
**Root Cause**: State merging instead of replacing  
**Fix**: Use REPLACE pattern in `setGrantDeed` or `updateFormData`

---

### **Issue #2: "New Deed" Goes to Previous Page**
**Symptom**: After finalization, "New Deed" button loads old deed  
**Root Cause**: localStorage not cleared  
**Fix**: Clear correct wizard key after finalization

---

### **Issue #3: Wrong PDF Generated**
**Symptom**: User requests Quitclaim, gets Grant Deed  
**Root Cause**: docType format mismatch  
**Fix**: Support all 3 formats in endpoint mappings

---

## 📚 **RELATED DOCUMENTATION**

- [SITEX_FIELD_MAPPING.md](SITEX_FIELD_MAPPING.md) → SiteX API fields
- [ADDING_NEW_DEED_TYPES.md](ADDING_NEW_DEED_TYPES.md) → How to add deed types
- [../../BREAKTHROUGHS.md](../../BREAKTHROUGHS.md) → Recent discoveries
- [../backend/PDF_GENERATION_SYSTEM.md](../backend/PDF_GENERATION_SYSTEM.md) → PDF generation

---

**Key Takeaways**:
1. Two separate wizard implementations with different UX patterns
2. Modern = prompt-driven, Classic = step-by-step
3. Both use SiteX hydration for property enrichment
4. State management must REPLACE, not MERGE
5. Session cleanup is critical to prevent data persistence bugs
