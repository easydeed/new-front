# Durable API ownership and test provenance proposal

P05 D6/D8 authorize preparation only. This is not approval to build or migrate P08, activate P03, alter public verification or clean up historical records.

## Durable owner and environment

Use a dedicated API partner-account identity, independent of any credential or application officer. The existing `partners` table is an officer's relationship directory, not this ownership contract. Its display labels and legacy organization defaults must not become customer boundaries.

The proposed additive model associates API keys and deeds with an explicit stable account UUID and an immutable `test`/`live` environment. Preserve the existing creating-key reference as attribution rather than rewriting who created a record. Every successor-key access predicate must require account, environment and current operation permission. Keep original deed/document IDs, stored PDF bytes and approval evidence stable. This does not grant multi-officer app access or merge app/API tables.

Legacy mapping needs an owner-approved key-to-account manifest and a reversible synthetic rehearsal accounting for every key and row. NULL, shared/default organizations, similar names and matching emails are not mapping evidence. Unknown ownership or environment stays unresolved, not silently assigned. A revoked predecessor never authenticates; successor access is available only after the authorized mapping exists. Production backfill is separately held.

P09 must settle idempotency continuity before replacing the current `(api_key_id, idempotency_key)` namespace with a possible `(account_id, environment, idempotency_key)` namespace. Two old keys may have used the same identifier for different deeds. Do not deduplicate, overwrite or silently choose a winner. P07 storage namespaces should distinguish API account/environment/string IDs from application numeric IDs; no storage configuration or deployment is approved here.

## Public test provenance

Currently an ordinary test-key approval can produce public `valid=true`; only exact demo markers are excluded. The proposed new-write rule is that test documents must not be represented by the public verifier as live authenticity. This requires durable environment metadata on the document, available to both approval and verification. A key prefix alone is not a historical document classification after a future key replacement.

Do not overload `demo_kind='try'` to suppress a test record: that marker authorizes demo whole-row deletion. Do not remove test records or change old authenticity status on deployment. For legacy approvals, return a separate classification inventory and decision matrix before touching public outcomes. Keep public responses free of party/property facts, approver contact, hashes and bearer links. Whether test verification should return not-found or a separately identified sample response remains an owner-facing contract choice before implementation; no wording is published by this proposal.

Required future proofs include same-account successor continuity, other-account and test/live refusals on metadata/PDF/evidence/list/retry paths, unchanged IDs and bytes, explicit ambiguous-row accounting, and test documents that cannot become live public assertions through either authenticity lookup or API-deed fallback. This is an acceptance proposal, not completed verification or an implementation claim.
