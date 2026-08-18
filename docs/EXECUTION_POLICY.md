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

## Standing practice — when a new surface needs an existing judgment

**The answer is never a second copy.** Owner-ruled 2026-08-11 (DASH1).

`/signings` held `STUCK_AFTER_DAYS = 5` in TypeScript. The dashboard
needed the same "has this gone quiet?" judgement, and the obvious move
was a matching threshold in Python. That would have been the FOURTH
instance of one disease in this codebase: the DTT city rates, the partner
category list (four divergent copies), the Shared Deeds row keys, and
this.

So the number moved server-side, the payload carries the verdict per row,
and the client constant was **deleted**. The ticket ended with one fewer
copy than it started with, and that is the bar: a ticket that adds a
surface should not add a copy of a judgement, and where it can, it should
remove one.

The mechanisms, in order of preference:

1. **Move it server-side and send the answer** — the screen renders what
   it is told (`officer_queue.is_stale`, `signing_loop.state_label`).
2. **One shared corpus both suites read** — when both languages must
   genuinely hold the logic (`phone_cases.json`,
   `shared_deed_row_keys.json`, `vesting_cases.json`).
3. **One module, both callers** — within a language (`lib/wallClock.ts`).

Copying is not on the list.

## Standing practice — verify the defect exists before costing the fix

**Owner-ruled 2026-08-11 (DASH1).** Applies to any finding that arrives
as a *description* of a problem rather than as a *reproduction* of one.

DASH1 item 6 asked to fix "label/route drift" — `/deed-builder` under a
label reading "Create Deed", `/account-settings` under "Settings" — with
redirects from the old paths. The wording inherited an external audit's
framing, and the framing implied a dead end.

There was no dead end. **Both target routes already existed as aliases**,
and one of them was a deliberate prior migration in the opposite
direction whose own comment recorded the decision. `/settings` had been
added by an earlier ticket for precisely the reason item 6 gave. Building
the rename would have undone a chosen migration, renamed a route param,
and put a redirect hop on a Stripe `return_url` — for a benefit visible
only in the address bar.

The check cost one directory listing, taken *before* opening an editor.

**The rule:** reproduce the defect, or locate the code that produces it,
before estimating or building. A finding described convincingly is not a
finding observed. And when the check says the defect is absent, the
answer is to report that — not to build the fix anyway because it was
ruled.

**Corollary.** If the thing is still wanted once the defect is disproved,
it is a product decision on its own merits and deserves to be ruled as
one, rather than shipped under a bug ticket that no longer has a bug.

### A ruling can fail in two ways, and both need checking

**Owner-ruled 2026-08-12 (UX2 item 1).** DASH1 was one failure mode. UX2
item 1 was the other, and confusing them wastes the lesson.

| | DASH1 route rename | UX2 item 1 property search |
|---|---|---|
| The defect | **did not exist** — both routes were already aliases | **was real**, and worse than described |
| The diagnosis | — | **was wrong**: "we re-search by address string instead of passing the autocomplete's identifier" |
| The right answer | ship nothing, report | ship the fix, at the place the defect actually is |

UX2's hypothesis was framed from outside the constraint. SiteX takes
`addr` + `lastLine` **or** `fips` + `apn`; Google's `place_id` is not a
SiteX key, and the FIPS + APN that would be precise does not exist on our
side until SiteX has already answered. Re-searching by address string is
the interface, not a shortcut somebody took.

The defect was one step later and entirely ours: we had the officer's
exact address, we had 76 candidates each carrying an address, and we
compared nothing.

**The rule:** verify the DEFECT and verify the EXPLANATION. A ticket that
names a cause is making two claims, and building against the wrong one
produces a change that is real work, passes review, and leaves the defect
where it was.

## Standing practice — a job that writes says which database it is in

Ruled 2026-08-12 (db-identity ticket). `relation "signing_participants"
does not exist` cost an afternoon and two redeploys on an untested
hypothesis: it sent us hunting for a schema that had never run, when the
schema was fine and the service was pointed at the wrong database.

**The rule:** any script that connects to `DATABASE_URL` and commits
either calls `services.db_identity.assert_tables()` before it does
anything, or appears in the exemption list in
`backend/tests/test_db_identity.py` with the argument for its exemption.
Exact-set equality — a new script cannot arrive unclassified.

**Two different wrong databases, and only one of them is loud.**

- *Missing tables* — the wrong database, empty. `assert_tables` names the
  database, host, port, user and every table it wanted, so one run ends
  the investigation instead of starting one.
- *Staging* — every table present, every query succeeding, the job
  deleting or rewriting real rows in the wrong copy and reporting a
  cheerful count. Nothing about the connection distinguishes it; only the
  name does. `EXPECTED_DATABASE` lets a deployment state which database a
  job is FOR, and it is optional because a local run and CI both point
  somewhere else legitimately.

