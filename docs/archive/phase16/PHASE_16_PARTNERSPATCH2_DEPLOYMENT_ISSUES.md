# Phase 16: Partnerspatch-2 Deployment Issues

**Date**: October 24, 2025  
**Branch**: `fix/stability-diag-v7-1`  
**Status**: 🔴 **DEPLOYMENT BLOCKED - AWAITING FIX**

---

## 📋 **What We Attempted**

Following the deployment strategy from the Systems Architect Analysis:

1. ✅ Created backup branch (`phase16-partnerspatch2-backup`)
2. ✅ Created feature branch (`fix/stability-diag-v7-1`)
3. ✅ Fixed shebang lines in scripts (Windows compatibility)
4. ✅ Fixed unescaped quotes in `apply_stability_diag_v7_1.mjs`
5. ✅ Ran apply script successfully
6. ✅ Ran verify script successfully (all checks passed)
7. ✅ Enabled diagnostics (`NEXT_PUBLIC_DIAG=1`)
8. ❌ **Build failed with 2 syntax errors**

---

## 🚨 **Issues Encountered**

### **Issue #1: ModernEngine.tsx - Mangled onChange Prop**

**File**: `frontend/src/features/wizard/mode/engines/ModernEngine.tsx`  
**Line**: 181

**What the script produced**:
```typescript
onChange={(v) = partners={current.field === 'requestedBy' ? partners : []} allowNewPartner={current.field === 'requestedBy'} onFocus={() => { if (current.field === "legalDescription") setState(s => ({ ...s, __editing_legal: true })); }} onBlur={() => { if (current.field === "legalDescription") setTimeout(() => setState(s => ({ ...s, __editing_legal: false })), 200); }}> onChange(current.field, v)}
```

**Error**:
```
Error: Expected a semicolon
Error: Expected '</', got '.'
```

**Root Cause**:
The script's regex replacement in `apply_stability_diag_v7_1.mjs` lines 59-74 incorrectly replaced the entire `onChange` prop instead of just the closing `>`.

**What it should be**:
```typescript
onChange={(v) => onChange(current.field, v)}
suggestions={current.field === 'grantorName' ? ownerCandidates : []}
partners={current.field === 'requestedBy' ? partners : []}
allowNewPartner={current.field === 'requestedBy'}
onFocus={() => { if (current.field === "legalDescription") setState(s => ({ ...s, __editing_legal: true })); }}
onBlur={() => { if (current.field === "legalDescription") setTimeout(() => setState(s => ({ ...s, __editing_legal: false })), 200); }}
```

**Temporary Fix Applied**:
I manually corrected this to unblock, but then hit Issue #2.

---

### **Issue #2: promptFlows.ts - Duplicate Code**

**File**: `frontend/src/features/wizard/mode/prompts/promptFlows.ts`  
**Line**: 44-47

**What the script produced**:
```typescript
showIf: (state: any) => shouldShowLegal(state)
  const legal = (state?.legalDescription || '').toString();
  const normalized = legal.trim().toLowerCase();
  const hasValidLegal = normalized !== '' && normalized !== 'not available' && legal.length >= 12;
  return !hasValidLegal; // keep step visible until user provides a minimally sufficient edit
```

**Error**:
```
Error: Expected ',', got 'const'
```

**Root Cause**:
The script's regex replacement in `apply_stability_diag_v7_1.mjs` lines 31-46 replaced the old `showIf` logic but LEFT THE OLD CODE IN PLACE, resulting in:
1. New code: `showIf: (state: any) => shouldShowLegal(state)`
2. Old code: Still present (the inline logic)

**What it should be**:
```typescript
showIf: (state: any) => shouldShowLegal(state),
```

**Expected behavior**:
The script should have:
1. Added the import: `import { shouldShowLegal } from '@/lib/wizard/legalShowIf';`
2. Replaced the entire old `showIf: (state: any) => { ... }` with `showIf: (state: any) => shouldShowLegal(state)`
3. Removed all the old inline code

---

## 🔍 **Script Analysis**

### **Problem with the Regex Approach**

**File**: `partnerspatch-2/scripts/apply_stability_diag_v7_1.mjs`

