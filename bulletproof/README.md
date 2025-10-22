# DeedPro – Bulletproof Fix Package (v4)

This Cursor-ready bundle combines the original fixes **plus additional hardening** to make the Modern wizard
finalization path robust and observable.

## What it does
- **SmartReview → presentational only** (no fetch/redirect). Works even if the wrong variant is rendered.
- **ModernEngine owns finalization**: passes **`onConfirm={onNext}`** and provides a **ref-safe** fallback
  event listener (`smartreview:confirm`) that cannot capture stale state.
- **Consolidates finalizeDeed**: `services/finalizeDeed.ts` and `mode/bridge/finalizeDeed.ts` now **re-export**
  from the single source of truth `@/lib/deeds/finalizeDeed`.
- **Guards blank deeds** in `finalizeDeed.ts` with `assertPayloadComplete(...)` and tags payload with `source: 'modern'`.
- **Adds trace headers** to deed creation requests: `x-client-flow`, `x-ui-component`, `x-build-sha`.
- **Optional Preview guard** script that injects validate-before-generate + capped 5xx retry on the preview page.
- **ESLint rule + CI guard** to prevent regressions.

## Apply (inside Cursor terminal)
```bash
git checkout -b fix/deedpro-bulletproof-v4
node deedpro_bulletproof_v4/scripts/apply_bulletproof_v4.mjs .
npm run typecheck && npm run build
node deedpro_bulletproof_v4/scripts/verify_bulletproof_v4.mjs .
# (optional) Add preview guard
node deedpro_bulletproof_v4/scripts/apply_preview_guard_v4.mjs .
# Run CI guard locally
bash deedpro_bulletproof_v4/scripts/ci_guard.sh .
git add -A
git commit -m "bulletproof: centralize finalize, ref-safe event bridge, guard finalizeDeed, trace headers, re-exports"
git push -u origin fix/deedpro-bulletproof-v4
```

## Optional: ESLint hardening
Copy `eslint/` folder into your repo and **extend** your root `.eslintrc.{js,cjs}` with:
```js
// .eslintrc.cjs
module.exports = {
  // ... your existing config
  overrides: [
    // (keep existing overrides)
  ],
  extends: [
    // ...your existing extends
    require.resolve('./eslint/.eslintrc.deedpro.cjs')
  ]
};
```

## Optional: Backend guard
See `backend/snippets/deed_creation_guard.py` for a FastAPI example that rejects Modern requests
missing `grantor_name`, `grantee_name`, or `legal_description` with 422.

## Sanity checks (should match your forensic docs)
- Only **one** POST to `/api/deeds/create` from `finalizeDeed.ts` with complete snake_case payload.
- Redirect to `/deeds/:id/preview?mode=modern`.
- Preview validates first, then generates with **max 3 retries** on 5xx only.
- Console shows `[finalizeDeed] Canonical payload received:` with **non-empty** grantor/grantee/legal_description.

## Source-of-truth alignment
- Fixes & guardrails match your MASTER_FAILURE_ANALYSIS and Forensic write-up, and preserve the Handoff contract
  (Preview is the gate; no cross-mode redirects; org-partitioned partners).

— DeedPro Bulletproof v4
