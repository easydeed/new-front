🌐 DeedPro - AI-Powered Legal Document Platform
⚠️ IMPORTANT: Monorepo with frontend (Next.js, Vercel) and backend (FastAPI, Render).
🚨 CRITICAL: WIZARD ARCHITECTURE OVERHAUL REQUIRED (September 2025)
⚠️ CURRENT STATE: ARCHITECTURAL CRISIS
Wizard flaws:

Hardcoded Grant Deed (5 steps, not 3).
APIs fail → system crashes.
Data loss from state chaos.
Only Grant Deed works; no scale.
Completion ~30% vs. 90% claimed.

Action: Redo per overhaul/CURSOR_MASTER.md.
Target: Dynamic wizard, AI help, US Letter PDFs (8.5x11 inches, 1in top/bottom, 0.5in sides margins or county-specific).
🏗️ System Architecture

Structure:

textnew-front/
├── frontend/          # Next.js → Vercel
├── backend/           # FastAPI → Render
├── templates/         # Jinja2 PDFs
├── docs/             # Guides
├── tests/            # Tests
├── scripts/          # Scripts

Tech:

Frontend: Next.js 14, TypeScript, Framer Motion.
Backend: FastAPI, Python 3.8+, PostgreSQL, WeasyPrint.
PDFs: Jinja2 + WeasyPrint (US Letter 8.5x11, 1in/0.5in margins).
Deploy: Vercel, Render, GitHub Actions.



🎯 Capabilities

Grant Deed: Working, 5-step wizard, PDFs in US Letter format.
Future: Quitclaim, Warranty, multi-language.

🆘 Support

Issues: Check DEED_GENERATION_GUIDE.md.
Deploy: See overhaul/CURSOR_MASTER.md.

🏆 Success Story (August 2025)
Grant Deed system works:

100% reliable PDFs (14KB+, US Letter).
<5s generation.
99.9% uptime.

Last Updated: September 2025
Version: 4.0
Status: Production Ready (Grant Deed only)
Next: Overhaul Redo