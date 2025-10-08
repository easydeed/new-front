# DeedPro — Phase 6-1 Release Train Kit

**Purpose:** Execute the Wizard‑First integration plan with **periodic deployments** and **fast feedback**.

This kit gives you:
- High‑priority patches (frontend + backend) to connect **Past Deeds**, **Shared Deeds**, and **Dashboard stats**.
- A GitHub Actions **Release Train** pipeline (staging daily, prod after smoke tests).
- Playwright **smoke tests**: wizard → deeds → shared → admin health.
- **Cursor tasks** to apply patches, run servers, test locally, and ship.

> Source plans referenced in this kit: *Phase 6‑1 System Analysis*, *Wizard‑First Integration Patch 1*, and *Patch 2 roadmap*.


## Quick Start (in Cursor)
1. **Open your repo** in Cursor (root of your monorepo).
2. **Unzip** this kit somewhere (or drag‑drop into the workspace).
3. Run **Tasks → Phase6: Apply Frontend Patches**.
4. Run **Tasks → Phase6: Apply Backend Patches**.
5. Run **Tasks → Phase6: Dev (FE+BE)** to start both servers locally.
6. Run **Tasks → Phase6: Smoke Tests (Playwright)**.
7. Commit and push your branch; GitHub Actions will pick up the **Release Train**.

If any patch fails to apply cleanly, copy the matching file from `snippets/` into place, or open the `.patch` alongside your file and apply the diff manually (they are surgical and small).


## Branching & Flags
- Create a working branch: `feat/phase6-1`.
- Keep the **wizard** code pristine; integration code lives in pages/components outside the wizard.
- Use the feature flags in `.env` (and in the sidebar component) to **hide deferred** sections (Team/Voice/Security).


## Release Train (default schedule)
- **Staging**: Every weekday at **16:00 PT** (23:00 UTC).
- **Prod**: After staging smoke tests pass and a **1‑hour soak**, at **18:00 PT** (01:00 UTC next day).
- Both schedules are declared in `.github/workflows/release-train.yml` and can be changed.

