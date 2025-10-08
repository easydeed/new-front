# Release Train — Phase 6-1

**Cadence**: Weekdays (Mon–Fri)

## Staging Train (16:00 PT)
1. Build FE/BE
2. Unit + integration tests
3. Deploy to **staging** (Vercel + API host)
4. Run Playwright smoke tests against staging
5. Notify Slack (optional webhook)

## Production Train (18:00 PT)
1. Gate on green staging smoke tests within the last hour
2. Deploy to **production**
3. Run smoke tests again
4. Tag release + generate changelog
5. Notify Slack

### Required secrets
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (frontend)
- `API_DEPLOY_CMD` (backend deploy command, e.g., Render CLI or Fly)
- `FRONTEND_BASE_URL_STAGING`, `API_BASE_URL_STAGING`
- `FRONTEND_BASE_URL_PROD`, `API_BASE_URL_PROD`

