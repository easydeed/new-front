# Cursor Tasks — Dual‑Mode Wizard v3 + Adapters

## 0) Branch
git checkout -b feat/wizard-dual-mode-v3

## 1) Copy files (same paths)
frontend/src/features/wizard/mode/components/DeedTypeBadge.tsx
frontend/src/features/wizard/mode/review/smartReviewTemplates.ts
frontend/src/features/wizard/mode/engines/ModernEngine.tsx
frontend/src/features/wizard/mode/engines/steps/SmartReview.tsx
frontend/src/features/wizard/mode/engines/steps/{StepShell,MicroSummary}.tsx
frontend/src/features/wizard/mode/{ModeContext,useWizardMode,ModeSwitcher,WizardHost}.tsx
frontend/src/features/wizard/mode/prompts/promptFlows.ts

# NEW — Canonical adapters (safe, additive)
frontend/src/features/wizard/adapters/index.ts
frontend/src/features/wizard/adapters/grantDeedAdapter.ts
frontend/src/features/wizard/adapters/quitclaimAdapter.ts
frontend/src/features/wizard/adapters/interspousalAdapter.ts
frontend/src/features/wizard/adapters/warrantyAdapter.ts
frontend/src/features/wizard/adapters/taxDeedAdapter.ts

## 2) Wrap wizard entry (if not done)
Apply: frontend/patches/0001_wrap_wizard_host.diff

## 3) Default & toggles
NEXT_PUBLIC_WIZARD_MODE_DEFAULT=classic   # or modern
# URL override: ?mode=modern / ?mode=classic

## 4) (Optional) Use adapters on Finalize (one line)
In your Finalize handler (Modern or Classic), map state → canonical payload:
  import { toCanonicalFor } from '@/features/wizard/adapters';
  const payload = toCanonicalFor(docType, store.state);  // ← one line
Then POST payload to your existing /deeds or generation route.

## 5) Verify
- /create-deed/grant-deed?mode=modern → Grant prompts + Grant Smart Review
- /create-deed/interspousal-transfer?mode=modern → DTT exemption prompt + tailored review
- /create-deed/warranty-deed?mode=modern → Covenants prompt + tailored review
- /create-deed/tax-deed?mode=modern → Tax sale reference prompt + tailored review
- Mode switcher swaps Modern/Classic without backend changes
