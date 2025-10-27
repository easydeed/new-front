# Cursor Tasks — v4.2 Badge/Toggle/Layout

## 0) Branch
git checkout -b fix/wizard-v4_2-badge-toggle-layout

## 1) Add new files
- frontend/src/features/wizard/mode/utils/docType.ts
- frontend/src/features/wizard/mode/layout/ask-layout.css

## 2) Apply patches
git apply frontend/patches/030_page_doctype_mapping.diff
git apply frontend/patches/031_modern_engine_badge_and_flow.diff
git apply frontend/patches/032_step_shell_centered_layout.diff
git apply frontend/patches/033_wizard_frame_toggle_in_header.diff

If a patch does not apply, open the target file and insert blocks marked `// [v4.2]` manually.

## 3) Verify
- Route to `/create-deed/quitclaim-deed?mode=modern`
- Header badge shows **Quitclaim Deed**
- No secondary badge inside Modern content
- Toggle visible in header; switching modes preserves deed type
- The question column is **centered**; inputs/buttons are large; spacing matches Classic
- Complete flow → Finalize → Preview stays in **?mode=modern** (from v4.1)

## 4) Rollback
- Revert the four patches; delete the two new files.
