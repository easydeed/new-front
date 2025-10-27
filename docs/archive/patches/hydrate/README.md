# Phase 15 — Hydration Hardening (Dual‑Mode Wizard)

**Date:** 2025-10-15

This package fixes React hydration mismatches by:
- **Gating SSR/CSR branching** in the wizard (no mode/property branching until client is hydrated).
- **Isolating persisted keys** for **Modern** vs **Classic** (`deedWizardDraft_modern` / `deedWizardDraft_classic`).
- **Deferring localStorage access** to **after mount** via safe helpers.
- Keeping **Step 1 (Property Search)** **unchanged** and **Modern Q&A** starts *after* verification.

It directly addresses the issues found in your Hydration Analysis (Error #418 + stale address bleed) and aligns with the Systems Architect guidance to preserve Step 1 and canonical finalize. 

