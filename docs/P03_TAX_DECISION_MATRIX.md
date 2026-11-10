# P03 Transfer tax decision matrix

Prepared 2026-11-10 for Gerard and the domain reviewer. Baseline: main `c966841f8a05c881ce557d8ea9bfef7a0d3665cc`, with P02 and temporary tax-deed containment merged.

**Engineering approved with domain holds.** On 2026-11-10 the owner approved D1 through D8, explicitly including interspousal containment and a separate rounding repair. County-specific legal wording and applicability remain held for domain review. The owner separately selected: “Prepare v2; hold broader v1 cutover for approval.” V2 must therefore retain disabled county profiles; no broader v1 creation/approval cutover is authorized by that choice. These are workflow and engineering approvals, not a transaction-specific legal instruction or a legal/form clearance.

The recommended boundary is an officer-instructed declaration: the professional supplies and accepts the tax treatment; DeedPro checks that the instructions are explicit, internally consistent and faithfully rendered. An amount, deed title, relationship, property value or recognized code string never chooses the legal treatment. This does not certify the professional's conclusion as legally correct.

## Investigation baseline before the approved repairs

These are synthetic schema/function checks on the baseline, not production traffic or an inventory of real documents. The probes executed the existing mapping functions directly from their source, without importing the live router or opening a database. A separate interspousal probe rendered HTML only. No PDF was generated.

| Supplied instruction | Observed baseline behavior | Source |
|---|---|---|
| Taxable, amount `825.00`, no basis | Accepted; API mapping supplies `full_value`; shared mapping turns it into the full-value checkbox | `backend/routers/api_v1/router.py:70`; `backend/services/deed_pdf.py:84` |
| Taxable, full-value basis, no amount | Accepted; shared tax context becomes absent | `backend/schemas/api_v1/deeds.py:86`; `backend/services/deed_pdf.py:80` |
| Exempt, no reason or amount | Accepted; shared mapping supplies `0.00` and a full-value basis without exemption wording | `backend/services/deed_pdf.py:77`; `templates/grant_deed_ca/index.jinja2:397` |
| Exempt, supplied amount `825.00` | Accepted; rendered context changes the amount to `0.00`, while the create path independently prepares the supplied numeric amount for storage | `backend/services/deed_pdf.py:78`; `backend/routers/api_v1/router.py:561` |
| Explicit amount `0.00` | Preserved in render context, but the actual response mapper returns `null` for a stored decimal zero | `backend/routers/api_v1/router.py:473` |
| Taxable amount `-1.00` | Accepted by P02's syntax-only validation and passed into the rendering context | `backend/services/api_input_validation.py:34` |
| Property city Los Angeles, tax city Santa Monica | Both accepted; the rendered tax city is Santa Monica. Omitting the tax city instead leaves its city label blank, despite a city-area verdict | `backend/routers/api_v1/router.py:86`; `templates/grant_deed_ca/index.jinja2:395` |

Two additional findings change the implementation discussion:

1. **Interspousal instructions can contradict the form.** An accepted `interspousal_transfer` request with `exempt=false` and amount `825.00` produces HTML asserting an exemption under section 11927 and does not print that amount. The template also uses `dtt_exempt_reason`, which the shared context does not supply. Choosing the instrument is not evidence that a particular tax exemption applies. Source: `templates/interspousal_transfer_ca/index.jinja2:121`; `backend/services/api_catalog.py:102`; `backend/services/deed_pdf.py:127`. P02's eight-type name-preservation tests were not tax-correctness approval.
2. **The separate calculator disagrees with an official county example.** `compute_dtt(21100, None)` returns county tax `23.21`. Los Angeles County's published example for that value is `23.65`, using $500 increments or fractions. Source: `backend/services/dtt_rates.py:81` and [Los Angeles County calculation guidance](https://www.lavote.gov/home/recorder/property-document-recording/documentary-transfer-taxes). The deed-create handler does not itself call this calculator; this is not evidence that every generated deed used that incorrect result. Do not silently fold a rate/calculator repair into P03.

## Approved engineering decisions and remaining domain holds

Approval here concerns product rules and release scope. A transaction's actual tax basis or exemption still belongs to its authorized professional. County-specific legal wording and applicability require domain review, not an engineering vote.

