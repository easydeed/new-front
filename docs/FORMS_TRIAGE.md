# FORMS-TRIAGE — PCT Library (~76 CA forms), One Page

**Tier A — recordable single instruments; fit the chassis (build these)**

*Deed variants (chassis does ~everything already):* Grant Deed – Joint
Tenancy · Grant Deed – Community Property w/Right of Survivorship · Grant
Deed – Corporation/Partnership as Grantor · Inter-Domestic-Partner Grant ·
Interspousal (shipped) · Quitclaim variants (shipped base). *Rationale:*
title/recital/vesting-default variations on shipped templates.

*Affidavit family (jurat partial now exists):* Affidavit of Death – Joint
Tenant (SHIPPED, the spike) · – Surviving Spouse/CP w/ROS · – Trustee ·
– TOD beneficiary. *Rationale:* same sworn-statement skeleton, 1–3 field
deltas each; highest non-deed volume in escrow.

*Other single recordables:* Declaration of Homestead (+ Abandonment) ·
Certification of Trust (Prob C §18100.5 — ~~sworn, jurat~~ ACKNOWLEDGED;
see correction note below) · Revocation of Revocable TOD Deed · Power of
Attorney (recordable, acknowledgment) · Substitution of Trustee ·
Full/Partial Reconveyance (HOLD — owner ruling, wave 2: lender-side
paper needing a separate decision). *Rationale:* one instrument, one
signer-set, recorder-formatted — chassis-shaped.

**Tier B — fillable government forms; need a form-fill pipeline (LAST, owner directive)**

PCOR / BOE-502-A · BOE-502-D (death of owner — the affidavit's natural
companion) · BOE-58-AH / BOE-19 family (parent-child etc.) · BOE-261-G
(veterans) · county-specific exemption forms. *Rationale:* these are
overlay-fill on government-issued PDFs with their own revisions — a
different pipeline (form-field mapping, not chassis rendering). Explicitly
sequenced last per owner; the BOE-502-D companionship is the reason B
eventually matters.

**Tier C — defer indefinitely**

Promissory notes · payoff demands · mechanic's-lien questionnaires/
releases · subordination agreements · escrow instructions/amendments ·
lender packages. *Rationale:* multi-party contractual or lender documents,
mostly not recorded instruments; drafting them edges toward practice-of-law
territory the doctrine deliberately avoids.

**Recommended first wave (owner to rank), 7 forms:**
1. Affidavit of Death – Surviving Spouse (CP w/ROS) — sibling, ~1–2 hrs
2. Affidavit of Death – Trustee — sibling, ~1–2 hrs
3. Grant Deed – Joint Tenancy — deed variant, escrow staple
4. Grant Deed – CP w/Right of Survivorship — deed variant, pairs with #1
5. Declaration of Homestead — new family, high consumer demand, ~~jurat
   reuse~~ (ACKNOWLEDGED per CCP §704.930 — see correction note below)
6. Certification of Trust — sworn instrument, title-company request magnet
7. Revocation of Revocable TOD Deed — small, completes a common workflow

*Pre-wave recommendation from the spike report: the half-day form-registry
refactor, so type #7 costs what type #2 costs.*

---

## Correction note — wave-1 reference measurements (2026-07-30, owner-acknowledged)

**References outrank memo predictions.** Two certificate predictions above
were wrong, caught when the PCT references were fetched and measured
before building (the pipeline's first step, doing exactly its job):

1. **Declaration of Homestead** (#5): predicted "jurat reuse" — the
   reference carries a **§1189 acknowledgment**, consistent with
   CCP §704.930 (a homestead declaration "shall be acknowledged").
2. **Certification of Trust** (#6): predicted "sworn, jurat" — the
   reference is a penalty-of-perjury declaration ending "(Acknowledgement
   must be attached)": an **acknowledged** instrument, not a jurat.

Both therefore ship as a third registry family — **declaration**
(acknowledged, no DTT, single-party) — alongside deed (acknowledged, DTT)
and affidavit (jurat, no DTT); the coherence pins enforce all three
structurally. The single-party shape also fired the owner-ledgered
parties-JSONB migration (both triggers at once: catalog >10 types AND
parties unmappable onto grantor/grantee).
