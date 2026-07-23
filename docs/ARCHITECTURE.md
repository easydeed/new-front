# DeedPro Architecture

> Generated 2026-07-23 — regenerated from code, 2026-07-23. Not copied from any prior documentation.
> Derived from: `render.yaml`, `frontend/vercel.json`, `.github/workflows/*`, `frontend/src/features/builder/DeedBuilder.tsx`, `frontend/src/components/builder/InputPanel.tsx`, `frontend/src/components/builder/sections/PropertySection.tsx`, `frontend/src/types/builder.ts`, `frontend/middleware.ts`, `backend/main.py`, `backend/auth.py`, `backend/pdf_engine.py`, `backend/routers/`, `backend/api/`, `backend/services/`.

## System overview

DeedPro is a California deed-generation platform. The monorepo contains:

| Component | Tech | Deploy target | Entry point |
|---|---|---|---|
| Web frontend | Next.js 15.4.8 / React 19.1.0, App Router, TypeScript, Tailwind | Vercel (`frontend/vercel.json`) | `frontend/src/app/` |
| Main API | FastAPI 0.116.1, Python 3.11 | Render service `deedpro-main-api` (`render.yaml`) | `backend/main.py` → `uvicorn main:app` |
| External Partner API | FastAPI (separate app for SoftPro/Qualia) | Render service `deedpro-external-api` (`render.yaml`) | `backend/external_api/app.py` |
| Database | PostgreSQL (raw psycopg2; SQLAlchemy only in `backend/phase23_billing/`) | Render database `deedpro-db` | `backend/database.py` |
| PDF generation | Jinja2 templates + WeasyPrint 66 (default) / PDFShift / Chromium | runs inside Main API | `backend/pdf_engine.py`, `/templates` |

Frontend production API base: `NEXT_PUBLIC_API_URL=https://deedpro-main-api.onrender.com`. CORS on the backend allows `localhost:3000` and `deedpro-frontend-new.vercel.app` (`backend/main.py:225-260`).

CI (`.github/workflows/`): `ci.yml` builds frontend + runs pytest with all steps `|| true` (non-blocking); `test.yml` runs `pytest backend/tests/` on Python 3.8 (stale vs. the 3.11 runtime pin in `backend/runtime.txt`); `release-train.yml` is a cron-driven staged deploy (Vercel prebuilt + `API_DEPLOY_CMD`), gated on `RELEASE_TRAIN_ENABLED`.

## Deed builder state flow (frontend)

The live builder is `frontend/src/features/builder/DeedBuilder.tsx`, reached via `/deed-builder/[type]` (`frontend/src/app/deed-builder/[type]/page.tsx`). The older `/create-deed/[docType]` route is now only a server redirect to `/deed-builder`.

**State is a single `useState` — there is no store.** There is no reducer and no context holding form data (an unused `zustand` dependency was removed 2026-07-23).

```tsx
// DeedBuilder.tsx:30-48
const [state, setState] = useState<DeedBuilderState>({ deedType, property, grantor, grantee, vesting, dtt, requestedBy, returnTo, titleOrderNo, escrowNo });
const handleChange = (updates: Partial<DeedBuilderState>) => setState(prev => ({ ...prev, ...updates }));
```

The full `state` plus `onChange` are **prop-drilled**: `DeedBuilder` → `InputPanel` (and read-only into `PreviewPanel`), and `InputPanel` fans out per-field slices to six section components (`frontend/src/components/builder/sections/`): `PropertySection` (`state.property`), `GrantorSection` (`state.grantor`, suggested from `property.owner`), `GranteeSection`, `VestingSection`, `TransferTaxSection` (`state.dtt`), `RecordingSection` (`requestedBy`/`returnTo`/`titleOrderNo`/`escrowNo`). Each section calls back with a partial, e.g. `onChange({ property })`.

Cross-cutting contexts are limited to `AIAssistProvider` (AI toggle/suggestions), `SidebarProvider`, and `PartnersProvider` — none hold builder form data.

## Provenance model

Field-level provenance landed on `main` 2026-07-23 (commit `270425a`), defined in `frontend/src/types/builder.ts`:

```ts
export type FieldSource = 'sitex' | 'google' | 'user' | 'titlepoint';
export type FieldStatus = 'candidate' | 'confirmed';

export interface Sourced<T> {
  value: T;
  source: FieldSource;
  status: FieldStatus;
  confirmedAt?: string; // ISO timestamp, set when status becomes 'confirmed'
}
```

`PropertyData` carries an optional `provenance?: PropertyProvenance` holding `Sourced<string>` entries for the three legally sensitive fields — `apn`, `legalDescription`, `owner`. It is deliberately optional: the generation payload keeps reading the bare value fields, so the PDF path is untouched by provenance.

The workflow lives in `PropertySection.tsx`:
- `POST /api/property/search-v2` (SiteX-backed) results — including the multi-match `POST /api/property/resolve-match` path — arrive wrapped as `{ source: 'sitex', status: 'candidate' }` (`PropertySection.tsx:602-622`).
- Each tracked field renders as a `ConfirmableField` (`PropertySection.tsx:186`): the escrow officer either **confirms** it (status flips to `confirmed` with an ISO `confirmedAt` stamp, `PropertySection.tsx:650-661`) or **edits** it (source becomes `'user'`, confirmed immediately, `PropertySection.tsx:665-682`).
- `provenanceFor` (`PropertySection.tsx:686-690`) backfills a `{source:'sitex', status:'candidate'}` wrapper for data loaded without provenance, so older drafts still work.
- The governing rule, from the type's doc comment: *the system suggests; the officer confirms; AI/auto-fill never silently writes a confirmed legal value.*

