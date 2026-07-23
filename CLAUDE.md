# Agent execution digest

**Read `docs/EXECUTION_POLICY.md` before executing any ticket — it is the
canonical policy; this is only the digest.**

- Tier 1: free inside a ticket; re-verify your own gates before reporting.
- Tier 2: auto-proceed to the next approved ticket ONLY on zero deviations,
  zero discoveries, all gates green. Otherwise stop and report.
- Tier 3 (owner-only, never delegated): DROP TABLE / irreversible data ops;
  credentials (env vars on Render only, never committed or pasted);
  deploy-topology changes; production click-throughs; money or customer
  communication.
- Deviation doctrine: letter-vs-intent conflicts are flagged and held —
  never silently decided in either direction.
- Invariants: blocking CI (no `|| true`), OpenAPI + six-flow baselines stay
  green, tsc baseline only goes down. Legal choices are never auto-applied.
