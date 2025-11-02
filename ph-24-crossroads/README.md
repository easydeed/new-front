# DeedPro — Phase 24 Crossroads: Cursor Package

**Generated**: 2025-11-02 23:00:24 UTC

This package gives you a **drop‑in workspace** for Cursor that safely integrates V0’s designs across **Auth**, **Dashboard**, and the **Wizard** while preserving every guardrail (auth, SiteX hydration, canonical adapters, PDF generation).

## What’s inside

- `.cursor/rules.md` — Workspace guardrails for Cursor’s AI
- `docs/` — Rollback plan, auth integration guide, modern‑engine decision note, test matrix
- `prompts/v0/` — Ready‑to‑paste V0 prompts for Auth, Dashboard, Wizard UI‑only components
- `frontend/src/app/(v0)/` — Isolated Next.js routes/layout skeleton with feature‑flag toggles
- `frontend/src/styles/` — `nuclear-reset.css` (optional) + `v0-globals.css` (Tailwind v3)
- `frontend/scripts/convert-tailwind-v4-to-v3.mjs` — Regex converter for V0 CSS
- `frontend/src/__tests__/` — Test stubs for auth & dashboard guardrails

## One‑time setup (10–15 min)

1. **Scope aggressive globals** (best long‑term fix): In your main global CSS (e.g., `vibrancy-boost.css`),
   wrap global selectors so they **don’t** affect V0 pages:

```css
/* Before (global everywhere) */
/* * { ... gradients, shadows ... } */

/* After (scoped away from V0 pages) */
body:not([data-v0-page]) * { /* gradients, shadows, etc. */ }
```

2. **Create V0 layout**: Use `frontend/src/app/(v0)/layout.tsx` here as your isolated layout.
   It adds `<body data-v0-page>` and imports `v0-globals.css`.

3. **Feature flags**: Drop `frontend/src/config/featureFlags.ts` in your repo and use it to toggle
   Auth, Dashboard, and Wizard V0 variants.

4. **Tailwind v4 → v3** (when V0 outputs v4): run
```bash
node frontend/scripts/convert-tailwind-v4-to-v3.mjs path/to/v0.css > path/to/v0-globals.css
```

5. **Install test libs** (if you don’t have them):
```bash
npm i -D @testing-library/react @testing-library/jest-dom jest ts-jest whatwg-url @types/jest
```

## Safe adoption flow

1. Start with **Auth pages** (lowest risk): paste a prompt from `prompts/v0/` into v0.dev, drop the TSX into the matching folder under `(v0)/auth/*`, and keep the API/validation code that’s already in the skeleton.
2. Move to **Dashboard** (medium risk): swap the visual layer only; keep auth guard, data fetching, and draft detection code.
3. Finish with **Wizard UI (UI‑only)** (highest risk): replace just the **visual components** (cards, inputs, progress), not the logic.

## Rollback

- Flip the feature flags OFF to revert to the original UI.
- The original files remain untouched in your app; V0 variants live under `src/app/(v0)` and guarded by flags.

See `docs/ROLLBACK_PLAN.md` for a 30‑second rollback and deeper scenarios.

## Test quickly

Run the included test stubs and add real selectors as you integrate. See `docs/TEST_MATRIX.md`.

— End —
