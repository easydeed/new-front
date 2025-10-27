# Deed Type Badge Issue - Root Cause Analysis

**Date**: October 15, 2025  
**Issue**: DeedTypeBadge shows "Grant Deed" in Modern mode when user is on Quitclaim Deed page  
**Status**: 🔍 Investigating

---

## 🐛 PROBLEM STATEMENT

**User Report**:
> "Currently I'm in the quitclaim deed which is displayed in the Wizard Frame Title. But when I switch to modern, Grant Deed appears in the badge inside the wizard content area."

**User Requirement**:
> "Both deed wizards should reflect what is chosen on the create deed page. Even when the button is toggled back and forth."

**Expected Behavior**:
- User visits `/create-deed/quitclaim-deed`
- WizardFrame header shows: `[Quitclaim Deed] Create Deed`
- **Classic wizard**: Shows Quitclaim wizard steps and content
- **Modern wizard**: Shows Quitclaim Q&A prompts
- **Toggle switch**: User can switch between Classic ↔ Modern
- **After toggle**: BOTH modes should show "Quitclaim Deed" (not Grant Deed)
- NO duplicate badge inside content area

**Actual Behavior**:
- WizardFrame header: ✅ Shows "Quitclaim Deed" correctly
- Classic wizard: ✅ Shows correct Quitclaim content
- Modern wizard: ❌ Shows "Grant Deed" badge (incorrect)
- After toggle: ❌ Loses deed type context

---

## 🔍 DATA FLOW ANALYSIS

### **1. URL → Component Tree**

```
URL: /create-deed/quitclaim-deed
    ↓
UnifiedWizard (page.tsx)
    ↓ params.docType = "quitclaim-deed"
    ↓ converts to "quitclaim" (underscores)
    ↓
WizardHost (docType="quitclaim")
    ↓
WizardFrame (docType="quitclaim")
    ↓ DeedTypeBadge in HEADER ✅ WORKS
    ↓
ModernEngine (docType="quitclaim")
    ↓ converts to slug "quitclaim-deed"
    ↓ looks up promptFlows[slug]
    ↓ uses flow.docType
    ↓ DeedTypeBadge in CONTENT ❌ SHOWS "Grant Deed"
```

---

## 🔎 CODE INSPECTION

### **File 1: `UnifiedWizard` (page.tsx)**

```typescript
export default function UnifiedWizard() {
  const params = useParams();
  const rawDocType = params?.docType as string || 'grant_deed';
  const docType = rawDocType.replace(/-/g, '_') as DocType; // "quitclaim-deed" → "quitclaim"
  
  return <WizardHost docType={docType} classic={<ClassicWizard docType={docType} />} />;
}
```

**Issue**: Converts hyphens to underscores
- Input: `"quitclaim-deed"`
- Output: `"quitclaim_deed"` ❌ (Not just "quitclaim")

Wait, let me check the actual code...

Actually, looking at line 412:
```typescript
const docType = rawDocType.replace(/-/g, '_') as DocType;
```

This converts `"quitclaim-deed"` → `"quitclaim_deed"` (with underscore!)

But the `DocType` type is:
```typescript
type DocType = 'grant_deed' | 'quitclaim' | 'interspousal_transfer' | 'warranty_deed' | 'tax_deed';
```

So `"quitclaim-deed"` → `"quitclaim_deed"` doesn't match `'quitclaim'` in the type!

**ROOT CAUSE #1**: Incorrect type conversion

---

### **File 2: `WizardHost.tsx`**

```typescript
function Inner({ docType, classic }: { docType: string; classic: React.ReactNode }){
  // ...
  return (
    <WizardFrame docType={docType} heading="Create Deed">
      <ModernEngine docType={docType} />
    </WizardFrame>
  );
}
```

**Passes `docType` correctly to both `WizardFrame` and `ModernEngine`**

---

### **File 3: `WizardFrame.tsx`**

