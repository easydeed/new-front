# DeedPro v3 — Modern Wizard + Partners (Org‑Scoped) Bundle

**Purpose**
- Fix modern → classic redirect at finalize.
- Add on-screen mode toggle (Modern / Classic) and keep the user on the selected mode.
- Unify layout so Modern feels like the Classic (large centered prompt, big inputs, generous padding).
- Prefill Modern answers from verified property data (owners) and from **Industry Partners** with categories and roles.
- Add **organization_id** partition so partners do not overlap across teams.
- Make hydration robust by isolating localStorage per mode and delaying reads until after hydration.

> This bundle is drop-in and *non-destructive*: it layers on top of your current repo. Keep your crown jewel safe.

---

## What’s inside

```
frontend/
  src/features/wizard/mode/
    ModeContext.tsx
    bridge/useWizardStoreBridge.ts
    engines/ModernEngine.tsx
    components/
      WizardModeToggle.tsx
      StepShell.tsx
      ProgressBar.tsx
      MicroSummary.tsx
      SmartReview.tsx
      DeedTypeBadge.tsx
      controls/SmartSelectInput.tsx
    prompts/promptFlows.ts
    review/smartReviewTemplates.ts
  src/features/wizard/adapters/
    index.ts
    grantDeedAdapter.ts
    quitclaimDeedAdapter.ts
    interspousalAdapter.ts
    warrantyDeedAdapter.ts
    taxDeedAdapter.ts
  src/features/partners/
    PartnersContext.tsx
    IndustryPartnersPanel.tsx
    PartnersSelect.tsx
    types.ts
  src/services/finalizeDeed.ts
  src/styles/wizardModern.css

backend/fastapi/
  routers/partners.py
  schemas.py
  models.py
  deps.py
  migrations/versions/1760585384_add_partners_org_scoped.py

sql/partners_org_scoped_postgres.sql  (raw SQL migration if Alembic not used)
```

---

## Cursor — Step-by-step

1) **Create a feature branch**
```
git checkout -b feat/modern-wizard-v3-partners
```

2) **Drop the `frontend/` files into your Next.js app**
- Root assumed: `frontend/src/...` (adjust path if your repo differs).
- Add style import once in your wizard root (e.g., `_app.tsx` or page wrapper):
  ```ts
  import '@/src/styles/wizardModern.css';
  ```

3) **Wire the Mode Provider and Toggle**
- At your wizard entry (e.g., `src/app/create-deed/[docType]/page.tsx`):
  ```tsx
  import { WizardModeProvider } from '@/src/features/wizard/mode/ModeContext';
  import WizardModeToggle from '@/src/features/wizard/mode/components/WizardModeToggle';

  export default function Page() {
    return (
      <WizardModeProvider>
        <WizardModeToggle />
        {/* your existing WizardHost remains; ModernEngine is chosen by provider */}
      </WizardModeProvider>
    );
  }
  ```

4) **Replace finalize redirect with API finalize**
- Ensure ModernEngine imports `finalizeDeed` from `src/services/finalizeDeed.ts` (already done in this bundle).
- No more redirect to classic — the modern flow `POST`s, then navigates to preview.

5) **Prefill + Partners**
- `promptFlows.ts` includes deed-specific prompts that use:
  - Verified property owners (from store) for “who is transferring” suggestions.
  - Partners (org‑scoped) for Requestor/Title fields via `PartnersSelect`.
- Sidebar: add the panel anywhere in the wizard layout:
  ```tsx
  import IndustryPartnersPanel from '@/src/features/partners/IndustryPartnersPanel';
  // ...
  <aside><IndustryPartnersPanel /></aside>
  ```

6) **Backend – choose FastAPI path (recommended)**
- Copy `backend/fastapi/*` into your backend project.
- Register the router:
  ```py
  # main.py
  from routers.partners import router as partners_router
  app.include_router(partners_router, prefix="/api/partners", tags=["partners"])
  ```
- Run Alembic migration (recommended) *or* run the raw SQL (see below).

7) **DB Migration (choose one)**

**A) Alembic**
```
alembic upgrade head   # ensure env works
alembic revision -m "add partners org scoped" --autogenerate  # optional
# Or drop in the provided version file:
# backend/fastapi/migrations/versions/1760585384_add_partners_org_scoped.py
alembic upgrade head
```

**B) Raw SQL (PostgreSQL)**
```
psql $DATABASE_URL -f sql/partners_org_scoped_postgres.sql
```

8) **Env**
- `NEXT_PUBLIC_WIZARD_MODE_DEFAULT=classic` (safe)
- `NEXT_PUBLIC_WIZARD_MODE_AVAILABLE=true`
- Backend relies on your existing auth dependency to provide `current_user` with `organization_id`.
- If your organizations table has a different name/key, adjust the FK in the migration accordingly.

9) **Build & test**
```
pnpm install  # or yarn/npm
pnpm build && pnpm start
# Exercise: modern mode (?mode=modern), partners create/select, finalize → preview.
```

10) **Rollout**
- Keep default to classic.
- Enable modern via feature flag for targeted users.
- Monitor logs for React #300 or hydration mismatch; gates are in this bundle.

---

## Notes for Architects

- Hydration: localStorage keys are per-mode (`*_modern`, `*_classic`) and only read **after** hydration.
- Finalize: adapters translate modern UI state to canonical payload that matches your existing Pydantic models.
- Partners: partitioned by `organization_id` with categories (title company, real estate, lender) and roles (title officer, realtor, loan officer). People are stored under a partner.
- Minimal CSS: keeps the modern page visually aligned with classic (centered question, larger inputs).
