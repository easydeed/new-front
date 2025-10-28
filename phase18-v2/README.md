# Phase 17 – All Deed Types (Bulletproof v2)

**What’s inside**  
- `scripts/apply_phase17_all_deeds_v2.mjs` – *Safe, idempotent* applier (models + templates).  
- `scripts/verify_phase17_all_deeds_v2.mjs` – Verifies models/templates/adapters; optional build check.  
- `scripts/rollback_phase17_v2.mjs` – Restores every `*.bak.v17` backup.  
- `scripts/report_adapters_v2.mjs` – Reports adapter coverage for `requestedBy` → backend flow (no auto‑patch by default).  
- `adapters/manual_adapter_checklist.md` – Hand‑tuned checklist + snippets if any adapter still misses `requestedBy`.

**Why v2?**  
This release addresses the Systems Architect review (7/10) by fixing:  
1) Folder/tooling naming confusion, 2) overly aggressive template injection, 3) fragile model import edits,  
4) naive adapter patching, 5) missing rollback, 6) verify not running a real build.

## Quickstart (Cursor / local)

```bash
# 0) New branch
git checkout -b fix/phase17-all-deeds-bulletproof-v2

# 1) Apply (safe, idempotent)
node deedpro_phase17_all_deeds_bulletproof_v2/scripts/apply_phase17_all_deeds_v2.mjs .

# 2) Verify (adds a real build if you want)
#    BUILD_CHECK=1 makes it run `npm run -s build` from repo root
BUILD_CHECK=1 node deedpro_phase17_all_deeds_bulletproof_v2/scripts/verify_phase17_all_deeds_v2.mjs .

# 3) Commit
git add -A
git commit -m "feat(phase17): Bulletproof v2 — requested_by across all deed types; safe templates; verify+rollback"

# 4) Push & open PR
git push -u origin fix/phase17-all-deeds-bulletproof-v2
```

## What it changes (safe & additive)

- **Backend models** (Quitclaim, Interspousal, Warranty, Tax): Adds  
  `requested_by: Optional[str] = Field(default="", description="Recording requester")`
- **Templates** (same deed set): Ensures a header block renders  
  `RECORDING REQUESTED BY: { requested_by or title_company or "" }`  
  with **non-destructive insertion** right after `<body>` if the string is absent anywhere in the file.
- **Adapters**: *No auto‑mutation by default.* We **report** coverage and provide exact, copy‑paste patches when/where needed.

Backups are written as `*.bak.v17` before any file mutation.

## Notes
- Dry‑run: `DRY_RUN=1 node ...apply_phase17_all_deeds_v2.mjs .`
- Strict mode: `STRICT=1` causes apply to **fail** if any target template lacks `<body>`.
- Auto‑adapter mode (opt‑in): `AUTO_ADAPT=1` lets `report_adapters_v2.mjs` attempt a conservative patch (only when a specific finalize function is matched).
