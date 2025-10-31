# V0 Prompt – Dashboard (Data Layer Preserved)

**Keep exactly** (do NOT remove hooks/effects):
1) Auth guard: check localStorage token; verify with `GET /users/profile`, redirect to `/login?redirect=/dashboard` on failure
2) Stats: `GET /deeds/summary` → { total, completed, in_progress, month }
3) Recent deeds: `GET /deeds` (last 5)
4) Draft detection: localStorage['deedWizardDraft'] to show "Resume draft" banner
5) Sidebar slots (keep prop/hole for existing sidebar)

**Task**: Upgrade visuals—cards, table, banner, empty states, loading skeletons, subtle motion (respect prefers‑reduced‑motion). No global CSS, Tailwind v3 only.

**Deliver**: `page.tsx` (client component) with identical data orchestration and much better UI.
