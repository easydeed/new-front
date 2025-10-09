# Phase 11 Prequal — Cursor Bundle (SAFE, Wizard-First)

**Date:** 2025-10-09  
**Goal:** Fix the 5 critical gaps identified in Phase 11 without risking regressions to the **crown‑jewel wizard**.  
**Approach:** Small, gated additions; no invasive edits. If a patch rejects, copy files from `snippets/` as-is.

## What this bundle targets (Issue → Fix)

1) **Wrong preview title** → Dynamic title map by docType (`PreviewTitle.tsx`) and a drop-in `Step5PreviewFixed.tsx` that reads docType safely.  
2) **Preview not using templates** → Default: **Embed the actual PDF** in the preview (Option B). Optional server-side preview endpoint provided but **feature-flagged OFF**.  
3) **No DB persistence after generation** → Two‑stage flow: *Generate → Finalize & Save*. Adds `saveDeedMetadata()` and `POST /api/deeds/create` proxy.  
4) **No “Finalize” step/state** → Adds a clear Finalize button, success message, redirect to Past Deeds, and draft clear.  
5) **SiteX enrichment not populating wizard** → Adds a `prefillFromEnrichment()` utility and sample wiring hook (non-invasive, can be called from your property step).

These align directly with the Phase 11 findings. See the source doc for context.

## Safety rails

- **No changes** to your PDF engine or Grant Deed templates.  
- All changes are **front-end wrappers** or **feature-flagged**.  
- Backend preview endpoint is **optional** and off by default to avoid load/complexity.

## Install (Cursor Tasks)
Open the **Tasks** panel and run:
1. **P11: Apply Frontend Patches**  
2. **P11: Apply Backend Patches (optional)**  
3. **P11: Dev (FE+BE)**  
4. **P11: Smoke (Prequal)**

If a patch writes `*.rej`, copy the matching file from `snippets/` into your repo path and re-run the task.

## Where files go (relative to repo root)

- Frontend
  - `snippets/frontend/src/features/wizard/steps/Step5PreviewFixed.tsx` → `frontend/src/features/wizard/steps/Step5PreviewFixed.tsx`
  - `snippets/frontend/src/features/wizard/components/PreviewTitle.tsx` → `frontend/src/features/wizard/components/PreviewTitle.tsx`
  - `snippets/frontend/src/features/wizard/services/deeds.ts` → `frontend/src/features/wizard/services/deeds.ts`
  - `snippets/frontend/src/features/wizard/services/propertyPrefill.ts` → `frontend/src/features/wizard/services/propertyPrefill.ts`
  - `snippets/frontend/src/features/wizard/lib/featureFlags.ts` → `frontend/src/features/wizard/lib/featureFlags.ts`
  - `snippets/frontend/src/app/api/deeds/create/route.ts` → `frontend/src/app/api/deeds/create/route.ts`

- Backend (optional server-side preview)
  - `snippets/backend/routers/preview.py` → `backend/routers/preview.py`
  - Then mount in `backend/main.py`: `app.include_router(preview.router, prefix="/api/generate")` behind env flag.

## Minimal wiring (frontend)

- In your wizard step registry/router, replace the Step 5 component import with:  
  `import Step5PreviewFixed from '@/features/wizard/steps/Step5PreviewFixed'`
- On your property step success handler, call:  
  `prefillFromEnrichment(verifiedData, storeUpdater)`

## Environment flags

- `NEXT_PUBLIC_WIZARD_EMBED_PDF_PREVIEW=true` (default: true) — use **embedded PDF** for preview.  
- `NEXT_PUBLIC_WIZARD_REQUIRE_FINALIZE=true` (default: true) — enforce two-stage finalize.  
- `NEXT_PUBLIC_SITEX_ENABLED=true` or `NEXT_PUBLIC_TITLEPOINT_ENABLED=true` — ensure enrichment runs.  
- `SERVER_SIDE_PREVIEW_ENABLED=false` — keep server-side preview **OFF** unless you opt in.

## Test checklist (staging gate)

- Generate each deed type → Preview shows **correct title**, embeds **actual PDF**, and **Finalize** saves to DB.  
- Dashboard/Past/Shared Deeds reflect the new record (no mocks).  
- Enrichment pre-fills APN, county, owners, legal description.  
- No changes to Grant Deed templates or PDF engine paths.
