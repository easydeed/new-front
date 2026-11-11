# Administrator session validation repair

P05 D7 engineering approved by the owner on 2026-11-10. Baseline main is `fdc7b6c1`. This separate concern repairs administrator-session revocation; it does not activate the P05 existing-key permission cutover.

`backend/auth.py:get_current_admin` now delegates JWT and session validation to the same `verify_token` used by normal authenticated routes, then applies the existing centralized administrator-role predicate. It keeps the email return contract used by key issuance and audit callers. It does not introduce a second token decoder, role vocabulary, credential store or account mapping.

Previously a synthetic revoked access token received 401 at the normal session gate but 200 at real administrator key management. Missing subjects, missing/unrevocable token IDs, refresh tokens, invalid signatures, expired tokens and revoked sessions now fail the normal session gate before administrator actions. Non-admin or missing-email claims remain forbidden. This is session/claim validation, not new human identity verification or a new authoritative database-role/offboarding design.

The guard is shared across administrator routes, so acceptance covers actual logout followed by refused key list/detail/create/update/revoke, inquiry and usage access. Tests exercise the real authorization dependency; unit cases replace only the revocation store, while the database test uses actual logout and the request-scoped connection. A deliberate private bypass of the session gate must fail the revoked-session regression at its expected 401 assertion. Both full suites and all five database proofs remain required; exact-head and actual-main receipts identify integration, not this candidate document.

Valid administrator sessions preserve existing role matching and email results. Revoked or pre-session tokens must sign in again. This change does not revoke API keys or confirmation links, issue credentials, perform a production login, change settings or access real records.

P05's existing-key cutover and terminal key-revocation changes stay held pending its approved inventory and release decision. P03 tax/legal/profile/v1 holds, both instrument holds, P04 production cleanup, customer-facing publication, deployment changes, credentials, money and customer communication remain held. No historical PDFs, request hashes or evidence are rewritten. Original local work remains untouched.
