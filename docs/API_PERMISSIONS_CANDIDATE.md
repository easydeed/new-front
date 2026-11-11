# API permissions candidate and cutover hold

P05 D1–D8 engineering approved by the owner on 2026-11-10. This candidate implements D1–D6 preparation; D7 is a separate administrator-session repair and D8 remains a separate test-provenance proposal. **Do not merge or activate this candidate until the owner separately approves the existing-key inventory, explicit per-key grants and release.** There is no compatibility switch or automatic grandfather grant. Current main is not claimed to enforce this candidate's contract.

## Candidate authorization contract

`backend/services/api_permissions.py` is the only operation-to-scope registry. Handlers and direct internal calls enforce the same authorizer before rendering, lifecycle sweeps or document persistence. API-key authentication still precedes body validation; denied authenticated requests consume the existing authentication rate budget but do not trigger the handler's lifecycle work. Authorization never authenticates twice or grants ownership.

The operations are create (`deed:create`), metadata/list (`deed:read`), stored PDF (`deed:pdf`), confirmation-link disclosure (`deed:handoff`) and calculator (`tax:calculate`). Permissions do not imply each other. The evidence/usage names are reserved but unavailable for issuance because there are no corresponding partner endpoints. Public verification and specification stay public and unchanged; existing admin usage routes stay admin-only.

Missing permission returns structured 403 `INSUFFICIENT_SCOPE`. A sufficiently authorized caller requesting another key's record still gets 404. The existing exact-key SQL predicates and idempotency namespace remain. Neither an organization match nor shared NULL state grants access. Create, replay and retrieve all return `urls.confirmation=null` without the independent handoff grant. The field was already nullable; no new public route or response field is introduced. A PDF URL is not a bearer credential: its route still requires the independent PDF permission.

`/try/deed` explicitly requires create and handoff authorization before its direct internal create call; its existing watermark and exact demo markers remain unchanged. No demo key is reissued or modified. Existing confirmation links retain their current independent bearer authority after API-key pause/revocation; this release does not cancel links or claim verified identity/reading.

Manual admin issuance requires an explicit list of unique supported scope names, including an intentional empty grant if desired. Missing/null, unknown, reserved, duplicate, wildcard and altered spellings are refused. Admin list/detail expose saved scopes and revocation state. The console fetches the server permission vocabulary, selects nothing by default, displays stored grants and distinguishes pause/resume from permanent revoke. A failed vocabulary load disables issuance. This is an internal candidate console, not approved customer-facing publication.

DELETE records terminal revocation and disables the key. Authentication refuses either inactive or timestamped records. Repeated revocation preserves its first timestamp; PATCH cannot resume a timestamped key. PATCH may pause/resume a never-revoked key. These deliberate changes are part of the held cutover, not already-active production behavior. Historical timestamps are not backfilled, cleared or relabeled.

## Inventory and transition preparation

The prepared `backend/scripts/api_permission_review.py` opens a read-only session directly. It deliberately does not import `database`, whose import starts schema-writing convergence. The command asserts both required tables and an optional exact expected database. Its successful output contains aggregate counts only: key state, scope shapes, conflicting revocation facts and API records without a key owner. An exception prints a generic refusal rather than credential, failing-row or contact data. No production invocation has been authorized or performed.

`services/api_permission_transition.py:plan_manifest` is a pure rehearsal. It accepts only opaque key IDs, prior scopes/state and explicit owner decisions. Every key must appear exactly once, with a bounded opaque owner reference and selected scopes. It neither groups keys nor guesses grants. It includes an independent copy of prior values for a scope/state reversal rehearsal and always returns `apply_allowed=false`. There is no executable apply/backfill/reissue command, and restoring old scope values is not represented as restoring the old unenforced authorization behavior.

Before any existing-key cutover, the owner must authorize real aggregate inventory, resolve every affected key—including nonempty/default scopes and any demo service key—approve an explicit grant manifest, and separately approve release. Ambiguous records or inactive/revocation discrepancies remain held. Request logs are not proof of every operation a caller needs. No key contents, hashes, caller emails or default organization are ownership evidence.

## Regression and integration gates

The new permission matrix tests exercise no implicit scopes, strict issuance vocabulary, actual bcrypt/SQL authentication, denied creation without rendering/persistence, metadata without handoff, create/replay/retrieve consistency, PDF access, exact-key isolation across shared/NULL organizations and key classes, pause/resume, terminal revocation and retained bearer-link access. The admin UI tests use a server-supplied vocabulary and prove explicit selected grants and disabled issuance on failed loading.

Existing synthetic API fixtures and `api_baseline.py` explicitly request the operations they exercise. This changes synthetic setup, not production grants. Baseline snapshots, OpenAPI route expectations and the five proof outcomes are not rerecorded or waived. The admin creation response keeps its existing fields; scope/state visibility is in list/detail. The existing held-instrument direct-call test now supplies a create-authorized context so it still tests the instrument hold rather than stopping at an earlier permission refusal.

Both full suites, all five marked-database proofs, build, browser safety, scanners/audits, guard mutations and unchanged type/lint ceilings remain blocking. The exact verification receipt records failed attempts and final gates. Passing a candidate does not authorize its merge or establish live caller compatibility. Following integration of the independent D7 repair, this branch must be based on actual main and verified again before any eventual merge.

P03 legal/profile/v1 activation, both instrument holds, P04 production inventory/cleanup, all historical redaction, real backup/restore reconciliation, deployment settings, credentials, money, customer communication and customer-facing publication remain held. P05 customer cutover, P08 ownership, P07 recovery and G1 are not complete.
