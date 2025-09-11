# Cursor Master Pack: Redo Overhaul with Zero Deviations (September 2025)

**Cursor Rules**: Follow ALL files in docs/overhaul/ EXACTLY—no new tools (no Turbo, Zod), no file-based env vars (use Vercel/Render dashboards ONLY), no assumptions. Use system terminal for git (Command Prompt/Terminal, not Cursor). Test on production after each push. STOP & ASK if fails (use template below). Start after revert to August 2025 stable state (git reset --hard cd27d2f && git push --force origin main). Reference WIZARD_ARCHITECTURE_OVERHAUL_PLAN.md for details like legal checks.

**STOP & ASK Template**:
STOP & ASK: Roadblock at <Week/Milestone>.
Context: <terminal output or Vercel/Render logs>.
Observed: <error/status/PDF output>.
Expected: <success criteria from milestone>.
Proposed: (A) rollback (list commands), (B) targeted fix (1 line), (C) pause for input.

**Revert to Stable (Do First)**:
1. Open terminal: cd path/to/new-front
2. Check: git status (if dirty, git add . && git commit -m "Save before revert")
3. Reset: git checkout main && git reset --hard cd27d2f && git push --force origin main
4. Clean: del turbo.json (Windows) or rm turbo.json (macOS); edit package.json (remove "workspaces", "turbo"); edit vercel.json (remove "env", $VAR routes).
5. Commit: git add . && git commit -m "Reverted to stable August 2025"
6. Push: git push origin main
7. Test prod: https://deedpro-frontend-new.vercel.app—Grant Deed wizard works, PDF <5s, US Letter 8.5x11, 1in/0.5in margins.
8. STOP if fails: Share terminal/Vercel logs.

**Timeline (Verbatim from Plan)**:
- Week 1-2: Foundation — See WEEK1_FOUNDATION.md
- Week 3-4: AI — See WEEK3_AI.md
- Week 5-6: Backend — See WEEK5_BACKEND.md (includes PDF specs)
- Week 7-8: Testing — See WEEK7_TESTING.md
- Week 9: Deployment — See WEEK9_DEPLOY.md

**PDF Specs**: All PDFs US Letter (8.5x11 inches), margins 1in top/bottom, 0.5in sides (or county-specific, e.g., LA requires 1in top for tax). Validate with attorney.

**Outdated Docs to Delete** (Before Week 1):
- docs/QUICK_START_FOR_NEW_AGENTS.md
- docs/TROUBLESHOOTING_PROPERTY_INTEGRATION.md
- docs/WIZARD_V2_GRANT_DEED_IMPLEMENTATION.md
Run: del docs\QUICK_START* (Windows) or rm docs/QUICK_START* (macOS), then git add docs/ && git commit -m "Removed outdated docs" && git push origin main.