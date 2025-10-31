# DeedPro — Phase 23 (Full) Billing & Reporting

This package upgrades the earlier MVP to a **production-capable** Billing & Reporting stack that implements:
- Expanded schemas (`invoices`, `payment_history`, `usage_events`, `credits`, `api_partner_contracts` + `subscriptions` enhancements)
- Complete **Stripe Webhook** handler with signature verification and core event support
- **Admin reporting** endpoints: overview, monthly breakdown, MRR/ARR, invoices & payments lists, CSV exports
- **Usage** endpoints: event logging, per-user & per-partner aggregations, limit check, and cost calculator
- **Partner billing** batch (monthly invoices from `api_usage` and/or `usage_events`)
- Optional **PDF invoice** generation (WeasyPrint) + S3/local storage
- A richer **Postman collection** to test everything end-to-end

## Install
1) Copy this `phase23/` package into your backend repo (e.g., `backend/phase23`).
2) Install deps:
   ```bash
   pip install fastapi "uvicorn[standard]" SQLAlchemy psycopg[binary] pydantic-settings stripe boto3 weasyprint httpx python-dotenv
   ```
3) Apply migrations in order:
   ```bash
   psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
   psql "$DATABASE_URL" -f migrations/phase23_001_invoices.sql
   psql "$DATABASE_URL" -f migrations/phase23_002_payments.sql
   psql "$DATABASE_URL" -f migrations/phase23_003_usage_events.sql
   psql "$DATABASE_URL" -f migrations/phase23_004_credits.sql
   psql "$DATABASE_URL" -f migrations/phase23_005_api_partner_contracts.sql
   psql "$DATABASE_URL" -f migrations/phase23_006_subscriptions_alter.sql
   psql "$DATABASE_URL" -f migrations/phase23_007_indexes.sql
   ```
4) Mount routers in your FastAPI app:
   ```python
   from phase23.billing.app_include import include_billing_routers
   include_billing_routers(app)
   ```
5) Configure env:
   ```env
   DATABASE_URL=postgresql+psycopg://user:pass@host:5432/deedpro
   STRIPE_SECRET_KEY=sk_live_or_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_OVERAGE_PRICE_CENTS=500
   STORAGE_DRIVER=local  # or s3
   S3_BUCKET=your-bucket
   S3_REGION=us-west-1
   AWS_ACCESS_KEY_ID=
   AWS_SECRET_ACCESS_KEY=
   ```

## Notes
- If WeasyPrint is unavailable, invoice PDFs will be skipped with a warning; you can enable later without breaking flows.
- `subscriptions` table is assumed to exist; this package **adds** several columns for reporting consistency.
- Admin endpoints currently have a placeholder `require_admin()`; connect to your real RBAC.
