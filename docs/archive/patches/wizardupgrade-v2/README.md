# DeedPro — Dual‑Mode Wizard v4 (Systems Architect–Aligned)

**Date:** 2025-10-14

This update **resolves the concerns in your Systems Architect analysis** while preserving all of your hard work:

**Key fixes (no regressions):**
1) **Do NOT change Step 1** — we **reuse your existing property search** as‑is, then enter Modern Q&A.  
2) **Single source of truth** — Modern Q&A reads/writes through your **existing wizard store** (no siloed state).  
3) **Finalize integration** — use **canonical adapters** to build the exact payload your backend/PDF expects and POST before redirect.  
4) **Validation hooks** — field‑level validators + completeness score, surfaced in Smart Review.  
5) **Safety** — Error boundary around Modern engine (falls back to Classic); optional Mode‑switch guard.

This is a **hybrid**: Property Search (Step 1) → Modern Q&A (Parties, Vesting, etc.) → Smart Review → Finalize.

> All prior packages remain compatible (Prompt Library, Adapters, Smart Review templates, DeedTypeBadge). v4 just **wires them correctly** to your store and Step 1.
