
# DeedPro — Wizard v3 Modern Patch (All‑in‑One)

**Build**: 2025-10-15T16:40:45.590176Z
**Scope**: Fix final-step redirect, add on-screen mode toggle, unify modern layout with classic, prefill owners, add Industry Partners selector, stabilize hydration (separate storage keys), and wire modern finalize to backend.
**Compatibility**: Next.js (app router), React 18, Zustand store, FastAPI backend (Render), Google Maps JS v3 (Places new API), existing auth (JWT bearer).

---

## What’s in this package

**Frontend** (`frontend/`)
- `features/wizard/mode/ModeContext.tsx` — hydration-gated mode provider + persistent toggle.
- `features/wizard/mode/WizardModeToggle.tsx` — in-UI toggle switch; persists `?mode=...`.
- `features/wizard/mode/engines/ModernEngine.tsx` — modern Q&A engine, integrated with store, owner prefill, finalize wiring.
- `features/wizard/mode/components/StepShellModern.tsx` — centered, padded layout to match classic visual density.
- `features/wizard/mode/components/DeedTypeBadge.tsx` — consistent badge with docType and mode.
- `features/wizard/mode/components/ProgressMinimal.tsx` — unified progress bar for both modes.
- `features/wizard/mode/components/OwnerSelect.tsx` — hybrid dropdown/input seeded from verified owners.
- `features/wizard/mode/components/IndustryPartnersSelect.tsx` — select existing partner or add new inline.
- `features/wizard/mode/prompts/promptFlows.ts` — deed-type specific questions (Grant, Quitclaim, Interspousal, Warranty, Tax).
- `features/wizard/mode/review/SmartReview.tsx` — plain-English review with “Edit” chips.
- `features/wizard/mode/review/smartReviewTemplates.ts` — deed-specific review lines.
- `features/wizard/mode/adapters/{grantDeed,quitclaim,interspousal,warranty,tax}.ts` — canonical adapters.
- `features/wizard/mode/adapters/index.ts` — `toCanonicalFor / fromCanonicalFor`.
- `features/wizard/mode/bridge/useWizardStoreBridge.ts` — separates modern/classic storage keys; hydration-safe get/set.
- `components/PropertySearchWithTitlePoint.tsx` — migrated to new Google Places (`AutocompleteSuggestion`/`Place`) with fallback.
- `lib/api/deeds.ts` — finalizeDeed() → backend POST; returns deedId → redirect to preview.
- `lib/api/partners.ts` — list/create partners for autofill.
- `styles/wizard-modern.css` — modern visuals aligned to classic paddings.

**Backend** (`backend/`)
- `app/api/routers/partners.py` — FastAPI endpoints: list/create partners (per user/org).
- `app/schemas/partner.py`, `app/models/partner.py`, `app/crud/partner.py` — models & CRUD.
- Alembic migration: `alembic/versions/20251015_add_industry_partners.py`.
- `app/api/routers/deeds_finalize_modern.py` (optional shim): accepts canonical payload from modern UI and forwards to existing deed creation service.

---

## Install (Cursor)

1) **Unzip** into your repo root:
```
/your-repo/
  frontend/  (merge)
  backend/   (merge)
```

2) **Frontend wiring**
- Import the mode provider at the wizard entry:
  - `app/create-deed/[docType]/page.tsx`:
    ```tsx
    import {{ WizardModeProvider }} from '@/features/wizard/mode/ModeContext';
    export default function Page({{ params, searchParams }}) {{ /* ... */ }}
    // wrap page content:
    return (
      <WizardModeProvider initialMode={{searchParams?.mode}}>
        {{/* your WizardHost (unchanged) */}}
      </WizardModeProvider>
    );
    ```
- Place the toggle in your wizard chrome (top-right):
  ```tsx
  import WizardModeToggle from '@/features/wizard/mode/WizardModeToggle';
  <WizardModeToggle docType={{docType}} />
  ```
- Replace modern finalize navigation with `finalizeDeed()` (already done in the included `ModernEngine.tsx`).

3) **Backend wiring**
- Add `partners.py` router to your FastAPI app:
  ```py
  from app.api.routers import partners
  app.include_router(partners.router, prefix="/api/partners", tags=["partners"])
  ```
- Run Alembic migration:
  ```bash
  alembic upgrade head
  ```

4) **Env vars**
- Frontend:
  - `NEXT_PUBLIC_BACKEND_BASE_URL=https://<your-render-service>`
  - `NEXT_PUBLIC_WIZARD_MODE_DEFAULT=modern` (or `classic`)
- Backend:
  - No new secrets required for partners (uses existing DB + auth dependency).

5) **Test**
- Start in modern mode: `/create-deed/grant-deed?mode=modern`
- Complete steps → **Review** → **Generate**. Expect redirect to `/deeds/<id>/preview` (stay in modern layout).
- Owner / Industry Partners selectors should prefill fields.

---

## Notes

- Hydration safety: modern storage key is **`deedWizardDraft_modern_v2`**; classic keeps its original key to avoid collisions.
- Google Places upgrade: uses new API if present; falls back to legacy with console notice.
- Progress bar unified: both modes can render `ProgressMinimal` with doc-type aware step count.
