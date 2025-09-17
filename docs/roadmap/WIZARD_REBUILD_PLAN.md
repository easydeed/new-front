# Wizard Rebuild Plan

This plan replaces the previous 9-week outline with actionable delivery phases that map directly to the dynamic wizard architecture and recently documented backend route updates. For architectural touchpoints reference the [Dynamic Wizard Architecture](../wizard/ARCHITECTURE.md) and for API wiring details see the [Backend Route Reference](../backend/ROUTES.md) alongside the [TitlePoint Integration: Fail-Proof Implementation Guide](../titlepoint-failproof-guide.md).

## Phase 1 – Foundation
**Objectives**
- Confirm baseline wizard flow in `frontend/src/app/create-deed/` aligns with the architecture in the [Dynamic Wizard Architecture](../wizard/ARCHITECTURE.md) reference.
- Stabilize shared UI primitives and loading states used across wizard steps.
- Document configuration deltas between local, staging, and production environments.

### Exit Criteria
- Component inventory and dependency graph for `dynamic-wizard.tsx` and nested components captured in the roadmap appendix.
- Environment variable matrices for frontend and backend signed off by DevOps.
- Baseline analytics events for wizard entry and step completion firing in staging.

### Required Tests
- **Unit**: Component-level tests in `frontend` (button states, validation hooks) and utility tests for wizard state machines.
- **Integration**: Next.js route-level tests that render the multi-step flow with mocked API responses.
- **Cypress/UAT**: Smoke script validating navigation across the three core wizard steps without external integrations enabled.

### Rollback Checkpoints
- Tag repository state (`foundation-ready`) after component stabilization.
- Snapshot Render and Vercel environment variables before introducing integration flags.
- Maintain feature toggle defaults (`DYNAMIC_WIZARD_ENABLED=false`) to quickly revert to legacy wizard.

### Deployment Steps
**Staging**
- **Render (Backend)**: No code deployment required; verify existing `/health` endpoint. Keep `DYNAMIC_WIZARD_ENABLED=false`. Monitoring: baseline latency/error metrics via Render dashboard.
- **Vercel (Frontend)**: Deploy UI-only adjustments. Use preview deployments with `NEXT_PUBLIC_DYNAMIC_WIZARD=false`. Monitor Next.js build output and client error logs.

**Production**
- **Render**: No rollout; confirm alerting configured for backend uptime.
- **Vercel**: Do not expose new UI; retain legacy wizard while tracking performance metrics for reference.

## Phase 2 – Integrations Enablement
**Objectives**
- Wire Google Places and TitlePoint connectors per the updated integration plans in the [Dynamic Wizard Architecture](../wizard/ARCHITECTURE.md), [Backend Route Reference](../backend/ROUTES.md), and [TitlePoint Integration: Fail-Proof Implementation Guide](../titlepoint-failproof-guide.md).
- Establish adapter interfaces for external data ingestion and caching.
- Update feature flag plan for staged rollout of integrations.

### Exit Criteria
- `PropertySearchWithTitlePoint.tsx` integrated with backend proxy endpoints documented in the [Backend Route Reference](../backend/ROUTES.md) and [TitlePoint Integration: Fail-Proof Implementation Guide](../titlepoint-failproof-guide.md).
- Caching strategy documented with TTL and eviction rules.
- Feature flags (`NEXT_PUBLIC_TITLEPOINT_ENABLED`, `TITLEPOINT_API_KEY`) configurable per environment.

### Required Tests
- **Unit**: Mocked API client tests for Google Places and TitlePoint adapters.
- **Integration**: Backend contract tests against sandbox services; frontend integration tests verifying API mocks resolve correctly.
- **Cypress/UAT**: End-to-end scenario selecting an address and confirming property data autofills, run against staging sandbox keys.

### Rollback Checkpoints
- Capture integration toggle defaults in config repository.
- Maintain revert plan for adapter registration in dependency injection container.
- Record last-known-good commit hash after stable integration handshake.

### Deployment Steps
**Staging**
- **Render**: Deploy new integration services behind feature flags. Set `TITLEPOINT_API_KEY` to staging secret, keep `DYNAMIC_WIZARD_ENABLED=true` but `INTEGRATIONS_ACTIVE=false`. Monitoring: watch external API failure metrics and retry counts.
- **Vercel**: Enable Google Places flag only. Use staged secrets for API keys. Monitor browser console for quota or auth errors.

**Production**
- **Render**: Deploy but keep `INTEGRATIONS_ACTIVE=false`. No data migration. Configure alerts on TitlePoint response times.
- **Vercel**: Ship dormant integration UI. Monitor Real User Monitoring (RUM) for unexpected JS errors while integrations remain hidden.

## Phase 3 – Backend Services & Routes
**Objectives**
- Finalize the `/generate/grant-deed-ca` FastAPI route per the Grant Deed Route Implementation doc.
- Extend orchestration services in `backend/api` to support multi-document generation and AI assist prompts.
- Harden template rendering logic with validation and logging.

### Exit Criteria
- Route handlers in `backend/routers/deeds.py` pass contract tests and align with documentation.
- AI assist workflow in `backend/api/ai_assist.py` orchestrates prompts without timeout regressions.
- Template rendering includes schema validation and error instrumentation.

