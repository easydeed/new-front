# DeedPro platform execution status

Updated 2026-11-06. Owner: Gerard. Governing rules: [EXECUTION_POLICY.md](EXECUTION_POLICY.md). Work plan: [PLATFORM_LAUNCH_PLAN.md](PLATFORM_LAUNCH_PLAN.md).

The first implementation wave restores verification, patches the frontend runtime dependencies, and replaces a broken scheduled deployment recipe with a non-deploying owner checkpoint. It does not make DeedPro ready for real partner documents or a public launch.

**DECIDED** — the owner approved this engineering work and merging the three patches after their checks pass. Production settings, credentials, irreversible data work, money, customer contact and substantive legal choices remain owner gates.

**BUILT** — all three engineering patches reached main after final checks passed. Each merged tree was checked against the approved branch; the security lockfile digest on main is `845fb9cf7558678631a2634ba7bbe48aa76929c4c9cad6c33c8d48b6f6090271`.

## Main integration record

| Work | Review | Main commit |
|---|---|---|
| Non-deploying release readiness guard | [298](https://github.com/easydeed/new-front/pull/298) | `56c4c373` |
| Isolated and portable verification baseline | [296](https://github.com/easydeed/new-front/pull/296) | `b9ce9f7e` |
| Frontend runtime dependency security | [297](https://github.com/easydeed/new-front/pull/297) | `88f8513b` |

The original dirty `engine1` checkout is preserved. Its local-only work is not treated as merged or obsolete. Temporary integration branches must be rebased onto main before merging; no child is merged into a feature branch.

## Verified engineering foundation

The release-guard integration candidate passed 1,852 backend tests without failures or skips. The security candidate passed 1,296 frontend tests across 94 suites, with two snapshots. Production builds, OpenAPI, concurrency, the Thursday walkthrough, unchanged six-flow and API baselines, current-tree secret scanning and banned-claims checks passed. The local backup drill recovered the application PDF with the same bytes and SHA-256 digest.

TypeScript remains at 83 errors and lint remains at 126 errors and 53 warnings under their existing ceilings. These are passing baseline gates, not clean code-quality results. Browser end-to-end tests were not run. The application restore proof does not cover the API artifact path.

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
| Blank substantive API fields and whitespace approver | Reproduced; baseline JSON records the accepted invalid inputs | P02 shared validation and negative/positive runtime tests |
| Omitted tax basis | Reproduced as a silent `full_value` fallback | P03 explicit conditional instructions approved by the owner |
| Optional approver contact copied into request JSON | Reproduced; purge behavior source-confirmed | P04 versioned evidence and retention transition |
| Scopes, key-scoped ownership, API second copy and concurrent retries | Source-confirmed risks, not cleared security/recovery claims | P05, P07, P08 and P09 runtime isolation and recovery proofs |
| Pagination, expiry disagreement and incomplete tax totals | Source-confirmed | P10 and P11 contract and boundary tests |
| Approval claims, marketing and acquisition path | Source-confirmed; browser acceptance remains open | P06 and P12 through P15 |
| Historical credentials and production controls | Owner verification outstanding; no historical secrets were tested | P01 and production portions of P13/P18 |
| Commercial offer, contracts and external pilot | Not qualified for release | P16, P17 and P19 |

The source references and ticket acceptance criteria remain in the approved plan. Engineering approval does not fill in an unknown retention duration, tenant mapping, price, tax instruction or legal term.

## Remaining release gates

| Gate | State |
|---|---|
| G0 reproducible verification foundation | Core local and CI baseline established and integrated on main |
| G1 safe for real documents | Not achieved: substantive validation, tax instructions, retention, scopes, truthful approval claims, API artifact recovery and credential closure remain |
| G2 integration pilot readiness | Not achieved: durable partner ownership, safe retries/lifecycle, integration documentation, operations and commercial readiness remain |
| G3 broader sales | Not achieved: external integration, approved terms, recovery/incident evidence and a qualified pilot remain |

The runtime production dependency audit reports zero known advisories at verification time. The complete graph still has **49 flagged development/build entries: 3 critical, 18 high, 25 moderate and 3 low**. These are registry dependency findings, not necessarily 49 distinct exploits. Their remediation and exposure assessment remain open; this wave is not a complete security clearance.

CI still asks for Node 20, which is end-of-life in the [official Node release table](https://nodejs.org/en/about/previous-releases). A supported-LTS CI update is separate from changing production settings. The legacy mixed-encoding root ignore file also remains unchanged; private verification tools, logs, artifacts and the disposable database are excluded locally and never committed.

## Owner checkpoints

1. Revoke or rotate historical exposed credentials and retain value-free confirmation. Current-tree scanning cannot prove revocation.
2. Configure or verify `production-release-review` in GitHub with the repository owner as the sole required reviewer, administrator bypass disabled, and self-review allowed for that sole owner. The readiness script refuses an absent, inaccessible or unprotected environment before an environment job can create it implicitly. This checkpoint never deploys.
3. Resolve the conditional tax matrix, contact-retention transition, legacy-scope compatibility and legacy tenant mappings before the affected contract or data changes ship.
4. Approve the commercial offer, counsel-reviewed documents, service targets and the first platform pilot. No money or customer communication is automated by this wave.
5. Reconcile the preserved `engine1` work separately.

The billing, home-value report, agent-pilot and LR-001 decisions pasted into this chat were explicitly retracted as belonging to another project. None are applied to DeedPro.
