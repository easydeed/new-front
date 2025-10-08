# Cursor Playbook — Deed Types Expansion (Safe Wizard‑First Execution)

> Goal: Add four deed types (Quitclaim, Interspousal Transfer, Warranty, Tax) using our **deterministic** pipeline
> (Pydantic → Jinja → WeasyPrint) and **do not** alter the existing Grant Deed wizard or its validation.

## Guardrails (Cursor, please follow)

1) **Do NOT edit** the existing Grant Deed templates, router, or validation unless explicitly asked.  
2) **No AI in the critical path.** New endpoints/templates are deterministic.  
3) Prefer **patches/snippets** in this kit; if a patch rejects, **copy the matching snippet file** into the target path.  
4) All new features behind **explicit routes**; do not auto-link in production nav until QA is complete.

---

## One‑shot setup (Tasks panel)

Open the Tasks panel and run, in order:

1. **DocTypes: Apply Backend Patches** – mounts the extra router and updates the document registry.  
2. **DocTypes: Apply Frontend Patches** – scaffolds minimal test routes and API proxies.  
3. **DocTypes: Dev (FE+BE)** – launches both servers (FastAPI on 8000, Next.js on 3000).  
4. **DocTypes: Smoke (Playwright)** – verifies the four routes are reachable.

> If a patch shows `*.rej`, open `snippets/` and copy the corresponding files into your repo paths.

---

## Manual steps (only if patches reject)

- Backend
  - Copy `snippets/backend/routers/deeds_extra.py` → `backend/routers/deeds_extra.py`
  - Copy models in `snippets/backend/models/*.py` → `backend/models/`
  - Add `include_router(deeds_extra_router)` in `backend/main.py`
  - Update `/api/doc-types` registry with the new items

- Templates
  - Copy `snippets/templates/*_ca/` → `templates/`

- Frontend
  - Copy `snippets/frontend/src/app/create-deed/<type>/page.tsx` → `frontend/src/app/create-deed/<type>/`
  - Copy `snippets/frontend/src/app/api/generate/<type>-ca/route.ts` → same path in your repo

---

## Dev verification checklist

- Start backend: `uvicorn backend.main:app --reload --port 8000`  
- Start frontend: `cd frontend && npm run dev`  
- Visit:
  - `/create-deed/quitclaim`
  - `/create-deed/interspousal-transfer`
  - `/create-deed/warranty-deed`
  - `/create-deed/tax-deed`
- Click **Generate PDF** on each; browser downloads should start.  
- Confirm PDFs render with correct @page margins and Exhibit‑A overflow behavior.

---

## Post‑verification (wiring into the real wizard)

1) Keep the minimal test pages as **canary routes**.  
2) Map your canonical wizard steps to each new endpoint’s request shape (see the Pydantic models).  
3) Add entries to your document picker **behind a feature flag**.  
4) Connect Past/Shared Deeds so completions appear in dashboard and can be shared (outside this kit).

---

## Rollback

- Remove router import from `backend/main.py` and delete `backend/routers/deeds_extra.py`.  
- Remove the new routes in `frontend/src/app/create-deed/*` and `frontend/src/app/api/generate/*`.  
- No changes to Grant Deed wizard or PDF engine were made.