This is Invariant #4 — a failure surfaces with its reason — pointed at
the failure itself: **an error that names its context is a different
quality of error.** Both phrasings of the message above are true and only
one is useful, and the difference is four values Postgres gives away.

## Verification invariants

- Honest CI stays blocking. No `|| true`, ever again.
- **`next build` runs locally before every frontend PR, and never becomes
  optional or advisory.** Owner-ruled 2026-08-11 (DASH1). It is the only
  gate that sees a whole class: `useSearchParams()` opts a page out of
  static prerendering unless it sits under a `<Suspense>` boundary, and
  Next fails the BUILD rather than the render — jest and tsc both stay
  green while the deploy dies. It caught this twice in one wave
  (`/signings`, then `/past-deeds`). The lesson generalises past that one
  API: **gate diversity matters more than gate count**, because gates of
  the same kind fail in the same direction.
- The OpenAPI route-contract test and the six-flow behavioral baseline
  (`backend/scripts/six_flow_baseline.py`) must stay green. Neither is
  re-recorded to make a failure pass without an approved, documented reason
  in the PR that re-records it.
- The frontend `tsc` error baseline (currently **88**) may only go down.
  Lowered from 94 on 2026-08-12 when UX2 item 2 deleted
  `PreviewDataDebugger.tsx` — a floating debug panel with no importers,
  which had shipped nothing and cost six type errors. Locking the gain
  in is the point: a ceiling left where it was is a ceiling that
  silently re-accepts what was just removed.
  Enforced by `TSC_BASELINE` in `.github/workflows/test.yml`, which is
  the authority; this line said **114** until 2026-08-12, long after the
  machine had been holding 94. Nothing was let through — the gate was
  always the stricter of the two — but a reader checking their work
  against this page would have believed they had twenty errors of
  headroom they did not have.

## Run every gate. Which one will find it first is guidance, not permission (2026-08-13, replaced 2026-08-18)

**Owner-ruled, from two failures — and the second one happened despite
the fix for the first.**

FAILURE ONE. REQUIRED1 tightened a write endpoint. I ran pytest, tsc,
jest and banned-claims — and not the proof harnesses — then reported
green. CI failed on `proof-harnesses`, and the harness was right: the
tightened endpoint refused an officer's partial work in the Thursday
walkthrough.

The fix was the table below, as a **decision aid for which gates to
skip.** It encoded a premise: that a change's shape bounds which gates
can fail.

FAILURE TWO. DASH-FIX #4's follow-on changed one expression in
`officer_queue.py`. Backend-only, so pytest, the harnesses and
banned-claims were run and jest was not. CI failed on `frontend-tests`.

**The premise was false, and false BY DESIGN.** This repo's
cross-language discipline works by suites reading the OTHER language's
source — `ux2Items.test.ts` reads `officer_queue.py` precisely so that
"the badge counts presence, the attention number counts silence" is one
decision rather than two. A backend-only change is therefore policed by
the frontend suite *on purpose*, and a rule saying otherwise is arguing
with the architecture.

**So the rule is now: RUN BOTH SUITES AND THE HARNESSES. They are about
four minutes together, which is cheaper than the reasoning required to
skip one correctly.**

And the reasoning is not merely expensive — it is not available. What
bounds which gates can fail is **which files the suites READ**, and that
is not knowable from the diff. A change to a Python expression cannot
tell you that a TypeScript test is holding a ruling about it.

### The table survives, stripped of its permission

It was always better as a diagnostic than as a licence. Read it as *this
is the gate most likely to catch this change's defect, so look there
first when something is red* — never as *these are the gates that can
be red.*

| the change | the gate most likely to find its defect |
|---|---|
| tightening or loosening a write endpoint | the end-to-end harnesses (six-flow, Thursday, API baseline) — unit tests hold fixtures the endpoint no longer accepts |
| a page's markup, state or conditional rendering | `next build`, then a render test — jest and tsc both stay green while the deploy dies |
| a shared vocabulary or a definition | the OTHER language's suite, and the cross-language pins |
| a schema or persistence shape | the resume/round-trip pins, then the harnesses |
| a refusal or a guard | a mutation probe, because a guard that never fires is invisible to every other check |

### Why this replaces the table rather than amending it

Worth recording plainly, because the shape recurs: **the response to a
judgement failure was a finer judgement aid, when the correct response
was removing the judgement.**

The first error was a person deciding which gates could be skipped and
deciding wrong. The remedy shipped was a better basis for that same
decision — which left the decision in place, and the second error was
made with the table available and consulted. An aid that makes a
judgement more accurate still fails at the rate the judgement fails.
Deleting the judgement does not.

