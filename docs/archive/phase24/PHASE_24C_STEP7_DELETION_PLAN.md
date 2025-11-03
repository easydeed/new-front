# 🔥 **Step 7: Classic Wizard Deletion Plan**

**Date**: November 1, 2025  
**Branch**: `phase24c-prep`  
**Objective**: Commit to Modern Wizard ONLY - Delete all Classic Wizard infrastructure

---

## **📋 DISCOVERY SUMMARY**

### **Architecture Understanding:**
1. **WizardHost** (`mode/WizardHost.tsx`) - Orchestrates between Modern and Classic modes
2. **ClassicEngine** (`mode/engines/ClassicEngine.tsx`) - Passthrough wrapper for Classic Wizard
3. **ClassicWizard** (`app/create-deed/[docType]/page.tsx` lines 51-433) - The old multi-step wizard
4. **Mode Switching UI**:
   - `ModeToggle.tsx` - Toggle component
   - `ToggleSwitch.tsx` - Modern iOS-style toggle
   - `ModeContext.tsx` - Context for mode management
   - `ModeSwitcher.tsx` - Mode switcher component

### **Classic Wizard Step Files** (in `features/wizard/steps/`):
- `Step2RequestDetails.tsx` - Request details form
- `Step3DeclarationsTax.tsx` - Tax declarations
- `Step4PartiesProperty.tsx` - Parties and property info
- `Step5PreviewFixed.tsx` - Preview and generate (KEEP - used by Modern too!)
- `Step5Preview.tsx` - Old preview (might be unused)
- `DTTExemption.tsx` - DTT exemption step
- `Covenants.tsx` - Covenants step
- `TaxSaleRef.tsx` - Tax sale reference step

---

## **🎯 DELETION STRATEGY** (3 Phases)

### **PHASE 1: Delete Classic Step Files** ✅
**What**: Remove old step components (Step2, Step3, Step4, specialty steps)  
**Why**: These are ONLY used by Classic Wizard  
**Risk**: LOW - Modern Wizard has its own Q&A flow  
**Keep**: `Step5PreviewFixed.tsx` (shared by both)

**Files to DELETE:**
1. `frontend/src/features/wizard/steps/Step2RequestDetails.tsx`
2. `frontend/src/features/wizard/steps/Step3DeclarationsTax.tsx`
3. `frontend/src/features/wizard/steps/Step4PartiesProperty.tsx`
4. `frontend/src/features/wizard/steps/Step5Preview.tsx` (old version)
5. `frontend/src/features/wizard/steps/DTTExemption.tsx`
6. `frontend/src/features/wizard/steps/Covenants.tsx`
7. `frontend/src/features/wizard/steps/TaxSaleRef.tsx`

**Verification**: 
- Check if Step5PreviewFixed is imported by Modern - YES, keep it
- Grep for any other imports of these files

---

### **PHASE 2: Delete Mode Switching Infrastructure** ✅
**What**: Remove toggle UI and mode context  
**Why**: No more mode switching needed  
**Risk**: LOW - Can hardcode to 'modern'

**Files to DELETE:**
1. `frontend/src/features/wizard/mode/engines/ClassicEngine.tsx`
2. `frontend/src/features/wizard/mode/components/ModeToggle.tsx`
3. `frontend/src/features/wizard/mode/components/ToggleSwitch.tsx`
4. `frontend/src/features/wizard/mode/components/toggle-switch.css`
5. `frontend/src/features/wizard/mode/ModeSwitcher.tsx`

**Files to SIMPLIFY** (remove classic logic, keep Modern):
1. `frontend/src/features/wizard/mode/ModeContext.tsx` - Remove classic, hardcode modern
2. `frontend/src/features/wizard/mode/WizardHost.tsx` - Remove classic branch
3. `frontend/src/features/wizard/mode/hoc/ModeCookieSync.tsx` - Simplify or delete

---

### **PHASE 3: Simplify Main Page** ✅
**What**: Remove ClassicWizard component from page.tsx  
**Why**: No longer needed  
**Risk**: MEDIUM - This is the main entry point

**File to MODIFY:**
1. `frontend/src/app/create-deed/[docType]/page.tsx`
   - DELETE: `ClassicWizard` component (lines 51-433)
   - MODIFY: `UnifiedWizard` - Remove classic prop from WizardHost
   - CLEAN UP: Remove unused imports (Step2, Step3, Step4, etc.)

**Expected Result:**
```tsx
// BEFORE
<WizardHost docType={docType} classic={<ClassicWizard docType={docType} />} />

// AFTER
<WizardHost docType={docType} />
```

---

## **✅ VERIFICATION CHECKLIST**

After each phase:
- [ ] `npm run build` - Build succeeds
- [ ] No import errors
- [ ] Modern Wizard still works
- [ ] No broken references to deleted files

After all phases:
- [ ] Test full deed creation flow (Modern only)
- [ ] Verify property search → Q&A → preview → PDF generation
- [ ] Check no console errors
- [ ] Verify localStorage uses Modern key only

---

## **🔄 ROLLBACK PLAN**

If anything breaks:
1. `git reset --hard HEAD~1` - Undo last commit
2. `npm run build` - Verify build works
3. Test manually
4. Review error logs
5. Re-attempt with fixes

**Backup Branch**: `phase24c-prep-backup` (before Step 7)

---

## **📊 ESTIMATED IMPACT**

**Files to DELETE**: ~15 files  
**Lines to REMOVE**: ~2,000+ lines  
**Files to MODIFY**: ~3 files  
**Build Time**: ~10 seconds  
**Testing Time**: ~15 minutes  
**Total Time**: ~30-45 minutes  

---

## **🎯 SUCCESS CRITERIA**

✅ All Classic Wizard files deleted  
✅ Build succeeds without errors  
✅ Modern Wizard works end-to-end  
✅ No mode switching UI visible  
✅ Clean commit with detailed documentation  

