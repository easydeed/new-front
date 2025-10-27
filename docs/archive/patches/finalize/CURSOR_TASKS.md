# Cursor Tasks — v4.1 Finalize & Layout Unification

## 0) Branch
git checkout -b fix/wizard-v4_1-finalize-layout

## 1) Copy files (same paths)
frontend/src/features/wizard/mode/layout/WizardFrame.tsx
frontend/src/features/wizard/mode/layout/wizard-frame.css
frontend/src/features/wizard/mode/ModeSwitcher.tsx        # ensure this exists from v4; replacing is safe
frontend/src/features/wizard/mode/finalize/finalizeBridge.ts  # updated: appends ?mode=modern to preview
frontend/src/features/wizard/mode/WizardHost.tsx          # updated: wraps engines with WizardFrame

## 2) Apply patches
git apply frontend/patches/020_inject_switcher_and_frame.diff
git apply frontend/patches/021_modern_smartreview_finalize.diff

If a patch rejects, open the file and place the marked blocks `// [v4.1]` manually.

## 3) Wire your Step 1 if not done
Open `PropertyStepBridge.tsx` and import your actual Step 1 component.
(From Phase 15 bundle. This package assumes that file is already present.)

## 4) Verify (dev)
- /create-deed/grant-deed?mode=modern
- Complete Step 1 → Modern Q&A → Smart Review → **Confirm & Generate**
- You should **land on preview with `?mode=modern`**, NOT classic finalize.
- Header shows the **Mode Switcher** consistently.
- Modern layout matches Classic (padding/typography).

## 5) Rollback
- Revert the two patches; remove layout files. Classic/Modern revert to prior behavior.
