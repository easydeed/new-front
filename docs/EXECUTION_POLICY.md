# Execution Policy — canonical

> This document governs all agent work in this repository, from any tool
> (Claude Code, Cursor, or anything else). It is the single source of truth;
> `CLAUDE.md` and `.cursorrules` carry only a digest and a pointer here.
> Established 2026-07-23 (Ticket P), distilled from the three-week cleanup
> and launch-set execution record (PRs #17–#36).

## Autonomy tiers

**Tier 1 — Free inside a ticket.** Build, self-review, independently re-run
all gates, recap. Every ticket ends with the executing agent re-verifying its
own gate conditions before reporting. When work is delegated, the T8 pattern
applies: the executor verifies, then the orchestrator independently
re-verifies — a gate is not "passed" on one party's word.

**Tier 2 — Conditional auto-proceed across tickets.** Rolling into the next
approved ticket without waiting is permitted only when the completed ticket
had **zero deviations, zero discoveries, zero surprises, and all gates
green**. Any flagged item, any "interesting find," any letter-vs-intent
judgment → stop and report instead. When in doubt, it's Tier 3.

**Tier 3 — Owner gates, never delegated.**
- `DROP TABLE` and any irreversible data operation (dumps first, drops by
  the owner's hand or explicit per-statement approval).
- Credentials: never committed, never pasted into any agent session —
  environment variables on Render only. Uploaded documents containing
  secrets get redacted before anything is committed.
- Deploy-topology changes (start commands, service layout, root dirs).
- Production click-throughs.
- Anything touching money or customer communication.

## Deviation doctrine

Letter-vs-intent deviations are **flagged and held for review, never
silently decided in either direction** — neither silent compliance with a
letter that violates the intent, nor silent improvisation past the letter.
Precedents, both correct *because they were flagged*: the
StorageClient→Postgres BYTEA storage call (T2 — ephemeral disk would have
silently violated the immutability requirement) and the flat-import call
(T8 — `backend.`-prefixing would have forced a deploy-topology change
mid-refactor). Recorded correction: `dtt_decided` (Ticket V) superseding
Ticket TT's "Generate as entered" — an undecided DTT was a path to a
substantively incomplete deed; the legal-choice doctrine was unchanged.

## Ticket protocol

- One concern per PR.
- Tickets name the agent type, verification steps, and explicit
  out-of-scope items ("flag, don't touch").
- Stop-and-report gates are non-negotiable.
- Evidence claims carry `file:line` citations.

## Verification invariants

- Honest CI stays blocking. No `|| true`, ever again.
- The OpenAPI route-contract test and the six-flow behavioral baseline
  (`backend/scripts/six_flow_baseline.py`) must stay green. Neither is
  re-recorded to make a failure pass without an approved, documented reason
  in the PR that re-records it.
- The frontend `tsc` error baseline (currently **114**) may only go down.

## Product doctrine (the why)

**The two-tier rule.**
- *Data fields* (APN, legal description, owner, grantor) carry `Sourced<T>`
  provenance and gate at generation with confirm-all; unstamped SiteX-loaded
  values are candidates, user-typed values are confirmed on entry.
- *Legal choices* (transfer-tax exemption, vesting) are **never
  auto-applied, never candidate-state inside the deed**. They gate at the
  point of decision by explicit officer acceptance and are recorded as the
  authorized instruction with source, timestamp, and the basis text the
  officer was shown. Suggest → confirm → record; the system proposes, the
  officer decides, we keep the record.
- *We generate the form, never its contents*: fields that belong to another
  party's legal act (e.g. the notary's certificate) are rendered blank.

**Immutability.** Generated PDFs are rendered once, stored once, and
sha256-stamped; `deeds.metadata.provenance` carries the
who-confirmed-what-when(-told-what) record beside the hash. Downloads
stream the stored bytes.

**Any code change that would violate these is wrong even if requested —
flag it.**
