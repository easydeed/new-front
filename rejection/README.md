# Cursor Bundle — Deed Sharing: "Request Changes" (Rejection + Comments)

**Purpose**: Close the 4 gaps in the “Request Changes” flow without touching the wizard.  
- Persist reviewer comments
- Notify the owner (email + in‑app notification)
- Surface comments in the UI (Shared Deeds)
- Keep the crown jewel (wizard) untouched

> This bundle is additive and **backward compatible**. It modifies the /approve/{token} handler and adds optional endpoints/utilities. Feature flags guard in‑app notifications.

---

## What’s included

```
backend/
  migrations/
    20251013_add_feedback_to_deed_shares.sql
    20251013_create_notifications_tables_if_missing.sql
  utils/
    notifications.py
  routers/
    deed_share_feedback.py          # optional read-only feedback API
  patches/
    main_approve_route_patch.diff   # applies to backend/main.py

frontend/
  src/components/FeedbackModal.tsx
  src/lib/api/deedShares.ts
  patches/
    shared_deeds_page_patch.diff    # applies to src/app/shared-deeds/page.tsx
    approve_token_page_patch.diff   # applies to src/app/approve/[token]/page.tsx

.env.example
```

---

## How to apply (Cursor steps)

### 0) Pre‑flight
1. **Open** your repo root in Cursor. Ensure main branches are up to date.
2. Confirm your backend has `backend/main.py` (FastAPI) and frontend uses **Next.js App Router** under `src/app/...`.

### 1) Database migrations
Run these in your production/staging database (safe, `IF NOT EXISTS`):

```sql
-- file: backend/migrations/20251013_add_feedback_to_deed_shares.sql
-- file: backend/migrations/20251013_create_notifications_tables_if_missing.sql
```

### 2) Backend patch
1. Open `backend/main.py`.
2. Apply patch: **backend/patches/main_approve_route_patch.diff** (Cursor → “Apply Patch”).  
   - This updates **POST /approve/{token}** to store `comments`, set status `rejected`, send email, and create an in‑app notification.
3. Add new utility: `backend/utils/notifications.py` (drag file in if missing).
4. (Optional) Mount read-only feedback routes by adding near other includes:
```python
from backend.routers.deed_share_feedback import router as deed_share_feedback_router
app.include_router(deed_share_feedback_router, prefix="/deed-shares", tags=["deed-shares"])
```

### 3) Frontend changes
1. Add component: `frontend/src/components/FeedbackModal.tsx`.
2. Add API helper: `frontend/src/lib/api/deedShares.ts`.
3. Apply patch to **Shared Deeds** page: `frontend/patches/shared_deeds_page_patch.diff`.
4. Apply patch to **Approval** page (token page): `frontend/patches/approve_token_page_patch.diff`.

### 4) Environment variables
Add to Render/Vercel (and `.env`):
```
SENDGRID_API_KEY=...          # or leave empty to noop email
FROM_EMAIL=noreply@deedpro.com
NEXT_PUBLIC_NOTIFICATIONS_ENABLED=true
NEXT_PUBLIC_API_URL=https://deedpro-main-api.onrender.com
```

### 5) Test plan
**Backend (local):**
```bash
pytest backend/tests/test_request_changes_flow.py -q
```

**Manual E2E:**
1. Share a deed → open approval link as recipient.
2. Click **❌ Request Changes**, enter comments → submit.
3. Owner receives email; bell shows a red badge (if enabled).
4. Owner opens **Shared Deeds** → sees red “Rejected” and **View Feedback** → modal shows the comments.
5. (Optional) “Edit & Reshare” navigates back to wizard.

> If notifications are not desired yet, set `NEXT_PUBLIC_NOTIFICATIONS_ENABLED=false`. The rest still works.

---

## Rollback
- Revert `/approve/{token}` patch.
- Columns are harmless to keep. Optional: set `feedback` to NULL via SQL.
- Frontend buttons hide when `feedback` is empty.

---

## Notes
- Email sending **no‑ops** if `SENDGRID_API_KEY` is unset; the API still returns success after DB save.
- All changes avoid the wizard execution path; no change to PDF generation or flow logic.
