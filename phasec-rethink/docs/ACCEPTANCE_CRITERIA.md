# Acceptance Criteria — Modern Wizard V0

**Guardrails**
- No regression in SiteX enrichment, canonical adapters, finalizeDeed invocation.
- LocalStorage draft flows unchanged (keys, shape).
- PDF generation success rate == 100% across 5 deed types.

**UX**
- Keyboard‑navigable. Focus ring visible. Labels mapped to inputs.
- Mobile: forms are single‑column with comfortable spacing; tables scroll horizontally.
- Progress reflects actual step index (±1%).

**Perf & Accessibility**
- LCP < 2.5s on wizard entry.
- No console errors; Lighthouse A11y ≥ 95 on the wizard route.
- Reduced‑motion users see no animated transitions.

**Metrics (monitoring)**
- Completion rate (start → PDF) does not drop vs baseline.
- Time‑to‑complete within ±10% of baseline; ideally lower.