#### **Problem Area 1: promptFlows.ts patching (lines 31-46)**

```javascript
const re = /(id:\s*['"]legalDescription['"][\s\S]*?showIf:\s*\(state[\s\S]*?\)\s*=>\s*)([^,\n]+)(,?)/m;
if (re.test(code)) {
  code = code.replace(re, (m, head, _old, tail) => head + 'shouldShowLegal(state)' + (tail || ''));
  write(pf, code);
}
```

**Issue**: The regex `([^,\n]+)` is meant to capture the old logic, but it only captures up to the first comma or newline. If the old `showIf` is a multi-line arrow function, this will NOT capture it all.

**Our case**: The old code was:
```typescript
showIf: (state: any) => {
  const legal = (state?.legalDescription || '').toString();
  const normalized = legal.trim().toLowerCase();
  const hasValidLegal = normalized !== '' && normalized !== 'not available' && legal.length >= 12;
  return !hasValidLegal;
}
```

The regex only replaced the arrow `=>` part but left the function body.

---

#### **Problem Area 2: ModernEngine.tsx PrefillCombo patching (lines 59-74)**

```javascript
code = code.replace(/<PrefillCombo([^>]+)>/g, (match) => {
  let updated = match;
  if (!/partners=\{/.test(updated)) {
    updated = updated.replace(/>$/, ' partners={...}>');
  }
  // ... more replacements
  return updated;
});
```

**Issue**: The script assumes `<PrefillCombo...>` is on a single line. In our codebase, it's multi-line:
```typescript
<PrefillCombo
  label={current.label || current.question}
  value={state[current.field] || ''}
  onChange={(v) => onChange(current.field, v)}
  suggestions={current.field === 'grantorName' ? ownerCandidates : []}
  partners={current.field === 'requestedBy' ? partners : []}
  allowNewPartner={current.field === 'requestedBy'}
/>
```

The regex `([^>]+)>` captures everything up to the first `>`, but in a multi-line case, this includes newlines and causes the replacement to break the structure.

---

## 📊 **Files Modified by Script**

| File | Status | Notes |
|------|--------|-------|
| `frontend/src/lib/diag/log.ts` | ✅ Created | New file, no issues |
| `frontend/src/lib/wizard/legalShowIf.ts` | ✅ Created | New file, no issues |
| `frontend/src/features/partners/PartnersContext.tsx` | ✅ Replaced | Entire file replaced, no issues |
| `frontend/src/app/api/partners/selectlist/route.ts` | ✅ Replaced | Entire file replaced, no issues |
| `frontend/src/features/wizard/mode/components/PrefillCombo.tsx` | ✅ Replaced | Entire file replaced, no issues |
| `frontend/src/features/wizard/mode/prompts/promptFlows.ts` | ❌ Patched (broken) | Regex failed to remove old code |
| `frontend/src/features/wizard/mode/engines/ModernEngine.tsx` | ❌ Patched (broken) | Regex mangled onChange prop |

---

## 🎯 **What Needs to Be Fixed**

### **Option A: Fix the Script**

The script needs to handle multi-line cases properly:

1. **For promptFlows.ts**:
   - Change regex to capture the entire `showIf` function body, not just the first line
   - Use a greedy match that respects brace matching: `showIf:\s*\(state[^)]*\)\s*=>\s*\{[\s\S]*?\}`
   - Or use a more robust parser (e.g., babel) instead of regex

2. **For ModernEngine.tsx**:
   - Check if `<PrefillCombo` already has the props before adding them
   - Don't use regex for multi-line JSX - it's too fragile
   - Either:
     - Use a proper JSX parser (e.g., babel)
     - OR provide complete replacement files (not patches)

### **Option B: Provide Replacement Files**

Instead of patching with regex, provide:
- `files/frontend/src/features/wizard/mode/prompts/promptFlows.ts` (complete file)
- `files/frontend/src/features/wizard/mode/engines/ModernEngine.tsx` (complete file)

Then the script can just copy them over, like it does for the other files.

### **Option C: Manual Instructions**

Provide manual step-by-step instructions for:
1. What to add to `promptFlows.ts`
2. What to add to `ModernEngine.tsx`

