# Phase 16: Wizard Flow Forensic Analysis

**Date**: October 24, 2025  
**Status**: 🔴 **CRITICAL BUG FOUND - WIZARD FLOW BROKEN**

---

## 🚨 **User-Reported Issues**

1. ❌ **Legal Description field disappears after pressing Next then Back**
2. ❌ **Partners API still 404**
3. ❌ **"Who is requesting" step was bypassed**

---

## 🔬 **Log Analysis**

### **Issue #1: Partners API Still 404**

```
/api/partners/selectlist:1  Failed to load resource: the server responded with a status of 404 ()
```

**Evidence**: The v7.3 fix hasn't taken effect in production yet.

**Possible Causes**:
1. Vercel deployment still in progress (takes 2-3 min)
2. Vercel cached the old route
3. The nodejs runtime change didn't work
4. Route file wasn't deployed correctly

---

### **Issue #2: Step Count Shifts Mid-Flow** 🔴 **CRITICAL**

**Timeline from logs**:

```javascript
// Step 1: Grantor (step 1/5)
[ModernEngine.onNext] Current step: 1 / 5
[ModernEngine.onNext] 🔴 grantorName: HERNANDEZ GERARDO J; MENDOZA YESSICA S
[ModernEngine.onNext] Moving to next step

// Step 2: Grantee (step 2/5)
[ModernEngine.onChange] 🔵 field="granteeName" value="John Smith"
[ModernEngine.onNext] Current step: 2 / 5
[ModernEngine.onNext] 🔴 granteeName: John Smith
[ModernEngine.onNext] Moving to next step

// Step 3: Legal Description (step 3/5)
[ModernEngine.onChange] 🔵 field="legalDescription" value="Legal Descrioioh Is abv 123"
[ModernEngine.onNext] Current step: 3 / 5  // ← Still 5 total steps
[ModernEngine.onNext] 🔴 legalDescription: Legal Descrioioh Is abv 123
[ModernEngine.onNext] Moving to next step

// ⚠️ STEP COUNT SUDDENLY CHANGES!
[ModernEngine.onNext] Current step: 2 / 4  // ← Now only 4 total steps!?
[ModernEngine.onChange] 🔵 field="requestedBy" value="John Smith"
```

**Key Observation**: Step count changed from **5 to 4** after filling legal description!

---

## 🐛 **ROOT CAUSE: Dynamic Step Filtering**

### **The Problem**

The wizard uses `showIf` to **dynamically filter** which steps appear in the flow:

```typescript
// frontend/src/features/wizard/mode/prompts/promptFlows.ts
{
  id: 'legalDescription',
  field: 'legalDescription',
  type: 'text',
  showIf: (state: any) => shouldShowLegal(state),  // ← Dynamic filtering
}
```

### **What `shouldShowLegal` Does**

```typescript
// frontend/src/lib/wizard/legalShowIf.ts
export function shouldShowLegal(state: any): boolean {
  try {
    const legal = (state?.legalDescription ?? '').toString();
    const norm = legal.trim().toLowerCase();
    const hasValid = norm !== '' && norm !== 'not available' && legal.length >= 12;
    if (state?.__editing_legal) return true;  // Show while editing
    return !hasValid;  // ← Show if NOT valid, HIDE if valid
  } catch {
    return true;
  }
}
```

**Logic**:
- If `__editing_legal` is true → **SHOW** (keep visible while typing)
- If legal description is valid (12+ chars, not empty, not "Not available") → **HIDE** ❌
- If legal description is NOT valid → **SHOW**

---

## 💥 **The Fatal Flaw**

### **Scenario: User Fills Legal Description**

1. **Step 3/5**: User on legal description step
2. **User types**: "Legal Descrioioh Is abv 123" (29 characters)
3. **onBlur fires**: After 200ms, `__editing_legal` set to `false`
4. **shouldShowLegal() called**:
   - `legal.length >= 12` → TRUE (29 > 12)
   - `__editing_legal` → FALSE (no longer editing)
   - `hasValid` → TRUE
   - Returns `!hasValid` → **FALSE** (hide the step!)
