# Cursor Tasks — Phase 15 Hydration Hardening

## 0) Branch
git checkout -b fix/wizard-hydration-phase15

## 1) Copy these files into your repo (same paths)
frontend/src/shared/hooks/useHydrated.ts
frontend/src/shared/safe-storage/safeStorage.ts
frontend/src/features/wizard/mode/HydrationGate.tsx
frontend/src/features/wizard/mode/bridge/persistenceKeys.ts
frontend/src/features/wizard/mode/bridge/withPersistedDraft.tsx
frontend/src/features/wizard/mode/bridge/debugLogs.ts
frontend/src/features/wizard/mode/bridge/useWizardStoreBridge.ts   # updated (no direct localStorage; hydration-gated)

## 2) Apply patches
- frontend/patches/010_wizard_host_hydration_gate.diff
- frontend/patches/011_mode_context_defer_storage.diff

If a patch rejects, open the file and insert the indicated snippet blocks manually.
Search for the anchors `// [Phase15]` in patch content to place code safely.

## 3) Replace direct localStorage calls (search & replace)
- Search for: `localStorage.getItem('deedWizardDraft'`
- Replace with: `safeStorage.get(WIZARD_DRAFT_KEY_CLASSIC)` in classic codepaths
- For modern codepaths: `safeStorage.get(WIZARD_DRAFT_KEY_MODERN)`
- Ensure all reads happen **inside useEffect** or after `useHydrated()` is true.

## 4) Verify (dev)
- Start on `/create-deed/grant-deed?mode=modern`
- First render should show a neutral shell (no Step 1 vs Modern branching) until hydrated.
- After hydration: If property is **not** verified → Step 1 shows; if verified → Modern Q&A shows.
- Refresh: No hydration error (#418). No stale address bleed from Classic.

## 5) Rollback
- Revert the two patch files and delete the six added files above (this only affects hydration safeguards).