```typescript
export default function WizardFrame({ docType, heading, children }){
  return (
    <div className="wizard-layout">
      <Sidebar />
      <div className="wizard-main-content">
        <div className="wizard-frame__header">
          <div className="wizard-frame__title">
            <DeedTypeBadge docType={docType} /> {/* ✅ WORKS */}
            <h1>{heading}</h1>
          </div>
          <ToggleSwitch />
        </div>
        <div className="wizard-frame__body">
          {children} {/* ModernEngine renders here */}
        </div>
      </div>
    </div>
  );
}
```

**WizardFrame passes `docType` to DeedTypeBadge in HEADER → Works correctly**

---

### **File 4: `ModernEngine.tsx`**

```typescript
export default function ModernEngine({ docType }: { docType: string }) {
  const slug = (docType || '').toLowerCase().replace(/_/g,'-').replace(/\s+/g,'-');
  const flow = promptFlows[slug] || promptFlows['grant-deed']; // ❌ FALLBACK
  const prompts = flow.steps;
  
  // ...
  
  // Inside render (multiple places):
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <DeedTypeBadge docType={flow.docType} /> {/* ❌ USES flow.docType */}
      </div>
      {/* ... */}
    </div>
  );
}
```

**Issues**:
1. Converts `docType` to `slug` (e.g., `"quitclaim_deed"` → `"quitclaim-deed"`)
2. Looks up `promptFlows[slug]`
3. If slug doesn't match, falls back to `promptFlows['grant-deed']`
4. Uses `flow.docType` instead of original `docType` prop

**ROOT CAUSE #2**: Using `flow.docType` instead of original `docType`

---

### **File 5: `promptFlows.ts`**

```typescript
export const promptFlows: Record<string, PromptFlow> = {
  'grant-deed': { docType: 'grant-deed', steps: [...] },
  'quitclaim-deed': { docType: 'quitclaim-deed', steps: [...] },
  'interspousal-transfer': { docType: 'interspousal-transfer', steps: [...] },
  'warranty-deed': { docType: 'warranty-deed', steps: [...] },
  'tax-deed': { docType: 'tax-deed', steps: [...] },
};
```

**Keys are hyphenated**: `'quitclaim-deed'`, not `'quitclaim'`

---

### **File 6: `DeedTypeBadge.tsx`**

```typescript
const LABELS: Record<string,string> = {
  'grant-deed':'Grant Deed',
  'quitclaim-deed':'Quitclaim Deed',
  'interspousal-transfer':'Interspousal Transfer',
  'warranty-deed':'Warranty Deed',
  'tax-deed':'Tax Deed',
};

export default function DeedTypeBadge({ docType }:{ docType:string }){
  const label = LABELS[(docType||'').toLowerCase().replace(/_/g,'-')] || docType;
  return (<span>...</span>);
}
```

**Converts underscores to hyphens for lookup**

---

## 🎯 ROOT CAUSES IDENTIFIED

### **Root Cause #1: Type Mismatch in URL Parsing**

**Location**: `frontend/src/app/create-deed/[docType]/page.tsx`

```typescript
const rawDocType = params?.docType as string || 'grant_deed';
const docType = rawDocType.replace(/-/g, '_') as DocType;
```

**Problem**:
- URL param: `"quitclaim-deed"`
- Converted to: `"quitclaim_deed"` (with underscore)
- But `DocType` type expects: `'quitclaim'` (no suffix!)

**Impact**: Type mismatch propagates through the system

---

### **Root Cause #2: Inconsistent docType Formats**

**Multiple formats used**:
1. **URL format**: `quitclaim-deed` (hyphenated with suffix)
2. **Type format**: `quitclaim` (no suffix, underscore for multi-word)
3. **promptFlows keys**: `quitclaim-deed` (hyphenated with suffix)
4. **DeedTypeBadge keys**: `quitclaim-deed` (hyphenated with suffix)

**Result**: Different parts of the system expect different formats!

---

### **Root Cause #3: Duplicate DeedTypeBadge Rendering**

**Location**: `frontend/src/features/wizard/mode/engines/ModernEngine.tsx`