| Decision | Approved engineering direction | Remaining constraint |
|---|---|---|
| D1 Explicit taxable instructions | Require an explicit exact-cent amount and full-value or less-liens basis before rendering. Refuse missing/blank amounts and negative signed tax amounts, including negative-zero presentation. Preserve explicit zero as zero, never as missing. Do not calculate an amount from `value` automatically or round a supplied amount to make it fit. | Structural and monetary rules approved. P02's finite/length/storage checks remain in force; taxability is not inferred. |
| D2 Zero tax and exemption grounds | Distinguish **no tax declared due** from an assertion of a particular statutory exemption. Require explicit zero and an officer-supplied reason. For a statutory exemption, require the professional's citation and factual wording appropriate to the approved county workflow; do not select or certify a code from a list. Exempt instructions need no irrelevant taxable basis; refuse incompatible supplied fields rather than dropping them. | Explicit zero and distinct no-tax/exemption modes approved. County wording, grounds and applicability remain unapproved; no reinterpretation of the existing v1 boolean. |
| D3 County and city scope | Make clear which jurisdiction each amount and exemption addresses. Use separate county/city components where required. A city location, a city that charges no tax, an unknown rate and an unincorporated location are different states. Reject conflicting city facts; do not pick one silently. | Component representation approved, but no county profile is approved or enabled. Do not announce statewide declaration completeness. |
| D4 Less-liens instructions | Retain the professional's explicit basis and any required supporting loan facts. Never infer a deductible lien from an amount or subtract a loan automatically. | Supporting-fact representation approved. Which county requires which facts/reference remains domain-held. San Luis Obispo's published guidance is not generalized into a statewide rule. |
| D5 Interspousal availability | **Separate temporary generation/approval hold approved**, preserving stored-document access, until the instrument's tax contract and fixed legal recital are approved. | Containment changes offered API types from eight to seven once verified and merged. Restoration and section 11927 applicability remain domain-held. |
| D6 Calculator dependency | Keep declaration instructions independent from calculator suggestions. **Separate county rounding repair approved**, with official examples and boundary cases. Keep unknown/tiered municipal completeness work with P11. | Repair is bounded to arithmetic under the existing county-rate calculation. It does not select legal taxability, change municipal rates, auto-populate declarations or certify a full calculator. |
| D7 Compatibility and release | **Prepare v2 with county profiles disabled**. Hold the broader v1 cutover for separate release approval, as the owner explicitly selected. | No unapproved broader v1 creation/approval hold is imposed. Existing v1 risks and caller inventory are not declared resolved by preparing v2; production usage remains unverified. |
| D8 Approval evidence and old previews | Show the exact declaration being accepted, and retain its version, original instructions, displayed wording, claimed actor/source, acceptance time and preview hash. No automatic grandfathering of nonconforming previews; never rewrite existing bytes. | Evidence/transition design approved. Applying a broader transition to current v1 remains behind D7's separate release gate. A bearer token is not identity verification; a preview proves no physical act. No production inventory or historical remediation is authorized. |

