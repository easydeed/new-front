# DeedPro platform remediation and launch plan

Created 2026-11-06. Owner: Gerard. Execution policy: [EXECUTION_POLICY.md](EXECUTION_POLICY.md).

Make DeedPro a dependable California deed engine that external platforms can integrate. Fix the trust-breaking defects first, prove one complete partner workflow second, and expand only after that workflow survives real use. A broad launch is an earned release gate, not the end of a feature checklist.

**DECIDED** 2026-11-06 — the owner wants a platform-first business and a plan covering the audit findings.
**DECIDED** 2026-11-06 — the owner approved engineering execution and merging the baseline, runtime-security and guarded-release repairs after their checks pass. This approval does not supply missing legal or commercial values, or delegate owner-only production actions.

**BUILT** — current implementation and remaining release gates are recorded in [PLATFORM_EXECUTION_STATUS.md](PLATFORM_EXECUTION_STATUS.md). Approval of a ticket is not completion of its acceptance criteria.

## Product boundary

The initial offer is California deed preparation through the existing nine deed-family API instruments, with a required hosted confirmation step and retrieval of the approved PDF and its evidence. The officer application remains a reference client and a secondary acquisition path.

Do not promise unattended legal decision-making, verified approver identity, proof that someone read a document, nationwide coverage, recorder acceptance, or a complete closing package. PCOR, BOE, signing, recording statements, correction lineage, and office collaboration must each be tested on the API path before being advertised as API capabilities.

Keep the current doctrine: external facts arrive as candidates; professionals authorize legal choices; certificates belonging to another party's act stay blank; approved PDF bytes are immutable. There is no ticket to bypass human confirmation.

## Baseline and safe working arrangement

The audit baseline is `origin/main` at `4273cec74c49d65e70e7d7b8d1793a6cda413e6e`. The working checkout is `engine1`, with one local commit, 30 remote-main commits not merged locally, and substantial uncommitted changes overlapping this plan. Counts describe the inspected state, not a permanent branch condition.

Do not reset, overwrite, automatically stash, or rebase that checkout. Start implementation in a separate clean worktree from freshly fetched `origin/main`, on a dedicated branch. Preserve the current checkout for a later owner-reviewed reconciliation. Inspect local-only work before deciding anything is obsolete.

The audit inspected an isolated main snapshot. Source-path findings below need negative and positive runtime reproductions in the implementation baseline. The previous audit did not obtain a fresh local test pass; historical green CI is not a substitute. If a finding is disproved, close it with evidence instead of implementing an unnecessary fix.

## Release gates

| Gate | Required outcome | Work required |
|---|---|---|
| G0 Reproducible baseline | Clean isolated workspace, disposable database, reproducible tests, classified findings | P00 |
| G1 Safe for real documents | Complete inputs and explicit choices, truthful approval claims, retained-data controls, authorized access, recoverable artifacts, credential exposure closed | P01 through P07; owner approvals and security review |
| G2 Ready for one integration pilot | Durable partner ownership, safe retries and state transitions, documented polling, complete evidence export, commercial and operational owners, honest acquisition path | P08 through P18; G1 remains green |
| G3 Ready for broader sales | Executed external integration, agreed service targets demonstrated, incident and restore drills, approved contracts and pricing, no unresolved critical or high-severity findings | P19; G2 remains green |

All runtime proof before G1 uses synthetic data and test credentials in an isolated environment. Public read-only inspection does not authorize production transactions. Production validation and customer contact remain owner-only.

## Execution rules for every implementation ticket

