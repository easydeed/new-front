# 🚀 Deployment Guide for Overhaul Redo

**Date**: September 2025  
**Purpose**: Step-by-step for pushes/deploys after milestones—zero problems.

### Pre-Push (Every Milestone)
1. Run: bash scripts/pre-push.sh
2. Commit: git add . && git commit -m "<Milestone description>"
3. Push: git push origin main

### Vercel Deploy (Frontend)
1. Dashboard > Project > Settings > Git: Ensure connected to main.
2. Auto-deploys on push—monitor logs for "cd frontend && npm install" success.
3. Test URL: https://deedpro-frontend-new.vercel.app—run wizard/PDF (US Letter 8.5x11, 1in/0.5in margins).

### Render Deploy (Backend)
1. Dashboard > Service > Settings: Auto-deploy on main push.
2. Monitor events for "Deploy succeeded".
3. Test endpoint: curl -X POST https://deedpro-main-api.onrender.com/api/generate/grant-deed-ca -H "Content-Type: application/json" -d '{"requested_by":"Test","grantors_text":"A","grantees_text":"B","county":"Los Angeles","legal_description":"Lot X"}'

### Rollback
Run: bash scripts/emergency-rollback.sh