# Temporary tax deed generation hold

**DECIDED 2026-11-09.** The owner explicitly approved: “Approve temporary block and eight-type P02.” This implements the containment phase of the tax-deed proposal, not its unapproved legal/form redesign. The eight available API instruments remain supported; the registered tax-deed identity remains available for historical labels and records.

## Behavior

Subsequent owner-approved D5 containment on 2026-11-10 also holds interspousal generation and pending approval. The offered API set becomes seven types; the earlier eight-type tax-only containment/P02 scope is historical. Current availability comes from the single shared policy. See [interspousal containment](INTERSPOUSAL_CONTAINMENT.md); neither hold restores or legally clears its form.

The single policy is `backend/services/instrument_availability.json:1`. Python and TypeScript read that same corpus. The public schema, capability counts, developer table, application picker, recent choices and direct builder links reflect the hold. Accepted legacy aliases and case/whitespace variants cannot bypass it.

New public API requests for a held type receive a field-specific 422 validation error. The API handler also checks availability defensively before opening the deed database connection. Application generation and the feature-flagged direct generator refuse with 409 `INSTRUMENT_UNAVAILABLE` before saving/rendering. The shared `render_deed_pdf` entry point refuses before HTML/PDF rendering, including attempted legacy self-heal that would create new bytes. No environment flag bypass is introduced.

Preexisting pending tax-deed previews stay viewable and rejectable, but approval cannot promote them into a new completed instrument. This prevents an existing pending token from bypassing the generation hold. `can_approve` becomes false; the approval endpoint independently refuses before promotion or authenticity inserts. No pending row is rewritten just because the hold was added.

Already stored completed PDFs remain downloadable, including through existing confirmation preview links. The hold does not filter read/list/evidence routes, mutate stored bytes, revoke access, delete drafts or rewrite hashes. Create/replay POST requests for a held type are refused; use the existing GET routes to retrieve historical records. A historical row with no stored artifact cannot manufacture a replacement through self-heal while the hold is active. Separate partial-draft save behavior is unchanged.

The archived template and registered metadata remain in the repository; the containment does not edit its legal text. HTML furniture tests can inspect that retained template, but this is not a public creation capability or legal clearance. All maintained tax-PDF-producing entry points and pending promotion are blocked. Arbitrary code with process access is not a separate authorization boundary.

## Compatibility and P02

This is an explicit owner-approved v1 safety cutover. Callers that previously generated tax deeds must stop doing so; no automatic substitute instrument is selected. Production usage and external callers have not been inventoried, and no customer communication is performed here. Existing provider auto-deploy hooks may respond to approved main merges; no manual deployment or hosting-setting change is included.

P02's original nine-type rendering criterion is revised by the owner's explicit approval: require successful validation/rendering for all eight available types and a positive refusal/no-artifact proof for the held tax type. This is not permission to skip a failing test or assert the tax form was repaired. P02 must be rebased onto the merged containment commit and pass its own gates before merging.

## Verification and rollback

The regression suite exercises public HTTP validation, internal-handler defense, application generation, the mounted legacy generator, shared PDF creation, capability/docs/picker consistency, completed historical byte retrieval and pending-preview non-promotion. Real-database fixtures create their own baseline and verify completed bytes remain identical while pending rows stay pending with no final PDF/authenticity. The guard mutation deliberately disables the policy in an isolated no-DB process; the refusal test must fail rather than report a pass.

Both maintained suites, all five database proofs, unchanged OpenAPI/six-flow/API snapshots, production build, type/lint ceilings, browser safety proofs, secret/claims scans and dependency audits remain blocking. Exact results belong in the review and evidence record; this document does not claim unrun gates passed.

The initial Vercel Preview failed because `.vercelignore` excluded the backend directory containing the shared policy, despite full-checkout local and CI builds passing. The owner approved a narrow packaging correction on 2026-11-09: only `backend/services/instrument_availability.json` is included; all other backend files remain excluded. The regression test evaluates the ignore rules against every tracked backend file, checks representative excluded private/nested paths, and detects removal of the one-file exception. Exact-head Preview must pass after this correction. No hosting settings, root directories or service layout are changed.

No schema or data migration is required. Reverting this patch would re-enable the known unsafe tax-deed generation path, so rollback is not a safe restoration of the capability. Lifting the hold requires a separately reviewed change after the county workflow, form, field/recital map, dates and explicit tax-instruction contract are approved. Stored historical documents are not regenerated as part of either containment or future restoration.

Implementation: `backend/services/instrument_availability.py:1`, `backend/services/api_catalog.py:1`, `backend/schemas/api_v1/deeds.py:1`, `backend/services/deed_pdf.py:147`, `backend/tests/test_instrument_availability.py:1`, and `frontend/src/lib/instrumentAvailability.ts:1`.