- One concern per PR, branched from current main. Every ticket below is planned and **BUILT — no** until its code and evidence reach main.
- Each PR records executor role, baseline SHA, reproduction, changed paths, tests and results, migration classification, rollback, unresolved decisions, and explicit exclusions. No success claim without independently rerun evidence.
- Run both maintained suites and the proof harnesses, including OpenAPI, six-flow, API baseline, concurrency, restore, and walkthrough proofs. Run frontend build for frontend changes, plus secrets and banned-claims gates, lint and TypeScript ceilings. Read exact commands and ceilings from current CI rather than copying stale prose.
- Use only a marked disposable test database for destructive harnesses. Never inherit a production database connection. Any write script verifies database identity and is covered by the script-classification test.
- Version intentional contract changes. Do not re-record snapshots or loosen tests simply to obtain green. Tightening accepted inputs is a compatibility change even when it fixes a defect; review existing consumers and document the cutover.
- No duplicate policy engines or second copies of shared judgments. Reuse shared validation, status resolution, catalog, pricing and jurisdiction logic.
- Additive migrations and reversible application changes first. Backfills, contact deletion, credential work, production actions, deployment topology, money and customer communication require the applicable owner gate. No destructive database operation is delegated.
- Stop and report discoveries, conflicts with existing rulings, unexplained test failures, or unverified migration assumptions. Auto-proceed across approved tickets only under the zero-deviation rule.
- On merge, verify the implementation reached main and update the relevant ledger entry with DECIDED and BUILT fields. Do not overwrite the currently dirty OWNER_LEDGER.md while creating this plan.

## Phase 0 Establish the executable baseline

### P00 Clean workspace and finding reproductions

Executor: implementation engineer with QA review. Dependency: none.

Create the isolated worktree and a test setup that cannot connect to production. Inventory runtime versions, dependencies, service entry points, schema creation, feature flags and actual CI jobs. Diagnose the previously stalled local runners before treating a missing result as a pass or a product defect. Prefer an explicit environment over installing or changing global tooling.

Turn each audit finding into a reproduction or a bounded design risk. Include blank strings, missing tax decisions, contact copies, scopes, key replacement, API artifact recovery, concurrent idempotency, pagination, expired drafts, incomplete tax calculations, anonymous inquiry and navigation.

Acceptance: baseline SHA and commands recorded; both suites and relevant database-backed harnesses produce results; failures and skips are classified; finding matrix marks reproduced, source-confirmed, operationally unverified, or disproved. Confirm whether the original report's scope and identity claims need correction. No source edits to the dirty checkout.

Rollback: remove no user data; stop any audit-owned test services without touching existing services. Excludes product fixes and production reads requiring owner approval.

## Phase 1 Remove trust-breaking defects

### P01 Close historical credential exposure

Executor: owner/security operator; engineer prepares a value-free checklist. Dependency: P00 inventory; owner can begin immediately.

Inventory exposed credential classes and affected systems from the existing ledger and controlled scanning. Do not print values or test historical secrets. The owner revokes or rotates each affected credential, updates approved deployment settings, and checks vendor access history for suspicious use. Rotate any affected signing or session secrets with an explicit session-impact plan.

Acceptance: each exposure has a credential identifier or fingerprint, owner, revoked-at evidence, replacement deployment verification and follow-up disposition. Any history cleanup follows rotation, backup, collaborator coordination and explicit approval; it is not a substitute for revocation. Current-tree and instrument self-tests stay blocking. Secrets never enter PRs, logs, chat or screenshots.

Excludes unattended vendor access, history rewriting, and credentials guessed to be safe because they look like test credentials.

### P02 Enforce usable API inputs

Executor: backend engineer with document-domain review. Dependency: P00.

Apply a shared, instrument-aware substantive validation layer at the public API boundary. Reject blank and whitespace-only material names, APN, legal description, required recording fields and approver identity strings. Validate before rendering or persistence. Preserve lawful optional fields; do not turn uncertainty about a fact into invented content. Bound input lengths and numeric formats without rejecting legitimate long legal descriptions.

Acceptance: each required field has absent, empty, whitespace and valid cases; all available instrument variants render correctly with valid data; invalid requests return a field-specific 422 with no artifact created. Include international names and long descriptions. Reuse the existing required-field corpus where appropriate. No credential-like name filter is represented as proof of human identity.

