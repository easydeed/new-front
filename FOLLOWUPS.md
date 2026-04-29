# FOLLOWUPS

Items noticed while doing scoped work. Not fixed inline; recorded here for later.

## From: "Relocate prefill and recent-properties services out of wizard folder"

### Stale path references in Markdown docs

After moving the two service files, the following docs still reference the old `frontend/src/features/wizard/services/` paths. They are historical/spec documents, not code, and were out of scope for the relocation commit. Sweep these when the wizard cleanup reaches the docs pass:

- [BREAKTHROUGHS.md:186](BREAKTHROUGHS.md) — mentions `propertyPrefill.ts` old path.
- [CURSOR_WIZARD_AI_INTEGRATION.md:267,319,322](CURSOR_WIZARD_AI_INTEGRATION.md) — code snippets showing old import path and "File:" header with old path.
- [DeedPro_Project_Plan.md:862,875,1408,1770,1783](DeedPro_Project_Plan.md) — multiple references to both files under the old path.
- [docs/wizard/ARCHITECTURE.md:306](docs/wizard/ARCHITECTURE.md) — references `propertyPrefill.ts` old path.
- [START_HERE.md:167](START_HERE.md) — references `propertyPrefill.ts` old path as part of onboarding reading list.
- [CLEANUP_AUDIT.md](CLEANUP_AUDIT.md) — the audit report itself (lines 133, 134, 383, 386, 388) still references the pre-move paths; that's expected since the audit is a point-in-time snapshot. Either regenerate or add an annotation noting the services have been relocated.

### Pre-existing TypeScript errors (unrelated)

`npx tsc --noEmit` reports 21 errors, all in [frontend/src/__tests__/integration/api-contract.test.ts](frontend/src/__tests__/integration/api-contract.test.ts). They pre-date the relocation — verified by running tsc against the pre-move state via `git stash`, which produced the identical 21 errors in the identical file. The errors look like TypeScript misparsing JSX-style generics (`TS1005: '>' expected`, `TS1109: Expression expected`) on a `.ts` file. Either rename to `.tsx`, rewrite the generics, or exclude the file from the typecheck — out of scope for the relocation commit.

## From: "Redirect legacy /create-deed routes to /deed-builder"

### Middleware still references the legacy path

[frontend/middleware.ts](frontend/middleware.ts) was intentionally left unmodified during the redirect work. After the wizard deletion it should be revisited:

- `protectedRoutes` still contains `/create-deed`. With the pages now redirecting, middleware correctly auth-gates the legacy URL before the redirect fires (fine). Once the legacy routes are eventually deleted (post-wizard-death), `/create-deed` can be dropped from this list.
- `protectedRoutes` does NOT contain `/deed-builder`. Appears to be an existing oversight — unauthenticated users can currently load the DeedBuilder page directly. Worth adding (`/deed-builder`) to the list to match the intent of the old `/create-deed` entry.
- The `?mode=modern` rewrite branch (`const isWizardRoute = /^\/create-deed\/[\w-]+$/.test(pathname)` and the `NextResponse.rewrite(url)` call) is a Phase-24 classic-vs-modern toggle artifact. After the wizard is deleted the `wizard-mode` cookie and the `mode` query param serve no purpose. Both the regex and the rewrite branch can be removed; at that point the `modeCookie` read at the top becomes unused too.

### `useBuilderMode` hook still checks the legacy path

[frontend/src/hooks/useBuilderMode.ts:11-12](frontend/src/hooks/useBuilderMode.ts:11) detects builder routes with `pathname?.includes('/deed-builder') || pathname?.includes('/create-deed/')`. After our server-side redirects, DeedBuilder at runtime only ever sees `/deed-builder` pathnames — the `/create-deed/` branch is dead. Safe to drop when the wizard cleanup lands; leaving it now doesn't affect behavior.

### `?fresh=true` draft-clearing no longer fires

The legacy `/create-deed/[docType]` page used to clear `deedWizardDraft_modern` / `deedWizardDraft_classic` in localStorage when `?fresh=true` was present. The redirect page still forwards the query string to `/deed-builder/[type]`, but DeedBuilder does not currently handle `?fresh=true`. Behavior is dormant, not lost — if/when DeedBuilder grows its own draft-storage model, teach it to honor `?fresh=true`. Low priority; the wizard drafts were wizard-state-specific and won't exist once the wizard is deleted.