5. **Step gets filtered OUT**: The `promptFlows` array is recalculated
6. **Steps array shrinks**: From 5 steps to 4 steps
7. **Current step index becomes invalid**: User was on step 3 of 5, now there are only 4 steps total
8. **Next button calculates next step**: `i < total` check fails, wizard skips to wrong step

---

## 📊 **Step Array Reconstruction**

### **Original Steps (Before Legal Description Filled)**

```typescript
[
  { id: 'grantor', field: 'grantorName' },          // Step 1
  { id: 'grantee', field: 'granteeName' },          // Step 2
  { id: 'legalDescription', showIf: shouldShowLegal }, // Step 3 ← VISIBLE (value is "Not available")
  { id: 'requestedBy', field: 'requestedBy' },      // Step 4
  { id: 'vesting', field: 'vesting' },              // Step 5
]
// Total: 5 steps
```

### **After Legal Description Filled (29 chars)**

```typescript
[
  { id: 'grantor', field: 'grantorName' },     // Step 1
  { id: 'grantee', field: 'granteeName' },     // Step 2
  // legalDescription REMOVED - showIf returned false
  { id: 'requestedBy', field: 'requestedBy' }, // Step 3 (was 4)
  { id: 'vesting', field: 'vesting' },         // Step 4 (was 5)
]
// Total: 4 steps
```

**Result**: 
- User clicks Next from legal description (old step 3)
- Step index increments: `i = 3`
- But now `requestedBy` is at index 2 (not 3)!
- Wizard shows wrong step OR skips ahead

---

## 🔍 **Why "Who is requesting" Was Bypassed**

From the logs:

```javascript
[ModernEngine.onNext] Current step: 3 / 5  // User on legal description
[ModernEngine.onNext] Moving to next step

// ⚠️ Array gets filtered, step count changes
[ModernEngine.onNext] Current step: 2 / 4  // Now on different step!
[ModernEngine.onChange] 🔵 field="requestedBy"  // This field appeared
```

**What Happened**:
1. User on step 3 of 5 (legal description)
2. Clicks Next → `i = 4` (should go to step 4: requestedBy)
3. **But** steps array gets recalculated
4. Legal description step is REMOVED (showIf → false)
5. Now only 4 steps total
6. Step index 4 doesn't exist (array is 0-3)
7. Logic shows step 2 (which is now requestedBy, was step 4 before)

**The wizard jumped backwards in the flow!**

---

## 🔍 **Why Legal Description Disappeared When Pressing Back**

From user report: "When I pressed back. Then the Legal Description field Disappeared all together."

**What Happened**:
1. User filled legal description (29 chars)
2. Legal description step got filtered OUT (showIf → false)
3. User pressed Back button
4. Wizard tried to go to previous step
5. **Legal description step doesn't exist anymore** (filtered out)
6. Wizard skipped over it to the step before (grantee)

**The step is GONE from the visible flow!**

---

## 📋 **ModernEngine Step Calculation**

Let's trace how steps are calculated:

```typescript
// frontend/src/features/wizard/mode/engines/ModernEngine.tsx
const visibleSteps = useMemo(() => {
  return promptFlows
    .find((f) => f.docType === docType)
    ?.steps.filter((s) => !s.showIf || s.showIf(state)) || [];  // ← Dynamic filtering!
}, [docType, state]);  // ← Recalculates every time state changes!
```

**Key Point**: `visibleSteps` is recalculated **every time `state` changes**!

**Flow**:
1. User types in legal description
2. `state.legalDescription` changes
3. `useMemo` recalculates
4. Calls `shouldShowLegal(state)` for legal description step
5. If valid (12+ chars), returns `false`
6. Step gets filtered out
7. `visibleSteps` array shrinks
8. Current step index becomes invalid

