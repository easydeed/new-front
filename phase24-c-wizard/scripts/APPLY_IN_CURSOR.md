# Apply in Cursor (5–10 minutes)

1) **Create route group layout** for wizard pages:
   - Copy `/src/app/(v0-wizard)/layout.tsx` into your app under `src/app/(v0-wizard)/`
   - Move modern/classic wizard routes **inside** this group or wrap via a parent layout that sets `data-v0-page data-v0-wizard`.

2) **Add feature flags**:
   - Open `frontend/src/config/featureFlags.ts`
   - Apply `patches/featureFlags.example.patch` or add constants manually

3) **Scope main CSS** (preferred):
   - Open `frontend/src/app/vibrancy-boost.css`
   - Apply `patches/vibrancy-boost.scope.patch`

   If you can’t modify vibrancy yet, import `/src/app/(v0-wizard)/nuclear-reset.css` in the route group layout.

4) **Wire telemetry**:
   - Copy `/src/lib/analytics/wizardEvents.ts` and call `trackWizardEvent()` from your wizard engine(s)

5) **Integrate components one‑by‑one** (behind flags):
   - `ProgressIndicatorV0` → `StepCardV0` → `Form inputs` → `PropertySearchV0` → `SmartReviewV0`

6) **Use V0 prompts**:
   - Open files under `/prompts`, paste your real TSX where indicated, get a styled version back, drop it into `src/components/wizard/ui/*V0.tsx`

7) **Verify**:
   - Run `scripts/verify.sh` to check for flag presence, layout tag, and files
