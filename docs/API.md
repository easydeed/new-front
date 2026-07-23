# DeedPro API Reference

> Generated 2026-07-23 — regenerated from code, 2026-07-23. Not copied from any prior documentation.
> Derived from: `backend/main.py`, `backend/auth.py`, `backend/routers/*`, `backend/api/*`, `backend/phase23_billing/*`, `backend/external_api/*`, `frontend/src/app/api/*`. Line numbers refer to those files at regeneration time.

Two FastAPI apps ship from `backend/`:

1. **Main API** — `backend/main.py` (`uvicorn main:app`, Render service `deedpro-main-api`, port 8000)
2. **External Partner API** — `backend/external_api/app.py` (Render service `deedpro-external-api`, port 8001)

## Auth legend

| Tag | Meaning |
|---|---|
| U | `Depends(get_current_user_id)` — user JWT (HS256, `backend/auth.py`) |
| A | `Depends(get_current_admin)` — JWT with admin role (real enforcement) |
| KEY | API key (`Authorization: Bearer dp_pk_…`, hashed lookup + scopes + rate limits, `routers/api_v1/router.py`) |
| TOKEN | capability token in the URL path |
| PUB | no auth |

## Main API — routes defined inline in `main.py`

| Method | Path | Auth | Purpose (line) |
|---|---|---|---|
| GET | `/health` | PUB | health (498) |
| GET | `/health/qa` | PUB | QA instrumentation status (502) |
| POST | `/users/register` | PUB | register, returns JWT (514) |
| POST | `/users/login` | PUB | login, returns JWT (606) |
| GET | `/users/profile` | U | profile (678) |
| POST | `/users/upgrade` | U | Stripe plan upgrade (732) |
| POST | `/payments/webhook` | PUB | Stripe webhook (799) — **shadowed by the phase23 router's identical path** |
| POST | `/payments/create-portal-session` | U | Stripe billing portal (859) |
| GET | `/admin/dashboard`, `/admin/users`, `/admin/users/{id}`, `/admin/deeds`, `/admin/revenue`*, `/admin/analytics`, `/admin/system-health`, `/admin/system/overview`, `/admin/system-metrics`; PUT/DELETE `/admin/users/{id}` | A | admin metrics & user management (942–1591). Real admin JWT enforced since 2026-07-23 (PR #17; previously guarded by an always-true stub). *`/admin/revenue` is shadowed by phase23. |
| POST | `/users` / GET `/users/{email}` | PUB | create/fetch user, no auth (1610, 1632) |
| GET | `/user/me` | U | current user (1640) |
| POST | `/deeds` | U | create deed (1686) |
| GET | `/deeds`, `/deeds/summary`, `/deeds/available`, `/deeds/{id}` | U | list/read deeds (1760–1909) |
| POST/GET | `/deeds/drafts` | U | drafts (1852, 1865) |
| PUT | `/deeds/{id}/status` | PUB | placeholder stub (1937) |
| POST/GET/DELETE | `/shared-deeds`, `/shared-deeds/{id}/resend`, `/shared-deeds/{id}` | U | legacy sharing system (1948–2251) |
| GET/POST | `/approve/{approval_token}`, `…/pdf` | TOKEN | public approval flow (2300–2611) |
| POST/GET | `/deeds/{id}/recipients`; DELETE `/deeds/{id}`; GET `/deeds/{id}/download` | PUB | placeholder stubs, no auth (2683–2714) |
| POST/GET/DELETE | `/payment-methods`, `/subscriptions` | PUB | Stripe stubs, no auth (2724–2773) |
| GET | `/property/search` | PUB | placeholder (2785) |
| POST | `/generate-deed-preview` | U | HTML/PDF preview (2802) |
| POST | `/generate-deed` | PUB | Jinja2+WeasyPrint generation, no auth (2922) |
| GET | `/pricing`, `/pricing/plans` | PUB | pricing (2989, 3028) |
| POST | `/admin/create-plan`, `/admin/sync-pricing`, `/admin/update-price`, `/admin/toggle-addon` | A | pricing admin, real JWT check (3033–3187) |
| GET | `/check-widget-access` | U | add-on flag (3178) |
| GET/POST | `/users/profile/enhanced` | U | enhanced profile (3195, 3210) |
| POST | `/property/cache`; GET `/property/suggestions` | U | property cache (3226, 3241) |
| POST | `/ai/deed-suggestions` | U | AI suggestions (3278) |

## Main API — mounted routers

Mounts are wrapped in try/except in `main.py`; a failed import silently drops the router. `api/property_search.py` is **commented out** (`main.py:78-87`) and unreachable.

| Prefix | Router file | Routes | Auth |
|---|---|---|---|
| `/api/property` | `api/property_endpoints.py` | POST `/validate`, `/search-v2` (SiteX search, 666), `/resolve-match` (765), `/test/titlepoint-*`; GET `/search-history`, `/cached-properties`, `/search-legacy` | U |
| `/api/ai` | `ai_assist.py` **and** `api/ai_assist.py` | POST `/assist` (registered twice — first mount wins), `/multi-document`, `/chat` | U |
| `/api` | `api/generate_deed.py` | POST `/generate-deed` | U |
| `/api/generate` | `routers/deeds.py` | POST `/grant-deed-ca`, `/grant-deed-ca-pixel` → streaming PDF | U |
| `/api/generate` | `routers/deeds_extra.py` (only if `ENABLE_DEED_TYPES_EXTRA=true`) | POST `/quitclaim-deed-ca`, `/interspousal-transfer-ca`, `/warranty-deed-ca`, `/tax-deed-ca` | U |
| `/api` | `api/doc_types.py` | GET `/doc-types` | PUB |
| `/api/ai` | `routers/ai.py` | POST `/chain-of-title`, `/profile-request` | U |
| — | `routers/auth_extra.py` | POST `/users/forgot-password`, `/users/reset-password`, `/users/verify-email/request`, `/users/refresh-token`; GET `/users/verify-email` | PUB (token-based) |
| `/admin` | `routers/admin_api_v2.py` | user/deed search & CRUD, CSV exports, `/api-keys` CRUD | **A** (real) |
| `/notifications` | `routers/notifications.py` (`NOTIFICATIONS_ENABLED`) | GET `/`, `/unread-count`; POST `/mark-read` | U |
| `/deeds` | `routers/shares_enhanced.py` (`SHARING_ENABLED`) | GET `/available`; POST `/{deed_id}/share`, `/shares/resend` | U |
| `/deed-shares` | `routers/deed_share_feedback.py` | GET `/{share_id}/feedback` | U |
| `/partners` | `routers/partners.py` | partner CRUD + `/selectlist/` | U |
| `/admin/partners` | `routers/admin_partners.py` | list/read/toggle-active | admin wrapper |
| `/api/verify` | `routers/verification.py` | GET `/{short_code}` — public QR authenticity check | PUB |
| `/admin/verification` | `routers/verification.py` (admin router) | stats & lookups | A |
| `/api/v1` | `routers/api_v1/router.py` | POST `/deeds`, `/transfer-tax/calculate`; GET `/deeds`, `/deeds/{id}`, `/deeds/{id}/pdf`, `/verify/{document_id}`, `/openapi.json` | KEY |
| `/payments`, `/admin`, `/usage` | `phase23_billing/` (registered **first**, `main.py:46`) | POST `/payments/webhook`; GET `/admin/revenue`, `/admin/invoices`, `/admin/payments`, `/admin/exports/payments.csv`; usage-metering routes | varies (SQLAlchemy-backed) |

## External Partner API (`backend/external_api/`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/healthz` | health check (Render probe) |
| POST | `/v1/deeds/{deed_type}` | partner deed creation |
| GET | `/v1/deeds/{external_deed_id}` | fetch partner deed |
| POST | `/v1/webhooks/softpro`, `/v1/webhooks/qualia` | partner webhooks |
| POST/GET/DELETE | `/admin/api-keys*`, GET `/admin/usage` | key management (bootstrap via `ADMIN_SETUP_SECRET`) |

Auth: API key + HMAC (`external_api/security/`), per-key rate limiting.

## Frontend proxy routes (`frontend/src/app/api/`)

Next.js route handlers that forward to the backend (default `http://localhost:8000` for the generate proxies, `NEXT_PUBLIC_API_URL` elsewhere): `api/generate/{grant-deed-ca,grant-deed-ca-pixel,quitclaim-deed-ca,interspousal-transfer-ca,warranty-deed-ca,tax-deed-ca}`, `api/deeds/create` (→ backend `POST /deeds`), `api/deeds/generate` (the builder's save path, added 2026-07-23 in PR #17 — maps the builder payload to `DeedCreate` and forwards to backend `POST /deeds`), `api/deeds/[id]`, `api/partners/selectlist`.

## Security notes (verified in code)

- ~~`verify_admin()` always returns `True`~~ **Fixed 2026-07-23 (PR #17):** the stub was deleted and every inline `/admin/*` route now enforces `dependencies=[Depends(get_current_admin)]`.
- Still open: the placeholder endpoints marked PUB above (deed status/recipients/delete/download, payment-methods, subscriptions, `/generate-deed`, `/users`, `/users/{email}`) perform no authentication. Deleting or authenticating them is Phase 3 of the simplification plan.
