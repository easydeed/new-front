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
