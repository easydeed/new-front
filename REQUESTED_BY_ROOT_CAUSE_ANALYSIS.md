# Requested By Field - Root Cause Analysis

**Date**: October 23, 2025  
**Status**: 🔴 BUG IDENTIFIED

---

## 🐛 Reported Issues

1. **Issue A**: Partner list did not appear in "Requested By" dropdown
2. **Issue B**: Name typed into field did not appear on generated deed

---

## ✅ What We Fixed (That Actually Works)

### Backend & Database:
- ✅ Database migration successful - `requested_by` column exists
- ✅ Backend accepts `requested_by` in DeedCreate model
- ✅ Backend saves `requested_by` to database
- ✅ Preview page sends `requested_by` to PDF generation

### Partners Dropdown (Issue A):
- ✅ Fixed 403 error - `PartnersContext` now includes Authorization header
- ✅ Partners list loads successfully from `/api/partners/selectlist`

---

## ❌ THE ACTUAL BUG: PrefillCombo Input Handler

### Root Cause:
**`PrefillCombo.tsx` line 37:**

```typescript
<input
  className="modern-input"
  value={draft}
  onFocus={() => setOpen(true)}
  onChange={(e) => setDraft(e.target.value)}  // ❌ ONLY updates local draft!
  placeholder={`Type or pick…`}
/>
```

### The Problem:

**When user TYPES in the input field:**
- ✅ Updates local `draft` state
- ❌ **NEVER calls `onChange(value)` prop**
- ❌ **NEVER updates parent (ModernEngine) state**
- ❌ **Value is lost** when user moves to next question

**When user CLICKS a dropdown item:**
- ✅ Calls `onChange(it.label)` (line 68)
- ✅ Updates `draft` state (line 69)
- ✅ Updates parent state ✅

---

## 🔍 Data Flow Analysis

### Expected Flow:
```
User types "John Smith"
  ↓
PrefillCombo input onChange fires
  ↓
PrefillCombo calls props.onChange("John Smith")
  ↓
ModernEngine.onChange updates state.requestedBy
  ↓
User clicks "Next"
  ↓
onNext logs state.requestedBy: "John Smith"
  ↓
finalizeDeed reads state.requestedBy
  ↓
Backend receives requested_by: "John Smith"
  ↓
PDF displays "Requested By: John Smith"
```

### Actual Flow (BROKEN):
```
User types "John Smith"
  ↓
PrefillCombo input onChange fires
  ↓
Only updates local draft: "John Smith"
  ↓ ❌ STOPS HERE - parent onChange NEVER called
  ↓
User clicks "Next"
  ↓
onNext logs state.requestedBy: undefined ❌
  ↓
finalizeDeed reads state.requestedBy: undefined
  ↓
Backend receives requested_by: ""
  ↓
PDF displays "Requested By: [empty]"
```

---

## 📋 Complete File Analysis

### 1. `promptFlows.ts` (Lines 52-58) ✅ CORRECT
```typescript
{
  id: 'requestedBy',
  question: 'Who is requesting the recording?',
  field: 'requestedBy',              // ✅ Field name is correct
  type: 'prefill-combo',             // ✅ Uses PrefillCombo component
  label: 'Requested By',
  why: 'Select from Industry Partners or type a new one.',
}
```

### 2. `ModernEngine.tsx` (Line 179) ✅ CORRECT
```typescript
<PrefillCombo
  label={current.label || current.question}
  value={state[current.field] || ''}
  onChange={(v) => onChange(current.field, v)}  // ✅ Would work if called
  suggestions={current.field === 'grantorName' ? ownerCandidates : []}
  partners={current.field === 'requestedBy' ? partners : []}
  allowNewPartner={current.field === 'requestedBy'}
/>
```

### 3. `ModernEngine.tsx` onChange (Line 136-143) ✅ CORRECT
```typescript
const onChange = (field: string, value: any) => {
  console.log(`[ModernEngine.onChange] 🔵 field="${field}" value="${value}"`);
  setState(s => {
    const newState = { ...s, [field]: value };
    console.log('[ModernEngine.onChange] 🔵 Updated state:', newState);
    return newState;
  });
};
```