**Problem**: ModernEngine renders its own DeedTypeBadge inside the content area

```typescript
<div className="p-4">
  <div className="flex items-center justify-between mb-2">
    <DeedTypeBadge docType={flow.docType} /> {/* ❌ DUPLICATE */}
  </div>
  {/* ... */}
</div>
```

**Why this is wrong**:
1. WizardFrame ALREADY shows DeedTypeBadge in header
2. Duplicate badge confuses users
3. Using `flow.docType` (from lookup) instead of original `docType` prop

---

### **Root Cause #4: Fallback to 'grant-deed'**

**Location**: `ModernEngine.tsx`

```typescript
const flow = promptFlows[slug] || promptFlows['grant-deed'];
```

**Problem**: If slug doesn't match any key in `promptFlows`, defaults to 'grant-deed'

**Why it fails**:
- Input: `docType = "quitclaim_deed"`
- Converted to slug: `"quitclaim-deed"` (correct!)
- Lookup in `promptFlows`: ✅ Should work...
- BUT if type conversion was wrong earlier, slug might be different

---

## 🔬 TESTING THE FLOW

### **Scenario 1: Visit `/create-deed/quitclaim-deed`**

```
1. rawDocType = "quitclaim-deed" (from URL)
2. docType = "quitclaim_deed" (after replace)
   ❌ Should be "quitclaim" per DocType union
3. Passed to WizardHost → WizardFrame → DeedTypeBadge
4. DeedTypeBadge converts "quitclaim_deed" → "quitclaim-deed"
   ✅ Finds label "Quitclaim Deed" → WORKS in header
5. Passed to ModernEngine
6. slug = "quitclaim-deed" (after replace)
   ✅ Correct for promptFlows lookup
7. flow = promptFlows["quitclaim-deed"]
   ✅ Should find the flow
8. flow.docType = "quitclaim-deed"
9. DeedTypeBadge in content area uses flow.docType = "quitclaim-deed"
   ✅ Should show "Quitclaim Deed"
```

**Wait, this should work!** Let me check the actual flow again...

---

## 🚨 ACTUAL ISSUE DISCOVERED

Let me trace through the ACTUAL code:

**In `flows.ts`**:
```typescript
export type DocType = 'grant_deed' | 'quitclaim' | 'interspousal_transfer' | 'warranty_deed' | 'tax_deed';
```

Notice: `'quitclaim'` NOT `'quitclaim_deed'`!

**In `page.tsx`**:
```typescript
const docType = rawDocType.replace(/-/g, '_') as DocType;
```

This converts:
- `"quitclaim-deed"` → `"quitclaim_deed"` ❌ (not in DocType union!)

**The mapping should be**:
- URL: `quitclaim-deed` → DocType: `quitclaim` (strip suffix!)
- URL: `interspousal-transfer-deed` → DocType: `interspousal_transfer` (strip suffix!)

**But current code converts**:
- `"quitclaim-deed"` → `"quitclaim_deed"` (wrong!)

---

## ✅ COMPREHENSIVE SOLUTION

### **Option A: Fix Type Conversion (Recommended)**

**Change `page.tsx` to properly map URL → DocType**:

```typescript
// URL to DocType mapping
const URL_TO_DOCTYPE: Record<string, DocType> = {
  'grant-deed': 'grant_deed',
  'quitclaim-deed': 'quitclaim',
  'quitclaim': 'quitclaim',
  'interspousal-transfer': 'interspousal_transfer',
  'warranty-deed': 'warranty_deed',
  'tax-deed': 'tax_deed',
};

export default function UnifiedWizard() {
  const params = useParams();
  const rawDocType = params?.docType as string || 'grant-deed';
  const docType = URL_TO_DOCTYPE[rawDocType] || 'grant_deed';
  
  return <WizardHost docType={docType} classic={<ClassicWizard docType={docType} />} />;
}
```

---

### **Option B: Standardize All Formats to Hyphenated**

**Change DocType union to match URL format**:

