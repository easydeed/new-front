# Part 2 (Feature‑flagged): Cognitive‑Load UI

**Do not enable until Part 1 is stable in staging.**

When ready, set `COGNITIVE_WIZARD_UI=true` and:
1. Render `<MicroSummary/>` below the header on all steps.
2. Replace the raw review step with `<SmartReview/>`.
3. Instrument step abandon rate, Smart Review edits, and PDF reject/fix rate.
4. Keep the PDF path deterministic; this change is UI/UX only.
