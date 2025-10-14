# Cursor Tasks — Dual‑Mode Wizard v4 (SA‑Aligned)

## 0) Branch
git checkout -b feat/wizard-dual-mode-v4

## 1) Copy package files (same paths)
frontend/src/features/wizard/mode/ModeContext.tsx
frontend/src/features/wizard/mode/ModeSwitcher.tsx
frontend/src/features/wizard/mode/WizardModeBoundary.tsx
frontend/src/features/wizard/mode/WizardHost.tsx
frontend/src/features/wizard/mode/components/DeedTypeBadge.tsx
frontend/src/features/wizard/mode/review/smartReviewTemplates.ts
frontend/src/features/wizard/mode/engines/ModernEngine.tsx
frontend/src/features/wizard/mode/engines/ClassicEngine.tsx
frontend/src/features/wizard/mode/engines/steps/{StepShell,MicroSummary,SmartReview}.tsx
frontend/src/features/wizard/mode/prompts/promptFlows.ts         # (v4 excludes property prompts)
frontend/src/features/wizard/mode/bridge/PropertyStepBridge.tsx  # renders your existing Step 1
frontend/src/features/wizard/mode/bridge/useWizardStoreBridge.ts # integrates Modern with your store
frontend/src/features/wizard/mode/finalize/finalizeBridge.ts      # canonical adapters → POST → redirect
frontend/src/features/wizard/mode/validation/{validators.ts,usePromptValidation.ts}

# Keep adapters from v3 (mandatory for finalize mapping):
frontend/src/features/wizard/adapters/{index,grantDeedAdapter,quitclaimAdapter,interspousalAdapter,warrantyAdapter,taxDeedAdapter}.ts

## 2) Patch your wizard entry (if not done)
Apply: frontend/patches/0001_wrap_wizard_host.diff
If patch rejects, add imports and render WizardHost manually (see patch).

## 3) Open PropertyStepBridge.tsx and set the import for YOUR Step 1
- Replace the placeholder import with your actual Step 1 component:
  e.g., `import PropertySearchWithTitlePoint from '@/features/wizard/steps/PropertySearchWithTitlePoint';`
- If your component expects props (onVerified, etc.), wire them in the TODO block.

## 4) Modern after Step 1 only
ModernEngine v4 **assumes property is verified** in the store (APN, county, owner, etc.).
If not verified, WizardHost renders PropertyStepBridge first.

## 5) Finalize (no regressions)
In your Finalize page/button handler (Modern or Classic), call:
  import { toCanonicalFor } from '@/features/wizard/adapters';
  import { finalizeDeed } from '@/features/wizard/mode/finalize/finalizeBridge';

  const canonical = toCanonicalFor(docType, store.getFormData());
  await finalizeDeed(canonical);  // POSTs, returns deedId, redirects to preview

## 6) Validation
- promptFlows.ts now supports `validate(value, state)` and shows inline errors on Continue.
- SmartReview shows a **completeness score** and flags likely issues (APN format, missing vesting, etc.).

## 7) Feature flags (unchanged)
NEXT_PUBLIC_WIZARD_MODE_DEFAULT=classic  # or modern
?mode=modern / ?mode=classic             # URL override

## 8) Verify
- Start with `/create-deed/grant-deed?mode=modern`
- Step 1 runs (your existing property search). After success → Modern Q&A questions.
- Smart Review shows deed-specific text + completeness.
- Finalize → deed created, preview opens (same backend/PDF as Classic).

Rollback: set `?mode=classic` or remove WizardHost imports.
