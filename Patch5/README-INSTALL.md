# Installation & Integration – DeedPro Cursor Bundle v3

## 1) Database migration

Run Alembic to create the `partners` table:

```bash
cd backend
alembic upgrade head
```

### Model overview

- `Partner` (org‑scoped):
  - `id` (UUID), `organization_id` (UUID/str), `created_by_user_id` (UUID/str)
  - `category`: `title_company | real_estate | lender | other`
  - `role`: `title_officer | realtor | loan_officer | other`
  - `company_name`, `contact_name`, `email`, `phone`
  - `address_*` (optional), `notes` (optional), `is_active` (bool)
  - timestamps

## 2) Wire FastAPI routers

Edit your central API router, typically `backend/app/api/api_v1/api.py`:

```python
from app.api.routes.partners import router as partners_router
from app.api.routes.admin_partners import router as admin_partners_router

api_router.include_router(partners_router, prefix="/partners", tags=["partners"])
api_router.include_router(admin_partners_router, prefix="/admin/partners", tags=["admin:partners"])
```

## 3) Permissions

- `/partners/*` requires authentication. Results are filtered by `organization_id` of the current user.  
- `/admin/partners/*` requires `current_user.is_superuser` (or your admin check) and returns **all** partners.

## 4) Frontend integration

- The Modern engine is patched to:
  - use `useWizardStoreBridge` for persistence (separate modern vs classic keys)
  - pull owner candidates from `verifiedData.owners`
  - use `PartnerSelect` for "Requested by"
  - call `finalizeDeed()` on confirm instead of redirecting to Classic

- **Progress bar**: Both Classic and Modern can import:
  ```tsx
  import WizardProgressBarUnified from "@/features/wizard/mode/components/WizardProgressBarUnified";
  ```

- **Mode toggle** remains available:
  ```tsx
  import ModeToggle from "@/features/wizard/mode/components/ModeToggle";
  ```

## 5) Pages

- `/partners` – user self‑service CRUD
- `/admin/partners` – admin listing

## 6) Environment

No new env vars required. The backend infers `organization_id` from `current_user` (ensure your auth dependency sets it).

## 7) Test pass

- Create a partner (Title → Title Officer) and confirm it appears in the Modern wizard "Requested by".
- Verify property search → owners appear as choices for “Who is transferring?”
- Finalize in Modern → lands on preview page; a deed record is created in DB.

---

## Troubleshooting

- If Modern still redirects to Classic on finalize, ensure **SmartReview** calls `finalizeDeed()`
  and the **error boundary** does not force a Classic fallback on caught errors.
- If owner candidates do not appear, confirm `verifiedData.owners` is saved by the property step and
  `useWizardStoreBridge.getWizardData()` shows it after hydration.

