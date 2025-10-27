# DeedPro — Build‑Fix v7.2 (Cursor‑ready)

**Goal:** Fix the two build‑blocking edits introduced by prior patching while keeping all v7.1 functionality intact.

## What this package fixes
1) **promptFlows.ts** — replaces the entire `legalDescription.showIf` body with `shouldShowLegal(state)` and **removes** the leftover inline function (the duplicate lines that caused `Expected ',' got 'const'`).  
2) **ModernEngine.tsx** — safely augments each `<PrefillCombo …/>` block to include:
   - `partners={current.field === 'requestedBy' ? partners : []}`
    - `allowNewPartner={current.field === 'requestedBy'}`
    - `onFocus` / `onBlur` wiring for `__editing_legal`
   It **never** touches your existing `onChange` prop (prevents the “mangled onChange” error).

The patcher is **multiline‑aware** and uses balanced‑brace scanning instead of brittle single‑line regex.

## Apply (inside Cursor)
```bash
git checkout -b fix/buildfix-v7-2
node deedpro_buildfix_v7_2/scripts/apply_buildfix_v7_2.mjs .
# Optional: run an actual build as part of verify (recommended)
BUILD_CHECK=1 node deedpro_buildfix_v7_2/scripts/verify_buildfix_v7_2.mjs .
# or without build:
node deedpro_buildfix_v7_2/scripts/verify_buildfix_v7_2.mjs .

git add -A
git commit -m "chore: Build‑Fix v7.2 — safe patch for promptFlows + ModernEngine"
git push -u origin fix/buildfix-v7-2
```

## What it does under the hood
- Creates `*.bak.v7_2` backups before modifying files.
- **promptFlows.ts**  
  - Adds: `import { shouldShowLegal } from '@/lib/wizard/legalShowIf';` if missing  
  - Locates `id: 'legalDescription'` (or `"legalDescription"`), finds `showIf:` and its arrow‑function body (block or expression), and replaces the entire body with `shouldShowLegal(state)` (adding the comma if necessary).
- **ModernEngine.tsx**  
  - Ensures an import + hook for `usePartners()` (if not present).  
  - For every `<PrefillCombo …/>`, scans to the self‑closing `/>` and injects missing props on separate lines, preserving indentation and **not** rewriting `onChange`.

## Why this directly addresses your report
- It fixes the two exact failure modes you documented: duplicate `showIf` body and mangled `onChange` in multi‑line JSX. fileciteturn0file0
- It aligns with the earlier diagnostic write‑ups (partners/propagation/legal behavior) without changing their logic — we’re only making the patch **build‑safe**. fileciteturn0file1 fileciteturn0file2 fileciteturn0file3 fileciteturn0file4

## Post‑apply smoke (2 minutes)
- `npm run build` completes. (Use `BUILD_CHECK=1` with the verify script to automate.)
- Open the app:
  - Legal Description step no longer throws build errors; it stays visible while typing and only hides when valid. fileciteturn0file1
  - Requested‑By field:
    - Typing without selecting still flows to state/PDF (PrefillCombo propagation fix remains). fileciteturn0file2 fileciteturn0file3 fileciteturn0file4
  - Partners list loads (proxy + context remain as v7.1 shipped).

## Rollback
- The apply script leaves `*.bak.v7_2` files next to originals. To rollback a file:
  ```bash
  mv frontend/src/features/wizard/mode/prompts/promptFlows.ts.bak.v7_2          frontend/src/features/wizard/mode/prompts/promptFlows.ts
  mv frontend/src/features/wizard/mode/engines/ModernEngine.tsx.bak.v7_2          frontend/src/features/wizard/mode/engines/ModernEngine.tsx
  ```

## Notes
- This package does **not** overwrite entire files; it patches in place. If your code has unusual variations, the script logs WARNs and leaves files unchanged so you can adjust manually without breaking your build.
- The verify script detects common regressions (e.g., residual `const legal…` after `shouldShowLegal(state)` or the “mangled onChange” pattern) and can optionally run your real build to be certain.
