# Manual Adapter Checklist (Phase 17 – v2)

Goal: Ensure every non‑grant deed adapter forwards **requestedBy** (camelCase) so `finalizeDeed` can map
to `requested_by` (snake_case). This mirrors Grant Deed’s working path.

## Files to review (typical)
- `frontend/src/utils/canonicalAdapters/quitclaim.ts`
- `frontend/src/utils/canonicalAdapters/interspousal.ts`
- `frontend/src/utils/canonicalAdapters/warranty.ts`
- `frontend/src/utils/canonicalAdapters/taxDeed.ts`

## What to look for
1) The adapter builds a `payload` or `adapted` object to pass to `finalizeDeed(...)`  
2) That object should include:

```ts
requestedBy: canonical?.requestedBy ?? opts?.state?.requestedBy ?? '',
```

3) Nothing else needed—`finalizeDeed` already maps:
```ts
requested_by: state?.requestedBy || canonical?.requestedBy || '',
```
(Phase 16 change that is universal across deed types.)

## Safe patch (copy/paste)
Insert inside the adapter’s payload object:

```ts
// Phase17 v2 — ensure requestedBy flows through
requestedBy: canonical?.requestedBy ?? opts?.state?.requestedBy ?? '',
```

> If you’re unsure where the payload object is, run:
> 
> ```bash
> node deedpro_phase17_all_deeds_bulletproof_v2/scripts/report_adapters_v2.mjs .
> ```
> 
> It will list any adapters missing `requestedBy` and print the snippet above.