`PropertySection` computes `allConfirmed` across the three tracked fields (`PropertySection.tsx:697-699`); the generation gate does **not** yet consume it — wiring confirmation into the gate is the planned Ticket B work.

## Generation gate

Generation is gated by a **6-of-6 section completion count** in `frontend/src/components/builder/InputPanel.tsx:32-68`:

- property → `state.property?.address` present; grantor → non-empty; grantee → non-empty **and not equal to grantor** (equality yields `'warning'`, which blocks); vesting → non-empty; transferTax → exempt-with-reason or a transfer value; recording → `requestedBy` non-empty.
- `isReady = completedCount === 6`; the Generate button is `disabled={!isReady || isGenerating}` (`InputPanel.tsx:211-213`).

A richer validator exists (`validateDeedData` in `frontend/src/lib/ai-helpers.ts:284-378`, consumed by `frontend/src/components/builder/ValidationPanel.tsx`) but **`ValidationPanel` is not rendered by anything** — it is absent from `builder/index.ts` and has no importers, so it does not gate generation today.

On generate, `DeedBuilder.handleGenerate` (`DeedBuilder.tsx:54-95`) maps state to snake_case and does `POST /api/deeds/generate` (relative URL) with a `Bearer` token from `localStorage`. The route handler `frontend/src/app/api/deeds/generate/route.ts` (added 2026-07-23, PR #17 — it was missing, which silently broke deed persistence) maps the builder payload to the backend `DeedCreate` shape and forwards to `POST /deeds`. Per-doc-type PDF proxies live under `frontend/src/app/api/generate/*`. Confirmation state from the provenance model (`allConfirmed` in `PropertySection`) is not yet part of this gate. **Still open:** the success page's PDF download calls the stubbed `GET /deeds/{id}/download` — wiring deed-record → PDF is Phase 3 item #1.

## Auth flow

- Backend issues HS256 JWTs (`backend/auth.py`; `JWT_SECRET_KEY` required at import, 30-minute expiry).
- Frontend stores the token in `localStorage` (`token` / `access_token`) for client fetches and in an `access_token` cookie for route guarding; fetch wrappers attach `Authorization: Bearer` (`frontend/src/lib/api.ts`).
- `frontend/middleware.ts` guards `/deed-builder`, `/dashboard`, `/admin`, etc. by decoding the cookie JWT payload shape (`isDeedProToken`) and redirecting to `/login` when absent.
- The public partner API (`backend/routers/api_v1/`) uses hashed API keys with scopes and DB-backed rate limits; the external partner app adds HMAC verification (`backend/external_api/security/`).

## Backend structure

`backend/main.py` is a ~3,000-line monolith app that also mounts routers from `backend/routers/` and `backend/api/` (each mount wrapped in try/except — a failed import silently drops routes). Services in `backend/services/` wrap vendors: SiteX/ICE REST (`sitex_service.py`), TitlePoint SOAP (`titlepoint_service.py`), Google Places (`google_places_service.py`), PDFShift, SendGrid, plus internal notifications/partners CRUD. Deed PDFs render from Jinja2 template sets at repo-root `/templates/<doc_type>/index.jinja2` through `pdf_engine.render_pdf_async` (engine selected by `PDF_ENGINE`/`PDFSHIFT_API_KEY`, WeasyPrint default). See `docs/API.md` for the full route map and known route collisions.

Feature flags are consistently **off** in deployed config: `DYNAMIC_WIZARD_ENABLED=false` (render.yaml), `NEXT_PUBLIC_DYNAMIC_WIZARD/GOOGLE_PLACES_ENABLED/TITLEPOINT_ENABLED=false` (vercel.json). `ENABLE_DEED_TYPES_EXTRA` gates the quitclaim/interspousal/warranty/tax generate routes.

## Known structural quirks (facts from code, kept here so agents don't rediscover them)

- ~~`verify_admin()` stub~~ **Fixed 2026-07-23 (PR #17):** the always-true `verify_admin()` stub was deleted and all eleven inline `/admin/*` endpoints in `main.py` now enforce `dependencies=[Depends(get_current_admin)]` — the same real JWT role check used by `routers/admin_api_v2.py`.
- Route shadowing: `backend/phase23_billing` routers register first (`main.py:46`) and shadow `main.py`'s own `POST /payments/webhook` and `GET /admin/revenue`; `POST /api/ai/assist` is registered by two different routers (first wins).
- Two parallel deed-sharing systems coexist: `shared_deeds` (+`sharing_activity_log`, served by `main.py /shared-deeds`) and `deed_shares` (+`deed_share_activity`, served by `routers/shares_enhanced.py`).
- The `api/property_search.py` router mount is commented out (`main.py:78-87`); its routes are unreachable.
- ~~Orphan code~~ **Removed 2026-07-23 (PR #18):** the repo-root orphan components, `AiTools/`, `v0-builder/`, `v0-prompts/`, `fixtemp/`, template backups, and ~45 loose backend scripts were deleted (1,222 files). The live builder components are under `frontend/src/components/builder/`.
- The frontend has ~116 pre-existing TypeScript errors; builds pass only because `next.config` sets `ignoreBuildErrors: true` (and `ignoreDuringBuilds: true` for ESLint). The backend test suite in `backend/tests/` is stale — it mocks methods that no longer exist (e.g. `SiteXService.search_address`) — and `test.yml` pins Python 3.8, which cannot install `requirements.txt`. Rebuilding honest CI is Phase 4 of the simplification plan.
