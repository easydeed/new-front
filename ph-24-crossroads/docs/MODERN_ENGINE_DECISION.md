# Modern Engine Crossroads — Decision Note

**Goal:** Use V0 for **visuals** while keeping our validated **ModernEngine v6** logic intact.

## Decision
- **Adopt “UI‑only” replacement** for wizard components (cards, inputs, progress, review).
- **Do not** alter canonical adapters, SiteX hydration, finalizeDeed, or PDF flow.
- **Why:** The existing Modern wizard (v6) is battle‑tested end‑to‑end (address → SiteX → SmartReview → PDF). Risk is in visuals, not logic.

## Implementation
- Wrap V0 wizard pages in the `(v0)` layout to mark `<body data-v0-page>`.
- Replace only component markup/classes (Tailwind), keep props, handlers, and state wiring.
- Keep localStorage draft and the `Resume Draft` banner.

## Outcomes
- Zero regression risk to generation and PDFs
- Clean, modern visuals from V0
- Easy rollback via feature flags
