# Cursor Bundle — Wizard Integration (Part 1 now, Part 2 gated)

> **Purpose:** Integrate the four new deed types into the **same wizard** pattern used by the Grant Deed, reusing Step 1 (Address search/prefill) and adding only the minimal, deed‑specific steps required to satisfy the PDF contexts. **Part 2** (cognitive UI: MicroSummary + SmartReview) is included but **feature‑flagged OFF** by default and MUST NOT be enabled until Part 1 passes staging QA.

## What this bundle installs
- **Flow registry** describing step arrays per deed type (`flows.ts`)
- **Context adapters** mapping wizard store → backend Pydantic contexts (`buildContext.ts`)
- **Doc‑specific steps**: `DTTExemption.tsx`, `Covenants.tsx`, `TaxSaleRef.tsx`
- **Feature flags** (`featureFlags.ts`) with `COGNITIVE_WIZARD_UI=false` by default
- **(Gated) Cognitive UI components** (not wired): `MicroSummary.tsx`, `SmartReview.tsx`
- **Tasks** to apply patches, run dev servers, and smoke test

## One‑time install (Cursor Tasks)
1. Open the **Tasks** panel in Cursor and run:
   - **Wizard: Apply Frontend Patches**
   - **Wizard: Dev (FE+BE)**
   - **Wizard: Smoke (Flows)**
2. If any patch shows `*.rej`, copy the corresponding file manually from `snippets/` to your repo path and re‑run the task.

## Where files go (relative to your repo root)
- `snippets/frontend/src/features/wizard/flows.ts` → `frontend/src/features/wizard/flows.ts`
- `snippets/frontend/src/features/wizard/context/buildContext.ts` → `frontend/src/features/wizard/context/buildContext.ts`
- `snippets/frontend/src/features/wizard/steps/{DTTExemption,Covenants,TaxSaleRef}.tsx` → `frontend/src/features/wizard/steps/`
- `snippets/frontend/src/features/wizard/components/{MicroSummary,SmartReview}.tsx` → `frontend/src/features/wizard/components/` (Part 2 only)
- `snippets/frontend/src/config/featureFlags.ts` → `frontend/src/config/featureFlags.ts`
- `snippets/frontend/src/features/wizard/lib/download.ts` → `frontend/src/features/wizard/lib/download.ts`

> If your repo uses different paths for the wizard store or step files, adjust imports marked with `// TODO: adjust import path`.

## Part 1 — Integrate flows & adapters (DO NOW)
1. **Wire flow registry**: Import `flows` in your wizard container and select the step list based on the chosen `docType`:
   ```ts
   import { flows, type DocType } from '@/features/wizard/flows';
   const steps = flows[currentDocType as DocType];
   ```
2. **Add doc‑specific steps**: Register components for `DTTExemption`, `Covenants`, and `TaxSaleRef` in your existing step switch/router.
3. **Address Step (unchanged)**: Keep Step 1 logic and ensure it posts to `/api/property/validate` then `/api/property/enrich`; store normalized address, APN, county.
4. **Context adapters**: On Generate, build the payload via `toQuitclaimContext`, `toInterspousalContext`, `toWarrantyContext`, or `toTaxDeedContext` and call your **existing** streaming proxy endpoints (e.g., `/api/generate/quitclaim-deed-ca`). Use `download()` helper to save the PDF.
5. **Persistence & dashboard**: After success, persist deed metadata and refresh Dashboard/Past/Shared Deeds. Remove any mocks; rely on backend endpoints.
6. **QA Gate (staging)**: Run a full happy path for each deed: Address → Parties → doc‑specific step(s) → Vesting/Notary → Generate → Dashboard visibility.

## Part 2 — Cognitive UI (DO LATER; feature‑flagged)
- Keep `COGNITIVE_WIZARD_UI=false`. When ready:
  1) Render `<MicroSummary/>` under the wizard header on each step.
  2) Replace the raw review step with `<SmartReview/>` that generates readable summaries + “Edit” chips.
  3) Track abandon rate, edits, and PDF reject/fix rate.

## Rollback
- Remove any imports of the new steps and delete the copied files. No backend changes are required for this bundle.

## Commands (if you prefer terminal over Tasks)
```bash
bash scripts/wizard_apply_frontend.sh
bash scripts/dev_all.sh
bash scripts/smoke_flows.sh http://localhost:3000
```