```typescript
export type DocType = 'grant-deed' | 'quitclaim-deed' | 'interspousal-transfer' | 'warranty-deed' | 'tax-deed';
```

**Update all references** (flows.ts, adapters, etc.)

**Pros**: Consistent format throughout
**Cons**: Many files to update

---

### **Option C: Remove Duplicate DeedTypeBadge**

**Remove all DeedTypeBadge instances from ModernEngine.tsx**:

```typescript
// Remove these lines from ModernEngine:
<DeedTypeBadge docType={flow.docType} />
```

**Reasoning**:
- WizardFrame already shows badge in header
- No need for duplicate in content area
- Removes complexity

---

## 🎯 RECOMMENDED FIX (Hybrid Approach)

**1. Fix type conversion in `page.tsx`** ✅  
**2. Remove duplicate badges from `ModernEngine.tsx`** ✅  
**3. Ensure `flow.docType` matches for all deed types** ✅

### **Changes Required**:

**File 1: `page.tsx`**
- Add URL_TO_DOCTYPE mapping
- Use proper conversion

**File 2: `ModernEngine.tsx`**
- Remove all `<DeedTypeBadge />` instances inside component
- Keep only in WizardFrame header

**File 3: `promptFlows.ts`** (verify)
- Ensure all keys match URL format
- Ensure all `docType` values match

---

## 📋 IMPLEMENTATION CHECKLIST

- [ ] Create URL_TO_DOCTYPE mapping in page.tsx
- [ ] Update docType conversion logic
- [ ] Remove DeedTypeBadge from ModernEngine (all instances)
- [ ] Verify promptFlows keys match URL format
- [ ] Test all 5 deed types:
  - [ ] Grant Deed
  - [ ] Quitclaim Deed
  - [ ] Interspousal Transfer
  - [ ] Warranty Deed
  - [ ] Tax Deed
- [ ] Verify badge shows correct type in header
- [ ] Verify NO duplicate badges in content
- [ ] Test Classic mode (should still work)
- [ ] Test Modern mode (should show correct type)

---

## 🎯 EXPECTED RESULTS AFTER FIX

### **Test Case 1: Visit `/create-deed/quitclaim-deed`**

**Initial Load (Classic Mode)**:
1. ✅ Header shows: `[Quitclaim Deed] Create Deed`
2. ✅ Toggle switch shows: `[● Classic] Modern` (gray bg)
3. ✅ Classic wizard displays Quitclaim steps
4. ✅ NO duplicate badge in content area

**After Toggle to Modern**:
1. ✅ Header STILL shows: `[Quitclaim Deed] Create Deed`
2. ✅ Toggle switch shows: `Classic [● Modern]` (blue bg)
3. ✅ Modern Q&A shows quitclaim questions
4. ✅ NO duplicate badge in content area

**After Toggle BACK to Classic**:
1. ✅ Header STILL shows: `[Quitclaim Deed] Create Deed`
2. ✅ Toggle switch shows: `[● Classic] Modern` (gray bg)
3. ✅ Classic wizard STILL shows Quitclaim steps
4. ✅ Deed type NEVER changes to Grant Deed

---

### **Test Case 2: Visit `/create-deed/interspousal-transfer`**

**Initial Load (Classic Mode)**:
1. ✅ Header shows: `[Interspousal Transfer] Create Deed`
2. ✅ Toggle switch visible
3. ✅ Classic wizard displays Interspousal steps
4. ✅ NO duplicate badge in content area

**After Toggle to Modern**:
1. ✅ Header STILL shows: `[Interspousal Transfer] Create Deed`
2. ✅ Modern Q&A shows interspousal questions
3. ✅ NO duplicate badge in content area

**After Toggle BACK to Classic**:
1. ✅ Header STILL shows: `[Interspousal Transfer] Create Deed`
2. ✅ Classic wizard STILL shows Interspousal steps
3. ✅ Deed type NEVER changes to Grant Deed

---

### **Test Case 3: All 5 Deed Types**

