# API contact separation and approval evidence

P04 engineering under the owner's D1–D7 approval, 2026-11-10. Baseline main is `ca56c8fe`, following P03 preparation. Optional email remains accepted for compatibility and is stored in `api_deeds.approver_email` only. P03 legal/profile/activation holds, both instrument holds and the broader v1 tax cutover hold remain unchanged. The [decision matrix](P04_RETENTION_DECISION_MATRIX.md) records the approvals and original reproductions.

## New writes and event evidence

New saved requests omit only the dedicated `approver.email` field. Other legal strings are preserved; an email-like string in a party name or legal fact is not automatically erased. Additive snapshot version/digest columns identify new writes; old rows remain unversioned. No schema-convergence backfill rewrites historical requests or hashes.

`services/api_evidence.py` owns the contact-free projection and canonical JSON scheme: sorted keys, compact separators, UTF-8 Unicode, no nonfinite numbers, and no trimming or legal-value normalization. Approval checks a versioned request against its digest and refuses a mismatch before promoting bytes. Legacy requests have no invented creation-time digest; a new approval can project their contact-free facts with that origin stated explicitly, without modifying their original JSON.

An approval action records a separate versioned evidence payload and digest in the same transaction as promotion of the existing preview bytes. It binds the request projection, document identifiers, exact PDF digest, claimed name/role/optional license, server approval time, source and whether a client digest was supplied. The old `content_hash` algorithm and historical values are not repurposed. New contact-free request inputs naturally contain no optional email; old inputs keep their original meaning.

The record distinguishes server artifact wording from client display: existing artifact declarations are captured as server statements, while `displayed_declaration` remains null and `display_attested` remains false. A bearer client can approve without showing the hosted page. This work cannot truthfully backfill what anyone displayed or read, and does not implement P03's later declaration-specific acceptance or P06's claims corrections. Identity and license remain unverified. Existing public request/response/artifact key sets and routes stay unchanged; no new public evidence or hold endpoint is added.

## Retention and holds

The existing shared 90-day operating window still starts at recorded approval, rejection or expiry, not creation or migration. One SQL fact model powers the restricted purge and aggregate inventory. Missing or contradictory terminal facts require review. Exact boundary behavior is explicit: eligible at the 90-day boundary. Future valid pending drafts are not overdue.

Automatic contact cleanup is restricted to versioned, contact-free new records without a retention hold or stranded evidence copy. It clears the contact column only, using one supplied UTC clock for both deadline and purge stamp. An old stamp cannot hide a remaining value. Legacy columns, JSON copies, unknown versions and evidence remnants require owner review rather than a new automatic redaction path. This deliberately narrows cleanup to avoid executing unapproved historical operations. The old JSON and its hashes remain untouched.

Inventory reports aggregate contact rows, JSON/evidence copies, stamped remnants, holds, unknown clocks, legacy-transition requirements, all overdue rows and the subset eligible for the automatic new-record purge. A zero eligible count is not a zero-remnants claim. Optional email never becomes a log value or a purge-audit payload; contact-bearing create/confirmation database errors produce generic diagnostics, not failing-row dumps.

It also breaks down stored record states and digest presence. A string-encoded or malformed legacy snapshot is counted separately as unclassified and blocks technical restore readiness; a failed JSON-path lookup must not become a claim that contact is absent. These counts are not production findings or proof that a present digest is valid.

Owner-operated hold/release changes are row-locked and append an audit event containing only record ID, state, UTC time and bounded opaque operator/case references. Those operator references are claims, not authenticated human identity. Access is through an administrative database credential, never a bearer confirmation or public API call. A held record is excluded from contact purge, preview cleanup and marked-demo deletion. Effective expiry still prevents approval after the original window. Repeating an unchanged hold state adds no duplicate audit event.

This is one record-level administrative hold, not a registry of independent legal cases. The case reference audits the owner's action. Before release, the owner must confirm all applicable holds can be released; the tool does not decide legal applicability or resolve competing case obligations.

## Owner tools and restore review

From `backend`, the prepared command is:

```text
python scripts/api_contact_review.py
python scripts/api_contact_review.py --restore-review
python scripts/api_contact_review.py --hold DEED_ID
```

These modes use read-only database sessions. They assert required tables and the configured expected database before reading; no personal contact values are printed. Production inventory access remains an owner checkpoint. Restore review always exits 2 and reports `ready_for_serving=false`: technical counts are not authorization to release traffic. The command does not install a quarantine network or configure a restore pipeline. It is a gate for the owner to use while a restored environment is isolated.

A hold plan is not applied without all of `--apply-hold`, `--operator`, `--case-reference` and an exact `--confirm-database`. The action can only hold/release, not redact JSON, delete rows, change hashes or enable generation. Production invocation is held. The existing lifecycle command remains available for the owner; no cron, environment, alert destination or deployment setting is created or changed here.

Real command tests exposed two stale identity-helper calls in the existing API lifecycle script: the keyword is `expect_database`, and `describe` takes the connection rather than the returned identity dictionary. Both call sites are corrected and exercised in status/dry-run modes against the marked test database. The helper itself is unchanged; the checks stay enforced. This is not verification of an actual production cron.

`legacy_transition_plan` prepares a pure contact-free projection, old-hash comparison and new snapshot digest for batch review. It never writes or claims the old digest verifies the redacted JSON. It never creates a human acceptance event. There is intentionally no executable legacy-redaction batch command in this release. Each real batch requires count review and separate owner authorization; retaining an undisclosed original JSON copy forever is not a deletion strategy.

## Verification and completion boundary

Synthetic tests cover exact before/at/after terminal-event boundaries, omission/blank/Unicode compatibility, stranded copies with null columns or old stamps, evidence integrity, legacy plans, owner hold/release and command refusal, no-request job invocation, job-window throttling, byte-identical PDFs, contact-free receipt round trips, generic error logs and restore-review refusal. Each persistent-state test establishes its own fixtures or counts. Guard mutations must make their corresponding checks fail.

Both full suites, all five marked-database proofs, unchanged OpenAPI/six-flow/API baselines, production build, current type/lint ceilings, browser safety, scanners and both audits are required. The final review receipt identifies exact head/tree, local results and merged-main checks. Additive schema and synthetic tests do not prove production backup expiry or API artifact disaster recovery; P07 remains open.

P04 engineering is not full operational closure. Actual legacy inventory/remediation, backup/export/log horizons, hold reconciliation after a real restore, scheduled idle-system execution and final counsel policy remain unverified owner gates. No production cleanup, customer-facing publication, customer message, historical artifact rewrite, credential work, deployment change or P03 activation occurs in this work.
