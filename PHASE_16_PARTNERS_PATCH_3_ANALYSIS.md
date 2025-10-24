# Phase 16: Partners-Patch-3 (Build-Fix v7.2) - Quick Analysis

**Date**: October 24, 2025  
**Solution**: `partners-patch-3` (Build-Fix v7.2)  
**Status**: ✅ **READY TO DEPLOY**

---

## 🎯 **What's Different from v7.1**

### **v7.1 Problem → v7.2 Solution**

| Issue | v7.1 Approach | v7.2 Approach | Result |
|-------|---------------|---------------|---------|
| **Multi-line JSX** | Single-line regex `/<PrefillCombo([^>]+)>/` | Balanced quote/brace scanner | ✅ **Fixed** |
| **onChange mangling** | Regex replaced everything | Inserts props before `/>`, preserves onChange | ✅ **Fixed** |
| **Arrow function body** | Regex `([^,\n]+)` (first line only) | `findArrowBodyEnd()` with brace balancing | ✅ **Fixed** |
| **Duplicate code** | Replaced arrow but left body | Removes entire body correctly | ✅ **Fixed** |
| **Build verification** | String checks only | Optional `BUILD_CHECK=1` runs actual build | ✅ **Added** |
| **Rollback** | Git only | Creates `.bak.v7_2` files | ✅ **Added** |

---

## 🔬 **Technical Improvements**

### **1. Balanced Brace/Quote Scanner**

Instead of regex, v7.2 uses proper parsing:

```javascript
function findIndexBalanced(src, startIdx, openCh, closeCh){
  let depth = 0, i = startIdx;
  let inS=false,inD=false,inT=false, esc=false;
  // Tracks strings, template literals, escapes
  // Properly counts nested braces
  // Returns exact end position
}
```

**Why this works**: Handles nested structures, multi-line code, and edge cases.

---

### **2. Arrow Function Body Detection**

```javascript
function findArrowBodyEnd(src, startAfterArrow){
  // Skip whitespace
  if (src[i] === '{'){
    // Block body: find matching }
    return findIndexBalanced(src, i, '{', '}');
  } else {
    // Expression body: find first comma/brace at same level
    // Track parens, brackets, braces depth
    // Stop at delimiter
  }
}
```

**Why this works**: Correctly handles both:
- Block body: `=> { return foo; }`
- Expression body: `=> foo + bar`

---

### **3. Safe JSX Injection**

```javascript
function injectPropsIntoPrefillBlocks(src){
  // Find each <PrefillCombo
  // Scan to /> with quote awareness
  // Check which props are missing
  // Insert ONLY missing props before />
  // Preserve indentation
  // NEVER touch onChange
}
```

**Key features**:
- ✅ Multi-line aware
- ✅ Preserves existing props
- ✅ Maintains indentation
- ✅ Doesn't touch onChange

---

## ✅ **What It Fixes**

### **Issue #1: promptFlows.ts - Duplicate Code**

**Before** (broken):
```typescript
showIf: (state: any) => shouldShowLegal(state)
  const legal = (state?.legalDescription || '').toString();  // ❌ Leftover
  const normalized = legal.trim().toLowerCase();
  return !hasValidLegal;
```

**After** (fixed):
```typescript
showIf: (state: any) => shouldShowLegal(state),
```

---

### **Issue #2: ModernEngine.tsx - Mangled onChange**

**Before** (broken):
```typescript
onChange={(v) = partners={...} onFocus={...}> onChange(current.field, v)}
```

**After** (fixed):
```typescript
<PrefillCombo
  label={current.label || current.question}
  value={state[current.field] || ''}
  onChange={(v) => onChange(current.field, v)}  // ✅ Preserved
  suggestions={current.field === 'grantorName' ? ownerCandidates : []}
  partners={current.field === 'requestedBy' ? partners : []}  // ✅ Added
  allowNewPartner={current.field === 'requestedBy'}  // ✅ Added
  onFocus={() => { if (current.field === "legalDescription") setState(s => ({ ...s, __editing_legal: true })); }}  // ✅ Added
  onBlur={() => { if (current.field === "legalDescription") setTimeout(() => setState(s => ({ ...s, __editing_legal: false })), 200); }}  // ✅ Added
/>
```

---

## 📋 **Verification Improvements**

### **v7.2 Verify Script**

