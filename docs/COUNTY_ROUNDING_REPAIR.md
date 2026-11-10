# County calculation increment repair

Owner-approved D6 engineering, 2026-11-10. Baseline main `00cb1ae2c9c4ed00f1f5c3787698c3dab68f061d` includes the verified interspousal hold. County-specific legal wording/applicability and broader v1 cutover remain held; this separate arithmetic repair approves neither.

## Reproduction and correction

The former backend and frontend county calculations multiplied the supplied base by a continuous per-$1,000 rate. Both returned `23.21` for `21100`. Los Angeles County publishes a county-only example of `23.65`, rounding that base to the next $500 increment and applying $0.55 per increment or fraction. [Official county example](https://www.lavote.gov/home/recorder/property-document-recording/documentary-transfer-taxes), checked 2026-11-10.

Both calculators now use that increment arithmetic under the **existing** county-rate assumption. Python uses decimal arithmetic before rounding up the unit count; the frontend rounds up the unit count before formatting money. Neither rounds the input base to cents before deciding whether a fraction of an increment exists. One shared fixture corpus is read by both suites at `backend/tests/fixtures/county_rounding_cases.json:1`; it is test data, not a second runtime rate table or a new Vercel packaging exception.

This function assumes an already supplied taxable calculation base. It does not decide whether a transaction is taxable, choose an exemption, determine the proper value, authorize a lien deduction, or implement a new threshold/applicability policy. Those remain professional/domain decisions. Existing municipal arithmetic, registry entries, unknown/tiered flags, zero/clamp behavior and input parsing are unchanged. Their preservation is not a legal/current-rate accuracy claim.

The public calculator uses the corrected shared backend function. Its county rate-description text, developer page, calculator breakdown caption and arithmetic help sentence now state the increment/fraction. The existing API disclaimer also states that calculation does not determine taxability or exemptions. Keys/routes are unchanged. Non-multiple inputs deliberately receive corrected numeric estimates; exact multiples retain their previous results. Existing legal-help exemption examples were not rewritten or approved; they remain within the domain-review hold. P11's incomplete municipal totals and broader calculator validation remain open; this is not complete tax-engine clearance.

## Tests and release gates

The regression corpus was run against the old code first: backend failed on the official county example; frontend had eight failures and nine passes, including the same `23.21`/`23.65` contradiction. These are retained failures, not skipped tests. After the repair the focused backend suite passed 39 cases and the focused frontend suites passed 26 cases. Boundary cases cover exact increments, cents above/below increments, an input fraction of a cent, the official example and large bases. A real HTTP calculator test uses mocked authentication and fatal deed-DB/PDF seams; it performs no deed generation.

Both full suites, all five marked-local-database proofs, unchanged OpenAPI/six-flow/API baselines, production build, type/lint ceilings, browser safety, secret/claims scanning and both audits remain blocking. The review receipt must identify the final checked head, reviewed/merged tree and post-merge checks. Focused results are not substituted for these full gates.

No rate registry, legal template, tax instruction, stored PDF, historical hash, production setting, credential or real database is changed. API deed creation does not call this calculator itself. Whether prior real documents used an incorrect estimate is unknown; no production inventory, retrospective correction, customer notice or regeneration is authorized here. Existing provider hooks may react to approved main merges; there is no manual deployment.