Owner-approved scope revision, 2026-11-09: the original all-nine requirement exposed the tax-deed template's discarded inputs and fixed exemption. The owner explicitly approved temporary blocking of new tax-deed generation and eight-type P02. Require successful rendering for the eight available types plus a blocking refusal/no-new-artifact test for tax_deed. Do not mark the legal tax-deed repair complete or skip its former failing case. See [the containment contract](TAX_DEED_CONTAINMENT.md); the county workflow/form decisions remain separate owner/domain gates.

Excludes substantive legal determinations and changing the application’s permitted partial-draft workflow.

### P03 Require explicit transfer tax instructions

Executor: backend engineer plus owner/domain reviewer. Dependency: P02; owner confirms the conditional decision matrix.

Remove the silent full_value fallback. Define taxable versus exempt requirements, explicit basis, exemption wording, monetary format, treatment of zero, and consistency of supplied fields. Do not invent statutory exemptions or validate a legal conclusion merely by matching a code string. Retain the officer’s actual instructions and provenance.

Acceptance: omitted or contradictory mandatory instructions fail before rendering; explicit zero is not treated as missing; valid exemptions are not forced to supply an irrelevant taxable basis; the PDF and returned declaration match the accepted instruction. Record the deliberate API-contract tightening and review existing callers before release.

Excludes choosing an exemption, vesting or tax basis for a caller.

### P04 Separate contact retention from immutable evidence

Executor: backend/privacy engineer; owner approves historical data operations. Dependency: P00; retention and evidence decisions approved before migration.

Map every contact copy: approver column, request JSON, logs, emails, exports, backups and object storage. Stop putting optional contact data into permanent request snapshots when it is not required. Define a canonical, versioned evidence payload that excludes purgeable contact; store its digest separately from mutable contact fields.

For legacy records, preserve the meaning of existing content hashes. Do not redact JSON and silently claim the historical digest still describes it. Design a versioned transition and owner-approved remediation for old copies, with a documented backup-expiry policy and legal-hold handling where applicable.

Acceptance: put a unique synthetic email in every active storage path; advance the retention clock; verify all governed live copies are removed while document bytes, approval subject and valid evidence remain intact. Backup retention and exceptions are stated accurately. Purge status detects overdue copies, not merely a NULL column. Run twice to prove idempotence and reset test baselines explicitly.

Excludes changing retention durations without approval, deleting production history, or promising immediate erasure from immutable backups.

### P05 Make API permissions real

Executor: backend/security engineer. Dependency: P00 and owner-approved compatibility policy.

Define an operation-to-scope matrix for creation, read/list, PDF, evidence, calculator and usage endpoints. Enforce centrally. Specify how legacy empty scopes behave and how existing callers transition; never silently grant additional privileges or abruptly revoke undocumented existing access. Keep public verification intentionally public and minimal.

Acceptance: read-only cannot create; missing permissions return 403; revoked keys fail; cross-customer access fails; test/live access remains separated. Tests call the real authorization dependency, not only search source text. Admin issuance and docs describe permissions actually enforced.

Excludes billing entitlements and production reissuance of credentials.

### P06 Correct confirmation claims and review token security

Executor: backend/security engineer and frontend/content engineer in separate PRs. Dependency: P00; owner decides any identity-policy expansion.

Keep hosted review, approval and the bytes-bound evidence. Replace claims of verified identity, verified professional authority, proof of reading and technical impossibility of scripted approval with the narrower truth: the system records approval under a supplied name and role using a bearer link. Label optional license claims as unverified.

Review pending and completed token lifetimes, revocation, post-approval PDF access, caching, referrer leakage, analytics, logs, cross-origin behavior, security headers and endpoint throttling. Propose any changed access lifetime explicitly rather than assuming the seven-day draft deadline revokes a completed document link. If stronger approver authentication is required, obtain a policy ruling before implementing it.

