# Phase 15 v5: Export/Import Patterns Audit

**Date**: October 16, 2025  
**Purpose**: Document all exports in wizard/mode to prevent future import mismatches  
**Status**: ✅ Complete

---

## 📊 EXPORT PATTERNS SUMMARY

### **Named Exports** (require `import { X } from`)

| File | Export | Type |
|------|--------|------|
| `bridge/useWizardStoreBridge.ts` | `useWizardStoreBridge` | Function (hook) |
| `bridge/persistenceKeys.ts` | `WIZARD_DRAFT_KEY_MODERN` | Constant |
| `bridge/persistenceKeys.ts` | `WIZARD_DRAFT_KEY_CLASSIC` | Constant |
| `bridge/debugLogs.ts` | `dbg` | Function |
| `ModeContext.tsx` | `WizardModeProvider` | Component |
| `ModeContext.tsx` | `useWizardMode` | Hook |
| `prompts/promptFlows.ts` | `slug` | Function |
| `prompts/promptFlows.ts` | `promptFlows` | Object |
| `utils/docType.ts` | `canonicalFromUrlParam` | Function |
| `utils/docType.ts` | `toUrlSlug` | Function |
| `utils/docType.ts` | `toLabel` | Function |
| `validation/validators.ts` | `validators` | Object |
| `validation/usePromptValidation.ts` | `usePromptValidation` | Hook |
| `review/smartReviewTemplates.ts` | `buildReviewLines` | Function |

### **Default Exports** (require `import X from`)

| File | Export | Type |
|------|--------|------|
| `engines/ModernEngine.tsx` | `ModernEngine` | Component |
| `engines/ClassicEngine.tsx` | `ClassicEngine` | Component |
| `WizardHost.tsx` | `WizardHost` | Component |
| `WizardModeBoundary.tsx` | `WizardModeBoundary` | Component (class) |
| `ModeSwitcher.tsx` | `ModeSwitcher` | Component |
| `HydrationGate.tsx` | `HydrationGate` | Component |
| `components/SmartReview.tsx` | `SmartReview` | Component |
| `components/StepShell.tsx` | `StepShell` | Component |
| `components/ProgressBar.tsx` | `ProgressBar` | Component |
| `components/MicroSummary.tsx` | `MicroSummary` | Component |
| `components/DeedTypeBadge.tsx` | `DeedTypeBadge` | Component |
| `components/ToggleSwitch.tsx` | `ToggleSwitch` | Component |
| `components/controls/SmartSelectInput.tsx` | `SmartSelectInput` | Component |
| `layout/WizardFrame.tsx` | `WizardFrame` | Component |
| `bridge/PropertyStepBridge.tsx` | `PropertyStepBridge` | Component |
| `engines/steps/StepShell.tsx` | `StepShell` | Component |
| `engines/steps/SmartReview.tsx` | `SmartReview` | Component |
| `engines/steps/MicroSummary.tsx` | `MicroSummary` | Component |

---

## 🎯 PATTERN GUIDELINES

### **Use Named Exports For:**
- ✅ **Hooks** (e.g., `useWizardStoreBridge`, `useWizardMode`)
- ✅ **Utility Functions** (e.g., `slug`, `toLabel`)
- ✅ **Constants** (e.g., `WIZARD_DRAFT_KEY_MODERN`)
- ✅ **Configuration Objects** (e.g., `promptFlows`, `validators`)

### **Use Default Exports For:**
- ✅ **React Components** (e.g., `ModernEngine`, `WizardHost`)
- ✅ **Main Module Export** (when file has single primary export)

### **Why This Matters:**
```typescript
// ❌ WRONG: Default import for named export
import useWizardStoreBridge from './useWizardStoreBridge';
// Result: undefined at runtime

// ✅ CORRECT: Named import for named export
import { useWizardStoreBridge } from './useWizardStoreBridge';
// Result: works as expected

// ✅ CORRECT: Default import for default export
import ModernEngine from './ModernEngine';
// Result: works as expected
```

---

## ✅ VERIFICATION CHECKLIST

### **For Developers:**
- [ ] Check export statement in source file
- [ ] Match import style to export style
- [ ] Named export? Use `import { X } from`
- [ ] Default export? Use `import X from`

### **For Code Reviews:**
- [ ] Verify all imports match exports
- [ ] Check for build warnings about imports
- [ ] Test component renders (not just builds)

### **For CI/CD:**
- [ ] Enable TypeScript strict mode
- [ ] Enable ESLint import rules
- [ ] Fail build on import warnings

---

## 🔧 THE FIX APPLIED

**File**: `frontend/src/features/wizard/mode/engines/ModernEngine.tsx`

**Line 10 - BEFORE** ❌:
```typescript
import useWizardStoreBridge from '../bridge/useWizardStoreBridge';
```

**Line 10 - AFTER** ✅:
```typescript
import { useWizardStoreBridge } from '../bridge/useWizardStoreBridge';
```

**Reason**: 
- Source file exports as: `export function useWizardStoreBridge()`
- This is a **named export**
- Import must use curly braces: `import { useWizardStoreBridge }`

---

## 📝 FUTURE PREVENTION

### **1. Enable Strict TypeScript**

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "esModuleInterop": true
  }
}
```

### **2. Add ESLint Rules**

```json
// .eslintrc.js
{
  "rules": {
    "import/no-default-export": "warn",
    "import/prefer-default-export": "off",
    "import/named": "error",
    "import/default": "error"
  }
}
```

### **3. Add Pre-commit Hook**

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run type-check && npm run lint"
    }
  },
  "scripts": {
    "type-check": "tsc --noEmit",
    "lint": "next lint"
  }
}
```

---

## 🎯 QUICK REFERENCE

**When you see**:
```typescript
export function myFunction() {}
export const myConst = 123;
```

**You must import with**:
```typescript
import { myFunction, myConst } from './file';
```

**When you see**:
```typescript
export default function MyComponent() {}
```

**You must import with**:
```typescript
import MyComponent from './file';
```

**Mixed exports**:
```typescript
// File: myModule.ts
export function helper() {}
export default function Main() {}

// Import:
import Main, { helper } from './myModule';
```

---

**END OF AUDIT**

