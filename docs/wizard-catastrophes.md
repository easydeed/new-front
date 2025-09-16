# Wizard Catastrophes

## Executive Alarm
The legacy wizard is flagged as a critical, blocking failure that demands a full rebuild around legal requirements rather than marketing promises.【F:docs/archive/2025-overhaul/WIZARD_ARCHITECTURE_OVERHAUL_PLAN.md†L16-L27】

## Failure Inventory
- **Marketing fantasy vs. product reality** – public messaging guarantees a three-step AI flow, but production code is locked to a five-step Grant Deed-only experience that breaks user trust.【F:docs/archive/2025-overhaul/WIZARD_ARCHITECTURE_OVERHAUL_PLAN.md†L32-L54】
- **Rigid architecture** – every component, schema, and interface is hard-coded for Grant Deeds, making additional deed types effectively impossible without rework.【F:docs/archive/2025-overhaul/WIZARD_ARCHITECTURE_OVERHAUL_PLAN.md†L56-L60】
- **Fragile external dependencies** – Google and TitlePoint integrations have no fallbacks; outages immediately strand the wizard and users lose work.【F:docs/archive/2025-overhaul/WIZARD_ARCHITECTURE_OVERHAUL_PLAN.md†L62-L67】
- **State management chaos** – four competing state stores (React state, localStorage, verified data, and a global store) introduce race conditions and data loss.【F:docs/archive/2025-overhaul/WIZARD_ARCHITECTURE_OVERHAUL_PLAN.md†L68-L73】
- **Incoherent validation** – form checks are arbitrary and disconnected from statutory requirements, risking legal defects.【F:docs/archive/2025-overhaul/WIZARD_ARCHITECTURE_OVERHAUL_PLAN.md†L74-L78】
- **Brittle API handling** – calls lack retries and error recovery, so any integration hiccup discards user progress.【F:docs/archive/2025-overhaul/WIZARD_ARCHITECTURE_OVERHAUL_PLAN.md†L80-L84】

## Legal Caveats That Cannot Be Ignored
- **California Civil Code** – property descriptions, notary acknowledgments, and signatures must be complete and explicit; skipping fields voids deeds.【F:docs/archive/2025-overhaul/WIZARD_ARCHITECTURE_OVERHAUL_PLAN.md†L87-L93】
- **Revenue & Taxation Code** – documentary transfer tax declarations and statement formatting have mandatory language and structure.【F:docs/archive/2025-overhaul/WIZARD_ARCHITECTURE_OVERHAUL_PLAN.md†L95-L99】
- **Government Code** – recorder offices impose strict page layout, margin, and electronic recording standards that templates must obey.【F:docs/archive/2025-overhaul/WIZARD_ARCHITECTURE_OVERHAUL_PLAN.md†L100-L104】
- **County recorder practices** – first-page tax notices, notary language, and essential parties/description/signature elements vary by county but are universally required.【F:docs/archive/2025-overhaul/WIZARD_ARCHITECTURE_OVERHAUL_PLAN.md†L105-L111】

> For the full reconstruction blueprint—including mitigations and sequencing—consult the archived plan in `docs/archive/2025-overhaul/WIZARD_ARCHITECTURE_OVERHAUL_PLAN.md`.