Acceptance: truthful copy across homepage, docs, trust, approval and evidence; mismatch hash refused; approval and rejection races do not produce contradictory outcomes; public verification exposes no party/property data; tokens are redacted from diagnostic output. Tests distinguish named-for-record from identity-verified.

Excludes removing confirmation, claiming identity verification, or silently changing established token access.

### P07 Give API artifacts a tested recovery path

Executor: backend/storage engineer; owner configures production storage. Dependency: P00; artifact ownership/key design aligns with P08.

Reuse the artifact-store abstraction for API PDFs without conflating numeric app deed IDs with API identifiers. Keep promotion of previewed bytes; never re-render an approved instrument during recovery. Define the authoritative copy, digest, mirror state, retry/reconciliation behavior, and user-visible behavior when a mirror fails. Do not claim a successful second copy before one exists.

Acceptance: an API-approved PDF and its evidence survive a disposable database restore with exact hashes; a missing primary copy can be recovered from the approved secondary path; storage outage and tampering are detected; app and API namespaces cannot collide. Restore proof covers api_deeds and required evidence, not only deed_pdfs. Owner approves recovery point and recovery time targets and verifies the production instance separately.

Excludes destructive live restore drills and unapproved deployment changes.

## Phase 2 Make the partner contract dependable

### P08 Durable partner ownership and safe key replacement

Executor: backend/data engineer; architecture and mapping approved by owner. Dependency: P00 and P05. Design runs before P07 namespace is finalized.

Give API records a durable partner/tenant owner independent of the authenticating credential. Keep created-by key attribution, scope authorization and test/live separation. This is the minimum partner ownership model, not the deferred full multi-officer organization product.

Use additive schema changes and an explicit old-key-to-partner mapping. Never group keys by display name, shared default organization, email guess, or NULL organization. Hold ambiguous legacy records for owner resolution. Preserve idempotency continuity and audit visibility through replacement; design overlap and revocation without exposing full keys.

Acceptance: new authorized key reads the same partner’s prior documents and evidence; old revoked key fails; another partner cannot access them; test key cannot retrieve live documents; old identifiers and artifacts remain stable. A reversible migration rehearsal accounts for every legacy row. Production backfill requires approval.

### P09 Concurrent idempotency and retry semantics

Executor: backend engineer. Dependency: P08 ownership contract; implement a key-local safety fix sooner only if it will not conflict with that contract.

Reserve an idempotency operation atomically or recover the uniqueness conflict into the original result. Specify same identifier with different payload, in-progress request, renderer failure, restart and retry after a commit whose response was lost. Keep rejected/expired requests non-resurrectable under the existing ruling.

Acceptance: at least 20 simultaneous identical creates yield one logical draft and defined retry responses, not a uniqueness-error 500. Reusing an identifier with a materially different payload produces an explicit conflict. Failure before and after persistence is tested. No duplicate public authenticity record or approved artifact. Idempotency and rate accounting cannot silently become billable duplicates.

### P10 Consistent lifecycle and validated query parameters

Executor: backend engineer. Dependency: P00.

Use one clock-aware state resolver for create replay, retrieve, list and confirmation. Do not require a cleanup request to make expiration true. Validate positive page/limit bounds, dates and filters; define stable pagination ordering. Return safe public errors with an internal correlation identifier rather than raw database exception strings.

Acceptance: all surfaces agree just before, at and after expiration; approval at an expired boundary is refused; limit=0, negative page, invalid dates and invalid filters return defined 4xx responses. Zero-valued tax amounts and names containing commas round-trip without truthiness loss or silent truncation in metadata responses.

### P11 Make incomplete tax calculations machine readable

Executor: backend engineer with owner/domain review. Dependency: P03 for declaration semantics.