Los Angeles County directs separate county/city amounts and places calculation responsibility on the preparer. [County guidance](https://www.lavote.gov/home/recorder/property-document-recording/documentary-transfer-taxes). San Mateo distinguishes transfer-tax exemptions from reassessment exclusions and describes additional city declarations; those are not interchangeable with zero tax or other recording-fee exemptions. [County guidance](https://smcacre.gov/county-clerk-recorder/documentary-transfer-tax). San Luis Obispo publishes statement elements including zero-tax grounds, jurisdiction, basis when tax is owed, and the loan-reference requirement noted above. [Statement examples](https://www.slocounty.ca.gov/departments/clerk-recorder/forms-documents/recording/dtt-statement-examples).

These county sources support the need for explicit, jurisdiction-aware instructions; they do not approve a DeedPro template for all counties or decide a transaction's exemption. The Legislature's section-page endpoints returned 403 during this review. Current statutory text, approved county forms and any exemption wording must therefore be verified by the domain reviewer before implementation approval is treated as legal/form clearance. No particular exemption is recommended for a transaction.

## Approved conditional matrix for engineering

This is the approved logical decision model. The prepared v2 schema is documented in [API_V2_TAX_PREPARATION.md](API_V2_TAX_PREPARATION.md); it has no enabled profiles or production mount. Apply a state to a clearly identified tax component. All accepted cases also require the approved jurisdiction profile and professional acceptance. Mixed jurisdiction treatment needs D3 before it can be called complete.

| Declared treatment | Amount | Taxable basis | Grounds or supporting facts | Proposed result |
|---|---|---|---|---|
| Undecided or missing treatment | Any | Any | Any | Refuse before rendering or artifact persistence; do not infer a mode. |
| Tax due, full value | Explicit positive exact-cent value | Explicit full value | Required jurisdiction/valuation facts under the approved contract; no contradictory exemption claim | Accept as the professional's instruction, not a verified calculation. |
| Tax due, less liens | Explicit positive exact-cent value | Explicit less liens | Approved county's required loan facts/reference; no contradictory exemption claim | Accept only within the approved profile. No automatic deduction or factual inference. |
| No tax due on non-exemption grounds | Explicit zero | No taxable basis forced | Explicit professional-supplied grounds in an approved category/wording | Structurally valid; generation still requires a domain-approved profile. Do not relabel it a statutory exemption. |
| Statutory exemption claimed | Explicit zero | No irrelevant taxable basis | Professional-supplied citation and factual wording, with approval evidence | Accept the instructed declaration, not legal eligibility. Never auto-select this state. |
| Zero without an explained no-tax instruction | Zero | Any | Missing/ambiguous | Refuse; zero is a value, not a legal conclusion. |
| No-tax/exemption state with a positive amount for the same component | Positive | Any | Any | Refuse the contradiction. Do not overwrite the amount with zero. Mixed city/county cases are separate components, not this row. |
| Any state with an absent/blank amount or negative signed amount | Missing/blank/negative | Any | Any | Refuse with the actual field path. No zero substitution, rounding or silent field discard. |
| Conflicting city facts, unknown jurisdiction requirements or incomplete component coverage | Any | Any | Unresolved | Do not represent the declaration as complete. Require a corrected instruction or an approved supported workflow. |

A property's positive value does not itself contradict an exemption. Supplied valuation facts should be retained as facts, not converted into a tax classification. P03 must not use a zero value, trust/entity type, marital label, loan balance or document title to choose an exemption or basis. Documentary transfer tax is the scope here; recording fees, SB2 fees and property-tax reassessment are not adjudicated by this state model.

## Full implementation boundary after release approval

The later enabled implementation requires shared conditional validation, faithful mapping/rendering, explicit-zero round trips, and declaration-specific approval evidence for supported profiles. Current authorization is narrower: prepare disabled-profile v2, with broader v1 cutover held under D7. The following requirements are activation work, not permission to change existing v1 inputs now. This is **not** a complete tax engine or a guarantee of recorder acceptance.

- Reuse one tax-decision judgment across the public API and affected application generation paths. Remove the API fallback **and** the shared mapper fallback; fixing only the schema leaves another caller able to assert full value accidentally. Inventory `/try`, final generation, shared rendering, direct/feature-flagged generators and legacy self-heal before implementing guards. Preserve the application's permitted partial-draft saves.
- Keep original entered instructions alongside any approved display-only formatting. The accepted request, stored declaration, returned amount and PDF must agree. Pull the minimum zero-response correction into P03 acceptance rather than declaring P03 done while P10 still returns `null` for zero; other P10 pagination/expiry work stays separate.
- D3's jurisdiction contract, D4's county facts and D5's interspousal decision are release dependencies, not details to improvise after coding. If deferred, name the exact refused/unsupported cases and obtain owner approval for that narrower slice. Do not silently preserve an eight-type tax-correctness promise.
- Existing completed PDFs remain byte-identical and downloadable. Do not regenerate historical artifacts or silently approve an old pending preview under new rules. An unsafe rollback that restores defaults is not a safe restoration of capability.
- Separate the calculator repair/P11 from declaration acceptance; do not convert its current partial/approximate output into an authoritative filing instruction. No jurisdiction expansion, tax-deed restoration, rate refresh, retention redesign, stronger identity claim, deployment or customer communication is authorized by this matrix.

## Acceptance required for the later implementation

1. Each approved mode has absent, null, blank, zero, positive, negative, contradictory and valid cases, plus exact field-specific refusals before PDF/artifact creation. Invalid input cannot be made valid by an automatic legal default.
2. Exercise `0`, `0.00`, negative-zero presentation, currency/grouped formats, precision bounds, Unicode grounds, known/no-tax/unknown cities, mixed components and less-liens county facts against the approved rules. Do not replace domain decisions with a statutory-code regex.
3. Assert actual PDF declarations for every type that remains available: amount, applicable basis checkboxes, grounds, city/county scope and retained wording. Generic party-name checks and a PDF header are insufficient. Interspousal behavior needs its own approved cases.
4. Verify create, replay, retrieve, list, approval evidence and stored preview/PDF agree for explicit zero and contradictions. Prove the selected old-preview transition, completed-byte immutability, held-type restrictions and partial-draft preservation using a marked disposable database.
5. Mutation-probe every new refusal/default-removal boundary. Run both full suites, all five database proofs, unchanged OpenAPI/six-flow/API baselines unless a change is separately approved, production build, existing type/lint ceilings, browser safety proofs, secret/claims scans and dependency audits. Review the chosen API cutover before release and verify the reviewed code actually reaches main.

## Current handoff

The matrix preparation used source review, official-source research and isolated read-only reproductions; those probes are not full implementation gate results. Engineering is now authorized in separate concerns: interspousal containment, county rounding repair and disabled-profile v2 preparation. Each implementation must produce its own full gate and integration receipt before being reported built. P02's previous green checks are not evidence for these new rules. The original dirty checkout is preserved.

County-specific legal wording, exemption applicability, profile activation and the broader v1 cutover remain held. The owner-approved engineering decisions never select exemption grounds for a caller. Actual build/merge status belongs in the corresponding review receipts, not in an inferred legal clearance from this approval record.


## Implementation status

Interspousal containment reached main in [review 304](https://github.com/easydeed/new-front/pull/304) as `00cb1ae2`; county increment arithmetic reached main in [review 305](https://github.com/easydeed/new-front/pull/305) as `8e5c28ad`. Both reviewed trees match main and their post-merge checks passed. The reproductions above remain historical evidence, not descriptions of those repaired paths.

The next concern prepares v2 with all profiles disabled and corrects the stored-zero response representation. It does not remove legacy v1 defaults or apply the broader approval transition. Actual declaration rendering, county/form approval and activation remain later release gates. See the prepared-contract guide and its own verification receipt; P03 is not complete merely because a schema exists.
