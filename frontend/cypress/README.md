# Browser test target safety

The three maintained E2E configurations require explicit frontend and API origins. They have no deployed-service or account defaults. Only HTTP(S) loopback origins using `localhost`, `127.0.0.1` or `[::1]` are accepted. A configuration named staging does not authorize a remote destination.

## Running the safety checks

From `frontend`, run `npm run test:browser-safety`. The checks exercise configuration, command and redirect refusals without contacting any application or deployed service. CI runs the same command's underlying Node check before Jest; both remain blocking.

With a compatible Cypress binary installed, `npm run test:browser-safety:runtime` exercises the actual guard modules against disposable synthetic loopback servers, not the application. Its proof requires one normal passing test, three deliberately failing refusal tests with the expected error messages, and zero hits at the forbidden local server. The negative cases cover a direct request, a redirect and an application browser fetch. Any missing refusal, skipped test or unexpected failure makes the proof fail. The toolchain follow-up also runs this synthetic proof in CI; it does not run the legacy application journeys.

Maintained E2E configs and synthetic proofs use Electron bundled with the approved Cypress 15 line. No external Chrome installation, personal browser profile, profile preference, process-wide environment flag or startup-argument change is required. `scripts/synthetic-browser.cjs` validates targets without mutating browser startup. The minifier/dev-server smoke requires three fresh browser starts and stops on the first failed result. Production browsers and hosting settings are unchanged.

The owner approved explicit local blocks for known browser-background downloads on 2026-11-09. The shared fence returns a static, uncached 503 response for anonymous GET/HEAD traffic to the observed `www.gstatic.com`, `edgedl.me.gvt1.com`, `redirector.gvt1.com` and anchored `rr<digits>---sn-<identifier>.gvt1.com` hosts. It never forwards that traffic. Eligibility requires no custom port or URL credentials, absent/`other` resource type, no Origin, Referer, Authorization or Cookie header, and absent or background-only fetch metadata. App resources, fetch/XHR, navigation, authenticated requests, writes and direct `cy.request`/`cy.visit` commands retain the strict failure path, even for these hosts. This is a deny-only response policy, not remote permission or operating-system network isolation.

## Configuring local application tests

First verify that the local frontend points to the disposable local API, and that the API uses synthetic data in a disposable database. A loopback address alone cannot establish those facts. This repair does not provision or attest a test environment.

For a verified local fixture, set both origins explicitly, for example in PowerShell:

```powershell
$env:CYPRESS_BASE_URL = 'http://127.0.0.1:3000'
$env:CYPRESS_API_URL = 'http://127.0.0.1:8000'
```

These select the browser test targets, not the frontend application's backend configuration. Tests requiring login also require explicit disposable account inputs through `TEST_EMAIL` and `TEST_PASSWORD` in Cypress's environment, or explicit helper arguments. Never use production accounts, commit account values, or paste credentials into agent sessions.

The existing `cypress:run` and `cypress:open` scripts use the guarded default config. The staging and phase-five config files apply the same policy. Missing or unsafe final values—including CLI overrides—fail before test tasks are registered. Remote staging requires owner review of a specific destination and a separate policy change; there is no environment-variable bypass.

## Request controls and limits

One shared policy validates final configuration and command targets. Login helpers recheck targets before sending, have no fallback account, and hide their request and UI credential inputs from Cypress's command log. Direct `cy.request` calls are checked too, with automatic redirects disabled and redirect responses refused. `cy.visit` permits only the configured frontend origin. Root suite and per-test middleware refuse browser requests outside the configured origin pair, before other intercept handlers.

The controls cover the maintained Cypress entry points. They are not an operating-system network fence: arbitrary Node tasks, custom configuration files, plugins, and server-side calls from a local app need their own review. Do not infer that the full legacy journeys pass or that local servers cannot reach production. Application assertions, accessibility behavior and test retries are unchanged.

Implementation references: `cypress/target-policy.cjs:7`, `cypress/support/target-safety.cjs:33`, and `scripts/browser-target-safety.check.cjs:1`.
