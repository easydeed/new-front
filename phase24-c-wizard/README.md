# DeedPro • Phase 24‑C Wizard UI Upgrade (V0‑Driven) — Cursor Package

**Date**: 2025-10-31

This package gives you a *safe, incremental, UI‑only* facelift for the Wizard (Modern + Classic) while **preserving all logic** (SiteX hydration, canonical adapters, finalizeDeed v6, PDF generation).

**What you get**
- Step‑by‑step playbook (`01_STEP_BY_STEP_PLAN.md`)
- V0 prompts for each atomic UI component (`/prompts`)
- Drop‑in visual wrappers (`/src/components/wizard/ui/*.tsx`) — className‑driven, no logic
- Shadow‑free layout for isolation (`/src/app/(v0-wizard)/layout.tsx`, `globals-v0.css`)
- CSS isolation fallback (`nuclear-reset.css`) and a scoped vibrancy patch
- Feature‑flag patch example and kill‑switch
- Analytics hooks for wizard step telemetry (`/src/lib/analytics/wizardEvents.ts`)
- Apply + verify scripts for Cursor

> **Scope**: UI/Styling only. All business logic, adapters, and data flow remain unchanged.
