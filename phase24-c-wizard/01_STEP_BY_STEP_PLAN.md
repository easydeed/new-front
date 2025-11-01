# Phase 24‑C • Step‑by‑Step Plan (Wizard UI, 10/10)

## 0) Principles (don’t break these)
- **Logic is sacred**: No changes to Google Places, SiteX hydration, canonical adapters, or `finalizeDeed`—UI only.
- **Atomic upgrades**: Replace visuals one component at a time, behind feature flags.
- **Isolation first**: Scope main “vibrancy” CSS away from Wizard; if unavailable, use `nuclear-reset.css`.
- **Telemetry**: Track every step/edge case to catch regressions early.
- **Rollback within 60 seconds**: Flags + single‑file reverts.

## 1) Prepare (15 min)
1. Create a **route group layout** to tag wizard pages with `data-v0-page data-v0-wizard` (file included).
2. Add **feature flags** (example patch provided):
   - `NEW_WIZARD_MODERN`, `NEW_WIZARD_CLASSIC`, `WIZARD_UI_KILLSWITCH`.
3. Scope `vibrancy-boost.css` to `body:not([data-v0-page])` (patch provided). If you can’t, import `nuclear-reset.css` in the v0 layout.

## 2) Instrument telemetry (10 min)
Add `trackWizardEvent()` calls:
- `Wizard.StepShown`, `Wizard.StepCompleted`, `Wizard.ResumeDraft`, `Wizard.FinalizeAttempt`, `Wizard.Success`, `Wizard.Error`.
Send to `/usage/events` (non‑blocking, fire‑and‑forget).

## 3) Sequence (one at a time; ~30–60 min each)
**Order** (lowest risk → highest):
1) Progress Indicator
2) Step Cards (containers only)
3) Form Inputs (labels, help/error copy, spacing)
4) Property Search UI shell (keep API/event logic exactly as‑is)
5) SmartReview shell (visual grouping only)

For each:
- Generate design with the matching **V0 prompt** in `/prompts` (paste your real TSX inside the prompt where marked).
- Drop V0’s output into the corresponding `*V0.tsx` file here and wire it into your app behind the feature flag.
- Verify (manual + telemetry). Commit before moving on.

## 4) Manual QA checklist per component (5–10 min)
- Mobile breakpoints (320 / 375 / 768 / 1024)
- Keyboard flow + focus ring
- Error and empty states
- Draft resume flow
- SiteX hydration present (property, APN, county, legal description)
- PDF generation path unaffected

## 5) E2E Smoke (15 min)
- Grant Deed: Address → SiteX → Wizard → SmartReview → **PDF**
- Repeat Classic mode
- Telemetry shows events in DB

## 6) Gradual rollout
- Internal: flags OFF by default, devs toggle locally
- Beta: enable `NEW_WIZARD_MODERN` for staff
- 10% → 25% → 50% → 100% over a week with fast rollback

## 7) Rollback
- Flip flag OFF, or set `WIZARD_UI_KILLSWITCH=true` env
- If CSS clash reappears, re‑import `nuclear-reset.css` or revert vibrancy patch
