# Phase 24‑C — Modern Wizard (V0 UI) — 11/10 Package

**Generated**: 2025-10-31T21:57:16.966324Z

This package gives you a *plug‑in place* to drop a modern, V0‑designed visual shell **without touching business logic**. 
It follows the CSS isolation + feature flag strategy and the “document‑to‑debug” playbook.

## What’s inside
- `frontend/src/app/(v0-wizard)/…` — isolated App Router group with its own layout and CSS scope
- `frontend/src/features/wizard/ui/v0/…` — presentational components (no logic) that your existing wizard calls
- `frontend/src/config/featureFlags.ts` — adds `NEW_WIZARD_MODERN_V0`
- `v0-prompts/modern-wizard/*.md` — copy/paste prompts for V0 (style‑only)
- `docs/*.md` — step‑by‑step execution guide, acceptance criteria, checklists, rollback plan
- `tests/e2e/wizard-modern.spec.ts` — Playwright flow (happy path + critical guards)
- `patches/vibrancy-boost-scope.diff` — scoping diff for global vibrancy CSS (if you choose this route)
- `scripts/*` — quick toggles and sanity checks

## Quick start
1) **Scope global CSS** (recommended): apply `patches/vibrancy-boost-scope.diff` (or do it manually) and restart dev server.
2) **Mount isolated route group**: the `(v0-wizard)` layout sets `<body data-v0-page data-v0-wizard>` to prevent CSS bleed.
3) **Wire feature flag**: set `NEW_WIZARD_MODERN_V0 = true` to switch to the new shell; keep classic intact.
4) **Integrate UI only**: replace container components with the `ui/v0/*` equivalents—do **not** change handlers or data flow.
5) **Run tests**: `npx playwright test tests/e2e/wizard-modern.spec.ts`.
6) **Gradual rollout**: flip the flag for internal → 5% → 25% → 50% → 100% with monitoring.

See `docs/PHASE_24C_EXECUTION_GUIDE.md` for the full playbook.
