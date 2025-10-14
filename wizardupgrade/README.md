# DeedPro — Dual‑Mode Wizard v3 (Modern Q&A + Traditional) + Canonical Adapters

**Date:** 2025-10-14

This version adds:
- **Prompt Library** with deed‑type specific questions (Grant, Quitclaim, Interspousal, Warranty, Tax).
- **Per‑docType Smart Review templates** and **DeedTypeBadge** (clarity).
- **Canonical Adapters** (toCanonical / fromCanonical) for all 5 deed types — a safe bridge from UI state to the canonical payload the backend & PDF expect.

Everything is **presentation-only** by default and **wizard-safe**. Finalize continues to use your existing path unless you opt into the adapters in step 4 (one line).