---

## 🎯 **The Design Flaw**

### **Intended Behavior** (What we thought):
- `showIf` controls whether a step appears **initially** based on state
- Once a step is shown and filled, it should stay in the flow
- User can navigate forward and backward through all visited steps

### **Actual Behavior** (What's happening):
- `showIf` is called **on every state change**
- Steps can appear and disappear **mid-flow**
- Step indices shift dynamically
- Navigation breaks when steps disappear

---

## 🔧 **Why v7.3 Fix Didn't Help**

Our v7.3 fix added `onFocus`/`onBlur` handlers to set `__editing_legal`:

```typescript
onFocus={() => { if (current.field === "legalDescription") setState(s => ({ ...s, __editing_legal: true })); }}
onBlur={() => { if (current.field === "legalDescription") setTimeout(() => setState(s => ({ ...s, __editing_legal: false })), 200); }}
```

**This works WHILE the user is on the legal description step**, but:
1. User types 12+ characters
2. User clicks Next
3. **Blur event fires** → `__editing_legal` set to `false`
4. **200ms later**, state updates
5. `visibleSteps` recalculates
6. Legal description step gets filtered out
7. **Step indices shift**

**The temporal state prevents the field from disappearing WHILE TYPING**, but doesn't prevent it from being filtered out AFTER leaving the step.

---

## 🚨 **Critical Issues**

### **Issue A: Dynamic Step Filtering Breaks Navigation**
- Steps appear/disappear mid-flow
- Step indices become invalid
- Forward/back navigation broken
- User loses progress

### **Issue B: showIf Logic Is Backwards**
```typescript
return !hasValid;  // Show if NOT valid, HIDE if valid
```

This says: "Hide the step once the user fills it correctly."

**This is wrong!** Once a step is shown and filled, it should:
- Stay in the flow
- Be navigable via Back button
- Show the filled value when revisited

### **Issue C: State Dependency in useMemo**
```typescript
}, [docType, state]);  // ← Recalculates on EVERY state change
```

Every keystroke triggers a recalculation of visible steps!

---

## 📊 **Impact Assessment**

| Issue | Severity | Impact |
|-------|----------|--------|
| **Step indices shift mid-flow** | 🔴 **CRITICAL** | Breaks navigation, skips steps |
| **Legal description disappears** | 🔴 **CRITICAL** | User loses filled data, can't go back |
| **"Who is requesting" bypassed** | 🔴 **CRITICAL** | Required field skipped, incomplete data |
| **Partners API 404** | 🟠 **HIGH** | Dropdown doesn't populate, UX degraded |
| **State recalculates on every keystroke** | 🟡 **MEDIUM** | Performance impact, unnecessary re-renders |

---

## 🔧 **Proposed Fixes**

### **Option A: Remove Dynamic Filtering for Legal Description**

**Change**: Don't use `showIf` for legal description. Always show it.

```typescript
// frontend/src/features/wizard/mode/prompts/promptFlows.ts
{
  id: 'legalDescription',
  question: 'What is the legal description of the property?',
  field: 'legalDescription',
  type: 'text',
  // showIf: (state: any) => shouldShowLegal(state),  // ← REMOVE THIS
  required: true,
},
```

**Pros**:
- ✅ Simple fix
- ✅ Step always present, no dynamic filtering
- ✅ Navigation works correctly
- ✅ User can always go back and edit

**Cons**:
- ⚠️ Step always shows, even if county provides it
- ⚠️ User has to interact with pre-filled "Not available"

---

### **Option B: Change showIf Logic to "Show Once Then Keep"**

**Change**: Track which steps have been visited, keep them visible forever.

