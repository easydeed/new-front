# DeedPro Admin Honesty Pass — Cursor Bundle

**Goal:** Replace fake/mock data in the Admin section with real backend calls, add missing list/detail/export endpoints,
and ship a new **/admin-honest** page that is production-honest — without touching your crown jewel (the wizard).

This bundle is **additive**. It does **not** modify or risk the existing wizard flows.

---

## What you get

### Backend (FastAPI)
- `routers/admin_api_v2.py` — new, additive admin routes:
  - `GET /admin/users/search` — paginated & searchable users
  - `GET /admin/users/{id}/real` — real user detail (joins + deed counts)
  - `GET /admin/deeds/search` — paginated & searchable deeds (status filter)
  - `GET /admin/deeds/{id}` — deed details
  - `GET /admin/export/users.csv` — CSV export
  - `GET /admin/export/deeds.csv` — CSV export

> We avoid conflicting with any existing `/admin/*` handlers by using **/search** and **/real** routes.
> This lets you keep the old admin page while /admin-honest uses the v2 endpoints.

### Frontend (Next.js / TypeScript)
- `/admin-honest` — a new page that renders **Overview · Users · Deeds · Revenue · System** tabs
  using **real** endpoints (existing + v2). It includes:
  - Pagination, debounced search, status filters
  - Working **View** modals for users and deeds
  - CSV **Export** buttons
  - Honest empty/error/loading states
  - Feature flags to hide non-implemented tabs
- `lib/adminApi.ts` — typed client that pulls the JWT from `localStorage.getItem('access_token')`
- `types/admin.ts` — shared Admin types
- Small UI components (tables, modals, status pills, skeletons)

### Tasks & How to run
- `.vscode/tasks.json` — Cursor tasks for: copying files, wiring router, dev run, smoke checks
- `docs/INSTALL.md` — step-by-step install & rollback
- `docs/QA_CHECKLIST.md` — verification list

---

## Why now
Your admin panel is **60% facade**: many tabs show mock arrays or nothing at all, while working backend endpoints exist
and simply aren’t called. This bundle performs a **Quick Honesty Pass**: wire what’s already real and hide what isn’t,
so admins finally see operational truth. (See the audit.)

---

## Zero impact to the Wizard
- No imports or changes to wizard components
- No global state changes
- New routes and a new page only
