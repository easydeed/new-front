# Phase 19 — Classic Wizard Bulletproof (Cursor‑Ready Package)

This package brings **Classic** into parity with your Modern fixes **without touching Modern**. It is **additive and reversible** (creates `.bak.p19` backups) and ships with **apply / verify / rollback**.

## What’s included
- **Node runtime partners proxy**: forwards `Authorization`/`X-Organization-Id` (or uses env fallbacks) to your upstream partners service.
- **Classic-friendly partners UI**: `PartnersInput.tsx` + `usePartnersList.ts` with typed value propagation.
- **Template normalization**: Inserts the **RECORDING REQUESTED BY** header into deed templates that are missing it.
- **Optional Prefill safety**: If Classic reuses `PrefillCombo`, ensures `onChange(newValue)` propagates typed values.
- **Backups + Ops log**: `*.bak.p19` and `phase19_ops.log.json` for clean rollback.

## Prereqs
- Node 18+
- Next.js App Router on the frontend
- Backend templates are Jinja/HTML under `backend/templates/` (adjustable in config).

## Setup (Cursor tasks)
1. **Install deps**
   ```bash
   cd phase19-classic-bulletproof
   npm i
   ```
2. **Configure paths** in `p19.config.json` if your repo layout differs.
3. **Environment**
   - Add to your frontend environment (Vercel/locally via `.env.local`):
     ```env
     PARTNERS_URL=https://your-upstream.example.com/api/partners
     PARTNERS_BEARER=REDACTED_SERVICE_TOKEN   # optional fallback if client lacks Authorization
     PARTNERS_ORG_ID=your-org-id              # optional fallback
     NEXT_PUBLIC_DIAG=1                       # optional diagnostics
     ```
4. **Apply changes**
   ```bash
   node scripts/apply.mjs
   ```
5. **Verify**
   ```bash
   node scripts/verify.mjs
   ```
6. **Commit**
   ```bash
   git add -A && git commit -m "Phase19: Classic parity (partners proxy, requested_by header, typed propagation)"
   ```
7. **Rollback (if needed)**
   ```bash
   node scripts/rollback.mjs
   ```

## What gets written (defaults in `p19.config.json`)
- `frontend/src/app/api/partners/selectlist/route.ts`
- `frontend/src/components/classic/PartnersInput.tsx`
- `frontend/src/hooks/usePartnersList.ts`
- Template header insertion across: `backend/templates/**/*.{html,jinja,jinja2}`
- Optional `PrefillCombo.tsx` patch at: `frontend/src/components/common/PrefillCombo.tsx`

## Notes
- The proxy is **Node runtime** and `force-dynamic`, robust to empty/failed upstreams.
- The UI is **free-type first** (typed text always persists) with optional suggestions from partners list.
- Template insertion runs only if header is missing and a `<body>` tag is present.

---

### Appendix: What this implements from the Phase 19 brief
- Node runtime proxy with label normalization and org/authorization passthrough.
- Typed value propagation (`onChange(newValue)` on every keystroke).
- Template header normalization:
  ```html
  <div><strong>RECORDING REQUESTED BY:</strong> {{ requested_by or title_company or "" }}</div>
  ```
- Idempotent scripts with backups and drift‑aware verify.
