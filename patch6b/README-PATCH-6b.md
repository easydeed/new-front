
# Patch 6b — Zod Validation for All Deed Types (Modern Wizard)

**Goal:** Extend Patch 6 (Grant Deed schema) to **all** deed types with a single, centralized Zod validation layer used by the Modern wizard before finalize — ensuring 100% compatibility with our backend PDF engine.

**What’s included**
- `frontend/src/features/wizard/validation/zod/shared.ts` — common helpers & docType normalization
- `frontend/src/features/wizard/validation/zod/grant-deed.ts` — Grant Deed schema (kept for completeness)
- `frontend/src/features/wizard/validation/zod/quitclaim-deed.ts` — Quitclaim schema
- `frontend/src/features/wizard/validation/zod/interspousal-transfer.ts` — Interspousal Transfer schema
- `frontend/src/features/wizard/validation/zod/warranty-deed.ts` — Warranty Deed schema
- `frontend/src/features/wizard/validation/zod/tax-deed.ts` — Tax Deed schema
- `frontend/src/features/wizard/validation/zod/index.ts` — Registry + `getDeedSchemaFor()` + `validateDeed()`
- `frontend/src/features/wizard/validation/useDeedValidator.ts` — small hook used by `SmartReview`
- `scripts/patch6b-verify.mjs` — quick smoke validation runner (optional)

## ✳️ Compatibility

- Accepts *either* hyphen or underscore formats and normalizes internally (e.g., `quitclaim`, `quitclaim_deed`, `quitclaim-deed`).
- Mirrors backend expectations for required fields: `propertyAddress`, `apn`, `county`, `legalDescription`, plus `grantorName` and `granteeName` (or their `parties.*.name` equivalents).
- Non-breaking: schemas are purely additive and live under the same folder used in Patch 6.

## 🧩 Cursor Instructions (apply in repo root)

1. **Create a branch**
   ```bash
   git checkout -b patch/6b-zod-other-deeds
   ```

2. **Add/replace files**
   Copy the `frontend/src/features/wizard/validation/zod/*` and `frontend/src/features/wizard/validation/useDeedValidator.ts` from this package into your repo.

3. **Wire up SmartReview (Modern finalize)**
   In `frontend/src/features/wizard/mode/components/SmartReview.tsx` (or equivalent), replace the existing validation import with:
   ```ts
   import { useDeedValidator } from "@/features/wizard/validation/useDeedValidator";
   ```
   And in the component:
   ```ts
   const { validate } = useDeedValidator(docType);
   const onConfirm = async () => {
     const result = validate(currentState);
     if (!result.success) {
       // Render result.errors (array of { path, message })
       setFormErrors(result.errors);
       return;
     }
     // proceed with finalizeDeed(...)
   };
   ```

4. **Run a quick smoke**
   ```bash
   node scripts/patch6b-verify.mjs
   ```

5. **Commit & push**
   ```bash
   git add frontend/src/features/wizard/validation scripts/patch6b-verify.mjs
   git commit -m "Patch 6b: Zod validation for Quitclaim, Interspousal Transfer, Warranty, Tax deeds"
   git push origin patch/6b-zod-other-deeds
   ```

## ✅ Success criteria

- Modern wizard refuses to finalize until **all required fields** are present for the selected deed type.
- Finalization now succeeds for **Grant, Quitclaim, Interspousal, Warranty, Tax** deeds.
- No redirects back to Classic due to validation mismatches.
