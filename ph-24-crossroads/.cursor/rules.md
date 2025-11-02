# DeedPro — Cursor Rules (Phase 24 Crossroads)
# Generated: 2025-11-02 23:00:24 UTC

## Mission
Upgrade Landing, Dashboard, and Wizard UI using Vercel V0 designs **without breaking** auth, data, or PDF generation.

## Golden Rules (Do NOT violate)
1) **Do NOT change business logic** — keep API calls, field names, adapters, and canonical transforms intact.
2) **Auth & Storage** — Always use AuthManager helpers; keep localStorage keys: 'access_token', 'user_data', 'deedWizardDraft'.
3) **APIs (must match backend)** —
   - POST /users/login
   - POST /users/register
   - POST /users/forgot-password
   - POST /users/reset-password
   - GET  /users/profile
   - GET  /deeds/summary
   - GET  /deeds
4) **Wizard logic** — Do not rewrite state/store, adapters, or PDF flow. UI-only changes for Modern + Classic wizards.
5) **Tailwind** — Project uses Tailwind v3. If V0 outputs Tailwind v4, run the conversion script and remove @theme blocks.
6) **CSS Isolation** — Mark V0 pages with <body data-v0-page>; scope aggressive globals to body:not([data-v0-page]).
7) **Feature Flags** — Route new UI behind flags; preserve old pages for rollback.
8) **A11y** — Keep keyboard navigation, labels, and focus states. Respect prefers-reduced-motion.
9) **Testing** — Add/keep tests for auth redirects, data loading, draft resume, and error states.

## When editing files
- Prefer composition over refactors. If unsure, duplicate the file into a V0 variant and toggle via feature flags.
- Keep types strict. Avoid 'any'.

## How to ask Cursor
- For V0 **UI-only** changes, say: “Change visual styling only — do not change logic.”
- For **Tailwind v4 → v3**, ask Cursor to run the provided script and then remove any remaining v4 blocks manually.

Good luck and keep it safe.