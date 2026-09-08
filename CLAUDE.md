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

## A fixed-width identifier is READ from the tool that owns it

**Never reconstructed, never padded, never completed from its prefix.**
A SHA, a token, a digest, an id — read it in the same command sequence
that uses it:

```
git -C /home/user/new-front rev-parse HEAD
```

The one it would have prevented: merging #274 needed the head SHA as a
merge precondition, the short hash `719de8fe` was on screen from a `git
commit` line, and **the remaining 32 characters were manufactured to
satisfy the length requirement.** A value that must be READ was
INVENTED, in the one field whose entire purpose is proving the caller
knows what it is merging.

**And the error that caught it points away from the fault.** GitHub
answered `409 Head branch was modified` — a *concurrent-modification*
message, so the obvious reading is "someone pushed", which sends you to
re-fetch and retry rather than to notice a fabricated argument. It was
somebody else's guardrail, and §14.18 is explicit that a near-miss
caught by somebody else's guardrail is not a caught near-miss.

**Why it lives in the digest.** This is the act the project refuses
everywhere it has been named — generate the allowlist rather than type
it, derive the count rather than transcribe it, recompute the hash
rather than echo the stored string. **It held everywhere it was named
and failed in the one place nobody had thought to name**, which is
§14.7: not a rule forgotten, a situation that did not announce itself as
an instance of the rule.

Same honest limit as the two rules above: **a prompt, not a gate.**

## Every ticket re-cuts its branch from `origin/main`. No exceptions.

```
git fetch origin main && git checkout -B <branch> origin/main
```

**Not "check that you are not stacked" — cut it so you cannot be.** The
command produces the property; there is no later moment at which to
forget to verify it.

The one it would have prevented: #249 was cut from #248's head. When #248
squash-merged, its content sat in `main` under a new SHA and on the branch
under the old ones, both editing `OWNER_LEDGER.md` — an automatic
conflict. And a conflicted PR **loses its `pull_request` CI silently**:
those runs are computed against `refs/pull/N/merge`, which does not exist,
so no run is created at all — not queued, not skipped, not failed. `test.yml`
fires on bare `push` and kept reporting, so the page showed six greens and
a hole, and **a hole reads as completeness** (§14.18).

Free confirmation, one line, no API, in the same breath as the checkout:

```
[ "$(git merge-base HEAD origin/main)" = "$(git rev-parse origin/main)" ]
```

**Two counts that are claims, not decoration.** A PR's own file and line
totals assert its scope: 6 files / +339 on a 3-file / +136 ticket is
something else having come along, and it was on screen before any of the
CI archaeology started. Same for `git status` before a commit.

Same honest limit as `-C` above: **this is a prompt, not a gate.** It
still has to be typed.
