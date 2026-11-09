# Public API input validation

P02 implements validation revision `P02-2026-11-09` before deed rendering or artifact persistence. On 2026-11-09 the owner approved the documented v1 safety cutover after the conflict with the public new-version promise was raised, then directed the engineer to use the recommended compatibility approach. The recommendation is the explicit v1 safety cutover after green checks, rather than preserving acceptance of unusable deed inputs. External caller inventory remains unverified; no claim of zero live integrations is made.

With the candidate applied, authenticated invalid input returns HTTP 422 in the existing `detail.code = VALIDATION_ERROR` envelope, with the actual field path in `detail.details[].field`. Authentication remains first and can consume the key's request allowance even when the body is refused.

The revision is published on the `CreateDeedRequest` schema as `x-deedpro-validation-revision` and records the explicit safety cutover on the developer page, preserving the versioning promise for other breaking changes. Routes, field names and response shapes are unchanged. Callers that previously sent empty material fields or malformed amounts must correct them. Existing stored records are not rewritten. Merge requires all verification gates; the known compatibility risk is actionable 422 responses for callers relying on the previous unsafe acceptance, not a silent data repair or a claim their migration was tested.

## Text requirements and limits

Required party names, property facts, recording/return-address fields and approver name/role must contain non-whitespace text. The existing per-instrument catalog still decides vesting and entity recitals: fixed-vesting forms refuse supplied vesting, quitclaim vesting stays optional, and entity deeds require their existing recital facts. The shared required-field presence predicate is reused; no new legal requirement list is introduced.

| Input | Maximum characters |
|---|---|
| Property city and county | 100 each, matching the existing database columns |
| Property APN | 50, matching the existing database column |
| Legal description | 1,000,000 |
| Other text | 10,000 unless an existing tighter constraint applies |
| Supplied computed amount | 64 including formatting |

Lengths count characters, not encoded bytes. The legal-description limit is a technical request bound, not a recordability guarantee. Descriptions remain multiline and are never truncated. Names accept international scripts, accents and punctuation; validation does not trim, transliterate or rewrite contents. NUL characters are refused because PostgreSQL cannot store them. Return addresses retain their existing free-form state/postal fields, including international addresses; property state retains the existing California-only check and omitted-state default.

Optional grantor addresses, email, company, entity metadata, order/escrow numbers and other optional fields remain optional. A supplied grantor address must satisfy its already-required fields. Blank optional text remains permitted unless the existing instrument rule requires substance there.

## Numeric syntax without new tax decisions

Transfer values and calculator inputs must be finite numbers; booleans are refused rather than silently converted to 0 or 1. Calculator positivity/nonnegative-lien constraints are unchanged. A nonblank computed amount must be an ordinary decimal with at most two fractional digits, optional leading dollar sign, optional sign and correctly grouped thousands separators. Its magnitude must fit the existing `DECIMAL(10,2)` storage column: at most `99,999,999.99`. Validation retains the original string; it never rounds it to make it fit.

Examples accepted by this syntax check include `0`, `0.00`, `550.00`, `$1,234.50` and `-1.00`. Scientific notation, nonfinite values, malformed grouping, excess fractional precision and storage overflow are refused. A syntactically accepted sign is not a determination that a negative tax instruction is legally valid.

P02 does not add conditional tax requirements, require a previously optional amount, choose a basis or exemption, check a rate, or reconcile contradictory instructions. Omitted/blank optional amounts and explicit zero retain their prior treatment. Those substantive rules remain P03 and require its owner-approved decision matrix. The application's partial-draft workflow is unchanged.

## Consumer review and cutover

Repository consumers are the public `POST /api/v1/deeds` endpoint, the constrained server-side `/try` demo, developer-page request examples, and the API lifecycle harness. Both create callers construct `CreateDeedRequest`, so the same validation applies; no router-only duplicate exists. The documented valid example and fixed demo payload remain valid, while the existing demo's intended catalog refusals remain refusals.

Before merging, run both maintained suites, all five database-backed proofs, route-contract checks, type/lint baseline gates, production build, browser safety checks, secret/claims scans, and dependency audits. Do not re-record the API or six-flow snapshots. Review checks and the P02 evidence record carry exact results. The database harness verifies real-key invalid requests create no draft/authenticity rows, and all nine valid instruments produce readable PDF previews with international names.

External caller inventory is not established by searching this repository. Any separately managed integration must be checked against this revision before its production cutover; no production traffic, customer communication or external migration is performed by this ticket. Rollback is an application revert, with no schema/data migration, and would restore the previously unsafe acceptance behavior rather than repair stored drafts.

Implementation: `backend/services/api_input_validation.py:1`, `backend/services/required_fields.py:106`, `backend/schemas/api_v1/deeds.py:8`, `backend/tests/test_api_input_validation.py:1`, and `backend/tests/test_api_v1_integration.py:171`.
