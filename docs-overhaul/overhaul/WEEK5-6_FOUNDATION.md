# Week 5-6: Backend Reconstruction (October 7-20, 2025)

**Tasks (Zero Deviations, Verbatim from Plan)**:
1. Generic Endpoint: Create backend/routers/generate_v2.py with /api/generate/v2/{type} using Pydantic models for validation.
2. Templates: Add Quitclaim templates in root templates/quitclaim_deed_ca/ (copy Grant, adjust fields). Use null-safe .get().
3. Validation: Unified Pydantic schemas per type in backend/models/; add backend legal checks (e.g., grantor matches title).
4. Extend Grant Pattern: Add Quitclaim/Interspousal endpoints in generate_v2.py.
5. PDF Specs: Set WeasyPrint in backend/utils/pdf.py to US Letter (8.5x11 inches), margins 1in top/bottom, 0.5in sides (or county-specific, e.g., LA 1in top for tax). Use @page { size: letter; margin: 1in 0.5in; }.

**Milestone 3**:
1. Run: bash scripts/pre-push.sh
2. Commit: git add . && git commit -m "Backend: Generation, APIs, templates complete with PDF specs"
3. Push: git push origin main
4. Deploy: Test prod PDF for Grant/Quitclaim (check size >14KB, margins correct, <5s).
5. Validate: <0.5% error rate, 99.9% uptime.
6. Rollback if fails: git revert HEAD && git push
7. STOP & ASK if issues: Share PDF output/logs.