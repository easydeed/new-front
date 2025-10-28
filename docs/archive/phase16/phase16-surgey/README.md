# Phase 16 — Final Mile v8.2 (Cursor‑ready)
**Purpose:** Land the three remaining issues with conservative, idempotent patches and strong diagnostics.

## What this package does
1) **Legal Description hydration (once, safely).** Ensures the Modern wizard backfills `state.legalDescription` from `verifiedData.legalDescription` (or `formData`) after hydration **without clobbering** a user edit. Also keeps the previously deployed `legalShowIf()` = `true` behavior intact.
2) **Partners dropdown reliability.** Forces the proxy runtime to **nodejs** (with `dynamic='force-dynamic'`), adds a robust `name → label` transform and production‑diagnostic logs (gated by `NEXT_PUBLIC_DIAG=1`).
3) **PDF “Requested By”.** Hardens mapping so `requested_by` is always set from `state.requestedBy`, with clear diagnostic logs.

## Apply (in Cursor)
```bash
git checkout -b fix/phase16-final-mile-v8-2

# Import this folder to repo root, then:
node deedpro_phase16_final_mile_v8_2/scripts/apply_phase16_final_mile_v8_2.mjs .

# (Recommended) Verify + run a real build:
BUILD_CHECK=1 node deedpro_phase16_final_mile_v8_2/scripts/verify_phase16_final_mile_v8_2.mjs .

git add -A
git commit -m "fix(phase16): Final Mile v8.2 — legal hydration, partners reliability, requested_by hardening"
git push -u origin fix/phase16-final-mile-v8-2
```

## Smoke tests (3 minutes)
1) **Legal Hydration:** After property search, go to Legal Description — it should show the SiteX value (or remain editable). Edit a few chars → step stays visible (we keep `legalShowIf`=true).
2) **Partners:** Open Network tab → `/api/partners/selectlist` returns **200**; console shows `[PARTNERS DIAG]` counts if `NEXT_PUBLIC_DIAG=1`.
3) **Requested By → PDF:** Type “Jane Smith – ABC Title” (don’t select). Finish. Preview → PDF shows **Recording Requested By: Jane Smith – ABC Title**.

## Rollback
The apply script creates `.bak.v8_2` per modified file. Restore by mv'ing the backups back.
