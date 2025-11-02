# Rollback Plan

## Levels

**Level 1 – Flags (30s)**
- Toggle V0 features OFF in `frontend/src/config/featureFlags.ts` and redeploy.

**Level 2 – Route swap (2m)**
- Point `/login`, `/register`, `/dashboard`, or wizard routes back to original components.

**Level 3 – CSS isolation (5–10m)**
- If styling conflicts appear, ensure `body:not([data-v0-page])` scoping is in effect and remove temporary `nuclear-reset.css` imports.

**Level 4 – Full revert (git, 2–5m)**
- `git revert` the last V0 commit or restore the backup copies you made before enabling flags.

## Edge cases

- **User mid‑wizard**: Local draft uses the same `deedWizardDraft` key; show the draft banner on the original wizard as well.
- **Token invalidation**: Keep AuthManager usage unchanged; the auth guard will force re‑login (expected).

## Smoke checklist before rolling forward again
- Auth redirect works
- Dashboard stats & recent deeds load
- Wizard draft banner appears when `deedWizardDraft` exists
- PDF generates on all 5 deed types
