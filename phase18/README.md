# Phase 17 — All Deed Types (Bulletproof v1)
Apply the proven Phase 16 Grant Deed fixes to **Quitclaim, Interspousal Transfer, Warranty, Tax Deed**.

## What this package does
1) **Backend Pydantic models** — Adds `requested_by: Optional[str] = Field(default="", description="Recording requester")` to each deed model (quitclaim/interspousal/warranty/tax). Additive & backward‑compatible.
2) **PDF templates** — Ensures each deed’s header renders: `RECORDING REQUESTED BY: {{ requested_by or title_company or "" }}`.
3) **Frontend adapters (best‑effort)** — Ensures `requestedBy` is passed to the finalize layer for all non‑grant deeds. If an adapter is absent or already correct, we skip.
4) **Does NOT touch Grant Deed** (already fixed in Phase 16).

## Apply (in Cursor)
```bash
git checkout -b fix/phase17-all-deeds-bulletproof-v1

node deedpro_phase17_all_deeds_bulletproof_v1/scripts/apply_phase17_all_deeds_v1.mjs .

# Optional: run verification + real build
BUILD_CHECK=1 node deedpro_phase17_all_deeds_bulletproof_v1/scripts/verify_phase17_all_deeds_v1.mjs .

git add -A
git commit -m "feat(phase17): Bulletproof v1 — requested_by across all deed types + template headers"
git push -u origin fix/phase17-all-deeds-bulletproof-v1
```

## Files this may modify (only if present)
**Backend:**
- backend/models/quitclaim_deed.py
- backend/models/interspousal_transfer.py
- backend/models/warranty_deed.py
- backend/models/tax_deed.py

**PDF Templates (Jinja2/HTML):**
- templates/quitclaim_deed_ca/index.jinja2 (or .html)
- templates/interspousal_transfer_ca/index.jinja2 (or .html)
- templates/warranty_deed_ca/index.jinja2 (or .html)
- templates/tax_deed_ca/index.jinja2 (or .html)

**Frontend (best‑effort adapters):**
- frontend/src/utils/canonicalAdapters/quitclaim.ts
- frontend/src/utils/canonicalAdapters/interspousal.ts
- frontend/src/utils/canonicalAdapters/warranty.ts
- frontend/src/utils/canonicalAdapters/taxDeed.ts
- (fallback) frontend/src/features/wizard/**/canonicalAdapters/*.ts
- (fallback) frontend/src/features/wizard/**/adapters/*.ts

## Smoke tests (per deed type)
1) Partners dropdown loads and can select (or type free text).
2) Legal description is present (hydrated) and remains visible throughout flow.
3) PDF shows header line: **RECORDING REQUESTED BY: [value]**.

## Rollback
Each modified file is backed up as `*.bak.v17`. Restore by moving the backup over the patched file.
