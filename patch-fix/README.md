# DeedPro – SmartReview ➜ ModernEngine Finalization Fix (Cursor-ready v2)

This package centralizes finalization in **ModernEngine** and converts **all SmartReview variants** into presentational components. It also tags backend payloads with `source: 'modern'` for optional server-side guardrails.

## Apply (inside Cursor terminal)
```bash
git checkout -b fix/smartreview-engine-finalize
# Node (cross-platform)
node deedpro_smartreview_fix_v2/scripts/apply_deedpro_smartreview_fix.mjs .
# or Bash (macOS/Linux)
bash deedpro_smartreview_fix_v2/scripts/apply_deedpro_smartreview_fix.sh .
```

## Verify
```bash
node deedpro_smartreview_fix_v2/scripts/verify_fix.mjs .
# or
bash deedpro_smartreview_fix_v2/scripts/verify_fix.sh .
```

## Build & Commit
```bash
npm run typecheck && npm run build
git add -A
git commit -m "fix(wizard): centralize finalize via ModernEngine; make SmartReview presentational; tag source=modern"
git push -u origin fix/smartreview-engine-finalize
```

## Files this will overwrite
- frontend/src/features/wizard/mode/review/SmartReview.tsx
- frontend/src/features/wizard/mode/components/SmartReview.tsx
- frontend/src/features/wizard/mode/engines/steps/SmartReview.tsx

## What the scripts will edit
- frontend/src/features/wizard/mode/engines/ModernEngine.tsx — adds a listener for `smartreview:confirm` that calls `onNext()`
- frontend/src/lib/deeds/finalizeDeed.ts — ensures `source: 'modern'` is included in the backend payload

## Why this fixes the issue
It removes legacy SmartReview finalize logic that bypassed `ModernEngine.onNext()` and posted a skinny payload to `/api/deeds`, producing deeds without `grantor_name`, `grantee_name`, or `legal_description`. The centralized engine path runs `finalizeDeed()` (canonical → snake_case) and preserves `/deeds/:id/preview?mode=modern`.
