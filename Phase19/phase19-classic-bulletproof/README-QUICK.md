# Phase 19 — Classic Wizard Bulletproof (Cursor Quick Start)

**What this does**
- Adds a **Node runtime partners proxy** at `/api/partners/selectlist` (Next.js App Router).
- Drops in **Classic-friendly PartnersInput** and **usePartnersList** hook with typed-value propagation.
- **Normalizes templates** to print `RECORDING REQUESTED BY` if missing.
- Optionally patches `PrefillCombo` so every keystroke hits parent state (typed text is never lost).
- Provides **apply / verify / rollback** scripts with backups (`.bak.p19`).

**1) Open in Cursor & install deps**
```bash
cd phase19-classic-bulletproof
npm i
```

**2) Configure paths (if needed)**
Edit `p19.config.json` if your repo layout differs (defaults assume `frontend/` and `backend/`).

**3) Apply**
```bash
node scripts/apply.mjs    # writes files, inserts headers, creates backups
```

**4) Verify**
```bash
node scripts/verify.mjs   # checks proxy + templates + prefill safety
```

**5) Rollback (if you need to undo)**
```bash
node scripts/rollback.mjs
```

**6) Commit**
```bash
git add -A
git commit -m "Phase19: Classic parity (partners proxy, requested_by header, typed propagation)"
```
