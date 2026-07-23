# DeedPro

California deed-generation platform: a Next.js builder UI over a FastAPI backend that enriches property data (SiteX/ICE, TitlePoint, Google Places) and renders recorder-ready deed PDFs from Jinja2 templates via WeasyPrint.

> Generated 2026-07-23 — regenerated from code, 2026-07-23.
> Derived from: `render.yaml`, `frontend/vercel.json`, `frontend/package.json`, `backend/requirements.txt`, `backend/runtime.txt`, `backend/main.py`, `backend/database.py`, `.github/workflows/`.

## Layout

| Path | What it is |
|---|---|
| `frontend/` | Next.js 15 / React 19 app (App Router). Builder lives at `/deed-builder/[type]` |
| `backend/` | FastAPI main API (`main.py`) + external partner API (`external_api/`) |
| `templates/` | Jinja2 deed templates (`grant_deed_ca/`, `quitclaim_deed_ca/`, …) used by the backend |
| `docs/` | [ARCHITECTURE](docs/ARCHITECTURE.md) · [API](docs/API.md) · [DATA_MODEL](docs/DATA_MODEL.md) · [SiteX integration](docs/skills/sitex-integration.md) |
| `docs/_archive/` | All pre-2026-07 documentation, moved unmodified. Historical only — do not treat as guidance |
| `scripts/`, `tests/` | ops scripts; root pytest for the wizard API |

## Quickstart

### Backend (Python 3.11)

```bash
cd backend
pip install -r requirements.txt
export DATABASE_URL=postgres://…        # required
export JWT_SECRET_KEY=dev-secret        # required — auth.py raises without it
uvicorn main:app --reload --port 8000
```

First run: `python -c "from database import create_tables; create_tables()"` creates the core tables; feature areas (sharing, public API, billing) need the SQL in `backend/migrations/` applied by hand — there is no Alembic.

Optional env for full functionality: `SITEX_CLIENT_ID`/`SITEX_CLIENT_SECRET`/`SITEX_BASE_URL`/`SITEX_FEED_ID` (property search), `OPENAI_API_KEY` (AI assist), `STRIPE_SECRET_KEY`, `SENDGRID_API_KEY`, `PDFSHIFT_API_KEY` (else WeasyPrint renders locally). See `docs/API.md` and `backend/env.example`.

### Frontend (Node 20)

```bash
cd frontend
npm ci
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev   # defaults to the production API if unset
```

App at http://localhost:3000. Register/login stores a JWT (localStorage + cookie) that `middleware.ts` requires for `/deed-builder`, `/dashboard`, `/admin`.

## Tests

- Backend: `cd backend && pytest` (uses `backend/pytest.ini`, testpath `tests/`)
- Frontend unit: `cd frontend && npm test` (Jest)
- Frontend e2e: `cd frontend && npm run test:e2e` (Cypress)

## Deployment

- **Frontend** → Vercel (`frontend/vercel.json`), production `deedpro-frontend-new.vercel.app`
- **Main API** → Render `deedpro-main-api` (`render.yaml`): `uvicorn main:app`
- **External partner API** → Render `deedpro-external-api`: `uvicorn external_api.app:app`
- **DB** → Render Postgres `deedpro-db`

CI in `.github/workflows/` (note: `ci.yml` steps are non-blocking `|| true`; `test.yml` still pins Python 3.8 vs. the 3.11 runtime).
