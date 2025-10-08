# Runbook — Phase 6-1

## What we’re changing
- **Past Deeds**: Frontend lists real deeds from `/deeds`.
- **Shared Deeds**: Frontend lists and updates shares via `/shared-deeds`.
- **Dashboard stats**: Real counts from `/deeds/summary` (new).
- **Admin**: Endpoint stubs to replace mocked user details and add `/admin/system-metrics`.

## Smoke tests (Playwright)
- Wizard end‑to‑end (minimal fields) → expect PDF download link or 200 stream.
- Dashboard loads deed counts > 0 after wizard run.
- Past Deeds table includes the new deed.
- Shared a deed → appears in Shared list.

## Rollback
- Revert patches: `git revert` the merge commit or re‑run `scripts/revert_patches.sh`.
- Disable trains: set `RELEASE_TRAIN_ENABLED=false` repository variable.

