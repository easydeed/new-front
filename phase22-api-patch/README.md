# DeedPro — Phase 22 External API (Hybrid) — Cursor Package

This package upgrades the **External Partner API** from a mockup to a **production-capable hybrid** that reuses your **proven Main API** for deed generation and DB persistence, adds **API key management**, **rate limiting**, **usage tracking**, **S3 file URLs**, and **webhook signature validation**.

## What’s inside
- `external_api/app.py` — FastAPI app with OpenAPI docs.
- `external_api/deps.py` — Dependency wiring (DB, config, logger).
- `external_api/models.py` — SQLAlchemy models: `ApiKey`, `ApiUsage`, `ExternalDeed`.
- `external_api/rate_limit.py` — Per-key rate limiter (Redis or in-memory) + `X-RateLimit-*` headers.
- `external_api/security/apikey.py` — API key auth, scopes, admin bootstrap.
- `external_api/security/hmac.py` — HMAC-SHA256 webhook signature validator.
- `external_api/services/deed_generation.py` — Calls **Main API** to generate PDF; uploads to S3 (or local) and records mapping.
- `external_api/storage/s3_storage.py` — S3 client + local fallback.
- `external_api/routers/partners.py` — Partner endpoints.
- `external_api/routers/admin.py` — Admin endpoints.
- `migrations/*.sql` — Postgres DDL for new tables.
- `postman/DeedPro External API.postman_collection.json` — Ready to import.
- `tests/test_external_api.py` — Smoke test.
- `scripts/dev_run.sh` — Run server with uvicorn.

## One-time setup
1. Copy env: `cp env/.env.example .env` and fill values.
2. Install deps:
   ```bash
   pip install fastapi "uvicorn[standard]" pydantic-settings SQLAlchemy psycopg[binary] httpx boto3 python-dotenv python-multipart
   # optional
   pip install redis
   ```
3. Apply migrations:
   ```bash
   psql "$DATABASE_URL" -f migrations/001_api_keys.sql
   psql "$DATABASE_URL" -f migrations/002_api_usage.sql
   psql "$DATABASE_URL" -f migrations/003_external_deeds.sql
   ```
4. Run:
   ```bash
   bash scripts/dev_run.sh
   ```

## Minimal happy path (local storage)
```bash
export STORAGE_DRIVER=local
export LOCAL_STORAGE_DIR=./external_api/storage/files
bash scripts/dev_run.sh

# Bootstrap API key
curl -X POST "http://localhost:8001/admin/api-keys/bootstrap"   -H "X-Admin-Setup-Secret: $ADMIN_SETUP_SECRET"   -H "Content-Type: application/json"   -d '{"company":"TestCo","scopes":["deed:create","deed:read"],"rate_limit_per_minute":60}'

# Use the returned api_key value below
curl -X POST "http://localhost:8001/v1/deeds/grant"   -H "X-API-Key: dp_pk_xxx" -H "Content-Type: application/json"   -d '{"order_id":"ORD-123","property_address":"123 Main St, La Verne, CA","parties":{"grantor":"Alice","grantee":"Bob"}}'
```
