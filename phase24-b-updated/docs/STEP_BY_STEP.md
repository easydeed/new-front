# Phase 24‑B – Step‑by‑Step (Cursor playbook)

> Goal: ship a **user‑centric Dashboard + complete Auth flow** and prep the Wizard facelift via UI‑only component prompts—**with feature flags, rollback, and tests**.

---

## 0) Prereqs
- Next.js 15 App Router
- Tailwind v3
- Existing `AuthManager` (or copy sample)
- `NEXT_PUBLIC_API_URL` set (or edit `api.ts` default)

---

## 1) CSS Isolation (one‑time, future‑proof)

**Recommended**: Scope aggressive global CSS to non‑V0 pages.

- Open your global CSS (e.g., `vibrancy-boost.css`) and wrap ALL global selectors so they **do not apply** when `data-v0-page` is present on `<body>`:

```css
/* before (applies everywhere) */
/* * { ... big gradients ... } */

/* after (applies everywhere EXCEPT v0 pages) */
body:not([data-v0-page]) * { /* existing rules here... */ }
```

- Ensure V0 pages add `<body data-v0-page>` via their layout.
- Keep `/css/nuclear-reset.css` in your back pocket if needed (see `/css/` here).

---

## 2) Feature Flags & Rollback

1. Add/merge the flags in `frontend/examples/config/featureFlags.ts` to your project:
   - `NEW_AUTH_PAGES`
   - `NEW_DASHBOARD`
   - `NEW_WIZARD_MODERN`
   - `NEW_WIZARD_CLASSIC`

2. Route the entry points to pick **original vs V0** based on those flags.
3. See `/docs/ROLLBACK_AND_FLAGS.md` for copy‑paste snippets + rollback checklist.

---

## 3) Auth – Generate with V0, then integrate

Surfaces (each has its own prompt in `/prompts/auth/`):
- `login`
- `register` (11 exact fields + validations)
- `forgot-password`
- `reset-password` (reads `?token=`)

**Process:**
1. Open a prompt file and paste into V0 with your current TSX page content (or the sample from `/frontend/examples/app/(auth)/**`).
2. Ask V0 to **preserve logic** (AuthManager calls, query params, error handling) and only improve **layout/UX**.
3. Replace your app’s page with the generated file **under a flag**.
4. Test full flows (success/failure) using `/tests/auth/*.test.tsx` as a starter.

---

## 4) Dashboard – Generate with V0, preserve the data layer

Use `/prompts/dashboard/dashboard.md`.
- Must preserve:
  - Auth guard → `/users/profile`
  - Stats → `/deeds/summary`
  - Recent deeds → `/deeds`
  - Draft detection → `localStorage['deedWizardDraft']`
- Let V0 modernize cards/table/empty states, but keep effects/hooks intact.
- Swap in the V0 page behind `NEW_DASHBOARD` and validate with real data.

Example TSX with full data orchestration is in `/frontend/examples/app/dashboard/page.v0.tsx`.

---

## 5) Wizard – UI‑only component prompts

Use **component‑level** prompts in `/prompts/wizard/**`:
- Do **not** change logic, API calls, adapters, or state.
- Targets: `PropertySearch`, `Parties`, `Vesting`, `LegalDescription`, `ProgressIndicator`, `SmartReview`.
- Replace visuals step‑by‑step; after each swap, run the **end‑to‑end check** (address → SiteX → SmartReview → PDF).

---

## 6) Tests (add then expand)

Start with stubs in `/tests/**`:
- **Auth**: login success/failure; register validations; reset token happy path.
- **Dashboard**: redirect if unauthenticated; stats rendering; draft banner visibility.
- **Wizard**: smoke tests for UI components (no logic change).

CI hint: run unit tests on push; add Playwright later for full E2E.

---

## 7) Deploy with flags OFF, then enable gradually

- Merge to main with flags OFF.
- Enable `NEW_AUTH_PAGES` first, then `NEW_DASHBOARD`. Keep wizard flags OFF until all visual swaps are validated.
- If anything regresses → flip the flag OFF (rollback ≤ 30s). See `/docs/ROLLBACK_AND_FLAGS.md`.

---

## 8) Aftercare

- Track errors (Sentry), UX (Hotjar), and conversion metrics.
- Create issues for remaining polish/animations.
- Iterate on the prompts (copy, tweak, re‑generate, replace under the same flag).

