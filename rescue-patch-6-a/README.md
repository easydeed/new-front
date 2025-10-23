# DeedPro – Backend Hotfix V1 (Cursor-ready)

**Goal:** Fix deeds being saved with **empty grantor/grantee/legal_description** by addressing BOTH the frontend proxy
(lost JSON body) **and** the backend endpoint/parser/DB create guards.

## Why this solves your exact failure
Your diagnostic reports show the frontend has a full canonical/back-end payload and `/api/deeds/create` returns 200
with an ID, but the DB row is **empty** for key fields; Preview then 400s on generate. This strongly indicates the
**request body is not reaching the backend intact OR the backend is not parsing/validating it before save**. This
bundle fixes both sides defensively. (See references in your reports.)

## What this installs
- **Frontend proxy fix** (`frontend/src/app/api/deeds/create/route.ts`)
  - Reads `await req.json()` once and forwards **`JSON.stringify(payload)`** with `Content-Type: application/json`.
  - Avoids forwarding an already-consumed `req.body` stream.
- **Backend schema** (`backend/schemas/deeds.py`)
  - `DeedCreate` (Pydantic v2) with **non-empty** constraints for `grantor_name`, `grantee_name`, `legal_description`.
- **Backend router** (`backend/routers/deeds.py`)
  - Typed endpoint `payload: DeedCreate`; no double-reading of `request.body`; strips/validates; returns `{id}`.
- **Backend service** (`backend/services/deeds.py`)
  - Accepts Pydantic or dict; enforces non-empty; inserts via ORM; returns refreshed row.

## Apply (in Cursor)
```bash
git checkout -b fix/backend-hotfix-v1
node deedpro_backend_hotfix_v1/scripts/apply_backend_hotfix.mjs .
# Frontend: rebuild (if proxy route updated)
npm run build
# Backend: restart server (uvicorn/gunicorn) to load schema/router changes
# Verify static checks
node deedpro_backend_hotfix_v1/scripts/verify_backend_hotfix.mjs .
git add -A
git commit -m "fix(backend): robust /api/deeds/create parsing + validation; Next proxy preserves JSON body"
git push -u origin fix/backend-hotfix-v1
```

## Smoke Test (manual)
1) From the Modern wizard, confirm console logs display **Backend payload JSON** with the expected values.
2) In DevTools Network, open the `POST /api/deeds/create` (frontend proxy) and confirm **Request Payload** has the same values.
3) In backend logs, confirm the typed endpoint received values (you can add temporary logs).
4) Visit `/deeds/:id/preview?mode=modern` → should **not** 400; PDF should generate.

## Notes
- If your project uses a different module layout, adjust imports in `routers/deeds.py` and `services/deeds.py` (comments inline).
- If the proxy runs on Edge runtime and your backend requires absolute URLs, ensure `BACKEND_BASE_URL` is set.

## References (from your docs)
- Phase 15 V6 Diagnostic: Modern wizard collects & sends data; DB has empties; Preview 400s. 
- Critical Diagnostic Report: Backend accepts request but saves blanks; proxy layer suspected.
- Modern Wizard Comprehensive Analysis: canonical vs. classic flows; known pitfalls.
- Forensic 2‑week Analysis: multiple paths, fixes, and preview gate.
- Master Failure Analysis: finalize logs vs. blank deeds mystery.
- Handoff Recap: Validate-before-generate; modern mode guardrails.
```

