# Patch 6 — Modern Wizard **Validation Gate** (Cursor-ready)

**Goal:** Stop incomplete deeds from being created by the Modern wizard. Add *client-side validation* in `SmartReview`, reuse the same checks on the preview page, and ensure the preview route exists. This patch is drop‑in and backwards‑compatible with your current hydration/store strategy.

> Why this now? Our Phase 15 v5 hotfix fixed the preview page by validating there, but Modern still lets incomplete deeds through and only fails later on preview/generation. This patch moves validation **in front of** finalize so users can’t create bad deeds in the first place. It mirrors the critical steps called out in your docs.


## What’s inside

```
frontend/
  src/features/wizard/validation/
    zodSchemas.ts            # Zod schemas per docType (Grant Deed included; easy to extend)
    adapters.ts              # Canonical builder resilient to current store shapes
    useValidation.ts         # Hook + helpers (field/step/finalize)
    index.ts                 # Barrel export

  src/features/wizard/mode/review/
    SmartReview.tsx          # Replaces SmartReview to gate finalize behind validation

  src/app/deeds/[id]/preview/
    page.tsx                 # Safety net: validates BEFORE generate; shows errors & "Edit" link

scripts/
  patch6-verify.mjs          # Quick static checks to help verify integration
```

**Dependencies**
- `zod` (runtime schema validation)

```bash
# Add dep
npm install zod
```

---

## Why this patch (source of truth)

- Preview page analysis shows Modern creates deeds with missing grantor/grantee/legal description etc., then preview tries to generate and fails; hotfix added validation *there* but not *before finalize*. This patch closes that gap. fileciteturn4file12 fileciteturn4file6
- Your SITEX Prefill gap analysis confirms we now collect and store owner/legalDescription/vesting on the property step; validation should honor those and pre‑fill prompts, not block needlessly. fileciteturn4file19
- Patch deviation analysis shows finalization redirects to a preview route that previously didn’t exist in patches; this bundle includes a working preview page with validation gate to ensure end‑to‑end completeness. fileciteturn4file0

---

## Installation (Cursor instructions)

1) **Apply files**
- Drag‑drop the contents of `frontend/` and `scripts/` into your repo, preserving paths.
- If your repo uses `src/` alias (`@/`), these paths will resolve. If not, adjust the imports noted in comments.

2) **Install deps**
```bash
npm i zod
```

3) **Wire up SmartReview**
- This patch **replaces** your Modern `SmartReview.tsx` (the classic one is untouched).
- If your file lives at a different path, either relocate this file or copy the content into your existing component.

4) **Ensure preview route exists**
- If you already have `app/deeds/[id]/preview/page.tsx` from the v5 hotfix, compare and keep the **validate‑before‑generate** logic. If you don’t, use this one.

5) **Build & run**
```bash
npm run dev
# or
npm run build && npm start
```

6) **Quick self‑check**
```bash
node scripts/patch6-verify.mjs
```

---

## What this does at runtime

1. **Modern SmartReview**
   - Builds a robust *canonical* payload from the shared Zustand store, **including** pre‑filled property/owner/SITEX values.
   - Validates with `zod`. If invalid, shows a clear list of errors + anchor buttons to jump to the right step.
   - **Blocks** `finalizeDeed()` until validation passes. (This was the missing piece called out in the hotfix notes.) fileciteturn4file6

2. **Preview Page (safety net)**
   - If accessed directly (e.g., deep link), it re‑validates the deed and **does not** attempt PDF generation on invalid data. Shows actionable errors with an **Edit** button that preserves `?mode=modern`. fileciteturn4file12

3. **Compatibility**
   - Canonical adapter tolerates current state shapes (`formData.*`, `verifiedData.*`, `grantDeed.*`) matching console evidence from your logs/analysis.
   - Fields specifically flagged as missing in your analysis are included in the schema (legalDescription, requestedBy, titleCompany, escrowNo, titleOrderNo, mailTo, tax fields). fileciteturn4file18

---

## Test plan (copy/paste)

**Scenario A — Incomplete deed should NOT finalize**
1. Start **Modern** Grant Deed.
2. Complete property search (SITEX verified) but leave **Grantor name empty**.
3. Go to Review → **Confirm & Generate**.
4. **Expected**: SmartReview shows validation list (e.g., “Grantor name is required”), finalize is blocked.
5. Click the auto‑scroll “Fix” link → correct the field → return to Review → now confirm succeeds.

**Scenario B — Prefill respected**
1. Start Modern Grant Deed; verify `[PropertyStepBridge]` logs show `legalDescription`, `grantorName`, `vesting` populated. fileciteturn4file19
2. Proceed to prompts: values should be **pre‑filled**; minimal/no errors on Review.
3. Confirm & Generate → land on `/deeds/:id/preview?mode=modern` → PDF generates.

**Scenario C — Direct preview deep link**
1. Navigate to `/deeds/:id/preview?mode=modern` for a deed with missing data.
2. **Expected**: No generation attempt; validation UI with “Edit Deed” button appears. fileciteturn4file7

---

## Notes / Non‑goals

- This patch is **front‑end only** (no DB migrations). Back‑end stays unchanged and remains the source of truth.
- The preview page included here is compatible with your hotfix; if you already have a better version, you can keep yours.
- Import paths are commented where your repo may differ. Adjust once if your base alias isn’t `@/`.

Rock on 🤘 — this closes the last major gap to 100% validation compatibility.