The same test applies to any future rule of this kind: *does it make a
call easier to get right, or does it remove the call?* Prefer the second
whenever the call is cheap to eliminate — and four minutes of CPU is
cheap.

## Dead code and revived code

**Reviving a dead file makes its violations live.** A file with no
importers is outside the blast radius of every ruling made while it was
dead — not because anybody exempted it, but because nothing pointed at it
when the sweep ran. The moment a ticket imports it, everything the
product decided in the interval applies to it retroactively and
un-negotiably.

The concrete instance, kept because the shape recurs:
`QuickAddPartnerModal` still carried a full-viewport `backdrop-blur` from
before the X1 renderer-freeze ruling, and a category list in which
`realtor` was a CATEGORY where every live surface treated it as a role of
`real_estate`. Both were harmless while nothing imported it. PARTNER2's
Part B imported it, and both became live defects in the same commit.

**What this means for a ticket that touches dead code:**

1. *Leaving a dead file alone is correct* when nothing in the ticket
   revives it. Cleaning up an unreferenced file is scope the owner did
   not ask for.
2. *Reviving one obliges you to bring it up to current doctrine* in the
   same diff — every pin the product has added since it went dark. Not
   as a follow-up ticket; the revival and the conformance are one change,
   because a half-revived file is a live surface running an old rulebook.
3. *Both of those can be true in consecutive tickets about the same file*,
   and saying so plainly is better than pretending the first call was
   wrong. PARTNER1's "leave the dead files alone" was right when it was
   made and wrong the moment Part B revived them.

The general form: **a pin's coverage is the set of files something
imports, not the set of files that exist.** When the import graph grows,
re-run the sweeps against the new graph rather than assuming the last
green run still describes the product.

## Deployed services

Both rules below are owner-set, from the purge cron's four-failure
deployment (2026-08-11; full account in `OWNER_LEDGER.md`).

**Every Render service pins `PYTHON_VERSION` explicitly.** Not only the
ones that have broken. A service without an explicit version inherits
whatever Render's default is on the day it builds, so the runtime can
change under a service nobody touched — which is how the cron's first
build died compiling Rust for a `pydantic_core` with no 3.14 wheel.

**Any service handed a `DATABASE_URL` is verified against the API's
before it is trusted.** Compare `current_database()`, host and port from
both sides. A connection that SUCCEEDS tells you nothing about whether it
is the right database: the cron connected happily to a second, older
Postgres in the same account and reported a missing table. "Table does
not exist" and "you are looking at the wrong server" produce the same
error message, and the first reading is the one that wastes an afternoon.

Corollary for anything with a specific table to find: assert it at
startup and NAME THE DATABASE in the failure. "signing_participants not
found in deedpro_database on dpg-d1vb…" ends the investigation in one
run; "relation does not exist" starts a schema hunt.

## Pull requests and stacking

**A squash-merged base does not carry its stack.** Stacking PR B on PR
A's branch works until A is squash-merged — at which point the squash is
a NEW commit on main, A's branch still exists unchanged, and B is still
pointed at it. Merging B then lands B on A's branch instead of on main,
reports "merged" truthfully, and leaves main without B's work.

This happened with #146 → #147: Part A reached main, Part B did not, and
the merge API said success both times. It was caught by checking that
main actually contained the files rather than trusting the word "merged."

**The operational rule: no stacking unless the child is re-based onto
main before it is merged.** In practice that means either
- open the second PR against `main` and wait for the first to land, or
- cherry-pick onto a fresh branch off current main and re-open.

**And the general form, which is the part worth keeping:** a merge
reporting success is a statement about the merge, not about main. When a
PR's whole point is that some code reaches production, verify the code
reached the branch production deploys from. `git log origin/main` and
`ls` cost five seconds.

## Test helpers and persistent state

**Any pin that reads a table surviving between runs must establish its
own baseline.** A test asserting "a row with this template exists" or
"this job has not run recently" is measuring the HISTORY of the test
database, not the behaviour of the code under test — and it passes with
the code deliberately broken, which is the worst failure a test has.

Two instances, both found by mutation-probing a green result:
- `email_log` (NOTARY1) — "the officer's email was attempted" was
  satisfied by a row from an earlier run. Fixed with a high-water mark
  (`MAX(id)`) taken before the action.
- `system_jobs` (NOTARY2) — "the sweep ran" failed on the second
  execution of the suite because the first had legitimately throttled it.
  Fixed by deleting the job row in setup, and extended to assert the
  throttle is a WINDOW rather than a one-shot.

The two shapes of fix: **take a high-water mark before acting** when the
table is append-only, or **reset the row in setup** when it is a
singleton. Either way the test states what it depends on instead of
inheriting it.

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