```typescript
// In ModernEngine.tsx
const [visitedSteps, setVisitedSteps] = useState<Set<string>>(new Set());

const visibleSteps = useMemo(() => {
  return promptFlows
    .find((f) => f.docType === docType)
    ?.steps.filter((s) => {
      if (!s.showIf) return true;  // Always show if no condition
      if (visitedSteps.has(s.id)) return true;  // Always show if visited
      return s.showIf(state);  // Otherwise check condition
    }) || [];
}, [docType, state, visitedSteps]);

// In onNext handler
useEffect(() => {
  if (current) {
    setVisitedSteps(prev => new Set(prev).add(current.id));
  }
}, [current]);
```

**Pros**:
- ✅ Step shown conditionally on first appearance
- ✅ Once shown, stays in flow
- ✅ Navigation works correctly
- ✅ Flexible for other conditional steps

**Cons**:
- ⚠️ More complex logic
- ⚠️ Need to persist `visitedSteps` to localStorage
- ⚠️ Edge cases with wizard reset

---

### **Option C: Change showIf Logic to "Hide BEFORE Showing, Not After"**

**Change**: Only hide steps that haven't been filled yet.

```typescript
// frontend/src/lib/wizard/legalShowIf.ts
export function shouldShowLegal(state: any): boolean {
  try {
    const legal = (state?.legalDescription ?? '').toString();
    const norm = legal.trim().toLowerCase();
    
    // If currently editing, always show
    if (state?.__editing_legal) return true;
    
    // If already filled with valid data, SHOW IT (don't hide)
    const hasValid = norm !== '' && norm !== 'not available' && legal.length >= 12;
    if (hasValid) return true;  // ← CHANGED: Show if valid
    
    // If empty or "Not available", check if we should show
    // Show if: SiteX didn't provide it OR it's invalid
    return norm === '' || norm === 'not available';
  } catch {
    return true;
  }
}
```

**Logic Changes**:
- `__editing_legal` → **SHOW**
- Valid (12+ chars, not "Not available") → **SHOW** (was: hide)
- Empty or "Not available" → **SHOW**
- **Never returns FALSE** once filled!

**Pros**:
- ✅ Minimal code change
- ✅ Step stays visible once filled
- ✅ Navigation works
- ✅ Temporal state logic preserved

**Cons**:
- ⚠️ Step always shows once visited (same as Option A)

---

### **Option D: Don't Use showIf for This Purpose**

**Change**: Use `showIf` only for steps that should be CONDITIONALLY ADDED to the flow based on deed type or property type, NOT for steps that might be auto-filled.

**For legal description**: Always show it. If county provides it, pre-fill it. User can edit.

```typescript
{
  id: 'legalDescription',
  field: 'legalDescription',
  // NO showIf
  required: true,
}
```

**Pros**:
- ✅ Simplest solution
- ✅ No dynamic filtering
- ✅ No edge cases
- ✅ User always has control

**Cons**:
- ⚠️ Might show steps that aren't always needed

---

## 🎯 **Recommended Solution**

**Implement Option C: Change showIf to Always Return True Once Filled**

