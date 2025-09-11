Week 3-4: AI Integration Overhaul (September 23-October 6, 2025)
Tasks (Zero Deviations, Verbatim from Plan):

AI Services: Create backend/routers/ai.py with /api/ai/chain-of-title (parses TitlePoint ownership history) and /api/ai/profile-request (suggests fields, optional). Add retries (e.g., tenacity library).
NLP: Integrate OpenAI in ai.py for prompts (e.g., "pull chain of title"). Set OPENAI_API_KEY in Render dashboard.
Integration: Hook AI suggestions to fields in dynamic-wizard.tsx (e.g., auto-fill address) without forcing use.
Mobile Polish: Add Framer Motion in frontend/src/components/ for responsive UI.
Legal Check: Attorney ensures AI doesn’t skip required fields (e.g., no illegal tax skips).

Milestone 2:

Run: bash scripts/pre-push.sh
Commit: git add . && git commit -m "AI: Services, NLP, integration complete"
Push: git push origin main
Deploy: Vercel/Render auto-deploys.
Test Prod: AI suggestions work (<2s latency), optional (wizard works if API down). Validate >90% error recovery.
Rollback if fails: git revert HEAD && git push
STOP & ASK if issues: Share logs.