# 🐛 BUG TRACE - GRANTOR/GRANTEE/LEGAL DESCRIPTION MISSING

**Error**: `400 Bad Request - Validation failed: Grantor information is required; Grantee information is required; Legal description is required`

**Location**: Preview page trying to generate PDF

---

## 🔬 DATA FLOW TRACE

### Step 1: User Completes Property Search ✅
```
PropertyStepBridge → updateFormData({
  apn: '8381-021-001',
  county: 'LA VERNE',
  propertyAddress: '1358 5th St...',
  legalDescription: 'LOT 1...',
  grantorName: 'HERNANDEZ GERARDO J',  // Prefilled from SiteX
  vesting: 'Joint Tenants'
})
```

**Saved to localStorage**:
```json
{
  "formData": {
    "apn": "8381-021-001",
    "county": "LA VERNE",
    "propertyAddress": "1358 5th St...",
    "legalDescription": "LOT 1...",
    "grantorName": "HERNANDEZ GERARDO J",
    "vesting": "Joint Tenants"
  },
  "verifiedData": { /* ... */ }
}
```

---

### Step 2: ModernEngine Loads Initial State ✅
```typescript
useEffect(() => {
  if (!hydrated) return;
  const data = getWizardData();
  const initial = { 
    ...(data.formData || {}),  // Spreads all fields including grantorName
    apn: data.formData?.apn || data.verifiedData?.apn || data.apn,
    // ... more fields
  };
  setState(initial);
}, [hydrated]);
```

**Result**: `state` now has:
```javascript
{
  apn: '8381-021-001',
  county: 'LA VERNE',
  propertyAddress: '1358 5th St...',
  legalDescription: 'LOT 1...',
  grantorName: 'HERNANDEZ GERARDO J',
  vesting: 'Joint Tenants'
}
```

---

### Step 3: User Answers Questions 🤔
User sees Modern Q&A wizard and answers:
1. **Q**: "Who is transferring title (Grantor)?"  
   **Field**: `grantorName`  
   **Answer**: User sees prefilled "HERNANDEZ GERARDO J", clicks Next

2. **Q**: "Who is receiving title (Grantee)?"  
   **Field**: `granteeName`  
   **Answer**: User types "Jane Doe", clicks Next

3. **Q**: "How will title be vested?"  
   **Field**: `vesting`  
   **Answer**: User sees prefilled "Joint Tenants", clicks Next

**onChange Handler**:
```typescript
const onChange = (field: string, value: any) => setState(s => ({ ...s, [field]: value }));
```

**EXPECTED Result**: `state` should now have:
```javascript
{
  apn: '8381-021-001',
  county: 'LA VERNE',
  propertyAddress: '1358 5th St...',
  legalDescription: 'LOT 1...',
  grantorName: 'HERNANDEZ GERARDO J',  // Kept from prefill
  granteeName: 'Jane Doe',              // NEW: User typed this
  vesting: 'Joint Tenants'              // Kept from prefill
}
```

---

### Step 4: State Syncs to localStorage 🤔
```typescript
useEffect(() => {
  if (!hydrated) return;
  updateFormData(state);
}, [hydrated, state, updateFormData]);
```

**This should save updated `state` to localStorage after each answer.**

---

### Step 5: User Clicks "Confirm & Generate" ❌
```typescript
const onNext = async () => {
  if (i < total - 1) {
    setI(i + 1);
  } else {
    const payload = toCanonicalFor(docType, state);  // ❌ PROBLEM HERE
    // ... finalize deed
  }
};
```

**What `toCanonical(state)` receives**: `state` at THIS MOMENT

**EXPECTED**:
```javascript
{
  apn: '8381-021-001',
  granteeName: 'Jane Doe',
  // ... all fields
}
```

**ACTUAL** (suspected):
```javascript
{
  apn: '8381-021-001',
  granteeName: '',  // ❌ MISSING!
  grantorName: 'HERNANDEZ GERARDO J',  // May or may not be present
  legalDescription: '',  // ❌ MISSING!
}
```

---

## 🔍 ROOT CAUSE HYPOTHESIS

**The problem is a RACE CONDITION or STATE SYNC ISSUE.**

###  Possible Causes:

#### Cause A: useEffect Dependency Issue
The second `useEffect` that syncs state to localStorage has `state` in its dependencies:
```typescript
useEffect(() => {
  if (!hydrated) return;
  updateFormData(state);
}, [hydrated, state, updateFormData]);
```

**Problem**: This creates a potential loop:
1. User answers question → `setState` updates state
2. State change triggers useEffect → `updateFormData(state)` saves to localStorage
3. `updateFormData` might trigger a re-render
4. State might get reset or overwritten

