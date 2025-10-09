# Context & Guardrails

- We are integrating **additional deed types** into the existing wizard while preserving the **deterministic** PDF pipeline (Pydantic → Jinja → WeasyPrint). The Grant Deed wizard remains the **crown jewel** and **must not be modified** except to surface new flows and post‑completion data in dashboard/admin.
- Part 1 focuses on wiring new flows, address prefill, adapters, generation, and persistence into dashboard/admin with **real data** (no mocks). Part 2 (cognitive UI) is gated by a feature flag and must wait until Part 1 passes staging QA.

**Internal references** (for the team):
- Adding new deed types playbook / recap (flows, registry, router expectations).  
- Phase 6‑1 analysis: dashboard shells, wiring gaps, wizard‑first posture.  
- Wizard‑centric plan: surface live wizard data everywhere; defer non‑core.  
- Backend Routes reference: property validation/enrichment and generation endpoints.  
- PDF Generation System: page rules, validation, sanitization, streaming response.  
