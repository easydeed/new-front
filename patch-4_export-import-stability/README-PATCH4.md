# Patch 4 — Export/Import Stability + Modern Mode Preview Retention

**Objective**
1) Fix all import shape mismatches (default vs named) that lead to *“Minified React error #300”* and sporadic hydration/runtime crashes.  
2) Guarantee the Modern wizard **stays Modern** on Finalize/Preview by preserving `?mode=modern` with a tiny cookie + middleware shim (no page logic rewrites).

**Why this patch**
- Your **Phase 15 v5 Export/Import Audit** enumerates the canonical export shapes (components = default; hooks/utils = named). Any drift breaks bundles at runtime.  
- We also observed that after Finalize the app sometimes lands on Classic. The middleware fix preserves `?mode=modern` without touching your page code.

---

## Contents

```
patch-4_export-import-stability/
├─ README-PATCH4.md  (this file)
├─ scripts/
│  ├─ patch4-fix-imports.mjs         # codemod: rewrites wrong imports across repo
│  └─ patch4-verify.mjs              # sanity check for transformed imports
└─ files/
   ├─ middleware.ts                  # Next.js middleware; keeps mode=modern on preview
   ├─ features/wizard/hoc/ModeCookieSync.tsx   # syncs ModeContext to cookie "wizard-mode"
   └─ features/wizard/utils/withMode.ts        # helper to append ?mode=<mode> to any url
```

> **Non‑destructive by default:** The codemod runs in **dry‑run** mode until you add `--write`. It also creates a **git patch** for easy review/rollback.

---

## Pre‑Flight

- Branch: create a working branch first
  ```bash
  git checkout -b patch4/export-import-stability
  ```
- Ensure Node ≥ 18 and a working install
  ```bash
  node -v
  pnpm -v || yarn -v || npm -v
  ```

---

## 1) Drop the files into your repo

Copy the `patch-4_export-import-stability/` folder into your **repository root** (same level as `package.json`).

---

## 2) Run the import codemod (DRY‑RUN)

```bash
node patch-4_export-import-stability/scripts/patch4-fix-imports.mjs
```

You’ll see a list of files that **would** be changed.

If everything looks good, apply changes:

```bash
node patch-4_export-import-stability/scripts/patch4-fix-imports.mjs --write
```

> The script:
> - Scans `src/` and `frontend/src/` (Next.js mono-repo friendly).
> - Uses the **canonical map** from your audit to rewrite incorrect imports.
> - Creates a backup patch at `.patch4/last-run.diff`.

---

## 3) Add Modern mode retention

**A.** Place middleware into your repo root (Next.js expects `middleware.ts` at root):
```
/middleware.ts  ← use the file from patch: patch-4_export-import-stability/files/middleware.ts
```

If you already have a middleware, merge the logic (search for `// PATCH4:` comments).

**B.** Add the cookie sync tiny component to your Wizard frame (once, near the root of the wizard UI):

```tsx
// Example: frontend/src/features/wizard/layout/WizardFrame.tsx
import ModeCookieSync from '@/features/wizard/hoc/ModeCookieSync';

export default function WizardFrame({ children }) {
  return (
    <>
      <ModeCookieSync />    {/* Keeps cookie in sync with current mode */}
      {children}
    </>
  );
}
```

> This syncs ModeContext → `wizard-mode` cookie so the middleware can preserve `?mode=modern` when you navigate to `/deeds/:id/preview` or open a new tab/window.

**C.** (Optional safety) Wrap any programmatic redirect to preview with `withMode()`:

```tsx
import { withMode } from '@/features/wizard/utils/withMode';
import { useWizardMode } from '@/features/wizard/ModeContext';

const { mode } = useWizardMode();
router.push(withMode(`/deeds/${id}/preview`, mode));  // always adds ?mode=modern when modern
```

> The codemod also attempts to auto‑upgrade obvious `router.push("/deeds/${id}/preview")` calls.

---

## 4) Build & Test

```bash
pnpm install    # or yarn / npm
pnpm build      # ensure compiles
pnpm dev        # run local
```

Manual QA (focus):
1. Modern wizard → complete all steps → **Finalize** → preview opens at `/deeds/:id/preview?mode=modern`.
2. Toggle to Classic and back → no hydration/React #300 errors.
3. Hard refresh during any step → state persists correctly; no “NOT HYDRATED – returning empty” loops.
4. Smoke the classic wizard too (unchanged behavior).

---

## 5) Commit

```bash
git add -A
git commit -m "patch4: fix export/import shapes + keep mode=modern on preview"
```

---

## Notes

- This patch only **harmonizes import shapes** (no API surface changes).  
- Middleware is a **minimal, SSR‑safe** way to keep Modern mode sticky without refactoring pages.
- If you later add a dedicated `WizardRouteGuard`, the middleware can remain as a fallback.

---

## Troubleshooting

- **Still seeing React error #300?** Run `node patch-4_export-import-stability/scripts/patch4-verify.mjs` and check for any remaining mismatches. If a file wasn’t auto‑fixed (unusual import form), update manually per the canonical map in the script.
- **Preview still lands on Classic?** Verify that `ModeCookieSync` renders (once) and that `document.cookie` shows `wizard-mode=modern`. Also ensure `middleware.ts` is at repo root and deployed (Next.js prints middleware routes at build).

Good hunting 👌
