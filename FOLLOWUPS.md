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