Expose explicit calculation completeness and a machine-readable reason when city knowledge or a tier amount is missing. Return a clearly partial subtotal or a null complete total; choose the compatible response shape through contract review. Do not leave an apparently complete total and rely on notes to retract it. Validate impossible values such as liens exceeding value.

Acceptance: known zero, known rate, unknown city and tiered cases are distinct without parsing prose; incomplete results cannot silently populate a completed declaration; app and API use the same jurisdiction judgments. Preserve rate-registry attribution in API evidence where a rate calculation is actually used. Owner reviews rates against current schedules before accuracy claims.

Excludes inventing rates or treating a registry version as proof the rate is currently correct.

### P12 Document the complete integration lifecycle

Executor: developer-experience engineer. Dependencies: P02 through P11 contracts stabilized.

Provide executable create, review handoff, rejection/correction, polling, PDF download and evidence-export examples. Cover authentication, scopes, tenant ownership, replacement/revocation, expiration, test watermarking, retry behavior, errors, timeouts and deletion/retention. Make evidence retrievable through an appropriately scoped partner-authenticated path rather than requiring indefinite storage of a bearer link. Add a durable caller correlation key or demonstrate existing escrow/title-order round trips; preserve the TitleSense ClientRequestKey contract if used.

Document polling/backoff within the real rate budget, with low-cost status retrieval, Retry-After behavior and consistent rate headers. Measure expected customer polling plus creation and downloads against assigned limits. Demo behavior must not be described as proof of the external HTTP hop it does not exercise.

Acceptance: a developer unfamiliar with the repo completes the synthetic workflow from published examples; samples run against the actual API/OpenAPI contract; artifacts and evidence can be exported; no promised SDK, webhook, package or integration is fictitious. Include corrections without representing the API’s reject-and-recreate workflow as the app’s already-built supersession lineage.

### P13 Operations and capacity readiness

Executor: backend/operations engineer; owner approves external tools and deployment changes. Dependencies: P07 and P09 through P12.

Measure create/render/retrieve/confirm latency and error rate on the API path. Include synchronous database and bcrypt work inside async endpoints, pool pressure while rendering, concurrent approvals, burst traffic, dependency outages, shared-demo exhaustion and cleanup failure. Audit dependencies with current advisory tooling, classify applicable issues, and test supported runtime versions. Do not mechanically upgrade every dependency.

Add redacted structured diagnostics, request correlation, lifecycle/mirror backlog visibility, synthetic monitoring using isolated test identities, and a tested alert destination with a named responder. Establish actual incident, backup, restore and support runbooks. Confirm rate-limit counters are concurrency-safe and public abuse controls have an explicit trust boundary across proxies/workers.

Acceptance: owner-approved workload, latency, error, availability and recovery targets have recorded measurements; overload fails predictably rather than corrupting data; an induced failure reaches the responsible operator; API secrets, tokens, contact and document content do not appear in diagnostic output. No unmeasured uptime claim or SLA publication.

## Phase 3 Make the offer understandable and purchasable

### P14 Repair the platform acquisition path

Executor: frontend engineer with backend support. Dependency: P00; may run early without changing product claims.

Route primary platform CTAs to the existing public inquiry flow. Keep authentication only where needed. Preserve inquiries before notification transport and make notification failure visible in the admin queue. Retire or redirect redundant form paths without breaking bookmarks. Fix How it Works to point to the real confirmation section.

Acceptance: an anonymous browser can navigate from homepage and docs to a short inquiry without creating an app account; synthetic staging submissions persist; mail failure does not lose the inquiry; navigation targets exist and visibly scroll correctly at desktop and mobile widths. Production submissions remain owner-only.

### P15 Reposition the homepage around the platform buyer

Executor: frontend/content engineer; owner approves public positioning. Dependencies: P06 claims, P12 contract and P14 funnel.

Lead with the California deed engine and the successful create/review/retrieve journey. Show what a partner avoids building and what its team must integrate. Keep validation refusal as supporting proof, not the first product outcome. Put Docs, Try, Supported Instruments, Trust and API Access in the persistent platform path; keep the officer application secondary.