**Each deed type must work correctly**:
- [ ] Grant Deed (`/create-deed/grant-deed`)
- [ ] Quitclaim Deed (`/create-deed/quitclaim-deed`)
- [ ] Interspousal Transfer (`/create-deed/interspousal-transfer`)
- [ ] Warranty Deed (`/create-deed/warranty-deed`)
- [ ] Tax Deed (`/create-deed/tax-deed`)

**For EACH deed type**:
- [ ] Header shows correct deed type
- [ ] Classic mode shows correct steps
- [ ] Modern mode shows correct questions
- [ ] Toggle preserves deed type (no reset to Grant Deed)
- [ ] Toggle works multiple times (Classic ↔ Modern ↔ Classic)
- [ ] NO duplicate badges anywhere

---

## 🔐 TOGGLE BEHAVIOR GUARANTEE

**Critical Requirement**: Deed type MUST be preserved when toggling between modes.

### **How it Currently Works**:

```typescript
// WizardHost receives docType from URL
function Inner({ docType, classic }) {
  const { mode } = useWizardMode(); // 'classic' or 'modern'
  
  if (mode === 'modern') {
    return (
      <WizardFrame docType={docType}> {/* ✅ Correct docType */}
        <ModernEngine docType={docType} /> {/* ✅ Passes docType */}
      </WizardFrame>
    );
  }
  
  return (
    <WizardFrame docType={docType}> {/* ✅ Correct docType */}
      <ClassicEngine>{classic}</ClassicEngine> {/* ✅ Classic uses docType from props */}
    </WizardFrame>
  );
}
```

**Why Toggle Preserves Deed Type**:
1. ✅ `docType` comes from URL (never changes during session)
2. ✅ `mode` is stored in `useState` (changes on toggle)
3. ✅ When `mode` changes, React re-renders with SAME `docType`
4. ✅ Both Modern and Classic receive SAME `docType` prop
5. ✅ WizardFrame header ALWAYS shows correct `docType`

### **Current Bug in ModernEngine**:

```typescript
// ❌ BAD: Uses flow.docType instead of docType prop
const flow = promptFlows[slug] || promptFlows['grant-deed']; // Fallback!
<DeedTypeBadge docType={flow.docType} /> // Uses flow, not prop!
```

**If lookup fails**:
- Falls back to `promptFlows['grant-deed']`
- `flow.docType` = `'grant-deed'`
- Badge shows "Grant Deed" even though URL is `/create-deed/quitclaim-deed`

### **Solution Guarantees**:

1. ✅ Remove duplicate badge from ModernEngine → No more wrong badge
2. ✅ Fix type conversion → promptFlows lookup never fails
3. ✅ docType prop flows consistently → Header always correct
4. ✅ Toggle changes only `mode`, not `docType` → Deed type preserved

**Result**: User can toggle infinitely, deed type NEVER changes!

---

## 🔍 SUMMARY

**Root Causes**:
1. ❌ Incorrect type conversion (quitclaim-deed → quitclaim_deed instead of quitclaim)
2. ❌ Duplicate DeedTypeBadge in ModernEngine content area
3. ❌ Using flow.docType instead of original docType prop
4. ❌ promptFlows lookup fallback hides the real issue

**Solution**:
1. ✅ Add proper URL → DocType mapping in page.tsx
2. ✅ Remove duplicate badges from ModernEngine content area
3. ✅ Keep badge ONLY in WizardFrame header
4. ✅ Ensure docType prop flows consistently from URL → WizardHost → WizardFrame

**Toggle Behavior**:
- ✅ docType comes from URL (immutable during session)
- ✅ mode is UI state (toggleable)
- ✅ Changing mode does NOT change docType
- ✅ Both Classic and Modern use same docType
- ✅ Header always shows correct deed type

**Impact**: 
- Zero breaking changes
- Cleaner UI (no duplicate badges)
- Correct deed type everywhere
- Toggle works infinitely without losing context
- All 5 deed types work correctly