### 4. `finalizeDeed.ts` (Line 78) ✅ CORRECT
```typescript
const backendPayload: AnyObj = {
  // ... other fields
  requested_by: state?.requestedBy || '',  // ✅ Looks for state.requestedBy
  source: 'modern-canonical',
};
```

### 5. `PrefillCombo.tsx` (Line 37) ❌ **BUG HERE**
```typescript
<input
  className="modern-input"
  value={draft}
  onFocus={() => setOpen(true)}
  onChange={(e) => setDraft(e.target.value)}  // ❌ Missing: onChange(e.target.value)
  placeholder={`Type or pick…`}
/>
```

**Should be:**
```typescript
<input
  className="modern-input"
  value={draft}
  onFocus={() => setOpen(true)}
  onChange={(e) => {
    const newValue = e.target.value;
    setDraft(newValue);
    onChange(newValue);  // 🔧 FIX: Call parent onChange
  }}
  placeholder={`Type or pick…`}
/>
```

---

## 🔧 The Fix

### Option A: Call onChange on Every Keystroke (Immediate)
```typescript
onChange={(e) => {
  const newValue = e.target.value;
  setDraft(newValue);
  onChange(newValue);  // Update parent state immediately
}}
```

**Pros**: Simple, immediate feedback  
**Cons**: Many state updates (but React handles this efficiently)

### Option B: Call onChange onBlur (Delayed)
```typescript
onBlur={() => {
  if (draft !== value) {
    onChange(draft);
  }
}}
```

**Pros**: Fewer state updates  
**Cons**: Previous attempt failed because onBlur fired before dropdown click

### Option C: Hybrid - Both onChange and onBlur
```typescript
onChange={(e) => {
  const newValue = e.target.value;
  setDraft(newValue);
  onChange(newValue);  // Immediate update
}}
onBlur={() => {
  if (draft !== value) {
    onChange(draft);  // Safety net
  }
}}
```

**Pros**: Most robust  
**Cons**: Slightly redundant

---

## 🎯 Recommended Solution

**Option A - Call onChange on Every Keystroke**

This matches standard React controlled component patterns and is what the Grantor field does when it's a regular text input (not PrefillCombo).

---

## 🧪 Test Plan After Fix

1. Go to Modern Wizard
2. For "Who is requesting the recording?" field:
   - **Test A**: Type "Jane Doe" (don't click dropdown) → Click Next
   - **Test B**: Click a partner from dropdown → Click Next
   - **Test C**: Type new name → Click "Add new partner" → Click Next
3. Complete wizard and generate PDF
4. **Expected**: All three methods save the value and it appears on PDF

---

## 📊 Why This Affects Grantor Too (Sometimes)

The Grantor field ALSO uses `PrefillCombo`:
```typescript
{
  id: 'grantor',
  question: 'Who is transferring title (Grantor)?',
  field: 'grantorName',
  type: 'prefill-combo',  // ← Same component!
  // ...
}
```

**Same bug applies if user types without selecting from dropdown!**

---

## 💡 Why It "Sometimes Works"

If user:
- ✅ Clicks a dropdown suggestion → Works (calls onChange line 68)
- ✅ Clicks "Add new partner" → Works (calls onChange line 113, 119)
- ❌ Types and presses Tab/Enter → **Fails** (no onChange call)
- ❌ Types and clicks Next button → **Fails** (no onChange call)

---

## 🚦 Next Actions

1. Fix `PrefillCombo.tsx` input onChange handler
2. Test with Grantor field (affected by same bug)
3. Test with Requested By field
4. Deploy fix
5. Test in production

---

**Root Cause Confirmed**: PrefillCombo input does not propagate typed values to parent state.  
**Fix**: Add `onChange(e.target.value)` call in input onChange handler.


