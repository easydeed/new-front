# Phase 24‑C Execution Guide — Modern Wizard (V0 UI)

This guide turns the analysis into a **repeatable, low‑risk** rollout.

## 0) Pre‑flight
- Branch from `main`.
- Ensure Playwright installed: `npx playwright install`.

## 1) CSS isolation (choose one)
**Recommended**: Scope the main app’s vibrancy CSS so it does not apply when the wizard is active.
- Apply `patches/vibrancy-boost-scope.diff` or update selectors in your `vibrancy-boost.css` from `*` → `body:not([data-v0-page]) *`.

**Alternative**: Keep your globals but include `nuclear-reset.css` (already imported in `WizardShellV0.tsx`).

## 2) Route group
- Place the wizard under `src/app/(v0-wizard)/create-deed/page.tsx` (provided).
- The layout sets `<body data-v0-page data-v0-wizard>` for scoping.

## 3) Feature flag
- Add `NEW_WIZARD_MODERN_V0` (provided in `frontend/src/config/featureFlags.ts`).
- Gate your existing wizard entry so toggling true routes users through the V0 shell.

## 4) Integrate presentational components
- Replace containers with the provided V0 counterparts under `ui/v0/*` or `_v0/components/*`.
- **Do not** change handlers, adapters, fetch calls, or storage keys.
- For property search, keep your logic intact; you can wrap it with `PropertySearchStyleOnlyV0` as needed.

## 5) V0 collaboration
- Use prompts from `v0-prompts/modern-wizard/` to iterate on visuals only (no logic changes).
- Paste your current TSX into V0, then merge style diffs back here.

## 6) Testing (Playwright quick pass)
- Run `npx playwright test tests/e2e/wizard-modern.spec.ts`.
- Add your test account creds via env if needed.

## 7) Rollout
- Internal (flag ON for team) → 5% → 25% → 50% → 100%.
- Monitor: conversion to PDF, error rates, time‑to‑complete, and abandon rate.

## 8) Rollback
- Flip `NEW_WIZARD_MODERN_V0` to false.
- If needed, revert the CSS scoping diff.
