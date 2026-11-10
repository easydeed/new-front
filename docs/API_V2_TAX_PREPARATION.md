# Prepared v2 tax instruction contract

Owner-approved P03 preparation, 2026-11-10. V2 is **not mounted in the application**, generates no deed, and has no approved county profiles. This is the engineering preparation selected after D1–D8 approval, not a replacement for v1 or clearance for real documents. The [decision matrix](P03_TAX_DECISION_MATRIX.md) retains the approvals and original reproductions.

## Explicit instructions

`PrepareDeedRequest` reuses P02 factual limits, California restriction, the instrument catalog, entity/vesting rules and both instrument holds. It replaces the v1 tax boolean with explicit component instructions. It does not convert between contracts or feed v2 components into the legacy renderer.

| Field | Prepared rule |
|---|---|
| `transfer_tax.profile_id` | Required opaque profile identifier. Every identifier remains blocked; no county profile is approved. |
| `location` | Explicit `city` or `unincorporated`; no unknown-to-unincorporated default. This is the professional's supplied fact, not verified incorporation. |
| `county` and `city` | Separate components. A city location requires a city name and city component even for declared zero; unincorporated instructions forbid city fields. City name must match the supplied property city after edge whitespace/case comparison; no jurisdiction alias or rate lookup chooses a location. |
| Component `mode` | Required `tax_due`, `no_tax_due` or `statutory_exemption`; never selected from a value, relationship or instrument. |
| Component `amount` | Explicit nonnegative monetary string within existing storage bounds. Currency/grouping formats and original whitespace are preserved. Fractions beyond cents, blank values and all negative-sign forms including negative zero are refused, not rounded. |
| `tax_due` | Positive amount and explicit `full_value` or `less_liens` basis. Grounds/citation fields are refused instead of discarded. |
| `no_tax_due` | Explicit zero and professional-supplied grounds. No forced taxable basis or statutory citation. |
| `statutory_exemption` | Explicit zero, grounds and professional-supplied citation. Presence is checked; neither the citation nor legal eligibility is certified. |
| `supporting_loan` | Optional balance/reference for an explicit less-liens instruction; a supplied object must contain facts. No loan is subtracted automatically. Which facts each county requires remains held. |
| `total_amount` | Required exact-cent total, exactly equal to the Decimal sum of supplied components. No automatic recalculation or correction. |

Unknown fields at the request root and within tax/support objects are refused, including legacy tax keys and attempted profile-approval switches. Existing nested factual models retain their P02 behavior. Optional valuation fields from v1 are not accepted inside this tax contract; no caller input is silently repurposed into tax classification. Supporting facts do not establish the deductibility of a loan. Structurally consistent mixed county/city treatments still cannot generate anything while profiles are disabled.

The conditional judgment is in `backend/services/tax_instructions.py:45`; prepared models call it rather than keeping a second API-only copy. No application generation path adopts it yet. Future approved callers must use that same judgment, with reviewed profile requirements added in one place. The calculator remains a separate estimate, not an accepted declaration instruction.

## Profile and release boundaries

`backend/services/tax_profiles.json:1` contains an empty registry in `domain_review_required` state. The loader refuses any altered or activated registry in this preparation. Environment flags and caller-supplied approval cannot enable profiles. There is no guessed county fallback or mapping from the municipal rate registry.

The prepared router reuses existing authentication and field-specific error envelopes. Tests mount it only in a synthetic application. Its POST can return validation 422, profile-review 409, or a separate release-review 409 if the profile guard is bypassed. It has no renderer, deed writer, persistence implementation, success response or artifact URL. Capabilities report generation disabled. `backend/main.py` is unchanged, and the application's public OpenAPI/route and behavioral baselines remain unchanged.

Authentication would still validate/meter a real key before request validation if the router were mounted; “before persistence” here means no deed or artifact persistence, not a promise of zero authentication I/O. No real integration or production account is used in these tests.

## Receipt and zero representation

`instruction_receipt` prepares an in-memory snapshot of original tax instructions, contract version, instruction digest, claimed name/role, source and UTC receipt time. It excludes email and sets profile version, displayed wording, acceptance and preview digest to null. A receipt is not acceptance or identity verification. Nothing writes it while v2 is disabled. This does not repair P04's legacy contact retention.

Future acceptance must bind reviewed profile/form versions, exact displayed wording, original instructions, claimed actor/source, affirmative acceptance time and the actual immutable preview digest. No old preview is grandfathered or rewritten by this work. Approval UI, persistence and the transition for existing v1 previews require the separate release decision.

The only v1 runtime change is its shared create/replay/retrieve response mapper: a stored numeric zero now returns `$0.00`, while null remains null. Routes, request requirements and record bytes are unchanged. A marked-database regression exercises a synthetic zero request, replay, retrieval, original request JSON and unchanged stored preview bytes. It does not certify that legacy v1 rendering or its tax defaults satisfy the new contract. List responses do not expose tax amounts and gain no new fields.

## Verification and activation requirements

Focused tests cover all seven active instrument fact sets, both held types, required decisions, amount syntax/precision/signs, explicit zero, conditional contradictions, mixed components, exact sums, loan support, city conflicts, attempted approval flags, malformed registries and contact-free receipt fidelity. Mutation probes deliberately disable conditional, amount, city and profile/registry guards and must cause the corresponding regression checks to fail. Independent release refusal remains exercised after the profile guard is bypassed.

Both full suites, all five marked-local-database proofs, unchanged OpenAPI/six-flow/API baselines, local production build, current type/lint ceilings, browser safety, scanners and dependency audits are required for the candidate. The [verification record](platform_p03_v2_2026-11-10.json) and final review receipt distinguish local, exact-head and merged-main results.

Before activation, domain review must approve the specific county workflow, supported instruments, required facts, declaration wording and applicability. Engineering must implement and prove faithful actual PDF declarations, approval evidence/persistence, old-preview handling, all affected generation entry points and rollback behavior. Mounting v2 and any broader v1 cutover require separate release approval. Legacy v1 basis defaults, exempt/amount contradictions and other matrix risks remain open; neither v2 preparation nor the independent rounding repair clears P03, P11 or launch gate G1.

No legal template, rate registry, historical PDF/hash, production data, credential or deployment setting changes here. The original dirty checkout is preserved.