### Required Tests
- **Unit**: FastAPI route handler tests (pytest) covering success and failure paths; template rendering utilities.
- **Integration**: API workflow tests invoking `/generate/grant-deed-ca` with mocked external dependencies; database read/write checks if applicable.
- **Cypress/UAT**: Wizard-driven deed generation flow validating backend responses populate the review step.

### Rollback Checkpoints
- Database snapshot (if any writes are introduced) stored before deploy.
- Toggle `DYNAMIC_WIZARD_ENABLED` and `NEXT_PUBLIC_DYNAMIC_WIZARD` to false to fall back to legacy flow.
- Maintain previous container image tag for quick Render rollback.

### Deployment Steps
**Staging**
- **Render**: Deploy updated backend. Run smoke tests (`pytest -k grant_deed`). Confirm logging per documentation. Monitoring: track request latency, error rate, and template rendering warnings.
- **Vercel**: Deploy wizard updates pointing to staging API. Enable `NEXT_PUBLIC_DYNAMIC_WIZARD=true` for QA accounts via feature flag rules. Monitor API call outcomes via browser devtools logging.

**Production**
- **Render**: Deploy container with new route but set `DYNAMIC_WIZARD_ENABLED=false` initially. No new data migrations unless persistence introduced; if so, apply Alembic migration scripts ahead of traffic. Monitor FastAPI logs and APM traces.
- **Vercel**: Keep wizard flag off until backend confirmed stable. Monitor Sentry/New Relic for background errors.

## Phase 4 – Quality Assurance & Hardening
**Objectives**
- Achieve comprehensive coverage across unit, integration, and end-to-end suites.
- Validate resilience scenarios (API degradation, slow responses, partial data).
- Conduct accessibility and performance audits.

### Exit Criteria
- Test coverage thresholds: 80%+ for affected frontend components, 90% for new backend modules.
- Documented resiliency playbooks for degraded external services.
- Accessibility score ≥ 90 in Lighthouse for wizard pages.

### Required Tests
- **Unit**: Regression suites across frontend hooks and backend utilities.
- **Integration**: Contract tests with fault injection (timeouts, HTTP 500).
- **Cypress/UAT**: Full regression pack, including accessibility (axe) checks and PDF download verification.

### Rollback Checkpoints
- Store Cypress baseline screenshots/videos for comparison.
- Archive successful test artifacts and coverage reports.
- Preserve staging database snapshot prior to resilience testing.

### Deployment Steps
**Staging**
- **Render**: Deploy QA instrumentation (additional logging). Run full automated suite (`pytest`, contract tests) in CI. Monitoring: use Render metrics plus log aggregation for injected faults.
- **Vercel**: Promote QA build with feature flags on. Execute Cypress suite against staging. Monitor Web Vitals dashboards.

**Production**
- **Render**: No new code unless fixes required; ensure monitors/alerts thresholds updated. Confirm rollback scripts tested.
- **Vercel**: Prepare production release candidate. Keep feature flags at previous values until go-live approval. Monitor for regression via synthetic checks.

## Phase 5 – Deployment & Rollout
**Objectives**
- Activate dynamic wizard for end users with phased rollout.
- Complete data migration or seeding tasks required for production parity.
- Establish ongoing monitoring and rollback readiness.

### Exit Criteria
- Production feature flags toggled to enable wizard for 100% traffic after staged ramp.
- Post-deployment validation checklist signed off (backend routes, integrations, UI states).
- Monitoring dashboards and alerting tuned for steady-state operations.

### Required Tests
- **Unit**: Spot-check hotfixes introduced during rollout.
- **Integration**: Smoke run of backend workflow tests post-deploy.
- **Cypress/UAT**: Production smoke suite (limited set) verifying core scenarios with production feature flags enabled.

### Rollback Checkpoints
- Pre-rollout production database backup (if applicable).
- Ability to toggle flags (`DYNAMIC_WIZARD_ENABLED`, `NEXT_PUBLIC_DYNAMIC_WIZARD`, `NEXT_PUBLIC_TITLEPOINT_ENABLED`) within minutes.
- Documented process to redeploy previous Vercel build and Render image.

### Deployment Steps
**Staging**
- **Render**: Final rehearsal using production-like data. Monitor high-priority metrics (latency, error rates, queue depth) for 24h burn-in.
- **Vercel**: Validate feature flag sequencing via LaunchDarkly (or equivalent). Run final Cypress regression and capture sign-off evidence.

**Production**
- **Render**: Deploy final image. Apply outstanding migrations (if any) during low-traffic window. Turn on `DYNAMIC_WIZARD_ENABLED=true` and monitor logs/APM for first-hour anomalies; set rollback checkpoint at 30 minutes.
- **Vercel**: Promote release, enable feature flags incrementally (e.g., 10% → 50% → 100%) while watching real-time analytics. Monitor user funnels, API error overlays, and business KPIs. If metrics regress, toggle flags off and redeploy prior build.

## Ongoing Governance
- Maintain linkage between roadmap items and supporting docs ([Dynamic Wizard Architecture](../wizard/ARCHITECTURE.md), [Backend Route Reference](../backend/ROUTES.md), [TitlePoint Integration: Fail-Proof Implementation Guide](../titlepoint-failproof-guide.md)) to ensure code and documentation evolve together, drawing on the archived [2025 overhaul guides](../archive/2025-overhaul/) for historical context when needed.
- Update Render `render.yaml` and Vercel project settings as configuration changes are introduced in later iterations.
- Schedule quarterly reviews of feature flags and monitoring coverage to retire unused toggles and refine alerts.