Remove or substantiate Most Popular and completion-time comparisons. Replace broad correctness, proof-of-reading and verified-human implications with bounded capabilities. Explain the nine-versus-21 distinction, hosted review requirement and lack of built-in title-software integrations. Treat named subprocessors as disclosure rather than a headline performance statistic. Keep actual demos, successful example output and evidence understandable without a sales call.

Acceptance: rendered desktop/mobile/accessibility checks; every CTA and anchor works; page, docs and trust agree; users can explain audience, outcome, coverage, review step and next action. No unsupported claims added to bypass the banned-claims gate. Do not make usage or customer-logo claims without permission and evidence.

### P16 Decide pricing and the application’s economic role

Executor: owner/product lead with engineering cost measurements. Dependency: P12 operation model and P13 usage measurements.

Choose the API billable event, retry/rejection treatment, included storage/retrieval, volume assumptions, support scope, minimum commitment and overage terms. Meter events once with durable identifiers; do not turn request counts into deed invoices. Measure property lookup, AI, rendering, storage and support costs.

Decide explicitly whether the free application is a reference client/acquisition channel or a separately monetized product. If Professional remains primarily a support upgrade, state that rather than invent feature restrictions. Do not enable plan limits or change prices without owner approval. Business stays unavailable until team ownership is built and verified.

Acceptance: written pilot offer, cost model with assumptions, agreed billable-event examples and reconciliation tests if automated billing is introduced. Owner verifies Stripe business identity, configured prices, signed webhooks and return URLs through the existing MONEY1 gate before any paid self-service release. Manual API pilot invoicing is an explicit alternative, not an assumed workaround.

### P17 Close legal and procurement readiness

Executor: owner and counsel. Dependency: P04 data map and P16 commercial offer; start counsel work immediately.

Approve Terms, Privacy, DPA, subprocessors and processing purposes; define retention, customer export/exit, incident notification, professional responsibility, permissible uses, service commitments and liability. Decide insurance and security-review requirements appropriate to target partners. Establish an actually monitored support/security contact and responsible responder.

Acceptance: approved documents match implemented behavior and legal entity; draft labels are removed only after approval; support and incident contacts are tested; unresolved procurement objections are explicit. No claim of certification, insurance, penetration testing or SLA without the corresponding completed evidence or agreement.

### P18 Restore documentation and release discipline

Executor: implementation/QA engineer. Dependency: P00 baseline; final synchronization after other contracts settle.

Correct README, architecture, data model, environment/deployment inventory, API docs and ledger from the actual system. Remove claims about the retired external API service and obsolete CI behavior. Document the app/API storage and ownership boundaries. Verify CI behavior across PRs, pushes and protected merges; do not assume a configured job is a required branch-protection check.

Add a browser journey gate and runtime authorization/retention/recovery tests while retaining useful source-level policy pins. Run CI against the approved production Python version, retaining compatibility coverage only where useful. Reduce TypeScript debt in critical auth/API/review paths, record remaining known debt by location, and prohibit new errors instead of relying solely on a global count that can trade one error for another. Retire build bypasses when their prerequisites are met, not by weakening gates.

Acceptance: fresh setup works from documentation; artifact and public configuration inventories are accurate; critical behavior tests fail under intentional defect mutations; current ceilings cannot increase; release evidence identifies exact main and deployed revisions. Owner verifies dashboard-only configuration and branch protection without exposing secrets.

## Phase 4 Prove the first customer workflow

### P19 Pilot qualification and launch decision

Executor: owner/product lead and QA engineer. Dependencies: G1 and G2; contracts and workload agreed before real customer data.

Owner recruits one platform with a named integration engineer, a real California deed workflow, and acceptance of hosted human confirmation. Validate demand through its willingness to allocate engineering effort and accept paid terms; technical verifiability is not demand evidence. Use authorized, minimized transaction data only after the data-processing and production gates are satisfied.