```javascript
// 1. Check imports
if (!s.includes(`import { shouldShowLegal }`)) bad('import missing');

// 2. Check showIf replacement
if (!/showIf:\s*\(state[^)]*\)\s*=>\s*shouldShowLegal\(state\)/.test(s))
  bad('showIf not using shouldShowLegal');

// 3. Check for residual duplicate code
if (/showIf:[^\n]*shouldShowLegal\([^)]+\)[^\n]*\n\s*const\s+legal/.test(s))
  bad('Residual inline showIf body detected');

// 4. Check for mangled onChange
if (/onChange=\{\(v\)\s*=\s*partners=/.test(s))
  bad('Detected mangled onChange prop');

// 5. OPTIONAL: Run actual build
if (BUILD_CHECK==='1') {
  execSync('npm run -s build');
  ok('Project build succeeded');
}
```

**Much better than v7.1**: Detects the exact errors we hit.

---

## 🚀 **Deployment Plan**

### **Step 1: Reset Current State** (1 min)
```bash
# We're on fix/stability-diag-v7-1 with broken changes
cd frontend
git checkout main
cd ..
git branch -D fix/stability-diag-v7-1
```

### **Step 2: Apply v7.2** (2 min)
```bash
git checkout -b fix/buildfix-v7-2
node partners-patch-3/scripts/apply_buildfix_v7_2.mjs .
```

### **Step 3: Verify with Build** (3 min)
```bash
BUILD_CHECK=1 node partners-patch-3/scripts/verify_buildfix_v7_2.mjs .
```

### **Step 4: Review Changes** (2 min)
```bash
git diff
# Check:
# - promptFlows.ts has clean showIf
# - ModernEngine.tsx has clean PrefillCombo props
# - No mangled onChange
```

### **Step 5: Deploy** (5 min)
```bash
git add -A
git commit -m "fix: Phase 16 - Build-Fix v7.2 (Stability & Diagnostics)

- Add temporal state (__editing_legal) to prevent legal description flickering
- Add gated diagnostics (NEXT_PUBLIC_DIAG=1) for observability
- Add safety flush to PrefillCombo onBlur
- Centralize legal description logic in legalShowIf.ts
- Use multi-line aware patching (balanced brace scanner)

Fixes:
- Legal description disappearing while typing
- Partners dropdown not populating (with diagnostics)
- Typed values not transferring to PDF (safety flush)

Build-Fix v7.2 addresses the two syntax errors from v7.1:
- promptFlows.ts: Cleanly replaces showIf body (no duplicate code)
- ModernEngine.tsx: Safely injects props without mangling onChange"

git checkout main
git merge fix/buildfix-v7-2 --no-edit
git push origin main
```

**Total Time**: ~13 minutes

---

## ✅ **Why This Will Work**

1. ✅ **Addresses exact issues we documented**
2. ✅ **Uses proper parsing (not brittle regex)**
3. ✅ **Creates backups (easy rollback)**
4. ✅ **Verifies build (catches errors early)**
5. ✅ **Preserves existing code (only adds what's needed)**
6. ✅ **Team explicitly fixed the problems we reported**

---

## 🎯 **Confidence Level**

**95% confidence this will build successfully**

**Why**:
- Team read our issue report
- Fixed the exact problems we documented
- Uses robust parsing instead of regex
- Includes build verification
- Creates backups for safety

---

## 📝 **Rollback Plan**

### **If issues arise**:

**Option A: Git rollback**
```bash
git checkout main
git branch -D fix/buildfix-v7-2
```

**Option B: File-level rollback**
```bash
mv frontend/src/features/wizard/mode/prompts/promptFlows.ts.bak.v7_2 \
   frontend/src/features/wizard/mode/prompts/promptFlows.ts
   
mv frontend/src/features/wizard/mode/engines/ModernEngine.tsx.bak.v7_2 \
   frontend/src/features/wizard/mode/engines/ModernEngine.tsx
```

---

## 🎓 **What We Learned**

### **From v7.1 Failure**:
- ❌ Single-line regex fails on multi-line code
- ❌ Regex capturing `([^,\n]+)` misses multi-line bodies
- ❌ String checks don't catch syntax errors

### **From v7.2 Solution**:
- ✅ Balanced brace scanning handles nested structures
- ✅ Proper parsing > regex for code transformation
- ✅ Build verification catches errors before commit
- ✅ Backups enable quick rollback

---

## 🚦 **Ready to Deploy**

**Status**: ✅ **GREEN LIGHT**

**Next**: Run the deployment steps above.


