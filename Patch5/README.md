# DeedPro Cursor Bundle v3 — Modern Wizard Finalize Fix + Industry Partners CRUD (Org-Scoped) + Unified Progress

**Build Date:** 2025-10-16T15:45:22.162393Z

This bundle patches the Modern Wizard finalize flow (no more fallback to Classic),
adds **Industry Partners** CRUD (with org-level partition and roles), and unifies the progress bar
across Classic and Modern modes. It is designed to drop into the existing DeedPro repo that uses
**Next.js (App Router)** on the frontend and **FastAPI + SQLAlchemy + Alembic** on the backend.

> ✔️ This bundle avoids hydration issues by gating all client-only storage access and using
> namespaced localStorage keys for Classic vs Modern.  
> ✔️ Modern finalize posts a full **canonical** payload to the backend and routes to the preview page.  
> ✔️ Partners are **organization-scoped** (`organization_id`) and categorized by **category** and **role**.

---

## What’s inside

```
frontend/
  src/
    features/
      wizard/
        mode/
          bridge/
            useWizardStoreBridge.ts
            finalizeDeed.ts
          components/
            ModeToggle.tsx
            WizardProgressBarUnified.tsx
            Combobox.tsx
            IndustryPartnersSidebar.tsx
          engines/
            ModernEngine.tsx
          prompts/
            promptFlows.ts
          review/
            SmartReview.tsx
    features/partners/client/
      PartnerSelect.tsx
      PartnersManager.tsx
  app/
    partners/page.tsx
    admin/partners/page.tsx
  styles/wizard-modern.css

backend/
  app/models/partner.py
  app/schemas/partner.py
  app/services/partners.py
  app/api/routes/partners.py
  app/api/routes/admin_partners.py
  alembic/versions/<module 'uuid' from '/usr/local/lib/python3.11/uuid.py'>.py (create_partners_table)

README-INSTALL.md
```

---

## Quick Install (Cursor steps)

1. **Extract** this archive into the repo root (it creates `frontend/` and `backend/` subtrees).  
2. **Frontend deps**: no new packages required (uses built-in React/Next + fetch).  
3. **Backend migration**:
   ```bash
   cd backend
   alembic upgrade head
   ```

4. **Wire the routers** in FastAPI (add once):
   ```python
   # backend/app/api/api_v1/api.py  (or your central router file)
   from app.api.routes.partners import router as partners_router
   from app.api.routes.admin_partners import router as admin_partners_router

   api_router.include_router(partners_router, prefix="/partners", tags=["partners"])
   api_router.include_router(admin_partners_router, prefix="/admin/partners", tags=["admin:partners"])
   ```

5. **Rebuild** frontend (Vercel/Next) and backend (Render/Gunicorn/Uvicorn).

---

## Key Changes (Why this fixes observed issues)

- **Finalize loop → Classic**: Modern Smart Review now calls `finalizeDeed(payload)` (client-only),
  which posts to `/api/deeds` and **stays** in Modern. We removed any hard-coded `window.location.href`
  changes to Classic routes.
- **Hydration safeguards**: `useWizardStoreBridge` separates draft keys:
  - `deedWizardDraft_modern` vs `deedWizardDraft_classic` and reads localStorage **after hydration**.
- **Auto‑fill from property API**: Prompt flows for “Who is transferring?” surface current‑owner names
  from `verifiedData.owners` and allow a **hybrid combo box** (select or free‑type).  
- **Industry Partners**: CRUD with `organization_id` scope, **categories** (title company, real estate,
  lender, other) **roles** (title officer, realtor, loan officer, other), and integration to “Requested By”
  prompt through `PartnerSelect` and a sidebar quick‑pick.
- **Unified progress bar**: `WizardProgressBarUnified` uses a per‑docType step map shared by Modern and Classic.

For detailed instructions, see `README-INSTALL.md`.

---

## Verification Checklist

- Modern flow reaches Smart Review and **generates a deed** without redirecting to Classic.
- “Who’s transferring?” shows owner candidates from verified property info and accepts custom input.
- “Requested by” shows Partners grouped by category; “New…” path creates & selects the partner.
- Admin can list all partners (`/admin/partners`) and toggle active status.
- Classic and Modern render the same progress bar component with docType‑specific step labels.