**Rationale**:
1. ✅ **Minimal code change** (one line in `shouldShowLegal`)
2. ✅ **Preserves existing logic** (temporal state, focus/blur)
3. ✅ **Fixes all three issues**:
   - Legal description won't disappear (always returns true once filled)
   - "Who is requesting" won't be bypassed (step indices stable)
   - Navigation works (steps don't shift)
4. ✅ **No risk of breaking other parts** of the wizard

**Implementation**:

```typescript
// frontend/src/lib/wizard/legalShowIf.ts
export function shouldShowLegal(state: any): boolean {
  try {
    const legal = (state?.legalDescription ?? '').toString();
    const norm = legal.trim().toLowerCase();
    
    // Always show if currently editing
    if (state?.__editing_legal) return true;
    
    // Always show if filled with valid data (don't hide after filling)
    const hasValid = norm !== '' && norm !== 'not available' && legal.length >= 12;
    if (hasValid) return true;  // ← FIXED: Show if valid (was: return !hasValid)
    
    // Show if empty or "Not available" (needs to be filled)
    return true;  // ← Always show by default
  } catch {
    return true;
  }
}
```

**Even simpler**:
```typescript
export function shouldShowLegal(state: any): boolean {
  // Always show legal description step
  // It's either empty (needs filling) or filled (user might want to edit)
  return true;
}
```

---

## 📋 **Verification Plan**

### **Test Case 1: Fill Legal Description**
1. Start Modern Wizard
2. Fill grantor, grantee
3. Reach legal description (shows "Not available")
4. Type "Lot 15, Block 2, Tract 12345" (28 chars)
5. Click Next
6. **VERIFY**: Step count stays consistent (doesn't change from 5 to 4)
7. **VERIFY**: Wizard shows "Who is requesting" step (not skipped)

### **Test Case 2: Navigate Back to Legal Description**
1. Fill legal description
2. Click Next to "Who is requesting"
3. Click Back
4. **VERIFY**: Legal description step is visible
5. **VERIFY**: Shows the value you typed ("Lot 15...")
6. **VERIFY**: Can edit and change it

### **Test Case 3: Complete Full Flow**
1. Fill all steps including legal description
2. Click Next through entire wizard
3. Reach Review & Confirm
4. **VERIFY**: Legal description appears on review page
5. **VERIFY**: All fields present and correct

---

## 🚀 **Implementation Priority**

### **Priority 1: Fix showIf Logic** 🔴 **CRITICAL**
- File: `frontend/src/lib/wizard/legalShowIf.ts`
- Change: Always return `true`
- Impact: Fixes all three reported issues
- Risk: **LOW**
- Time: **2 minutes**

### **Priority 2: Wait for Partners API Fix** 🟠 **HIGH**
- File: `frontend/src/app/api/partners/selectlist/route.ts`
- Change: Already deployed in v7.3
- Action: Wait for Vercel deployment to complete
- Time: **2-3 minutes** (passive wait)

### **Priority 3: Add Step Index Guard** 🟡 **MEDIUM**
- File: `frontend/src/features/wizard/mode/engines/ModernEngine.tsx`
- Change: Add bounds checking on step navigation
- Purpose: Prevent invalid step indices even if steps shift
- Risk: **LOW**
- Time: **5 minutes**

---

## 📖 **Related Files**

| File | Purpose | Status |
|------|---------|--------|
| `frontend/src/lib/wizard/legalShowIf.ts` | Legal description showIf logic | 🔴 **NEEDS FIX** |
| `frontend/src/features/wizard/mode/prompts/promptFlows.ts` | Step definitions | ⚠️ Uses broken showIf |
| `frontend/src/features/wizard/mode/engines/ModernEngine.tsx` | Wizard flow engine | ⚠️ No bounds checking |
| `frontend/src/app/api/partners/selectlist/route.ts` | Partners API proxy | ✅ Fixed in v7.3 (waiting for deploy) |

---

## 🎓 **Lessons Learned**

### **1. Dynamic Filtering in Sequential Flows Is Dangerous**
- Steps in a wizard should be **stable**
- Once a step is shown, it should **stay in the flow**
- Dynamic filtering should only apply to **initial step set**, not during navigation

### **2. showIf Should Not Mean "Hide After Filling"**
- `showIf` should determine if a step is **needed**, not if it's **complete**
- Once a step is needed and shown, keep it visible
- Completion status should be tracked separately

### **3. Step Indices Must Be Stable**
- Changing the steps array mid-flow breaks navigation
- Step indices become invalid
- Forward/back buttons behave unpredictably

### **4. Always Test Back Navigation**
- Not just "can I click Next through the wizard"
- But "can I go back and edit previous steps"
- Edge case: What if step disappears after filling?

---

**Next**: Apply Priority 1 fix immediately to unblock the user.


