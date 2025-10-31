# Rollback & Feature Flags

## Flags (copy into your project)
```ts
// src/config/featureFlags.ts (or merge these into your file)
export const FEATURE_FLAGS = {
  NEW_AUTH_PAGES: false,
  NEW_DASHBOARD: false,
  NEW_WIZARD_MODERN: false,
  NEW_WIZARD_CLASSIC: false,
} as const;
```

## Gate your routes
**Auth example** (App Router entry):
```tsx
'use client'
import { FEATURE_FLAGS } from '@/config/featureFlags'
import LoginV0 from '@/app/(auth)/login/page.v0'
import LoginOriginal from '@/app/(auth)/login/page'

export default function LoginEntry() {
  return FEATURE_FLAGS.NEW_AUTH_PAGES ? <LoginV0/> : <LoginOriginal/>
}
```

**Dashboard example**:
```tsx
'use client'
import { FEATURE_FLAGS } from '@/config/featureFlags'
import DashboardV0 from '@/app/dashboard/page.v0'
import DashboardOriginal from '@/app/dashboard/page'

export default function DashboardEntry() {
  return FEATURE_FLAGS.NEW_DASHBOARD ? <DashboardV0/> : <DashboardOriginal/>
}
```

## Rollback checklist (30s)
1. Flip the flag to `false`
2. Commit & deploy
3. Verify routes and logs
4. Open a follow‑up issue with a screenshot + error snippet

## Session continuity tip
- Do **not** change `localStorage` keys or auth cookie names across versions.
- Keep the draft key as `'deedWizardDraft'` for both UIs.
