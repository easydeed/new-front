# DeedPro – Canonical V6 (Cursor-ready)

**Mission:** Repair the **canonical** Modern flow end-to-end without touching Classic, and make it resilient across **all deed types**. This package consolidates finalize, locks the SmartReview import, fixes the Legal prompt `showIf`, enforces **Preview validate-before-generate**, and adds robust guards + traceability.

## Why this solves the root cause (not a band‑aid)
Your forensic + master analyses pin the failure on **divergent finalization paths**, **wrong SmartReview import** and a **missing/fragile canonical step**—not just a missing question. Canonical V6 puts **one** finalize path back in charge, protects it against stale closures, and prevents **blank deeds** at both the **frontend** and **backend** edge (via `source: 'modern-canonical'`). fileciteturn0file1 fileciteturn0file2

## What’s included
- **finalizeDeed v6** (`frontend/src/lib/deeds/finalizeDeed.ts`): single source of truth with:
  - Canonical → snake_case mapping
  - **Rescue mapping** from Modern state/localStorage for grantor/grantee/legal
  - **No-blank-deed guard** + actionable alert
  - **Trace headers** (`x-client-flow`, `x-ui-component`, `x-build-sha`)
  - `source: 'modern-canonical'` tag for server‑side guardrails
- **ModernEngine patch**: imports **`../review/SmartReview`**, passes `onConfirm={onNext}`, uses **ref‑safe** fallback event, calls `toCanonicalFor(docType, state)` and then `finalizeDeed(canonical, { docType, state, mode })` with clear green logs.
- **Canonical adapter entry** (`frontend/src/lib/canonical/toCanonicalFor.ts`) if you lack a single entry point.
- **Legal prompt fix**: ensures “Not available” triggers the question.
- **Preview guard**: validates deed completeness **before** any `/api/generate/*`, retries **3× on 5xx only**—aligns to the handoff contract. fileciteturn0file3
- **Consolidation re‑exports**: any legacy imports of finalizeDeed now resolve to v6.
- **Verify script** + **CI guard** so this can’t regress silently.

## Apply (inside Cursor)
```bash
git checkout -b fix/canonical-v6
# Import this folder to repo root (drag/drop or “Import files”)
node deedpro_canonical_v6/scripts/apply_canonical_v6.mjs .
npm run typecheck && npm run build
node deedpro_canonical_v6/scripts/verify_canonical_v6.mjs .
bash deedpro_canonical_v6/scripts/ci_guard_v6.sh .
git add -A
git commit -m "feat(modern): Canonical V6 — single finalize path, legal prompt fix, preview gate, guards + trace"
git push -u origin fix/canonical-v6
```

## Expected runtime trace (success case)
1) **SmartReview** shows all answers (Modern UX intact).  
2) Click Confirm → Console shows  
   - `[ModernEngine.onNext] 🟢 FINAL STEP - Starting finalization`  
   - `[ModernEngine.onNext] 🟢 Canonical payload created: …`  
   - `[finalizeDeed v6] Canonical payload received: …`  
   - `[finalizeDeed v6] Backend payload (pre-check): …`  
   - `[finalizeDeed v6] Success! Deed ID: …`
3) **Network**: single `POST /api/deeds/create` (snake_case, `source: 'modern-canonical'`).  
4) **Preview**: fetches deed → validates → generates (3× 5xx retry only) → ✅.

## What if something still fails?
- The v6 guard **blocks** creating a blank deed and sends the user back to review with a clear alert.  
- Use DevTools to confirm the green logs above. If `[finalizeDeed]` logs **do not appear**, a rogue path exists—run the verify script. This directly targets deviations called out in your analysis docs (wrong import, duplicate finalize, preview without gate). fileciteturn0file0 fileciteturn0file1

## Back-end hardening (optional but recommended)
Reject any create with `source == 'modern-canonical'` when `grantor_name/grantee_name/legal_description` are missing (422). This permanently prevents blank deeds even if a client regresses. Handoff recap already envisions this preview/validation model. fileciteturn0file3

## Why this holds for **all deed types**
- The **single canonical entry** and **single finalize** eliminate path drift for grant/quitclaim/interspousal/warranty/tax deed adapters.  
- The legal prompt fix removes a common “silent skip.”  
- The preview gate is deed‑agnostic and blocks 400 loops system‑wide.  
- CI/verify stop side‑effects from sneaking back in.

## References to your documents
- Modern Wizard comprehensive analysis & alternatives — **root causes & options**. fileciteturn0file0
- 2‑week forensic — **wrong SmartReview import, duplicate finalize**. fileciteturn0file1
- Master failure analysis — **finalizeDeed logs never appeared; blank deeds created**. fileciteturn0file2
- Handoff recap — **Preview validate‑before‑generate; mode guardrails**. fileciteturn0file3
