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

## Git commands take an absolute `-C`, always

`git -C /home/user/new-front add …` (and `commit`, `push`). **Never a bare
`git add <path>` from a subdirectory.**

Twice in one session a `git add docs/…` was run from `backend/`. It
errors, the commit is then empty, and `git push` reports *"Everything
up-to-date"* — **a success message for having pushed nothing.** Both were
caught by reading the output; neither was prevented.

`-C <absolute root>` removes the working directory as a variable rather
than asking anyone to track it. This lives here because `.git/hooks` is
not version-controlled and does not survive a container recycle, which
this project has seen twice — **the digest is the only enforcement
surface that outlives the machine.**

**And read what a git command printed, never its exit code alone.** A
failed `add` followed by a "successful" push is the shape: every
individual command did what it said.
