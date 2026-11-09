# Browser test target safety

The three maintained E2E configurations require explicit frontend and API origins. They have no deployed-service or account defaults. Only HTTP(S) loopback origins using `localhost`, `127.0.0.1` or `[::1]` are accepted. A configuration named staging does not authorize a remote destination.

## Running the safety checks

From `frontend`, run `npm run test:browser-safety`. The checks exercise configuration, command and redirect refusals without contacting any application or deployed service. CI runs the same command's underlying Node check before Jest; both remain blocking.

With a compatible Cypress binary installed, `npm run test:browser-safety:runtime` exercises the actual guard modules against disposable synthetic loopback servers, not the application. Its proof requires one normal passing test, two deliberately failing refusal tests with the expected error messages, and zero hits at the forbidden local server. Any missing refusal, skipped test or unexpected failure makes the proof fail. The toolchain follow-up also runs this synthetic proof in CI; it does not run the legacy application journeys.

Synthetic browser proofs apply process-local background/component/model-fetch controls through `scripts/synthetic-browser.cjs`, restoring prior launch arguments afterward. This addresses observed browser-startup traffic without admitting remote hosts or ignoring refusals. The minifier/dev-server smoke uses the same target policy, requires three fresh browser starts, and stops on the first failed result. These settings do not change the production browser or hosting configuration.

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
