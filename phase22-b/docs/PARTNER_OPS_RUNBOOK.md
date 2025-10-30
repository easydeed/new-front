# Partner API — Ops & Governance Runbook (Phase 22‑B)

## Roles
- **Partner Admin**: Create/revoke API keys and view usage (Admin UI).
- **Observer**: Read-only usage.
- **Partner Engineer**: External; uses API key only.

## Secrets
- `EXTERNAL_API_ADMIN_SETUP_SECRET` — server-side only.
- External API stores only key hash + prefix; full key shown once.

## Onboarding Flow
1. Admin → `/admin/partners` → **Add Partner**.
2. Generate key → copy once → share securely.
3. Send Postman + docs.
4. Verify first call; watch usage on detail page.

## Revocation & Rotation
- Revoke via list page.
- Rotation: revoke old → create new → notify partner.

## Rate Limits
- Default 120/min; adjust per partner.
- External API returns `X-RateLimit-*` headers.

## Monitoring
- `/admin/partners/[prefix]` shows quick KPIs + table.
- External `api_usage` retains request latency and status.

## Incidents
- ≥10% errors → check usage, logs, partner payload.
- 429 storm → lower limit or revoke.
- Data export → query `external_deeds` by partner.
