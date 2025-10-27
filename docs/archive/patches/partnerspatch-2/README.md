# DeedPro — Stability & Diagnostics v7.1 (Cursor‑ready)

**Fixes & Diagnostics**
1) **Legal Description**: no more disappearing while typing — `shouldShowLegal(state)` centralizes logic and keeps the step visible while the user is editing and until the value is *meaningfully* updated.  
2) **Partners list (403/empty)**: proxy + context emit clear diagnostics (toggle with `NEXT_PUBLIC_DIAG=1`), forward `Authorization` + `x-organization-id` correctly.  
3) **Typed values → PDF**: `PrefillCombo` now propagates on every keystroke **and** flushes on blur; this prevents the “I typed but it didn’t save” scenario.

## Apply (inside Cursor)
```bash
git checkout -b fix/stability-diag-v7-1
# Import this folder to your repo root (drag/drop or “Import files”)
node deedpro_stability_diag_v7_1/scripts/apply_stability_diag_v7_1.mjs .
# Optional: enable rich console logs
echo "NEXT_PUBLIC_DIAG=1" >> .env.local
npm run build
node deedpro_stability_diag_v7_1/scripts/verify_stability_diag_v7_1.mjs .
git add -A
git commit -m "chore: Stability & Diagnostics v7.1 — legal showIf helper, partners diagnostics, PrefillCombo flush"
git push -u origin fix/stability-diag-v7-1
```

## What changed (files)
- `frontend/src/lib/diag/log.ts` — gated console logger.
- `frontend/src/app/api/partners/selectlist/route.ts` — auth‑aware proxy with diagnostics.
- `frontend/src/features/partners/PartnersContext.tsx` — robust loader + logs.
- `frontend/src/lib/wizard/legalShowIf.ts` — central showIf helper (keeps step visible while editing).
- `frontend/src/features/wizard/mode/components/PrefillCombo.tsx` — onChange propagation + onBlur flush + focus/blur hooks.
- `scripts/apply_stability_diag_v7_1.mjs` · `scripts/verify_stability_diag_v7_1.mjs`

## Minimal wiring
- Ensure your wizard page/layout wraps the tree with `<PartnersProvider>` from `@/features/partners/PartnersContext`.
- The apply script tries to wire `usePartners()` and the `PrefillCombo` props in `ModernEngine.tsx` automatically. If your engine renders the field differently, wire these props where the **Requested By** and **Legal Description** inputs are rendered.

## Smoke tests (copy/paste checklist)
1) **Partners list**  
   - Open console (F12). With `NEXT_PUBLIC_DIAG=1`, you should see:  
     `[PartnersContext] Loading partners… { hasToken: true, hasOrgId: true }` and a response status.  
   - Network → `/api/partners/selectlist` → **200** and a JSON array (or `options` field).

2) **Type (do not select)** — Requested By / Grantor  
   - Type “Jane Smith – ABC Title”, click **Next** (do not select from dropdown).  
   - Finish flow; Preview/PDF must show the value. This extends the Phase‑16.2 PrefillCombo fix and hardens it with onBlur flush.  

3) **Legal Description**  
   - If it pre‑fills as *Not available*, the step **stays visible**.  
   - Start typing → the step **stays visible while editing**, and only hides after the entry is ≥12 chars and not “Not available”.  
   - With diagnostics on, your console will show partners and network proxy logs for quick triage.

## Notes
- If partners still don’t load: confirm `BACKEND_BASE_URL` or `NEXT_PUBLIC_BACKEND_BASE_URL` is set in `.env.local` for the proxy route.
- If your codebase has multiple copies of `promptFlows.ts` or `PrefillCombo.tsx`, run the verify script and replace stragglers accordingly.

— Stability & Diagnostics v7.1