### Landing-page dead-end audit was high-yield

The `/create-deed` → `/deed-builder` sweep touched 14 links across 10 files (StickyActionBar, escrow Hero, main Hero, Footer, Pricing, past-deeds, voice, mobile, team, deeds/[id]/preview). Several of those are primary conversion paths. Useful signal that future route-rename work should always run the same grep before finalizing.

## From: "Remove legacy wizard implementations; DeedBuilder is the single deed creation UI"

### Resolved by this commit

The four FOLLOWUPS entries above under *"Redirect legacy /create-deed routes to /deed-builder"* are addressed:

- **Middleware `/create-deed` removal**: dropped from `protectedRoutes`. ✅ done in this commit.
- **Middleware `/deed-builder` addition**: added to `protectedRoutes`. ✅ done in this commit.
- **`?mode=modern` rewrite branch removal**: entire branch deleted (modeCookie read, wantsModern, hasModeParam, isPreview regex, isWizardRoute regex, the searchParams.set call, the NextResponse.rewrite call, the "preserve mode param" parenthetical in the loginUrl comment). ✅ done in this commit.
- **`useBuilderMode` `'/create-deed/'` branch removal**: dropped from the pathname include check. ✅ done in this commit.

The `?fresh=true` draft-clearing entry above is now moot — wizard draft storage no longer exists. DeedBuilder has its own state model. The query param forwards harmlessly through the redirect page; if DeedBuilder ever wants to honor it for draft-reset semantics, that's net-new behavior, not a regression.

### Cypress e2e tests reference deleted routes and dying-wizard UI semantics

After deleting the wizard, the e2e suite still references `/create-deed` URL paths and tests wizard-specific UI flows that no longer exist:

- [cypress/e2e/accessibility-compliance.cy.js](cypress/e2e/accessibility-compliance.cy.js) — 14 references; mostly `cy.visit('/create-deed')` and `cy.visit('/create-deed/grant-deed')` for accessibility scans. These visits will follow redirects to `/deed-builder` and the underlying a11y assertions will run against DeedBuilder. Tests that assert page titles like `/create.*deed|wizard/i` (line 286) may need updating but are flexible enough to potentially still match.
- [cypress/e2e/wizard-regression-pack.cy.js](cypress/e2e/wizard-regression-pack.cy.js) — entire file is a wizard-specific regression pack. Tests code that no longer exists. The `cy.url().should('include', '/create-deed')` assertion at line 97 will fail outright after the redirect lands the user at `/deed-builder`. Recommended: delete the file in the cleanup commit; rewrite as a DeedBuilder regression suite separately if desired.
- [cypress/e2e/debug-simple.cy.js](cypress/e2e/debug-simple.cy.js) — 3 references; debug script that probes "what text is on the create-deed page." Likely safe to delete or repoint.
- [cypress/support/commands.js](cypress/support/commands.js) — login helper that visits `/create-deed` and asserts URL includes `/create-deed/grant-deed`. The URL assertion at line 70 will fail after the redirect. This is a shared command used by other tests, so updating it is high-leverage.

**CI signal during the gap**: e2e CI may show failures until this cleanup lands. These failures are expected fallout from this commit, not regressions in the surviving DeedBuilder code. The wizard tests were already testing dead semantics; their CI signal was meaningless. Deserves its own dedicated commit ("Update e2e tests for DeedBuilder-only world") so the test-rewrite work doesn't get lumped into the wizard-deletion blame.

### Comment substring cleanup in surviving files

Two surviving files contained stale comment substrings referencing now-deleted code:
- [frontend/src/app/create-deed/[docType]/page.tsx](frontend/src/app/create-deed/[docType]/page.tsx) — comment mentioned `WizardHost` and `?mode=modern`. Both updated inline.
- [frontend/src/utils/canonicalAdapters/index.ts](frontend/src/utils/canonicalAdapters/index.ts) — comment mentioned `ModernEngine` and `canonicalFromUrlParam()`. Updated inline to describe the surviving caller pattern.

These were cleaned under the prompt's "remove dead imports or unused references only" rule. No behavior change.