Run the complete journey: inquiry, issued test key, valid and invalid create, hosted review, reject/correct, approve, PDF plus evidence export, key replacement, revocation, status polling, expiry, concurrent retries and recovery. Test separation between two partners and test/live data. Product completion must never imply signed, notarized or recorded completion.

Acceptance: the external engineer completes the documented workflow; accepted instruments are reviewed by the designated professional; observed volume, latency, incidents, support time and document issues meet the written pilot criteria. Define an observation window and minimum meaningful transaction count with the partner before it starts. No invented universal sample size or assumed recording-acceptance percentage.

G3 requires an executed staging restore and incident drill, owner production verification, a complete evidence packet, approved commercial terms, no open critical/high findings and a documented disposition for lower-severity risks. Only then publish broader availability. No agent sends customer outreach, issues real credentials, accepts contracts or performs paid transactions.

## Follow on work with named triggers

These are accounted-for gaps, not forgotten fixes. Do not quietly pull them into the pilot critical path. Each requires a scoped ticket and approval when triggered.

| Capability | Trigger | Minimum acceptance |
|---|---|---|
| Signed outbound webhooks | Pilot polling is inadequate or required by a committed partner | Tenant isolation, signed minimal payload, event IDs, outbox, retries, replay, deduplication, secret rotation, delivery visibility and SSRF controls; deployment changes owner-approved |
| Client library or SDK | First partner language and repeated integration pain are known | Generated or maintained against real OpenAPI; create/poll/retry/export examples; no fictitious methods; supported-version policy |
| Multi-officer accounts | First committed office or partner requires shared work | Separate design under RED-S5, organization-owned work, assistant/officer permissions, offboarding, isolation, audit and migration proof; not satisfied by P08 alone |
| Complete API package | Partner requires deed plus PCOR/BOE or attachments | Explicit supported catalog, package manifest, immutable versions, appropriate review and artifact recovery; no flattened form regression |
| API correction lineage and app handoff | Partner needs the app to resume API files or track supersession | Explicit identity/ownership mapping, source correlation, immutable predecessor links and no accidental data sharing; no forced merger of tables |
| TitleSense or TitlePoint adapter | Real partner contract and live payloads available | Honor H1 and DX0 source granularity, correlation and proposal semantics; no guessed leaf mapper or implied existing vendor integration |
| Stronger approver authentication | Customer or counsel requires verified identity/authority | Owner-approved identity policy, authentication and delegation tests, accurate assurance claims; no name-field heuristic presented as verification |
| External penetration test or certification | Target procurement or risk review requires it | Qualified scope, tracked remediation and completed evidence before claims; scheduling a test is not passing one |
| Additional jurisdictions or instruments | Committed demand and owner-approved legal/domain expansion | Separate research, licensed review where needed, versioned jurisdiction rules, template/render/acceptance proof; never inferred from California support |

## Owner decisions and immediate actions

Engineering may prepare evidence and implementation proposals while these proceed, but cannot silently answer them.

1. Complete credential revocation/rotation and approve production verification under P01.
2. Approve the transfer-tax conditional decision matrix, retention/evidence transition and stronger identity requirements if any.
3. Approve tenant mapping, legacy-scope policy, migration rehearsals and all historical data changes.
4. Approve storage and deployment configuration, service/recovery targets and incident ownership.
5. Start counsel review; decide API pilot offer, application pricing role and payment-verification path.
6. Name the first platform and authorize outreach and pilot data handling.
7. Reconcile existing engine1 work separately; this plan does not authorize losing it or treating it as merged.

## Sequencing and effort budget

P00 comes first. P01 and counsel intake start immediately with the owner. Engineering then tackles P02/P03, P04, P05/P06 and the P08 ownership design; P07 aligns storage with that design. P09 through P13 stabilize the partner contract. P14 can run early; P15 waits for truthful contracts. P16 through P18 close the offer and release system. P19 is the proof, not an automatic deployment.

