# DeedPro – Phase 24‑B Cursor Package (Dashboard + Auth + Wizard UI Prompts)

This package gives you a **10/10 execution path** to ship Phase 24‑B:
- **Auth** (Login, Registration, Forgot/Reset)
- **Dashboard** (data-rich, plug-and-play)
- **Wizard** UI facelift (component-level prompts, UI-only refactor)

It includes:
1) **V0 prompts** ready to paste into https://v0.dev (one file per surface).
2) **Example Next.js client pages** with **guardrails & data orchestration** (AuthManager, API calls, draft detection).
3) **Feature flags & rollback strategy** (docs + code stubs).
4) **Testing scaffolds** (Jest/RTL + Playwright-ready structure).
5) **Tailwind v4→v3 converter** helper + **CSS isolation** artifacts.

**How to use (quick):**
1. Open in Cursor → run through `/docs/STEP_BY_STEP.md` in order.
2. Use prompts in `/prompts/**` to generate V0 output; paste results into `/frontend/examples/**` or directly into your repo under `src/app/**`.
3. If your repo has `AuthManager` already, keep it. Otherwise copy the sample from `/frontend/examples/lib/auth/AuthManager.example.ts` and adapt.
4. Follow `/docs/ROLLBACK_AND_FLAGS.md` to flip feature flags safely.
5. Run the tests in `/tests/**` and iterate.

> This package bakes in the **must‑haves** from our analyses: Auth pages are included, dashboard data layer is real, wizard work is UI‑only, and rollback/tests are first‑class.

