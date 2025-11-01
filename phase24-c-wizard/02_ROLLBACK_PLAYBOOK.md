# Rollback Playbook (under 60 seconds)

## Level 1 — Feature flags
- Set `NEW_WIZARD_MODERN=false`, `NEW_WIZARD_CLASSIC=false`
- (Optional) `WIZARD_UI_KILLSWITCH=true` to force original shells

## Level 2 — Component fallback
- Swap `PropertySearchV0` → `PropertySearchOriginal`
- Same for `StepCardV0`, `SmartReviewV0`, `ProgressIndicatorV0`

## Level 3 — CSS fallback
- Re‑enable `nuclear-reset.css` import in the v0 layout
- Revert `vibrancy-boost.scope.patch`

## Level 4 — Git revert
- `git revert <last-sha>` and redeploy
