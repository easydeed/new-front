# Dual‑Mode Wizard v4.1 — Finalize & Layout Unification

**Date:** 2025-10-15

This package builds on **Phase 15 (Hydration Hardening)** and fixes the three issues you reported:

1) **Generate → Classic redirect**: We now finalize via adapters, POST to your API, and redirect to **preview with `?mode=modern`**, so you remain in Modern context.
2) **Missing toggle**: Injects **ModeSwitcher** in the wizard header on every wizard page.
3) **Layout mismatch**: Introduces **WizardFrame** so Modern looks/feels identical to Classic (header, padding, typography).

Everything is additive; Step 1 (Property Search), backend routes, and PDFs remain unchanged.
