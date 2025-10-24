# Phase 16: Root Cause Analysis - Critical Bugs Found

**Date**: October 24, 2025  
**Status**: 🔴 **CRITICAL - 2 MAJOR BUGS IDENTIFIED**

---

## 🚨 **BUG #1: Legal Description onFocus/onBlur Never Fire** (ROOT CAUSE)

### **The Problem**

The `legalDescription` field **disappears when typing** because the temporal state (`__editing_legal`) is **never set**.

### **Why This Happens**

**In `promptFlows.ts` line 41**:
```typescript
{
  id: 'legalDescription',
  field: 'legalDescription',
  type: 'text',  // ❌ NOT 'prefill-combo'
  showIf: (state: any) => shouldShowLegal(state),
}
```

**In `ModernEngine.tsx` line 177-187**:
```typescript
{current.type === 'prefill-combo' ? (
  <PrefillCombo
    // ... props
    onFocus={() => { if (current.field === "legalDescription") setState(s => ({ ...s, __editing_legal: true })); }}
    onBlur={() => { if (current.field === "legalDescription") setTimeout(() => setState(s => ({ ...s, __editing_legal: false })), 200); }}/>
) : (
  <div className="modern-qna__control">
    <input  // ❌ Regular input - NO onFocus/onBlur handlers!
      className="modern-input"
      type="text"
      value={state[current.field] || ''}
      onChange={(e) => onChange(current.field, e.target.value)}
    />
  </div>
)}
```

