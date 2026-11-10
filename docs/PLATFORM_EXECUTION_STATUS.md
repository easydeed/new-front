# DeedPro platform execution status

Updated 2026-11-10. Owner: Gerard. Governing rules: [EXECUTION_POLICY.md](EXECUTION_POLICY.md). Work plan: [PLATFORM_LAUNCH_PLAN.md](PLATFORM_LAUNCH_PLAN.md).

The first implementation wave restores verification, patches the frontend runtime dependencies, and replaces a broken scheduled deployment recipe with a non-deploying owner checkpoint. It does not make DeedPro ready for real partner documents or a public launch.

**DECIDED** — the owner approved this engineering work and merging the three patches after their checks pass. Production settings, credentials, irreversible data work, money, customer contact and substantive legal choices remain owner gates.

**BUILT** — the three first-wave engineering patches reached main after final checks passed. Each merged tree was checked against the approved branch. Their initial runtime-security lockfile digest was `845fb9cf7558678631a2634ba7bbe48aa76929c4c9cad6c33c8d48b6f6090271`; the subsequent toolchain changes are recorded below.

## Main integration record

| Work | Review | Main commit |
|---|---|---|
| Non-deploying release readiness guard | [298](https://github.com/easydeed/new-front/pull/298) | `56c4c373` |
| Isolated and portable verification baseline | [296](https://github.com/easydeed/new-front/pull/296) | `b9ce9f7e` |
| Frontend runtime dependency security | [297](https://github.com/easydeed/new-front/pull/297) | `88f8513b` |
| Explicit browser test targets and refusal guards | [301](https://github.com/easydeed/new-front/pull/301) | `c1f9dacd` |
| Development/build dependency security and local browser download denials | [300](https://github.com/easydeed/new-front/pull/300) | `a7321b63` |
| Temporary tax-deed hold and narrow shared-policy packaging exception | [303](https://github.com/easydeed/new-front/pull/303) | `6a37115c` |

The original dirty `engine1` checkout is preserved. Its local-only work is not treated as merged or obsolete. Temporary integration branches must be rebased onto main before merging; no child is merged into a feature branch.

## Verified engineering foundation

The release-guard integration candidate passed 1,852 backend tests without failures or skips. The security candidate passed 1,296 frontend tests across 94 suites, with two snapshots. Production builds, OpenAPI, concurrency, the Thursday walkthrough, unchanged six-flow and API baselines, current-tree secret scanning and banned-claims checks passed. The local backup drill recovered the application PDF with the same bytes and SHA-256 digest.

TypeScript remains at 83 errors and lint remains at 126 errors and 53 warnings under their existing ceilings. These are passing baseline gates, not clean code-quality results. Full application browser journeys remain unverified; the isolated toolchain browser check below does not cover them. The application restore proof does not cover the API artifact path.

The final security lockfile installs with Node 20.20.2 and npm 10.8.2, matching CI. The first generated lockfile was rejected by that installer and was corrected without bypassing installation checks. An initial locally capped frontend run and an interrupted walkthrough were retained as failed attempts; isolated reruns passed without changing assertions or recording new baselines.

The owner supplied deployment-record and successful Vercel-preview evidence that the production frontend line satisfies the patched image library's Node requirement. This is not a live production `process.version` measurement. No Vercel or Render settings were changed. Existing provider auto-deploy hooks are outside the replacement readiness workflow and may still respond to main changes.

Detailed evidence: [baseline record](platform_baseline_2026-11-06.json), [security record](platform_security_2026-11-06.json), and the exact-head CI runs linked in each review.

Implementation references at merged main `88f8513b`:

- Isolated environment: `scripts/platform_preflight.py:24`; portable scheduling: `backend/services/signing.py:136`.
- Shared scanner paths: `frontend/src/test-support/sourceText.ts:92`; dependency regression checks: `frontend/src/__tests__/dependencySecurity.test.ts:22`.
- Blocking runtime audit: `.github/workflows/test.yml:134`; audit counts: `docs/platform_security_2026-11-06.json:43`.
- Owner dispatch and protection checks: `scripts/check_release_readiness.py:23` and `:54`; baseline results: `docs/platform_baseline_2026-11-06.json:62`.

## Audit finding classifications

| Finding group | Current evidence | Required completion work |
|---|---|---|
| Blank substantive API fields and whitespace approver | P02 shared validation implemented; original reproduction and eight-type/held-refusal verification are retained | P02 requires its green exact-head checks and verified main receipt in review 302 |
| Omitted tax basis | Reproduced as a silent `full_value` fallback | P03 explicit conditional instructions approved by the owner |
| Optional approver contact copied into request JSON | Reproduced; purge behavior source-confirmed | P04 versioned evidence and retention transition |
| Scopes, key-scoped ownership, API second copy and concurrent retries | Source-confirmed risks, not cleared security/recovery claims | P05, P07, P08 and P09 runtime isolation and recovery proofs |
| Pagination, expiry disagreement and incomplete tax totals | Source-confirmed | P10 and P11 contract and boundary tests |
| Approval claims, marketing and acquisition path | Source-confirmed; browser acceptance remains open | P06 and P12 through P15 |
| Historical credentials and production controls | Owner verification outstanding; no historical secrets were tested | P01 and production portions of P13/P18 |
| Commercial offer, contracts and external pilot | Not qualified for release | P16, P17 and P19 |

The source references and ticket acceptance criteria remain in the approved plan. Engineering approval does not fill in an unknown retention duration, tenant mapping, price, tax instruction or legal term.

## Browser test safety repair

The owner approved a separate repair on 2026-11-09, then approved proceeding after its checks passed. Review 301 reached main as `c1f9dacd`; its merged tree was identical to the reviewed tree and post-merge CI passed. The repair removes deployed frontend/API defaults from all three maintained E2E configurations, removes embedded login account defaults, and checks final configuration plus request/visit destinations with one shared policy. Both origins must be explicit loopback HTTP(S) origins; no remote destination is approved. Direct requests cannot auto-follow redirects. Blocking refusal checks run before Jest without relaxing the maintained suites or baselines.

The [operator guide](../frontend/cypress/README.md) describes setup and limits. Loopback configuration cannot establish whether a local application or API uses production services behind it; those services still require disposable fixtures and separate review. Full legacy application journeys remain unverified. Review 301 did not include the toolchain dependency changes; review 300 was subsequently rebased onto its merged main commit.

Implementation references: `frontend/cypress/target-policy.cjs:7`, `frontend/cypress/support/target-safety.cjs:33`, `frontend/cypress.config.js:21`, and `.github/workflows/test.yml:130`. The [verification record](platform_browser_safety_2026-11-09.json) and review 301 retain the candidate results and failed attempts. Integration does not clear the launch gates below.

## Development toolchain security follow-up

**DECIDED** — the owner authorized continued engineering work on 2026-11-06. The security follow-up retains the existing tool major versions and production runtime pins.

The original hold in [review 300](https://github.com/easydeed/new-front/pull/300) was reproduced on 2026-11-09: the browser attempted traffic to a `gvt1.com` host before visiting the synthetic page. A later refusal identified a spellcheck-dictionary download without printing its path or query. [Electron downloads Hunspell dictionaries by default](https://www.electronjs.org/docs/latest/tutorial/spellchecker). Neither startup flags nor its test-window preference prevented that session-level download. Private Chrome preferences and startup-update switches also failed in cold CI. These unsuccessful experiments are retained in the verification record, not in the final browser configuration.

**DECIDED AND IMPLEMENTED** — on 2026-11-09 the owner approved explicit local blocks for known browser-background downloads. The shared fence returns a static local 503, never forwards the request, and keeps unapproved application/API traffic fatal. Eligibility is limited to observed CDN hosts, anonymous GET/HEAD requests, absent/other resource type, no app-origin or credential headers, and background-only fetch metadata. Direct request/visit commands never receive this treatment. The failed Chrome and startup-flag experiments are removed; proofs retain Cypress 15's bundled Electron browser without changing personal profiles or requiring external Chrome. Integration requires all final exact-head gates to pass; review 300 carries the final head, merge and post-merge results.

The resolved graph clears the previously reported three critical and 18 high dependency findings. Compatible transitive updates close the proxy-address, shell-quoting and WebSocket issues. Cypress 15.21.1 removes its vulnerable archive extractor and permits a patched system-information dependency; the updated minifier no longer requires the affected serializer. The full dependency audit now blocks high/critical findings in development tools as well as runtime packages, using one shared threshold and the existing required check name.

A maintained smoke test compiles and minifies a synthetic page, serves it on loopback, and requires the same test to pass in three fresh headless browsers, stopping on the first failure. It generates its own temporary config and reuses review 301's single target policy and refusal guards, without loading application browser configs, application code, login commands or deployed APIs. A separate browser proof requires one positive test and three intended refusal failures (direct request, redirect and application fetch), with zero hits at a forbidden local sentinel. Both checks are blocking in CI. All 38 network-free safety checks pass; deliberately replacing the local reply with forwarding in a private copy makes its forwarding detector fail. A regression probe also confirmed the new audit command refuses the old graph with its three critical and 18 high findings. Detailed results and remaining lower-severity findings are in [the toolchain verification record](platform_devtools_2026-11-06.json).

The historical deployed-API default discovery is addressed by merged review 301. That change and these synthetic proofs do not establish that the full application browser journeys pass against a disposable environment.

## Temporary tax deed containment

**DECIDED** — on 2026-11-09 the owner approved a temporary tax-deed generation block and completing P02 for eight available API types. The full legal/form redesign remains unapproved. The [containment contract](TAX_DEED_CONTAINMENT.md) records the single shared availability policy, affected entry points, pending-preview restriction and preservation of completed stored bytes. No tax-deed template text or historical record is changed.

**BUILT** — [review 303](https://github.com/easydeed/new-front/pull/303) reached main as `6a37115c` on 2026-11-10. Its reviewed and merged trees match; main Run Tests `42854645241`, CI `42854645253` and Vercel status passed. The owner-approved packaging correction includes only the shared availability JSON from the backend, with an exact included-file regression. P02 is rebased onto this actual main commit and must pass its own eight-type-plus-refusal gates. This phased scope does not clear the broader launch gates.

## P02 Public API input validation

**Phased scope approved.** The original ninth PDF case exposed a real tax-deed defect, and [review 302](https://github.com/easydeed/new-front/pull/302) was held with a [separate repair proposal](TAX_DEED_API_REPAIR_PROPOSAL.md). The owner then explicitly approved temporary containment and revised P02 acceptance to eight available types plus a held-tax refusal/no-artifact proof. The original failed local/CI results remain in the evidence record. Full tax-deed restoration is not implemented or approved; no assertion is weakened to certify its broken form.

**DECIDED** — on 2026-11-09 the owner approved P02, then approved the documented v1 safety cutover after the existing public versioning promise was flagged. The owner directed the engineer to use the recommended compatibility approach. That recommendation is an explicit safety cutover after green gates, not preservation of unusable deed inputs. External caller inventory remains unverified; the approval is not recorded as a claim of zero live integrations.

The implementation shares the existing substantive-presence predicate, preserves the required-field corpus and instrument catalog, and rejects invalid input at the public request-model boundary before deed rendering or artifact persistence. It adds bounded text, NUL refusals, finite/non-boolean numeric inputs and amount syntax that fits existing decimal storage. It does not trim or truncate supplied facts, introduce a name/identity filter, change partial application drafts, or decide tax instructions. Authentication still runs first.

The developer page records this specific compatibility exception and retains the new-version promise for other breaking changes. Field names, routes and response shapes remain unchanged; invalid authenticated requests receive actionable field-specific 422 errors. No schema migration, historical data rewrite, production transaction or customer notification is included. Implementation and cutover details are in [the input validation contract](API_INPUT_VALIDATION.md); exact local and review checks are recorded in [the P02 evidence](platform_p02_2026-11-09.json). Integration requires green exact-head checks and a verified main receipt in review 302. G1 remains unachieved.

## Remaining release gates

| Gate | State |
|---|---|
| G0 reproducible verification foundation | Core local and CI baseline established and integrated on main |
| G1 safe for real documents | Not achieved: conditional tax instructions, retention, scopes, truthful approval claims, API artifact recovery and credential closure remain |
| G2 integration pilot readiness | Not achieved: durable partner ownership, safe retries/lifecycle, integration documentation, operations and commercial readiness remain |
| G3 broader sales | Not achieved: external integration, approved terms, recovery/incident evidence and a qualified pilot remain |

The runtime production dependency audit reports zero known advisories at verification time. The verified toolchain graph has **25 flagged development/build entries: zero critical, zero high, 22 moderate and 3 low**, down from 49 on its main baseline. These are registry dependency findings, not necessarily 25 distinct exploits. The remaining entries need separate compatibility and exposure review; clearing the high/critical npm findings is not a complete security clearance.

CI still asks for Node 20, which is end-of-life in the [official Node release table](https://nodejs.org/en/about/previous-releases). A supported-LTS CI update is separate from changing production settings. The legacy mixed-encoding root ignore file also remains unchanged; private verification tools, logs, artifacts and the disposable database are excluded locally and never committed.

## Owner checkpoints

1. Credential rotation remains owner-managed. On 2026-11-09 the owner directed engineering to proceed independently of that work. Revocation is not attested here, and current-tree scanning cannot prove it.
2. Configure or verify `production-release-review` in GitHub with the repository owner as the sole required reviewer, administrator bypass disabled, and self-review allowed for that sole owner. The readiness script refuses an absent, inaccessible or unprotected environment before an environment job can create it implicitly. This checkpoint never deploys.
3. Resolve the conditional tax matrix, contact-retention transition, legacy-scope compatibility and legacy tenant mappings before the affected contract or data changes ship.
4. Approve the commercial offer, counsel-reviewed documents, service targets and the first platform pilot. No money or customer communication is automated by this wave.
5. Reconcile the preserved `engine1` work separately.
6. The loopback-only browser-test policy is approved and integrated through review 301. Verify disposable local app/API fixtures before attempting the full legacy browser journeys; no remote destination is approved.

The billing, home-value report, agent-pilot and LR-001 decisions pasted into this chat were explicitly retracted as belonging to another project. None are applied to DeedPro.
