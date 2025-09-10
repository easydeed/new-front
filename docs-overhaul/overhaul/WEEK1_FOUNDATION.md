# Week 1-2: Foundation Reconstruction (September 9-22, 2025)

**Tasks (Zero Deviations, Verbatim from Plan)**:
1. Build Document Registry: Create backend/models/doc_types.py with JSON configs for steps/fields/schemas (Grant Deed: 5 steps—request details, tax, parties/property, review, generate).
2. Unified State: Create frontend/src/store.ts using Zustand for single store with auto-persist to localStorage/DB. Remove competing state systems (useState, global state.ts).
3. Dynamic Rendering: Refactor frontend/src/app/grant-deed/page.tsx to dynamic-wizard.tsx; read steps from registry, render conditionally.
4. Fallbacks: Add manual entry UI (e.g., text fields for address) in dynamic-wizard.tsx if APIs (TitlePoint/Google) fail.
5. Legal Check: Attorney reviews Grant steps vs. CA codes (e.g., Civil Code §1092 for property ID, 5 steps mandatory).

**Milestone 1**:
1. Run: bash scripts/pre-push.sh
2. Commit: git add . && git commit -m "Foundation: Registry, state, rendering complete"
3. Push: git push origin main
4. Deploy: Vercel auto-deploys (dashboard > verify build).
5. Test Prod: https://deedpro-frontend-new.vercel.app—Grant wizard works (5 dynamic steps, no data loss). Validate >85% completion rate.
6. Rollback if fails: git revert HEAD && git push origin main
7. STOP & ASK if issues: Share terminal/Vercel logs.