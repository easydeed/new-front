# Patch 6-c — Modern Wizard State, Finalize & Prefill (Cursor-ready)

**Date**: 2025-10-16T23:44:56.183655 UTC  
**Scope**: Frontend (Next.js/React), no breaking backend changes  
**Goal**: 
1) Stop Modern → Classic redirect at finalize  
2) Eliminate hydration/localStorage collisions  
3) Add persistent on-screen mode toggle  
4) Use same shell as Classic (centered layout, big inputs/buttons)  
5) Prefill from verified owner + Industry Partners (hybrid dropdown)  
6) Consistent progress bar across Classic and Modern (doc-type aware)  
7) Safe Google Places fallback (no SSR/hydration breaks)

This bundle includes both **patches** (for safe, line-based changes) and **drop‑in files** (new components). Apply patches first; if a patch fails, use the corresponding drop‑in file(s) as instructed below.

---

## Why these changes

- Hydration mismatch came from **shared localStorage** keys between Classic and Modern plus early localStorage reads.  
  **Fix**: Each mode gets its own key; modern reads happen **after** hydration, with explicit gates.  
- Modern finalize was hard-coded to navigate to classic finalize.  
  **Fix**: Wire Modern to your existing `finalizeDeed` flow and keep the user in Modern.
- We keep **Step 1: Property Verification** exactly as is (your crown jewel), then switch to modern Q&A for cognitive‑load wins.
- Add prefills: **verified owner → Grantor** and **Partners → Requested By** via a **hybrid dropdown** (pick or type).

---

## File map

```
patches/
  0001-mode-context-hydration-and-keys.patch
  0002-wizard-store-bridge.patch
  0003-modern-engine-finalize-and-state.patch
  0004-property-step-bridge.patch
  0005-progress-bar-unify.patch
  0006-mode-toggle-ui.patch
  0007-prefill-combo-and-partners.patch
  0008-styles-modern-wizard.patch

frontend/src/features/wizard/mode/ModeContext.tsx             (drop-in reference)
frontend/src/features/wizard/mode/bridge/useWizardStoreBridge.ts
frontend/src/features/wizard/mode/engines/ModernEngine.tsx
frontend/src/features/wizard/mode/components/ModeToggle.tsx
frontend/src/features/wizard/mode/components/StepShell.tsx
frontend/src/features/wizard/mode/components/ProgressBar.tsx
frontend/src/features/wizard/mode/components/PrefillCombo.tsx
frontend/src/features/wizard/mode/components/DeedTypeBadge.tsx
frontend/src/features/wizard/mode/components/PropertyStepBridge.tsx
frontend/src/features/wizard/mode/review/SmartReview.tsx
frontend/src/features/wizard/mode/prompts/promptFlows.ts
frontend/src/utils/canonicalAdapters/index.ts
frontend/src/utils/canonicalAdapters/grantDeed.ts
frontend/src/utils/canonicalAdapters/quitclaim.ts
frontend/src/utils/canonicalAdapters/interspousal.ts
frontend/src/utils/canonicalAdapters/warranty.ts
frontend/src/utils/canonicalAdapters/taxDeed.ts
frontend/src/styles/modern-wizard.css
```

---

## Cursor instructions (apply in order)

> **Branch**: create a working branch, e.g. `git checkout -b patch/6c-modern-wizard`

1) **Apply patches** (safe line diffs)
- In Cursor, open `patches/0001-mode-context-hydration-and-keys.patch` and apply.  
- Repeat for `0002` … `0008` in numeric order.

2) **If a patch fails** (context drift)
- Open the corresponding file under `/frontend/src/...` in this bundle and copy its content into your repo file (**same path**).  
- Re-run the app; ensure type imports resolve. If your project uses path aliases (e.g. `@/`), keep them; otherwise adjust relative imports.

3) **Add styles**
- Import `frontend/src/styles/modern-wizard.css` in your wizard root (or `_app.tsx` if global).

4) **ENV check**
- Ensure `NEXT_PUBLIC_WIZARD_MODE_DEFAULT` is set (e.g. `classic` to preserve current default).  
- No new NPM deps are required.

5) **Testing sequence**
- Start from `/create-deed/grant-deed?mode=modern`
- Verify: 
  - Step 1 is your **existing property search** (unchanged).
  - After verify, modern Q&A starts; grantor is **prefilled** from owner (editable).  
  - `Requested By` supports **Industry Partners** hybrid dropdown + “New…” inline add.  
  - Progress bar updates per prompt step & doc type.  
  - Finalize **does not** jump to classic; it calls your `finalizeDeed` flow and lands on preview.
- Switch to `?mode=classic` and confirm classic still works; progress bar matches step count.

6) **Roll‑back**
- Revert branch or set `NEXT_PUBLIC_WIZARD_MODE_DEFAULT=classic` and remove the ModeToggle component from the layout.

---

## Notes on compatibility

- We **do not** change your Step 1 code paths (SITEX/TitlePoint, caching).  
- We **isolate** modern state into `deedWizardDraft_modern` so it cannot collide with classic drafts.  
- All modern reads from localStorage happen **after hydration**.  
- Where we referenced project-local modules (e.g., `@/components/PropertySearchWithTitlePoint`, `@/lib/deeds/finalizeDeed`), adjust import paths if your aliases differ.

Good luck — this should unblock the last mile of Modern Wizard. 
