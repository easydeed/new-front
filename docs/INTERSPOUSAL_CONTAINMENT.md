# Temporary interspousal generation hold

Owner decision, 2026-11-10: D1 through D8 engineering recommendations are approved, including a separate temporary interspousal generation/approval hold. County-specific legal wording and exemption applicability remain held for domain review. The new tax-contract version may be prepared with county profiles disabled; any broader legacy v1 cutover requires separate release approval.

## Scope

The existing interspousal template always declares an exemption under section 11927 even when the API accepts taxable instructions. The containment does not rewrite that recital or decide when it applies. It adds `interspousal-transfer` and its legacy alias to the existing shared `backend/services/instrument_availability.json:1` policy, alongside the retained tax-deed hold. No second availability list or environment bypass is introduced.

There are seven available API deed types, nine retained registered identities, and nineteen currently offered application instruments. This is an explicit owner-approved safety withdrawal of one capability, not a claim that the remaining forms are legally cleared. Historical P02 eight-type results and the original tax-deed failure evidence remain unchanged as history.

Public create requests receive field-specific 422 errors before deed persistence/rendering; application generation, the mounted legacy direct generator and shared PDF creation independently refuse with 409 `INSTRUMENT_UNAVAILABLE`. Picker, recents, direct builder, developer table and confirmation controls use the same policy/reason. Tests cover canonical, underscore, uppercase/whitespace and legacy aliases. The legacy interspousal route has its own guard before its separate renderer.

Previously stored completed PDFs remain downloadable byte-for-byte. Existing pending previews remain readable and rejectable, but cannot be approved/promoted. No record, hash, token or existing artifact is rewritten merely by the hold. Legacy self-heal cannot create new held-type PDF bytes. Separate partial-draft save behavior remains unchanged. Internal archival HTML/furniture inspection is not an authorized public PDF-generation capability.

## Verification and release

The expanded refusal tests require both held instruments to fail before side effects, rather than silently removing a positive rendering case. Real disposable-database fixtures separately verify historical completed bytes and pending-preview non-promotion for each type. Every available type still participates in positive validation/PDF tests. The former interspousal vesting requirement remains registered for history, with a separate held-request refusal instead of pretending creation succeeds.

Both full suites, all five marked-database proofs, unchanged OpenAPI route/six-flow/API baselines, production build, native/runtime browser safety, existing type/lint ceilings, secret/claims scans and dependency audits remain blocking. The guard must fail its mutation probe. Exact results, reviewed head and main-tree verification belong in the review receipt; this contract does not assert unrun checks passed.

No schema/data migration, legal-template change, credential read/rotation, hosting-setting change, manual deployment, production inventory or customer message is included. Existing provider hooks may react to an approved main merge. The broader v1 cutover and county profiles are not enabled here. The calculator rounding repair is a separate concern/review.

Rollback that removes the hold re-enables the reproduced input/form contradiction; it is not a safe restoration. Lifting the hold requires domain-approved workflow, tax contract, legal recital and actual PDF-declaration proofs, followed by all maintained gates. Stored historical documents are not regenerated as part of restoration.