The sequence may be split into independent approved tickets but is not blanket permission for delegation or multi-agent execution. Dependencies are correctness constraints, not permission to proceed past stop-and-report gates.

Provisional allocation, to be revised after P00 reproductions and architecture decisions:

| Workstream | Focused engineering days |
|---|---|
| Baseline and reproductions | 1 to 2 |
| Trust-breaking defects and security proof | 6 to 10 |
| Ownership, API reliability, recovery and operations | 10 to 16 |
| Funnel, documentation and release-quality improvements | 5 to 8 |
| Integration exercise and resulting stabilization | 4 to 7 |
| Total to a bounded pilot | 26 to 43 |

This is an allocation envelope, not a fixed-price quote or calendar commitment. It excludes owner execution, counsel lead time, vendor procurement, historical migration complications, full enterprise certification, the complete TypeScript backlog and triggered follow-on features. G3 additionally depends on the pilot observation window; it cannot be promised at a day count. Re-estimate at P00 and after P08’s migration design rather than hiding uncertainty in an optimistic launch date.

## Definition of done

Each ticket closes with a recorded outcome, reproducible evidence, approved migration/rollback details if applicable, and code verified on main. Disproved findings close as disproved. Deferred work carries a trigger, not a misleading completed status.

The platform is ready when an external customer can integrate, authorize a deed, retrieve the exact approved bytes and evidence, replace credentials without losing its work, understand what is and is not guaranteed, and obtain help when something fails. The company must be able to restore that work and honor the terms it sells.

## Audit evidence index

Line references below name the pinned audit baseline, not the dirty local checkout. Reconfirm them at P00.

| Finding | Baseline evidence |
|---|---|
| Blank substantive fields and whitespace approver | backend/schemas/api_v1/deeds.py:32, :59, :103; backend/services/deed_pdf.py:96 |
| Silent tax basis | backend/routers/api_v1/router.py:66 |
| Contact duplicated in request JSON | backend/routers/api_v1/router.py:569; backend/services/api_confirm_lifecycle.py:85 |
| Scopes loaded but not enforced by public router | backend/routers/api_v1/router.py:239, :333 |
| Credential-scoped ownership | backend/routers/api_v1/router.py:651, :688, :741; backend/routers/admin_api_v2.py:708 |
| App mirror versus API PDF promotion | backend/services/deed_pdf.py:295; backend/routers/api_confirm.py:256 |
| Historical exposure and pending rotation verification | docs/OWNER_LEDGER.md:649 |
| Idempotency lookup and uniqueness constraint | backend/routers/api_v1/router.py:518; backend/database.py:625 |
| Pagination and stored versus clock-resolved status | backend/routers/api_v1/router.py:439, :741; backend/services/api_confirm.py:155 |
| Incomplete city calculation and numeric total | backend/routers/api_v1/router.py:838 |
| Named approval is not verified reading or authority | backend/routers/api_confirm.py:157, :333 |
| Authenticated inquiry versus public alternative | backend/routers/api_key_requests.py:55, :161; frontend/src/app/api-key-request/page.tsx:30 |
| Missing navigation target | frontend/src/components/landing-v2/StickyNav.tsx:34; frontend/src/app/page.tsx:256 |
| Correctness and reading claims, timing and popularity | frontend/src/app/page.tsx:70, :373, :546, :682 |
| Free versus paid proposition | frontend/src/lib/pricing.ts:71 |
| Operational disclosures and draft contracts | frontend/src/app/trust/page.tsx:86; frontend/src/app/terms/page.tsx:26; frontend/src/app/privacy/page.tsx:23 |
| CI and runtime debt | .github/workflows/test.yml:1; frontend/next.config.js:1; docs/ARCHITECTURE.md:1; README.md:1 |