#### Cause B: State Not Updated Before Finalize
When user clicks "Confirm & Generate", the `onNext` function is called immediately:
```typescript
const onNext = async () => {
  const payload = toCanonicalFor(docType, state);  // Uses state RIGHT NOW
  // ...
};
```

**Problem**: If React hasn't finished processing the last state update (from the previous question), `state` might be stale.

#### Cause C: PrefillCombo Not Calling onChange
The PrefillCombo component is used for `grantorName`:
```typescript
{current.type === 'prefill-combo' ? (
  <PrefillCombo
    label={current.label || current.question}
    value={state[current.field] || ''}
    onChange={(v) => onChange(current.field, v)}
    suggestions={current.field === 'grantorName' ? ownerCandidates : []}
    partners={current.field === 'requestedBy' ? partners : []}
    allowNewPartner={current.field === 'requestedBy'}
  />
) : (
  <input
    className="modern-input"
    type="text"
    value={state[current.field] || ''}
    onChange={(e) => onChange(current.field, e.target.value)}
    placeholder={current.placeholder || ''}
  />
)}
```

**Problem**: If the user doesn't actively CHANGE the prefilled value, `onChange` might not be called, so `state[current.field]` remains whatever it was initialized to. BUT if the initial state has the value, this should be fine...

UNLESS: The PrefillCombo's `value` prop is `state[current.field] || ''`. If `state[current.field]` is `undefined`, it becomes `''`, and the onChange is never called, so it stays `''`.

---

## 🔧 THE REAL BUG

**I think I found it!**

Look at the PrefillCombo:
```typescript
<PrefillCombo
  value={state[current.field] || ''}  // ❌ PROBLEM HERE
  onChange={(v) => onChange(current.field, v)}
/>
```

**If `state[current.field]` is `undefined`** (because the field wasn't in initial state), then `value` becomes `''` (empty string).

**The PrefillCombo component** expects to show suggestions, but if the `value` is empty, it might not trigger `onChange` when the user selects a suggestion, OR the user might not interact with it at all if they think it's already filled.

**Actually, let me check PrefillCombo's implementation:**

```typescript
// frontend/src/features/wizard/mode/components/PrefillCombo.tsx
const [draft, setDraft] = useState(value || '');

// When user selects from dropdown:
onClick={() => {
  onChange(it.label);  // ✅ This DOES call onChange
  setDraft(it.label);
  setOpen(false);
}}
```

So PrefillCombo DOES call `onChange` when a suggestion is selected. That's good.

**BUT**: What if the user just clicks "Next" without selecting anything? Then `onChange` is never called, and `state[current.field]` remains `undefined` or `''`.

---

## ✅ THE FIX

The problem is that we're not initializing `state` with all the fields that the wizard expects to fill out. We only initialize property-related fields, but not party fields like `granteeName`.

**Fix**: In ModernEngine, when initializing state, we should also initialize ALL prompt fields with empty strings:

```typescript
useEffect(() => {
  if (!hydrated) return;
  const data = getWizardData();
  
  // FIXED: Initialize ALL prompt fields, not just property fields
  const initial = { 
    ...(data.formData || {}),
    // Property fields (from verifiedData if not in formData)
    apn: data.formData?.apn || data.verifiedData?.apn || data.apn || '',
    county: data.formData?.county || data.verifiedData?.county || data.county || '',
    propertyAddress: data.formData?.propertyAddress || data.verifiedData?.fullAddress || data.propertyAddress || '',
    fullAddress: data.formData?.fullAddress || data.verifiedData?.fullAddress || data.fullAddress || '',
    legalDescription: data.formData?.legalDescription || data.verifiedData?.legalDescription || data.legalDescription || '',
    // Party fields (ensure they exist even if empty)
    grantorName: data.formData?.grantorName || data.verifiedData?.currentOwnerPrimary || data.grantorName || '',
    granteeName: data.formData?.granteeName || '',  // NEW: Explicitly initialize
    vesting: data.formData?.vesting || data.verifiedData?.vestingDetails || data.vesting || '',
    requestedBy: data.formData?.requestedBy || '',  // NEW: Explicitly initialize
  };
  setState(initial);
}, [hydrated]);
```

This ensures that:
1. Property fields are prefilled from verifiedData
2. Party fields are initialized to empty strings if not in formData
3. PrefillCombo has a value to work with (not `undefined`)
4. When user clicks Next without changing, the field is at least `''` (not `undefined`)

---

## 🚀 DEPLOYMENT PLAN

1. Update `ModernEngine.tsx` to explicitly initialize all prompt fields
2. Ensure empty strings are used as fallbacks (not `null` or `undefined`)
3. Test end-to-end: property search → answer questions → finalize → preview

**SLOW AND STEADY. SYSTEMATIC DEBUGGING. 🐢✨**

