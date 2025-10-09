# DeedPro — Auth & DB Hardening (Cursor Bundle)

**Date:** 2025-10-09  
**Goal:** Fix critical auth gaps (password reset, email verification, role/admin consistency, token storage), remove schema conflicts, and stop hardcoded user ids — **without touching the wizard**.

This bundle aligns with your audit findings (missing reset flow, no email verification, user id hardcode, schema mismatch, token & role inconsistencies). It ships safe, additive changes and keeps risky items behind flags.

---

## What this bundle delivers

### P0 — Ship this first
1. **Forgot / Reset Password flow (end‑to‑end)**
   - `POST /users/forgot-password`: always returns success; emails a 1‑hour reset link
   - `POST /users/reset-password`: verifies token + new password strength; updates hash
   - Frontend page: `/reset-password?token=...`

2. **Email Verification (opt‑in)**
   - `POST /users/verify-email/request` → sends verification link
   - `GET /users/verify-email?token=...` → sets `users.verified = TRUE`
   - Note: you can allow login pre‑verification (configurable) or block until verified

3. **Fix hardcoded `user_id = 1`**
   - `/deeds` and friends use `Depends(get_current_user_id)` instead of hardcoding

4. **Unify token storage (frontend)**
   - Provide `utils/authToken.ts` and codemods to standardize on `access_token`
   - (HttpOnly-cookie mode is out of scope here; we keep localStorage for now)

5. **Schema unification (users table)**
   - SQL migration brings the `users` table to the canonical shape (adds columns if missing, no data loss)
   - Disables any `create_tables()` routine that creates the wrong shape

### P1 — Safe improvements (flagged OFF by default)
6. **Refresh tokens (7 days) + silent refresh (frontend hook)**
   - `POST /users/refresh-token` & `POST /users/logout` (revokes token)
   - `refresh_tokens` table to store **hashed** refresh tokens + expirations
   - Frontend `useSilentRefresh` hook (OFF by default)

7. **Rate limit login**
   - SlowAPI limiter applied to `/users/login` (5/min per IP). If lib missing, it’s no‑op.

8. **Admin role normalization**
   - Standardize admin to `'admin'` everywhere; migration updates legacy `'Administrator'` to `'admin'`
   - Backend checks accept both until migration runs (grace window)

---

## Install (Cursor Tasks)

Open **Tasks** and run in order:

1. **AUTH: Apply Backend Patches**  
2. **AUTH: Apply Frontend Patches**  
3. **AUTH: Run DB Migrations (dev)** *(or apply SQL on Render)*  
4. **AUTH: Dev (FE+BE)**  
5. **AUTH: Smoke (Auth flows)**

If a patch writes `*.rej`, copy the matching file from `snippets/` into your repo path and re-run the task.

---

## Where files go (relative to repo root)

**Backend**
- `snippets/backend/routers/auth_extra.py` → `backend/routers/auth_extra.py`
- `snippets/backend/utils/email.py` → `backend/utils/email.py` (SendGrid helper; consoles if not configured)
- `snippets/backend/utils/roles.py` → `backend/utils/roles.py`
- **Mount router** in `backend/main.py` (see below)

**Frontend**
- `snippets/frontend/src/app/reset-password/page.tsx` → `frontend/src/app/reset-password/page.tsx`
- `snippets/frontend/src/app/verify-email/page.tsx` → `frontend/src/app/verify-email/page.tsx`
- `snippets/frontend/src/utils/authToken.ts` → `frontend/src/utils/authToken.ts`
- `snippets/frontend/src/hooks/useSilentRefresh.ts` → `frontend/src/hooks/useSilentRefresh.ts`  *(OFF by default)*

**SQL**
- `sql/migrations/20251009_sync_users_schema.sql`
- `sql/migrations/20251009_refresh_tokens.sql`
- `sql/migrations/20251009_roles_normalization.sql`

---

## Minimal wiring

### 1) Mount the new router (backend)
Add to `backend/main.py` near other routers:
```python
from routers import auth_extra
app.include_router(auth_extra.router, prefix="")  # no auth required for forgot/reset; internal checks inside
```

### 2) Standardize token storage (frontend)
Use the new helpers consistently:
```ts
import { getAccessToken, setAccessToken, clearAccessToken } from '@/utils/authToken';
// Replace all ad-hoc localStorage "token"/"jwt" calls
```

### 3) Expose Reset & Verify pages (frontend)
Nothing else needed; routes live under `/reset-password` and `/verify-email`.

### 4) Optional: enable refresh tokens
- Backend: set `REFRESH_TOKENS_ENABLED=true` and run the refresh_tokens migration
- Frontend: opt-in to `useSilentRefresh` at your `App` root

---

## Environment variables (Backend)

```bash
# Required
JWT_SECRET_KEY=change-me # now enforced to be set

# Optional (email)
SENDGRID_API_KEY=...          # or leave empty to log emails to console
FROM_EMAIL=noreply@deedpro.com
FRONTEND_URL=https://deedpro-frontend-new.vercel.app

# Feature flags
REFRESH_TOKENS_ENABLED=false
LOGIN_RATE_LIMIT=true
EMAIL_VERIFICATION_REQUIRED=false  # allow login before verify (true blocks login)
```

---

## Rollback

- Remove the `auth_extra` include, delete the new frontend pages, and revert token helper usage if needed.
- Running the schema migration is additive; no destructive changes are included.

---

## Test checklist (staging gate)

- Register → **receive verification email** (if enabled) → verify
- Login → receives `access_token` → dashboard loads
- “Forgot password” → email link → reset succeeds → can login with new password
- Admin features still accessible with `'admin'` role after normalization
- Wizard flows (Create Deed, Preview, Finalize) still work unchanged

