# 🌐 DeedPro Documentation Hub (2025 Reset)

The documentation set now mirrors the narrow slice of work that remains after the failed wizard relaunch. Only the records below are considered living guidance; everything else has been sequestered for historical reference.

## Core References
- **Crisis Report** — [wizard-catastrophes.md](./wizard-catastrophes.md) documents the compliance breaches and UX failures that forced the rebuild mandate.
- **Backend Routes** — [backend/ROUTES.md](./backend/ROUTES.md) is the canonical FastAPI map for every authenticated and public endpoint the wizard relies on.
- **Wizard Architecture** — [wizard/ARCHITECTURE.md](./wizard/ARCHITECTURE.md) captures the target state for the dynamic flow, state store, and API integrations we still need to finish.
- **Rebuild Plan** — [roadmap/WIZARD_REBUILD_PLAN.md](./roadmap/WIZARD_REBUILD_PLAN.md) outlines the sequencing required to ship a compliant replacement.
- **TitlePoint Integration** — [titlepoint-failproof-guide.md](./titlepoint-failproof-guide.md) remains the only vetted playbook for working with the upstream data provider.

## How to Use This Folder
1. **Read the catastrophe summary first** to understand the legal guardrails and UX gaps we must not repeat.
2. **Audit the backend routes** so every wizard touchpoint and downstream automation has an identified handler.
3. **Reconcile the architecture plan with the rebuild roadmap** before committing new work; any deviation needs an explicit update to the roadmap doc.
4. **Consult the TitlePoint integration guide** whenever adding, testing, or mocking property data flows.

## Active Subdirectories
- `backend/` – Route-by-route API documentation, including auth requirements and fallback behavior.
- `wizard/` – Target architecture for the dynamic wizard experience and supporting state models.
- `roadmap/` – The authoritative rebuild plan owned by engineering leadership.
- `archive/` – Frozen historical material. Use only for context when updating the living docs above.

## Historical Material
- [`archive/legacy-2025/`](./archive/legacy-2025/) contains every prior root-level guide, runbook, and marketing one-pager preserved for posterity.
- [`archive/2025-overhaul/`](./archive/2025-overhaul/) retains the earlier architecture teardown that justified the reset.

If a question is not answered by the five core references, assume the work is either unfinished or requires new documentation before implementation proceeds.
