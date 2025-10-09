# Install & Run (Cursor-ready)

> Target repos: `backend/` (FastAPI) and `frontend/` (Next.js App Router)

## 0) Prereqs
- Backend env has a working Postgres and JWT auth (already in place)
- Frontend env var: `NEXT_PUBLIC_API_URL` → your FastAPI base URL
- Auth storage standardized on `localStorage['access_token']`

## 1) Drop the bundle
Unzip `deedpro-admin-honesty-pass-bundle.zip` at your mono-repo root.

```
/backend
/frontend
/deedpro-admin-honesty-pass-bundle/ (this folder's files will be copied by tasks)
```

## 2) Run Cursor tasks (one by one)

### A) **ADMIN: Apply Backend Additive Router**
- Copies `snippets/backend/routers/admin_api_v2.py` → `backend/routers/admin_api_v2.py`
- **Manual step (one line):** open `backend/main.py` and add:

```python
from routers import admin_api_v2
app.include_router(admin_api_v2.router, prefix="")  # add after other admin includes
```

> If your project structures imports as `backend.routers`, adjust accordingly.

### B) **ADMIN: Apply Frontend Honest Page**
- Copies everything under `snippets/frontend/src/*` into `frontend/src/`:
  - `app/admin-honest/*`
  - `lib/adminApi.ts`
  - `types/admin.ts`

### C) **ADMIN: Dev (FE+BE)**
- Starts FastAPI on 8000 and Next on 3000

### D) **ADMIN: Smoke**
- Opens http://localhost:3000/admin-honest
- Runs a few curls against v2 endpoints

> If you can’t modify `backend/main.py` now, you may import the router inside `main.py`’s existing admin include block.

## 3) Feature flags
In `app/admin-honest/page.tsx`, flip:

```ts
const FLAGS = {
  AUDIT_LOGS: false,
  API_MONITORING: false,
  INTEGRATIONS: false,
  NOTIFICATIONS: false
};
```

## 4) Rollback
- Remove the single `include_router()` line
- Delete `frontend/src/app/admin-honest` and the `lib/types` files you added
- No other codepaths impacted