---

## 📝 **Current State**

### **Branch Status**
```
Branch: fix/stability-diag-v7-1
Status: Build failing
Files changed: 7
```

### **What's Working**
- ✅ New helper files created (`log.ts`, `legalShowIf.ts`)
- ✅ PartnersContext.tsx updated correctly
- ✅ PrefillCombo.tsx updated correctly
- ✅ Partners proxy route updated correctly
- ✅ Verification script passes (but doesn't catch syntax errors)

### **What's Broken**
- ❌ `promptFlows.ts` has duplicate/malformed code
- ❌ `ModernEngine.tsx` has mangled `onChange` prop
- ❌ Build fails with 2 syntax errors

---

## 🔄 **Rollback Performed**

**Status**: No changes committed yet, so we're still clean.

**To reset**:
```bash
git checkout main
git branch -D fix/stability-diag-v7-1
```

---

## 💡 **Recommendation**

**DO NOT manually fix these files.** This would be "patching" and defeats the purpose of having an automated script.

**Instead**:
1. Document these issues for the team
2. Request a corrected script OR complete replacement files
3. Test the new script on a fresh branch
4. Only deploy once the script works without manual intervention

---

## 📋 **Information for Team**

### **Our Current File Structure**

**promptFlows.ts - Current legalDescription definition**:
```typescript
{
  id: 'legalDescription',
  question: 'What is the legal description of the property?',
  field: 'legalDescription',
  type: 'text',
  placeholder: 'e.g., Lot 1, Block 2, Tract 12345',
  why: 'This describes the exact boundaries of the property being transferred.',
  required: true,
  showIf: (state: any) => {
    const legal = (state?.legalDescription || '').toString();
    const normalized = legal.trim().toLowerCase();
    const hasValidLegal = normalized !== '' && normalized !== 'not available' && legal.length >= 12;
    return !hasValidLegal;
  },
},
```

**ModernEngine.tsx - Current PrefillCombo usage** (multi-line):
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
  // ... other input
)}
```

### **What We Need**

Either:
- **Updated script** that handles multi-line JSX and multi-line arrow functions
- OR **Complete replacement files** for `promptFlows.ts` and `ModernEngine.tsx`
- OR **Manual instructions** with exact code snippets

---

## 🔍 **Verification Script Results**

Even though the build failed, the verification script passed:
```
[verify-stability-diag-v7.1] ✅ legalShowIf helper present
[verify-stability-diag-v7.1] ✅ promptFlows uses shouldShowLegal(state)
[verify-stability-diag-v7.1] ✅ PrefillCombo onChange + onBlur present
[verify-stability-diag-v7.1] ✅ PartnersContext includes Authorization header
[verify-stability-diag-v7.1] ✅ Next.js partners proxy present
[verify-stability-diag-v7.1] ✅ ModernEngine wiring for legal editing present
[verify-stability-diag-v7.1] All checks passed.
```

**This means the verify script is checking for presence of strings, not syntax correctness.**

**Recommendation**: Verify script should also run `npm run build` as a final check.

---

## 🎓 **Lessons Learned**

1. ✅ **Regex is fragile for code patching** - Multi-line code breaks simple patterns
2. ✅ **Verification should include build** - String presence ≠ syntax correctness
3. ✅ **Complete file replacement > patching** - Less error-prone
4. ✅ **Document before fixing** - Prevents "patching the patch"

---

## 📞 **Next Steps**

**For the Team**:
1. Review this document
2. Provide one of:
   - Fixed script
   - Complete replacement files
   - Manual instructions
3. Test on a fresh repo

**For Us**:
1. Wait for corrected solution
2. Test on fresh branch
3. Deploy only when automated script works 100%

---

## 🔗 **Related Files**

- `PHASE_16_PARTNERSPATCH2_SYSTEMS_ARCHITECT_ANALYSIS.md` - Full architecture analysis
- `partnerspatch-2/README.md` - Original patch documentation
- `partnerspatch-2/scripts/apply_stability_diag_v7_1.mjs` - The script with issues

---

**Status**: 🔴 **Blocked - Awaiting corrected solution from team**


