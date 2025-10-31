# Phase 24‑B — V0 Dashboard & Wizard Starter (Cursor Bundle)
**Generated**: 2025-10-31T18:26:18.166174 UTC


This bundle gives you:
1) Two _production‑ready_ master prompts for Vercel V0 (Dashboard, Wizard UI‑only).
2) A minimal Next.js scaffold to mount V0 output behind feature flags and the `data-v0-page` isolation attribute.
3) A Tailwind v4→v3 converter script for quick integration of V0 CSS.
4) Guardrail checklists + simple Playwright tests for auth guard and data contracts.

---

## Quick Start (10 minutes)

### 1) Drop the scaffold in your repo
Copy `frontend_scaffold/src` into your project’s `frontend/src` **without** overwriting existing files.
- Key routes:
  - `src/app/(v0)/dashboard` — new V0 dashboard route
  - `src/app/(v0)/create-deed/wizard-v0-shell.tsx` — UI shell that wraps your existing wizard logic

All V0 surfaces are wrapped under `<body data-v0-page>` for clean CSS isolation (works with the Vibrancy scoping you implemented).

### 2) Feature flags
Open `src/config/featureFlags.ts` and toggle:
```ts
export const FEATURE_FLAGS = { NEW_DASHBOARD: false, NEW_WIZARD_MODERN: false };
```

### 3) Generate UI with V0
- Open each file in `v0-prompts/` and paste the prompt into https://v0.dev.
- Download the generated .tsx/.css and drop them into:
  - Dashboard → `src/app/(v0)/dashboard/DashboardV0.tsx` (replace the placeholder)
  - Wizard UI blocks → create sibling files (e.g., `PropertySearchV0.tsx`, `WizardStepCardV0.tsx`, etc.)

### 4) Convert Tailwind v4 → v3 (if needed)
V0 often emits Tailwind v4. Run:
```bash
node tools/convert-tailwind-v4-to-v3.mjs path/to/v0-file.css
```
Then ensure files use `@tailwind base; @tailwind components; @tailwind utilities;` and remove any `@theme inline` blocks.

### 5) Wire guardrails (do not change logic)
- Keep **AuthManager** usage as-is.
- Preserve calls to `/users/profile`, `/deeds/summary`, `/deeds` with `Authorization: Bearer <token>`.
- Preserve wizard state, SiteX hydration, canonical adapters, and `finalizeDeed` codepaths.

### 6) Run smoke tests
We include two Playwright samples:
- `e2e/auth-guard.spec.ts`
- `e2e/dashboard-contracts.spec.ts`

Customize the selectors as needed, then run your e2e suite.

---

## Files in this bundle

- `v0-prompts/dashboard-master-prompt-v2.md` — Dashboard master prompt (creative freedom + hard functional fences)
- `v0-prompts/wizard-ui-master-prompt-v2.md` — Wizard UI‑only master prompt (component‑by‑component)
- `frontend_scaffold/src/app/(v0)/dashboard/layout.tsx` — adds `data-v0-page` to isolate CSS
- `frontend_scaffold/src/app/(v0)/dashboard/page.tsx` — gates V0 dashboard under feature flag
- `frontend_scaffold/src/app/(v0)/dashboard/DashboardV0.tsx` — placeholder component to be replaced by V0
- `frontend_scaffold/src/app/(v0)/create-deed/wizard-v0-shell.tsx` — UI shell to host V0 components without touching logic
- `frontend_scaffold/src/config/featureFlags.ts` — simple flags for NEW_DASHBOARD / NEW_WIZARD_MODERN
- `tools/convert-tailwind-v4-to-v3.mjs` — tiny converter script
- `e2e/auth-guard.spec.ts` — redirects to /login when unauthenticated
- `e2e/dashboard-contracts.spec.ts` — asserts required network calls are issued

---

## Integration Tips
- Keep V0 **presentational**: tweak layout, spacing, motion, and micro‑interactions, not logic.
- When in doubt, **wrap**: export your existing functions and state, inject them as props into the V0 components.
- Always respect `prefers-reduced-motion` and keep Lighthouse ≥ 90 on Dashboard.

Good luck — ship the crown jewel! 🚀