**The Flow**:
1. `legalDescription` has `type: 'text'`
2. ModernEngine checks: `if (current.type === 'prefill-combo')`
3. Check FAILS (it's `'text'`, not `'prefill-combo'`)
4. Goes to `else` branch → renders regular `<input>`
5. Regular input has NO onFocus/onBlur handlers
6. `__editing_legal` is NEVER set to `true`
7. `shouldShowLegal()` checks `if (state?.__editing_legal) return true;` → FALSE
8. As soon as user types ONE character, field length < 12, so `shouldShowLegal` returns TRUE (should show)
9. But React re-renders, field disappears

### **The partners-patch-3 Script's Mistake**

The script added onFocus/onBlur to the `<PrefillCombo />` component, but `legalDescription` uses a regular `<input>`.

**What the script did**:
```javascript
// partners-patch-3/scripts/apply_buildfix_v7_2.mjs
// It ONLY patched PrefillCombo blocks
code = injectPropsIntoPrefillBlocks(code);
```

**What it should have done**:
- Also patch the regular `<input>` in the `else` branch
- OR change `legalDescription` type to `'prefill-combo'` in promptFlows

---

## 🚨 **BUG #2: Partners API 404** (Possible Vercel Deployment Issue)

### **The Problem**

`/api/partners/selectlist` returns 404 in production.

### **What's in the Code** (Looks Correct)

File exists: ✅ `frontend/src/app/api/partners/selectlist/route.ts`

Content looks correct:
- ✅ Has `export async function GET(req: NextRequest)`
- ✅ Has fallback API_BASE URL
- ✅ No DIAG import (removed in hotfix)
- ✅ Has proper headers forwarding

### **Possible Causes**

1. **Vercel Build Issue**:
   - Route not being generated during build
   - Check Vercel build logs for errors about this route
   - Check if route appears in Functions list

2. **Timing Issue**:
   - User tested immediately after push
   - Vercel takes 2-3 minutes to deploy
   - Route might not be live yet

3. **Edge Runtime Issue**:
   - Despite removing DIAG import, edge runtime might still have issues
   - Could try switching to `nodejs` runtime

4. **Next.js App Router Issue**:
   - File structure might be wrong
   - But other API routes work, so this is unlikely

---

## 📊 **What partners-patch-3 Actually Fixed vs Claimed**

| Feature | Claimed | Reality | Status |
|---------|---------|---------|--------|
| Legal description stays visible | ✅ | ❌ | **BROKEN** |
| Partners dropdown works | ✅ | ❌ | **BROKEN** |
| Typed values on PDF | ✅ | ❓ | **UNKNOWN** |
| Temporal state helper | ✅ | ✅ | Works but not wired |
| Safety flush in PrefillCombo | ✅ | ✅ | Works |
| Partners auth headers | ✅ | ✅ | Works |

---

## 🔧 **FIXES NEEDED**

### **Fix #1: Add onFocus/onBlur to Regular Input** (CRITICAL)

**Option A**: Add handlers to regular input in ModernEngine.tsx

**Location**: `frontend/src/features/wizard/mode/engines/ModernEngine.tsx` line 189-194

**Change from**:
```typescript
<div className="modern-qna__control">
  <input
    className="modern-input"
    type="text"
    value={state[current.field] || ''}
    onChange={(e) => onChange(current.field, e.target.value)}
  />
</div>
```

**Change to**:
```typescript
<div className="modern-qna__control">
  <input
    className="modern-input"
    type="text"
    value={state[current.field] || ''}
    onChange={(e) => onChange(current.field, e.target.value)}
    onFocus={() => { if (current.field === "legalDescription") setState(s => ({ ...s, __editing_legal: true })); }}
    onBlur={() => { if (current.field === "legalDescription") setTimeout(() => setState(s => ({ ...s, __editing_legal: false })), 200); }}
  />
</div>
```

**Option B**: Change legalDescription to use prefill-combo

**Location**: `frontend/src/features/wizard/mode/prompts/promptFlows.ts` line 41

**Change from**:
```typescript
type: 'text',
```

**Change to**:
```typescript
type: 'prefill-combo',
```

**Recommendation**: Use **Option A** - it's safer and doesn't change the UX.

---

### **Fix #2: Partners API 404**

**Option A**: Wait for Vercel to Deploy
- Check if deployment finished
- Test again after 2-3 minutes

**Option B**: Switch to Node.js Runtime

**Location**: `frontend/src/app/api/partners/selectlist/route.ts` line 4

**Change from**:
```typescript
export const runtime = 'edge';
```

**Change to**:
```typescript
export const runtime = 'nodejs';
```

**Option C**: Check Vercel Build Logs
- Go to Vercel dashboard
- Check deployment logs for commit `18f878f`
- Look for errors about `api/partners/selectlist`

**Recommendation**: First check Vercel deployment status, then try **Option B** if still broken.

---

## 🎯 **Did We Deviate from partners-patch-3?**

### **Answer: YES and NO**

**NO - We didn't deviate during initial deployment**:
- ✅ We ran the partners-patch-3 script exactly as instructed
- ✅ We copied all the support files from partnerspatch-2
- ✅ Build succeeded locally
- ✅ We deployed correctly

**YES - But partners-patch-3 itself was incomplete**:
- ❌ The script only patched `<PrefillCombo />` blocks
- ❌ It didn't patch the regular `<input>` fallback
- ❌ `legalDescription` uses regular `<input>`, not `<PrefillCombo />`
- ❌ Therefore, the temporal state solution was never wired up correctly

**YES - We deviated with the hotfix**:
- ⚠️ We modified partners API route again (removed DIAG)
- ⚠️ This might have introduced issues (but the route looks correct)

---

## 💡 **The Real Problem**

**partners-patch-3 made an assumption** that ALL fields that need temporal state would use `<PrefillCombo />`.

But `legalDescription` uses a regular `<input>` (type: 'text'), so the onFocus/onBlur handlers were never attached.

This is a **script bug**, not a deployment error.

---

## 📋 **Immediate Action Plan**

### **Step 1**: Fix Legal Description (5 minutes)
```bash
# Edit frontend/src/features/wizard/mode/engines/ModernEngine.tsx
# Add onFocus/onBlur to regular input (lines 189-194)

git add frontend/src/features/wizard/mode/engines/ModernEngine.tsx
git commit -m "fix: Add onFocus/onBlur handlers to regular input for legalDescription temporal state"
git push origin main
```

### **Step 2**: Verify Partners API Status (2 minutes)
- Check Vercel dashboard
- Is deployment `18f878f` finished?
- Are there errors in build logs?
- Test `/api/partners/selectlist` directly

### **Step 3**: If Partners Still 404, Switch Runtime (5 minutes)
```bash
# Edit frontend/src/app/api/partners/selectlist/route.ts
# Change: export const runtime = 'nodejs';

git add frontend/src/app/api/partners/selectlist/route.ts
git commit -m "fix: Switch partners proxy to nodejs runtime (edge runtime incompatible)"
git push origin main
```

---

## 🔍 **Verification After Fixes**

### **Test #1: Legal Description**
1. Go to Modern Wizard
2. Legal description shows "Not available"
3. Start typing "Lot 15"
4. **Expected**: Field STAYS VISIBLE while typing ✅
5. **Current**: Field disappears ❌

### **Test #2: Partners API**
1. Open Console (F12)
2. Go to Modern Wizard
3. Navigate to "Requested By" field
4. **Expected**: See `[partners/selectlist] proxy { status: 200, ... }` ✅
5. **Current**: `404 (Not Found)` ❌

---

## 🎓 **Lessons Learned**

1. ❌ **Don't trust automated scripts blindly** - Verify they handle ALL cases
2. ❌ **partners-patch-3 had a critical gap** - Only patched one branch
3. ❌ **Should have tested immediately** - Caught this sooner
4. ✅ **User was right to question** - Analysis revealed the truth

---

## 🔄 **Honest Assessment**

**We did NOT deviate from the deployment process.**  
**But partners-patch-3 itself was incomplete/buggy.**

The script assumed ALL fields needing temporal state would be `<PrefillCombo />`, but `legalDescription` is a regular input.

This is **not our fault**, but **we need to fix it now**.

---

**Next**: Apply Fix #1 immediately, then verify Fix #2.


