# Rollback — Modern Wizard V0

1) Toggle feature flag OFF:
   - `frontend/src/config/featureFlags.ts` → `NEW_WIZARD_MODERN_V0 = false`

2) (If needed) Restore CSS:
   - Revert `vibrancy-boost.css` scoping diff
   - Remove `(v0-wizard)` route group from router

3) Verify classic wizard paths:
   - /create-deed (classic) renders
   - All 5 deed types generate PDFs

4) Post‑mortem:
   - Capture metrics + errors; update docs.
