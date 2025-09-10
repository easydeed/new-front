# Week 3-4: AI Integration Overhaul (September 23-October 6, 2025)

**Tasks (Zero Deviations, Verbatim from Plan)**:
1. AI Services: Create backend/routers/ai.py with /api/ai/chain-of-title (parses TitlePoint ownership history) and /api/ai/profile-request (suggests fields, optional). Add retries (e.g., tenacity library).
2. NLP: Integrate OpenAI in ai.py for prompts (e.g., "pull chain of title"). Set OPENAI_API_KEY in Render dashboard.
3. Integration: Hook AI suggestions to fields in dynamic-wizard.tsx (e.g., auto-fill address) without forcing use.
4. Mobile Polish: Add Framer Motion in frontend/src/components/ for responsive UI.
5. Legal Check: Attorney ensures AI doesn’t skip required fields (e.g., no illegal tax skips).

**Milestone 2**:
1. Run: bash scripts/pre-push.sh
2. Commit: git add . && git commit -m "AI: Services, NLP, integration complete"
3. Push: git push origin main
4. Deploy: Vercel/Render auto-deploys.
5. Test Prod: AI suggestions work (<2s latency), optional (wizard works if API down). Validate >90% error recovery.
6. Rollback if fails: git revert HEAD && git push
7. STOP & ASK if issues: Share logs.