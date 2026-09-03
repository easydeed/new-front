# Owner ledger — canonical open/closed list

**This file is the ledger.** Agent reports cite it; corrections land HERE
(not only in chat) so the list survives context windows. No credential
values ever appear in this file — item names and status only.

_Last corrected: 2026-08-27 (API-CONFIRM #263; approved ≠ merged,
third instance).
Previously 2026-08-27 (ENTITY1 merged #264; Terms-vs-env entity pin).
Previously 2026-08-27 (DX-BRUTAL's dead-control finding and the
open `exempt_code` validation decision recorded).
Previously 2026-08-18 (the DECIDED/BUILT convention adopted
repo-wide; W0 §3 converted as the first entry; HOME2-FOLLOWUP recorded).
Previously 2026-08-04 (RED-H1 wave closed; the RED0 remediation queue
re-sequenced by owner ruling; NOTARY1 and RED-S5 recorded as
deferred-by-decision with named triggers)._

## THE CONVENTION: `DECIDED` and `BUILT` are FIELDS, not prose

**Adopted 2026-08-18, owner-ruled, repo-wide.** Every entry that records
a decision carries both markers on their own line:

    **DECIDED** 2026-07-30 — Model 2: confirmation stays in our UI.
    **BUILT** — yes, 2026-08-27, `services/api_confirm.py`,
    `routers/api_confirm.py`, `frontend/src/app/confirm/[token]/page.tsx`.

`BUILT` takes a PR number, a date, or the word **no**. It is never
omitted, and "no" is never expressed by leaving it out — an absent field
reads as an oversight, and the whole point is that an unbuilt ruling
should be impossible to skim past.

**Why a convention, and why it earned one.** Twice now, an accurate
ledger entry was read as describing a shipped thing:

1. **`EMAIL_VERIFICATION_REQUIRED`** — recorded as evidence that required
   verification was ready to switch on, while the flag was defined in one
   file and read in none, and the same entry called verification
   "resend-only" when the resend endpoint had no caller.
2. **W0 §3** — *"DECIDED: Model 2 = confirmation in our UI… PR #79 closed
   as decided; the W1 draft stays parked pending the owner's lane call."*
   Every word true. The owner made the ruling and read it as built. The
   qualification that mattered was a subordinate clause in a sentence
   about something else. Found four days before pilot traffic.

Both cost real time, and neither was a lie — they were **prose that
required close reading to distinguish a decision from an implementation**.
Two fields make that distinction scannable, and make the gap countable:
`grep -c 'BUILT — no'` is now a number about the product.

**The first sweep ran on 2026-08-19** and is recorded below with its
coverage — including what it did NOT reach, because a sweep claiming
completeness it lacked would be this convention's own defect.

**`BUILT` IS ANSWERED FROM THE CODE, NEVER TRANSCRIBED FROM THE
ENTRY'S OWN PROSE.** That is the discipline, and it is the whole
reason the first sweep found anything: reading the queue table's own
sentences would have confirmed the queue table.

## THE SECOND CONVENTION: a caveat names a worry, a mechanism names the QUESTION

**Adopted 2026-08-26, owner-ruled.** Filed here, where entries get
written, rather than in the entry that produced it — the same §15.1
argument that moved §14.22 out of §14.20.

**A caveat says *"be careful about X."* A mechanism made of prose names
the specific question a future reader would otherwise stop asking.** The
difference is whether the sentence does work at the moment someone would
have skipped it.

**The instance is on this page.** `TSC-PARSE` records that two frontend
gates happened to have opposite failure modes on an unparseable file, so
one fell silent while the other got louder, and the drop was visible only
because of that.

  · **Caveat:** *"recorded as luck rather than design."* True, agreeable,
    and easy to nod past. It changes nothing a reader does.
  · **Mechanism:** *"we do not know whether any other pair of gates in
    this repository has opposing failure modes, and none has been
    checked."* That sentence names a question the reader was about to
    stop asking — and stopping is the actual damage, because a property
    obtained by accident and filed as a control teaches the next person
    that the coverage is deliberate everywhere.

**The test when writing an entry:** what would a reader who believes this
entry stop investigating? Write THAT down. An entry that only expresses
appropriate humility has expressed a mood.

**This applies to every entry, not to the one that occasioned it.** Any
caveat already in this file is a candidate for conversion, and new
entries carry the mechanism form.

## The queue — RED0 remediation, as ruled

Owner-ruled order. Nothing here is "next" by inference; this list is the
authority and it is re-ruled, not re-derived.

| # | ticket | DECIDED | BUILT |
|---|---|---|---|
| 1 | ~~**RED-S1**~~ — per-request pool, per-request transactions, induced-failure concurrency test, 20 RPS + burst run, healing ladder RETIRED | ruled | **yes** — `scripts/s1_concurrency_proof.py`, green in CI |
| 2 | **RED-S2** — object storage for `deed_pdfs`, `ON DELETE CASCADE` removed, backup runbook, EXECUTED restore drill with hash verification | ruled | **yes** — `services/artifact_store.py`, `docs/BACKUP_AND_RESTORE.md`, `scripts/s2_restore_drill.py` (its step [F] proves the cascade is gone: deleting a deed with a stored artifact is REFUSED) |
| 3 | **RED-S3** — sessions: refresh + revocation (jti), login lockout, edge rate limiting, and frontend expiry as pause → preserve → re-auth → resume, never data loss | ruled | **yes** — `auth.py` (jti), `services/login_guard.py`, `lib/apiClient.ts`'s `SessionExpiredError`, `scripts/s3_thursday_walkthrough.py` |
| 4 | **RED-S4** — recording fields (`recorded_at`, `instrument_number`) as officer-recorded statements, + the rate-registry version stamped into deed metadata at generation | ruled | **yes, both halves** — `POST /deeds/{id}/recording` (RED0 R3-8) and `services/deed_pdf.py`'s `rate_registry_version` stamp |
| 5 | **Doctrine ticket A** — vested-owner extraction SPLIT: names flow as fact-candidates; the vesting characterisation routes to the vesting section as a violet proposal, never a carried fact | ruled | **yes** — `services/vesting_split.py` + `lib/vestingSplit.ts` against the shared `vesting_cases.json` corpus |
| 6 | **Doctrine ticket B** — the AI boundary: explain-yes / select-no, refusal behaviour pinned, ruled against the transcript evidence H1.3 is now logging | ruled | **yes** — `services/ai_boundary.py`, pinned by `test_doctrine_b_ai_boundary.py` and `test_doctrine_b_flag_roundtrip.py` |
| 7 | **DX0** — investigation only, no build. Scoped to **partner #1 = TitleSense** | ruled | **no** — not started |
| 8 | **TP0** — TitlePoint investigation, no build | ruled | **no** — not started, and gated on DX0 |
| — | **NOTARY1** | ruled | **no** — deferred by decision, trigger below |
| — | **RED-S5** (org model) | ruled | **no** — deferred by decision, trigger below |

⚠️ **THIS TABLE WAS WRONG ABOUT SIX OF ITS EIGHT ROWS, AND ALL SIX ERRED
THE SAME WAY.** Before the 2026-08-19 sweep it read: RED-S2 "next",
RED-S3 "queued", RED-S4 "queued", doctrine A and B "queued (ruled)" —
five shipped tickets described as work still to do, plus RED-S1 correctly
marked. Nothing here was a lie; the states were simply never re-ruled
after the tickets landed, and the header's own instruction — "this list
is the authority and it is re-ruled, not re-derived" — is what let a
stale authority stand.

**The direction matters.** These read as UNDER-claiming, which is the
harmless-looking half of the same defect: DASH3 began by writing a live
capability up as an unbackable claim, on the strength of RED-S4 being
listed queued. A record that understates gets believed exactly as
readily as one that overstates, and it costs a different kind of
mistake — building something twice, or refusing to say something true.

**DX0 scope (ruled):** SDK shape, webhook events, API-key lifecycle for a
KNOWN first consumer, the deep-link pattern (external finding → DeedPro
opens with a document staged from the payload), and the inbound rule that
**external interpretations arrive as PROPOSALS, never facts** —
`titlesense` joins the source enum on that footing.

#### DX0 pre-inputs — relayed from the TitleSense contract work

Recorded 2026-08-04. **Ledger only; nothing fires early.** These are
design inputs for DX0 when it is called, not scope changes to anything
in flight. Sequence unchanged: S3 → S4 → doctrine A/B → DX0.

1. **The source enum needs SUB-SOURCE granularity.**
   `titlesense.prelim_extraction` and `titlesense.titlepoint` are the
   same *proposal colour* and a different *warrant* — one is text pulled
   off a document, the other is a title-plant search. The basis string
   recorded at decision time must name **whose conclusion the officer
   accepted**, not merely that something external suggested it.

2. **`ClientRequestKey` round-trips as the matter/escrow join.** Inbound
   envelopes carry it; DX0's staging endpoint should expect it rather
   than inventing its own correlation.

3. **`openness_basis` may arrive as `conflict`, and that is a
   FIRST-CLASS DISPLAY STATE.** Two sources disagreeing about whether an
   encumbrance is open surfaces to the officer as a disagreement and is
   **never auto-reconciled**. Picking a winner silently would be
   auto-applying a legal conclusion under a data label.

4. **H1 v1 arrives with leaf fields marked `pending: live_capture`.**
   DX0 designs against **envelope semantics only** and must not invent
   leaf mappers. A mapper written against fields that do not exist yet
   is a guess that will read as a contract.

**Note for whoever runs DX0:** items 1 and 3 land on the seam the two
queued doctrine tickets are about (RED0 R3-1/R3-2 — a derived legal
observation presented as a fact). Item 1 says the record must name whose
conclusion was accepted; item 3 says a disagreement is shown, not
resolved. Both point the same way as doctrine ticket A, and both arrive
before the first partner payload rather than during it — which is the
whole value of having them written down now.

### Deferred by decision — with the trigger that revives each

Neither of these is blocked, unscoped or unfunded. Both are FINISHED
thinking held back for a missing precondition, and both fire unchanged
when their trigger arrives.

- **NOTARY1 — the signing handoff.** Investigation complete and every
  ruling stands: v1 is request + view + officer-marks-complete, built on
  share machinery (notary partner category, `share_kind:
  signing_request`, token package view with PCOR access and no
  approve/reject branch, `share_signing_request` E1 template, matter File
  status line). Completion is asserted by the OFFICER only in v1; no
  notary-side negotiation UI, because the notary's existing text/phone
  channel is the feature. All §4 nevers pin: no ranking, no marketplace,
  no fees, no SOS verification, no RON surface, and the load-bearing one
  — **the system never auto-asserts "signed and notarised"; completion is
  always someone's recorded statement.**
  **TRIGGER: a real design-partner user to hand it to.** Deferred because
  a signing handoff with nobody signing is a feature with no feedback.
- **RED-S5 — the org model.** Multi-user offices: assistant preps /
  officer reviews / coverage when someone is out. Today `deeds` carries
  one `user_id` and every query is scoped to it, so a colleague cannot
  pick up a file and a departing employee's drafts leave with their
  login. Design doc first.
  **TRIGGER: the first multi-officer office.** This is the largest
  product gap in the RED0 report (Reviewer 2, R2-5) and deferring it is a
  sequencing call, not a disagreement with the finding.

## Open — owner's card

- **MONEY1 — Stripe, owner-side (Tier 3), 2026-08-13.** Two items only
  the owner can do, both blocking a live launch.

  **DIAGNOSIS SETTLED 2026-08-13 — the secret was never the bug.** The
  delivery log showed events arriving and verifying; two handlers threw
  500s. Both are now fixed (see below). Setting the secret remains worth
  doing as hardening, and the reclassification stands, but item 1 below
  is no longer blocking the paid path.

  1. **Set `STRIPE_WEBHOOK_SECRET` on the API service** to the signing
     secret of the endpoint registered in the Stripe dashboard, and
     confirm the endpoint is registered and points at the production
     API. It was declared in NEITHER render.yaml NOR the REQUIRED
     manifest, so nothing anywhere told anybody it needed setting. Both
     are fixed; the value is the owner's.

     Then read Stripe's own delivery log for the test-mode checkout
     event. It is the only thing that distinguishes *never sent* from
     *sent and rejected* from *sent and silently ignored*. The prediction
     on our side is **sent and rejected with a 400 (signature)** — and
     the handler now says which of the two 400s it is.

  2. **Report `SELECT count(*) FROM users WHERE subscribe = true`.**
     LEGAL1 has shipped the stop-collecting half; this count is the only
     part I cannot run (production query, Tier 3). `subscribe` IS a real column — the consent value is
     STORED, not merely accepted and dropped: written at registration,
     then unreachable (no read path, no patch path, no unsubscribe). We
     are holding a consent flag we cannot show, cannot let them change,
     and cannot honour. Strengthens the stop-collecting ruling.

  3. **The Stripe account business name reads "EasyDeeds sandbox".** It
     appears on the checkout page, in the authorization line, and on
     customer card statements. Must be corrected before live mode.



- **Stripe URL verification — Tier 3, real dollar behind it** (DASH1,
  2026-08-11). Run a live test checkout at the $99 price and confirm:
  the success landing is `/account-settings?success=true` on the
  production host; the cancel landing is `?canceled=true`; the billing
  portal's "return to DeedPro" lands on `/account-settings`; whether a
  default return URL is configured in the Stripe dashboard (Settings →
  Billing → Customer portal) as a second place the URL lives; and —
  **the one that matters most** — that `FRONTEND_URL` is actually set on
  the production API service. Unset, every checkout URL falls back to
  `http://localhost:3000` and a paying customer lands nowhere. This is
  independent of any route rename; see `docs/DASH1_REQUESTS_MERGE.md`.

  **PR #166 did not close this, and must not be read as having closed
  it.** #166 is the CLASS fix: the environment is declared, the boot log
  names anything missing, and `require()` makes a checkout refuse rather
  than redirect to localhost. The INSTANCE — whether `FRONTEND_URL` is
  actually set on the production API — is still this card, still
  unanswered, and still the owner's. Making an absence visible is not
  the same act as ending it, and after #166 the failure mode changed
  rather than disappeared: a customer no longer lands on their own
  laptop, they get a refused checkout. Better, and still a customer who
  cannot pay.

## Closed by the owner — 2026-08-12 production verification

- **`EXPECTED_DATABASE=deedpro` is SET on the purge cron. The check is
  live, not inert.** The populated-wrong-database case — staging, which
  has every table the purge asserts — is now refused by name rather than
  merely refusable. This was the last thing standing between the purge
  and a mistake that deletes real contact details out of the wrong copy.

  *Correction to this card as it was written:* it said the cron was "still
  not created". It was — `signer_contact_purge`, 2026-08-11, recorded in
  the `render.yaml` header the same day. The card inherited a staleness
  from the ticket that wrote it.

- **`PYTHON_VERSION=3.12.7` verified in production, on both services.**
  `deedpro-main-api` and the purge cron both built clean, confirmed by
  cp312 wheel tags (sqlalchemy, greenlet, watchfiles, yarl, zopfli) in
  both build logs, both "Build successful." The nondeterminism the pin
  existed to close — a service inheriting whatever Render's default was
  on the day it built — is closed.

  **And the caveat now has production evidence behind it:** the dashboard
  is authoritative and the `render.yaml` pin alone never applied. That is
  no longer an inference from one variable; it is the observed behaviour
  of two services. See the note beside the value in `render.yaml`.

- **`ALLOWED_ORIGINS` — SET, AND IT DOES NOTHING. My error, corrected.**
  The boot check named it missing on the first production deploy, the
  owner set it on the strength of that, and **setting it changed
  nothing, because nothing reads it.** `main.py` hardcodes its CORS
  origin list; a grep of the whole backend finds this name in exactly one
  place — the manifest declaring it REQUIRED. The consequence text I
  wrote for it ("the browser refuses every call") described a failure
  that cannot happen.

  Reclassified OPTIONAL with the truth in its entry, and a new pin now
  fails the suite if any REQUIRED variable is read by nothing —
  `test_every_required_variable_is_actually_read_by_something`. It
  catches this exact error; probed against it.

  **The mechanism's first catch is still real, and the honest version is
  better than the flattering one:** the boot check surfaced a declared
  variable that was genuinely unset, which nobody knew. Chasing what it
  caught is what revealed the declaration itself was wrong. Both halves
  are the system working.

  **And it sharpens the STRICT_ENV argument rather than weakening it.**
  #166 argued you cannot refuse to boot on a condition nobody has
  verified, "because the refusal is then the incident". Had `STRICT_ENV=1`
  been the default, the deploy that shipped #166 would have refused to
  start — over a variable that changes no behaviour at all. Not an outage
  caused by a real absence; an outage caused by a mis-classification.
  STRICT_ENV stays off, and the ticket that turns it on is the ticket
  that audits the manifest against the code, which the new pin now does
  continuously.

## ROLE1 migration — APPLIED and verified (2026-08-13)

`backend/migrations/role1_separate_job_title.py --apply`, run by the
owner against production after the plan was reviewed.

**Final state, verified:**

| role | job_title | rows |
|---|---|---|
| `admin` | — | 1 |
| `user` | Escrow Officer | 1 |
| `user` | Title Agent | 1 |
| `user` | — | 1 |

Two job titles moved out of the authorization column with `role` set to
`user` EXPLICITLY, and the one admin was already canonically spelled, so
no spelling was rewritten.

**Both conditional rulings fired on the strength of it:**

- `ADMIN_ROLES` narrowed from four spellings to `('admin',)`. It stayed
  wide through steps 1–3 on purpose: narrowing before the migration would
  have silently removed access from an unmigrated row, and narrowing
  after removes nothing because there is nothing left to remove. The
  interim shape (recognized ⊋ assignable) had an expiry and this was it —
  the two sets are now equal.
- The legacy `role` field came off the registration wire, with the string
  refusal that guarded it. The trigger written into both files was "once
  a frontend sending `job_title` has been live through a deploy", and it
  fired rather than being forgotten.

**What replaced the refusal is stronger than the refusal.** Registration
binds a module constant to the access column, so no request value reaches
it — there is no field to spell at. Every test-suite fixture registering
with `role` had to move to `job_title`, which is a fair rehearsal of what
a stale client would have experienced and is the reason the pair was kept
through one deploy window rather than cut in one step.

---

## Deferred by owner decision — credentials in git history (2026-08-13)

**Status: DEFERRED BY DECISION, NOT OUTSTANDING, NOT FORGOTTEN.** The
machine flagged this twice and asked for rotation; the owner has
deliberately deferred it with the reasoning and trigger below. Recorded
that way round so the record shows who decided what.

**The finding.** Four backend files carry a `postgresql://user:password@host/db`
literal — **two distinct credentials**, one repeated three times:

| file | database | secret fingerprint |
|---|---|---|
| `backend/run_migration.py` | `deedpro` (Ohio) | `105f01e0` |
| `backend/migrations/run_migration.py` | `deedpro` (Ohio) | `105f01e0` |
| `backend/migrations/run_adminfix_migration.py` | `deedpro` (Ohio) | `105f01e0` |
| `backend/set_admin_role.py` | `mr_staging_db` (Oregon) | `d6e6271a` |

Fingerprints are `sha256(secret)[:8]`, so the owner can tell the two
apart and confirm a rotation landed **without the value ever appearing in
this file** — the standing rule that no credential value is written here
holds, and a fingerprint is how the rule stays useful rather than merely
observed. Found by an AST sweep written for an unrelated argument-shape
bug.

**Why deferring is defensible today.** Exposure requires clone access to
a private repository with a single collaborator. Obscurity is not
security, but access control is, and that is access control.

**The two ways it actually bites — and neither is "an attacker finds us".**

1. **The first outside clone makes the credential permanently theirs.**
   A contractor, a design partner's engineer, an acquirer's diligence
   team — the moment anyone else clones, it cannot be taken back, and
   rotating afterwards does not un-give it.
2. **Diligence will find it.** Live production credentials in git history
   is a disclosure-schedule item, not a code smell. This is precisely
   what RED0's reviewer #1 was simulating.

**TRIGGER — rotate BEFORE any of, whichever comes first:**

- a second person is granted access to the repository;
- a design partner or contractor clones it;
- acquisition or investment diligence begins.

**Why the files stay unscrubbed until then.** Scrubbing the working tree
while the secrets stay live in history is the appearance of a fix, and it
**destroys the evidence of which credential needs rotating** — the table
above stops being checkable against the code. Rotation first, then scrub
to `os.getenv`, in that order. `run_migration.py` stays quarantined with
them (it is also unparseable — a migration runner that has never parsed,
so has never run a migration); deleting it is part of the same pass.

**What is mechanical in the meantime.**
`backend/tests/test_db_identity.py::test_no_new_file_hard_codes_a_database_password`
holds the offender set at exactly these four. A fifth cannot arrive
quietly, and a file cleaned up must be removed from the set — so the
gate stops the next one without pretending to have fixed these.

---

## Open — needs a ruling (found 2026-08-12, NOT fixed)

- **CORS allows every origin, with credentials.** `backend/main.py:66-76`:

  ```python
  allow_origins=[
      "http://localhost:3000",
      "https://deedpro-frontend-new.vercel.app",
      "https://deedpro-frontend-new-*.vercel.app",  # Preview deployments
      "*"  # Fallback for development
  ],
  allow_credentials=True,
  ```

  Starlette sets `allow_all_origins = "*" in allow_origins`, so
  `is_allowed_origin` returns True for everything and the four entries
  above the wildcard are decorative. With `allow_credentials=True` it
  echoes the requesting origin back instead of `*`, which is the form
  browsers accept — so every site on the internet is an allowed origin.
  A comment calls it a development fallback; it is in production.

  **The bound, stated so nobody over- or under-reacts.** This API
  authenticates with `Authorization: Bearer` read from `localStorage`,
  not cookies. A malicious page cannot read another origin's
  localStorage, so it cannot forge an authenticated request merely by
  being allowed. What the wildcard removes is the browser-side barrier
  that would otherwise contain a token obtained some other way, and it
  makes any allowlist meaningless.

  **Why it is not a quick fix, and why it needs you rather than me.**
  Removing `"*"` today breaks every Vercel preview deployment.
  `allow_origins` is EXACT-matched — the `deedpro-frontend-new-*.vercel.app`
  entry has never matched anything, and previews work solely because of
  the wildcard. Doing this properly means `allow_origin_regex` for the
  preview pattern plus the production host, which is a production CORS
  change with a real chance of taking the frontend down if the pattern is
  wrong. Tier 3-adjacent, and the right shape is: build it, verify
  against a preview URL and the production host, then ship.

  It is also the obvious answer to the question above — this is what
  `ALLOWED_ORIGINS` was presumably declared FOR, and wiring it is one
  ticket with the regex work.

- **Demo video: `homepageLinks.test.ts` has to be retargeted first.**
  The GTM plan says the 90-second video "fills the homepage's dead Watch
  Demo". There is no dead Watch Demo — HM1 removed it along with a
  placeholder demo iframe (a rickroll), and the pin asserts BOTH that no
  such button exists AND that `components/landing-v2/VideoPlayer.tsx`
  does not exist on disk. Whoever adds a player retargets that pin in the
  same commit, with the reason it is now allowed, or hits a confusing
  red. Ten minutes; recorded so it is not discovered at 11pm.

- **Junk seed cleanup** (test rows in production data).
- **TitlePoint / SiteX credential rotations.**
- **DTT city-rates review** (`frontend/src/lib/dttCalc.ts`) — owner's
  escrow review is authoritative.
- **HM2 inputs**: sales/contact email → `CONTACT_SALES_EMAIL` constant.
  Footer entity details — **BUILT** ENTITY1 (env-wired; not restated here).
- **Counsel review** of the DRAFT `/terms` + `/privacy` pages.
- **Demo-card Vercel env vars** — REOPENED 2026-07-30 on the owner's
  direct request ("I do not see them"). The code is live (PR #76); the
  card renders only when BOTH `NEXT_PUBLIC_DEMO_EMAIL` and
  `NEXT_PUBLIC_DEMO_PASSWORD` are set in Vercel (Production) and the
  site is redeployed. Owner sets the values (current/rotated password —
  never the pre-X0 leaked one); values never in git or chat.
  **⚠ May now be moot — owner's call, not closed here.** The 2026-08-03
  privilege audit hash-locked the X0 demo account, which is the account
  a demo card would advertise. A card offering credentials that cannot
  authenticate is worse than no card. Either the item retires with the
  account, or a fresh non-privileged demo account is created for it.
- **PDFShift account closure** (code removal shipped in PR #71; Render
  env vars `PDFSHIFT_API_KEY`/`PDF_ENGINE` deletion rides with it).
- ~~Production `api*` table check~~ — ANSWERED 2026-08-03: all seven
  `api*` tables exist in production and all five key tables are EMPTY
  (0 rows). Nothing ever authenticated, so nothing ever wrote. A1 takes
  the simple branch: `create_tables()` adopts the existing empty tables
  and converges their columns onto Gen 3's bcrypt/20-char design. No
  data to preserve, no legacy keys to deactivate, no backfill.
- **API pricing — DEFERRED by ruling** (Flag 3): free manually-issued
  keys through the design-partner phase; `api_usage_log` meters from day
  one (shipped in A1) so the eventual pricing decision reads data. The
  four-model `api_partner_contracts` schema stays unused until then.
- **Full/Partial Reconveyance — HOLD** (wave-2 ruling): lender-side
  paper adjacent to Tier C; needs a separate owner decision before any
  build. Not part of wave 2.
- **Affidavit of Death — TOD Beneficiary — HOLD** (wave-2 form #1): NO
  PCT reference exists (the Succeed-* blanks are a different
  instrument). Sourcing it — drafting from the Prob C §5680-series
  procedure or adopting a county-published form — is a doctrine-shaped
  decision awaiting the owner. The other seven wave-2 forms shipped.

## Closed — do not re-report

- **Privileged-account audit (#103 follow-through)** — EXECUTED
  2026-08-03. PR #103 closed the hole that let self-registration mint an
  admin; this is the audit of accounts created *before* that fix. One
  legacy admin found: the X0 demo account `test@deedpro-check.com`,
  demoted and hash-locked. `realty.reports@gmail.com` is now the sole
  admin. Retain this entry — it is the platform's only record of who
  held privilege and when it changed, until an admin audit log exists
  (ADMIN0 gap 3).
- **Demo password rotation** (X0 follow-up) — CLOSED 2026-08-03 as
  **superseded by lockout**: the account whose password was to be
  rotated is hash-locked, so there is no live credential left to rotate.
- **`NOTIFICATIONS_ENABLED=true`** — SET and deployed 2026-08-03. The
  in-app notification bell is live, which makes E1/A1's approval record
  readable for the first time: the rows were being written since E1 and
  the flag gated only the read side. PR #107 had already fixed the
  `KeyError: 0` that would have crashed the endpoint on enabling.
- **`ADMIN_EMAIL=info@deedpro.io`** — SET and deployed 2026-08-03. Both
  ops funnels now land there: new-signup pings (E1) and API-access
  inquiries, authenticated and public alike (A3/#108). It matches the
  verified SendGrid sender, so these are self-addressed and maximally
  deliverable.
- **Second Render service `deedpro-external-api`** — DELETED by owner
  2026-08-03 (A1 Flag-1 ruling; Tier 3). Its `render.yaml` block went
  with A1. The service ran a broken second API — every partner call
  401'd while `/healthz` stayed green. Its env vars retire with it:
  `MAIN_API_INTERNAL_TOKEN`, `ADMIN_SETUP_SECRET`, and the frontend's
  `EXTERNAL_API_ADMIN_SETUP_SECRET`/`EXTERNAL_API_BASE_URL` are
  referenced by no code.
- **SendGrid** — RESOLVED 2026-07-30: `info@deedpro.io` verified, key
  refreshed, production share test green with delivery confirmed.
- **W0 §3** — **Model 2 = confirmation in our UI.**
  **DECIDED** 2026-07-30 (corrected that day; an earlier ledger entry
  inverted this as "asserted confirmations" — the owner's definition
  governs). PR #79 closed as decided.
  **BUILT** — **yes, 2026-08-27.** `POST /api/v1/deeds` returns
  `pending_confirmation` and a confirmation URL
  (`services/api_confirm.py`, `routers/api_confirm.py`,
  `frontend/src/app/confirm/[token]/page.tsx`). Stored PDF exists only
  after approval. Reject-with-reason; named-for-record; v1 broken as
  the Model 2 cutover.
- ~~Demo-card Vercel env vars~~ — the 2026-07-30 closure ("owner has
  not requested the demo card back") was superseded the same day by the
  owner's request; see the reopened item on the open card above.
- **PS2/PS3 engine flip** — WeasyPrint sole engine; production parity
  PASSED; PDFShift code removed (account closure remains open, above).
- **T7 drops** — done (owner-executed).
- **HM2 copy** — approved as-is and merged (#75).
- **Wave-1 rulings** — all implemented as structural pins (fixed-vesting
  furniture; blank execution marks; parties-JSONB migration; declaration
  family; FORMS_TRIAGE correction note).

## Approved wave — ADMIN (ADMIN0 audit, 2026-08-03)

Order **re-approved 2026-08-03** after the browser audit:
**ADMIN1 ✅ → BILL1 ✅ → ADMIN1.5 ✅ (+ADMIN-BRAND ✅) → ADMIN3 → ADMIN2 →
ADMIN4 → ADMIN5 → ADMIN6.**

ADMIN1.5 shipped in **two** PRs, which is worth recording so the
sequencing sync reads correctly against the history: **#113** carried the
serializer half (row type, field contract, the `/real` fossil, the CSV
check) and **#114** the rest of the sharpened scope (reconciliation,
stats-honesty relapse sweep, frictions). **ADMIN-BRAND is #115**, stacked
on #114 because both touch the same three components.

**Next: ADMIN2** (share lifecycle console) — ADMIN3 shipped as #116.

### Ledgered trigger — browser-audit re-run

Owner-set, 2026-08-03: when **ADMIN-BRAND (#115) and ADMIN3 (#116) are
merged AND deployed**, re-run the browser click-drill audit. The last
run's five drills went fail, fail, unanswerable, empty, unverifiable.
The re-run is the before/after that shows whether the wave did what it
claimed — and it is a production click-through, so it is the owner's,
not delegable.

ADMIN3 was **promoted above ADMIN2**: it answers the 3 AM question, and
ADMIN2's queue surface depends on knowing what failed. ADMIN5 needs a
real API key minted before per-key usage is testable — owner action when
we reach it.

- **ADMIN1.5 — serializer contract.** Fired after a browser audit found
  the Users and Deeds tabs blank and their drill-downs requesting
  `/admin/users/undefined/real` → 422. Root cause was a regression from
  PR #107, not a fossil: that PR moved every connection to psycopg2's
  `DictCursor` for its dual access styles, and a `DictRow` is a LIST
  subclass, so rows serialised as JSON arrays and every by-name read
  came back undefined. Fixed at the row type (`HybridRow` — dict
  subclass AND index-addressable), with the field contract pinned
  against real serialised output. **(#113)**
- **ADMIN1.5, second half (#114)** — the numbers inside the fixed shape.
  *Reconciliation:* the month card states its window and travels with a
  rolling 30-day count; percentage charts name their denominator and say
  so when n is too small to read as a distribution; the Verification tab
  scopes itself to the partner-API lane it actually covers.
  *Relapse sweep:* database latency was `int(seconds * 1000)`, which
  truncated a healthy sub-millisecond probe to a "0ms" that read as a
  measurement — and reported 0 under an Offline badge. Now
  `perf_counter()`, and null on a failed probe. The Verification tab's
  two fetches had no failure branch, so a 500 rendered as `?? 0` beside
  "No verified documents yet".
  *Frictions:* one shared pager that stops announcing "Page 1 / 1" over
  an empty set, three distinguishable search states, and a stated,
  changeable sort behind a server-side allowlist.
- **ADMIN-BRAND** (#115) — the console adopts the BRAND2 tokens. Not
  cosmetic: the orange palette predated the brand and collided with
  doctrine, since amber means unconfirmed external data. Decorative
  amber/violet is gone; the doctrinal colors appear in admin only with
  their meanings, and those meanings are now written in `docs/BRAND.md`
  beside the values.
  **One reading was extended, not assumed — owner's to confirm or
  narrow:** BRAND.md defines amber for the officer-facing flow
  ("unconfirmed external data"). The console has no officer decisions in
  it, so amber there means *a value that is real but must not be read at
  face value* — unconfirmed, unmeasured, or degraded. Absence is neutral
  gray and failure is red, so amber did not simply become "warning".
  **Second finding, from the sweep:** four tokens (`--dp-warn`,
  `--dp-error`, `--dp-muted`, `--dp-brand`) were referenced across the
  console and **declared nowhere**. Every reference carried a hex
  fallback, so those surfaces rendered the fallback every time and were
  never reading the token file — including a `#333` border and a
  `#1a1a2e` dark-navy chip on a light theme. A palette swap alone would
  have left them orange-adjacent and untouched. Pinned now: every
  `var(--dp-*)` must resolve to a declaration in `tokens.css`.

- **ADMIN1 — truth pass + operator home.** Kills the fabricated System
  values (`pdf_engine` hardcoded `"up"`, `avg_time_ms` never assigned,
  `weasyprint_count` asserted equal to a deed count) — each gets a real
  probe or an honest absence, and the System tab fails loudly instead of
  rendering zeros that read as measurements. Also: the Revenue
  silent-zero dies (a missing table must not render as `$0`); the
  Overview QR silent-zero dies; the 7-day activity feed that
  `/admin/dashboard` already computes and discards gets rendered; and
  the §9 insert-or-refuse fix is absorbed here. **H1 adoption rides
  along:** the billing tables and `partners` are outside
  `create_tables()` and adopt into it — adopt-vs-create branch decided
  by the owner's production table check. **GATED on that paste.**
- **ADMIN2 — share lifecycle console.** The largest visibility hole:
  `deed_shares` records sent → viewed → approved/rejected/revoked/
  expired plus rejection feedback, and no admin surface reads any of it.
- **ADMIN3 — email outcome persistence (#116).** Generalize the one
  working pattern (`api_key_requests.notify_error`) to the other ten
  templates; 10 of 11 send outcomes were printed and discarded.
  **Built as a choke point, not eleven edits:** every sender already
  ended in one call to the transport, so persistence went there. Adding
  it at eleven call sites would have repeated the reason the gap
  existed — `api_key_requests` persisted its outcome only because that
  table is a work queue somebody stares at; nothing made the other ten
  hurt, so nothing fixed them. New `email_log` table (in
  `create_tables()` per H1) carrying the S1 diagnosis string rather than
  a boolean, plus an **Emails** tab linked from the sidebar.
  Two design notes worth keeping: the recorder uses its OWN autocommit
  connection (writing into the caller's transaction is the A1 metering
  defect that silently discarded a deed), and its failures are caught —
  a ledger write must never 500 a registration — so they are caught
  LOUDLY and the tab states it shows attempts it managed to record.
- **ADMIN4 — admin audit log.** UNBLOCKED by the ruling below.
- **ADMIN5 — orphan wiring.** ~18 admin endpoints have no caller; the
  cheap wins are per-key error rates, deed PDF open, a partners tab,
  payments detail, and API-key reactivation (deactivation is currently
  one-way in the UI only).
- **ADMIN6 — trends.** **Derives from existing tables** by ruling; no
  rollup emission unless queries prove slow.

### ADMIN4 audit-log ruling (owner, 2026-08-03) — build to this

- **Scope:** privileged mutations only — not every read, not every write.
- **Prior values:** captured. Role, status, and limit changes record the
  old → new values **verbatim**; personal fields (email, name, phone)
  are **masked** rather than stored in the clear.
- **Retention:** indefinite.
- **Surface:** admin-visible, **read-only, append-only, no delete path**,
  and that absence is **pinned** by test — a log with a delete path is a
  log that can be edited by whoever is being logged.
- Note for the builder: nothing exists today. `get_current_admin`
  already returns the actor's email and every handler discards it, so
  actor threading is the first task, not the last.

## Open — needs a ruling (found 2026-08-12, NOT fixed)

- **Revoking a share notifies the reviewer — RULED 2026-08-12, not yet
  built.** Found by the sweep for other revoke-then-notify compositions
  (CANCEL1 item 2's class). `POST /shared-deeds/{id}/revoke` flips the
  status and sends no email and no in-app notice, so a reviewer keeps a
  link that has silently stopped working and finds out by clicking it.

  It is NOT the composition bug — there is no notify loop to be
  silenced, because there is no notify loop at all. It is the PRODUCT
  question, and the owner has ruled it:

  **A revoked review share SHOULD notify**, with softer copy than a
  cancellation — *"this deed is no longer available for review"* rather
  than the cancellation's account of who agreed to what — **and with an
  officer opt-out: a "notify them" checkbox in the revoke confirm,
  defaulted ON.**

  The reasoning, recorded because it is the general shape: a reviewer who
  finds a dead link assumes the PRODUCT broke, which is a worse outcome
  than being told. But some revocations are deliberate un-invitations,
  and the officer owns that call — so the default is courtesy and the
  override is hers.

  Cheap when it fires: the transport, the template shape and the two
  registers all exist. Note the confirm gains a control, so it also
  inherits the naming rule — a revoke confirm that does not name the deed
  is the same defect the delete confirm had.

- **The preview page's Share button lands nowhere in particular** —
  RULED AND FIXED 2026-08-12 (found during the Requests merge; the
  pre-existing behaviour was carried across unchanged by the rename, then
  fixed in its own PR).

  `/deeds/{id}/preview` pushed `/requests?deed={id}` and nothing has ever
  read `?deed=`, so a button labelled Share navigated away from the deed,
  landed on an unfiltered tracker with no dialog open, and left her to
  find the deed she had been looking at a moment earlier.

  **Owner's ruling: open the share dialog in place.** She is looking at
  the deed; routing her to a tracker to locate the deed she is already
  looking at is a detour ending in a lookup. Teaching `/requests` the
  parameter would have worked and optimises the wrong journey — the
  tracker is for finding, and she has already found it. Same reasoning as
  the dashboard queue's `onOpen`.

  Built as ruled: the review modal opens on the deed, with FLOW1 item 1's
  signing interrupt wired to its other half so the "did you mean a
  signing?" question has somewhere to go. No chooser — `share_kind` stays
  set by which button she pressed.

- **The deed preview page shows a RE-RENDER, not the stored instrument**
  (found 2026-08-12 while verifying DEEDDETAIL's premises; NOT fixed —
  it is a correctness defect and wants its own unit).

  `/deeds/{id}/preview` POSTs the deed's fields to `/api/generate/{type}`
  on every visit and displays the result; its Download button hands over
  that blob. `/deed-builder/{type}/success` does the opposite — it
  fetches `/deeds/{id}/download`, which serves the bytes stored in
  `deed_pdfs`.

  `deed_pdfs` is one row per deed, INSERT-OR-REFUSE under §9, with a
  sha256 stamped on the deed row, deliberately immutable because
  verification survives as data and that hash is the substrate. The
  preview page routes around all of it.

  The two agree until a template, the rate registry, or the deed's own
  fields change after generation. Nothing checks that they agree — and
  RED-S4 is queued precisely because the registry version is not yet
  stamped at generation time, so one of those inputs is already known to
  move.

  Not urgent in the sense that nothing links to `/deeds/{id}/preview`
  today (see the next item), which is also why it has gone unnoticed.
  Urgent in the sense that DEEDDETAIL is the ticket that decides what
  "the instrument" means on screen and would otherwise enshrine the
  ambiguity. See `docs/DEEDDETAIL_DESIGN.md`.

- **`/deeds/{id}/preview` is orphaned — nothing navigates to it** (found
  2026-08-12, NOT fixed). No `router.push` and no `href` anywhere in the
  app reaches it; it is a full single-deed page, with a PDF viewer, a
  details panel and (as of #178) the share and signing modals, that can
  only be opened by typing the URL.

  Recorded rather than fixed because the fix is a design decision, not a
  missing link: DEEDDETAIL has to rule whether this page is the deed page
  or whether the success page's content is promoted instead. Adding an
  entrance first would be choosing that by accident.

  NOTE on #178: the ruled Share fix landed on this page and is correct
  where it sits — that is where the button was — but it reaches nobody
  until this is resolved. Flagging so the fix is not read as live.

- **CLOSED 2026-08-13 — the preview served a re-render, not the stored
  instrument.** Fixed in DEEDPREVIEW-FIX (#181): the preview fetches
  `/deeds/{id}/download`, the re-render path is deleted, and a tree-wide
  sweep pins that nothing outside the builder generates.

  **And the fix as specified had a trap in it, which is the part worth
  keeping.** `store_deed_pdf` sets `status='completed'`, stamps
  `completed_at`, and refuses replacement under §9 — so "let the download
  endpoint render when nothing is stored" would have converted a
  half-filled draft into an immutable, unamendable instrument on a page
  view. Rendering is not a read; under §9 it is a write that cannot be
  undone, so **"generate if missing" is never a safe fallback on a
  surface that merely displays.**

  The invariant that prevented it was living in a SCREEN — Past Deeds
  renders Download only when `status === "completed"` — which is exactly
  why it survived until a second screen wanted the same document. A rule
  enforced by a component is a rule the next component does not have.
  The rule is `services/deed_pdf.may_self_heal` now, and the pin asserts
  the draft is still a draft afterwards: it tests the harm, not the
  response.

- **CLOSED 2026-08-13 — the admin "regenerate" message pointed somewhere
  that could not help.** Fixed: `admin_get_deed_pdf` now tells the two
  cases apart with `may_self_heal` (the same rule the download endpoint
  asks) and names `/deeds/{id}/download`, which repairs the row on the
  way through. A draft is told it is a draft, and no admin tool offers to
  generate on the officer's behalf — that would be the §9 write dressed
  as a convenience.

  §4 REACHES HELP STRINGS. A refusal that names the wrong remedy is
  worse than one that names none: it spends an afternoon before failing.

  _Original finding:_
  When a deed has no stored PDF, `admin_api_v2` returns *"PDF not
  available. Use /api/generate/{deed_type} to regenerate."*

  Those handlers take a render CONTEXT rather than a deed id, and they
  render and stream **storing nothing** — so an admin following the
  advice gets a document that is not the instrument, and the deed still
  has no stored PDF. It is the same defect DEEDPREVIEW-FIX just closed,
  one layer over, on an admin surface. The correct advice is
  `/deeds/{id}/download`.

  Small and self-contained; held only because it was found mid-ticket.

- **The `app/api/generate/{type}` Next proxies have no in-app caller**
  (found 2026-08-13, NOT deleted — ruling wanted). The preview page was
  the last one. They are NOT unreachable in the `/security` sense:
  `docs/API.md` documents them, QA instrumentation budgets one of them,
  and the admin message above points at the backend routes they front.
  Deleting the proxies would be cosmetic while those backend endpoints
  stay documented and referenced. Reported rather than assumed; see
  `docs/DEEDDETAIL_DESIGN.md`.

- **TRIGGER — promote the matter to the unit** (ruled 2026-08-13).
  DEEDDETAIL builds the DEED page with matter context on it, because
  there is no `matters` table, matters are virtual, and officers
  navigate from lists of deeds. **If officers consistently use the deed
  page as a doorway to the file rather than to the deed, that is the
  evidence to promote the matter.** Earned rather than assumed.

- **TRIGGER — retire the `/api/generate/{type}` render layer.** The six
  Next proxies at `app/api/generate/*` have no in-app caller (owner-ruled
  2026-08-13: hold the deletion). They are not the `/security` case —
  that had no caller AND no contract; these have `docs/API.md`, a QA
  budget line, and until today an admin-facing reference.

  **FIRES WHEN** either: `docs/API.md` stops documenting the render
  layer, or the render layer is deliberately retired as a public
  contract. Deleting the proxies before then is cosmetic — the backend
  render endpoints they front would remain documented and reachable.

- **`notifications` has no `deed_id`** (found 2026-08-13 during the
  activity-element scoping; NOT fixed, and correctly not this ticket).
  The table is close to an event log — type, title, message, link,
  created_at — but the deed it concerns is encoded only in the `link`
  URL. So "everything that happened on this deed" cannot be answered
  from it without parsing links, and it holds only events worth
  notifying about.

  Adding the column is the right eventual answer. Until then the deed
  page's activity list is a UNION of real timestamp columns, which is
  honest but is not the log this table nearly is.

- **RULED 2026-08-13 — `users.company_name` is canonical; the
  `user_profiles` copy dies.** One fact, two columns, two tables.

  **Why users wins:** `/users/profile` returns it, SETTINGS1 patches it,
  and Settings — the surface where she edits her company — writes it.
  The requested-by default MUST read what Settings writes, or the field
  silently disagrees with the page she just filled in. That is the class
  this wave keeps closing.

  **The work, in order:**
  1. Item 5's requested-by default reads `users.company_name`.
  2. `update_user_profile` (database.py, called by the enhanced-profile
     endpoint at users_auth.py:825) stops writing
     `user_profiles.company_name`.
  3. Report row counts for both columns.
  4. Migrate any value present in `user_profiles` and absent in `users`.
  5. Retire the duplicate column — a SEPARATE data operation, owner's go
     (Tier 3).

  **AND A SECOND OVERLAP FOUND WHILE CONFIRMING THIS, worth folding in.**
  `update_user_profile` is a CLOBBERING writer: its `ON CONFLICT DO
  UPDATE` sets every column from `EXCLUDED` unconditionally, including
  `business_address` — which SETTINGS1 now owns through `ProfilePatch`.
  So a partial call to the enhanced endpoint would NULL an address the
  officer had just saved in Settings.

  Not a duplicate column this time but the same disagreement: two write
  paths to one fact, one of which does not know the other exists.
  `ProfilePatch` was built not to clobber; the enhanced endpoint was
  not. Whichever survives, only one of them should own these fields.

- **RECORDED — the ordering pin is reachable-vs-present applied to
  CONTROL FLOW** (SETTINGS1, 2026-08-13). `handleSave` was three lines
  that reported success and issued no request. A presence check would
  have PASSED it: it contained `toast.success`. The defect was never
  that success went unreported — it was that success was reported
  FIRST.

  So the pin asserts POSITION: `toast.success` must appear after the
  `!response.ok` throw, which is unreachable without a completed
  request.

  **Generalized:** any pin asserting "the product reports X" must assert
  WHERE IN THE FLOW it reports it, not merely that the string exists.
  The string-presence family already covers dead code (`signingRowAction`
  — present but unreachable); this is its mirror — reachable, present,
  and in the wrong place.

- **RECORDED — item 3 and the two-column finding are one disease from
  opposite ends.** SETTINGS1's address section was built against storage
  it INVENTED while real storage (`user_profiles.business_address`) sat
  one table over. Then a fact turned out to have TWO homes. First the
  code could not find its column; then the column existed twice. Both
  are the schema and the code disagreeing about where a fact lives, and
  the `users.updated_at` bug that ate every payment was a third face of
  it — the column the code was certain existed and did not.

- **STANDING RULE — how to read an external audit.** Across SETTINGS1,
  every premise describing a MECHANISM was wrong (zero API calls, no
  toast, the county step navigating, an endpoint to wire to) and every
  premise describing a SYMPTOM was right (fields blank, nine fields
  lost, county unsaved, company entered three times). Five for five, and
  the same split held in MONEY1 and LEGAL1.

  **Take the symptom, discard the diagnosis, verify.** An external
  auditor sees behaviour correctly and can only guess at mechanism — and
  a guess stated confidently reads exactly like a finding.
- **The officer's company reaches a deed by DEFAULT, not by becoming a
  partner** (SETTINGS1 item 5, owner ruling reversed on the report,
  2026-08-13). She gave us her company at signup and typed it again in
  Settings; "Recording Requested By" is a Partner picker, so she would
  have had to enter it a third time.

  Auto-creating a partner row is cheap — `partners` needs `company_name`,
  `created_by_user_id`, `category`, `role`, all of which we have — and
  it is still the wrong move. **A partner is a COUNTERPARTY**: somebody
  you send things to. Her own company is not one, and auto-inserting it
  makes the picker a list where one entry means something categorically
  different from the rest. That is the two-populations problem ruled in
  DEEDDETAIL, one table over.

  So: the requested-by field DEFAULTS from `user_profiles.company_name`,
  and the picker stays for actual counterparties. Not built in
  SETTINGS1 — it is a builder change and belongs with the builder.

- **`users.company_name` and `user_profiles.company_name` both exist**
  (found 2026-08-13 while extending ProfilePatch; NOT resolved). Two
  columns for one fact, in two tables. `/users/profile` returns the
  `users` one; SETTINGS1 patches that one. `user_profiles.company_name`
  is written by the enhanced-profile endpoint and read by nothing this
  ticket touched.

  Ruling wanted before the requested-by default is built, because that
  feature has to read ONE of them and picking the wrong one is a field
  that silently disagrees with Settings.

- **Checkout returns to the WRONG TAB, and the confirmation is already
  built** (tabled by the owner 2026-08-13, after verifying the first
  successful payment in the product's history end to end — card charged,
  webhook received, plan flipped to professional).

  `success_url` is `{FRONTEND_URL}/account-settings?success=true` with no
  tab, and `activeTab` defaults to `"profile"`. So somebody who has just
  paid $99 lands on a form asking for their phone number and has to hunt
  for evidence that anything happened.

  **The confirmation is not missing — it is unreachable.** MONEY1's
  banner renders under `activeTab === "billing" && checkout`, and the
  retry/refetch effect fires correctly on `?success=true` regardless of
  tab. The plan updates, the banner is composed, and she never sees it.

  Same shape this wave keeps finding: the thing exists and nothing
  connects to it — the orphaned `/deeds/{id}/preview`, the unused
  `user_profiles.business_address`, now this.

  **Fix:** deep-link the return to the billing tab — `success_url` gains
  a tab parameter and the page reads it — alongside the `?success=true`
  retry and refetch already ruled and shipped. Both halves of the same
  return trip.

  **OWNER-RULED: fold into the next billing-adjacent PR, do not fire
  standalone.** Small, and it belongs with the work it completes.

- **RULED 2026-08-13 — the requested-by default: LAST-USED PARTNER wins
  over own-company.** Confirmed on the report.

  **Her own company is the FALLBACK FOR A BLANK FIELD, not a preference
  that should override an explicit prior choice.** If she picked a
  partner last time, that is a decision she made; the company default
  exists for the case where no decision exists.

  Pinned as an ORDERING rather than an outcome, so flipping it is
  somebody's decision rather than a diff nobody notices. Both orders have
  a wrong case — last-partner re-imposes a title company used once for an
  unusual deal; own-company re-imposes her own name on an officer who
  always records under a partner — which is exactly why the tie-break is
  written down instead of re-derived.

- **A DEFECT THAT PRODUCES NO ERROR — the COALESCE case** (SETTINGS1
  item 5, 2026-08-13). The best kind of finding, and the hardest class
  to notice.

  Moving the company read to `users` means anchoring the join on `users`,
  which means a person with no `user_profiles` row comes back as a dict
  of NULLs rather than as None. `auto_populate_company_info` then reads
  falsy — and **a column's `DEFAULT TRUE` never applies to a row that was
  never inserted.**

  Nothing raises. Nothing logs. The deed pre-fill would simply have been
  absent for every officer who never touched the old profile endpoint.

  **Absence looks like a design decision.** That is the whole reason this
  class survives: a missing feature reads as a feature nobody built, and
  there is no error message to search for. Fixed with an explicit
  COALESCE and pinned by name.

- **"A DEFAULT IS NOT TYPING" — permanent, beside `hasMeaningfulData`'s
  own comment** (SETTINGS1 item 5, 2026-08-13).

  A RULE THAT BROKE ITSELF. `hasMeaningfulData` carries the comment "an
  untouched builder must not mint rows", and `requestedBy` is one of the
  fields it counts. The localStorage prefill populates `requestedBy` when
  the Recording section is expanded — so expand it, look, leave, and the
  2.5s autosave debounce writes a deed row holding one company name and
  nothing else.

  Pre-existing for every officer who had ever picked a partner. The new
  own-company default would have extended it to everyone with a company
  on their profile.

  The sentence lives in the source beside the comment it repairs.

- **THE VALUABLE HALF OF A CLASS SWEEP IS WHAT IT REJECTS** — `role` is
  a name collision, not a duplicated fact (2026-08-13).

  `users` and `user_profiles` both carry `role`. It is NOT the
  `company_name` disease and merging them would be the bug:

    - `users.role` is AUTHORIZATION — the value `is_admin_role()` reads
      to gate the admin console.
    - `user_profiles.role` is PROFESSIONAL — escrow_officer /
      title_officer / notary, used to shape deed defaults.

  One word, two meanings, two correct columns.

  Recorded because **"we swept and found nothing else" only means
  something if it says what it looked at.** A sweep that reports zero
  findings and no inventory is indistinguishable from a sweep that did
  not run.

  **Pre-finding for ROLE1**: that ticket inherits this, and the collision
  is the thing to name rather than resolve.

- **FIFTH SIGHTING: a string-presence pin over an UNREACHABLE branch**
  (SETTINGS1 item 5 mutation probe, 2026-08-13).

  Three endpoint pins asserted that `PROFILE_ELSEWHERE` and
  `status_code=400` APPEAR IN THE SOURCE. The probe set `moved = []`,
  leaving the raise block intact and unreachable. All three passed.

  This was on a rule cited two tickets earlier — *a string-presence pin
  cannot tell REACHABLE from PRESENT* — by the same author, in the same
  wave.

  **THE LESSON DOES NOT TRANSFER BY BEING KNOWN.** Knowing the rule did
  not stop the pin being written that way; only converting the assertion
  to a CALL catches it. Where a pin's subject is a branch, the pin must
  execute the branch.

  Same shape as the `document_party` probe in DEEDDETAIL Unit 2 hours
  later: a contact check deleted from the constructor, still green,
  because the key-set assert raised the SAME EXCEPTION TYPE. Matching the
  reason rather than the type is the same fix at a smaller scale.

- **RULED 2026-08-13 — the `ready` state offers BOTH actions**, review
  primary, signing beside it. My own flag on the DEEDDETAIL report was
  right and the ruling confirms it.

  **"One state, one obvious action" means do not present a wall of equal
  choices. It does not mean hide the second most common move.** Reaching
  signing only through the share modal's "did you mean a signing?"
  switch is FLOW1 item 1's affordance problem one screen over — the
  thing you want discoverable only by opening a dialog about a different
  thing.

  `secondary_action` is SINGULAR in both languages, and `ready` is the
  only state that has one. Both pinned, so a third action or a second
  exception is a decision rather than a drift.

- **RULED 2026-08-13 — the matter section STAYS on the deed page.** My
  proposed cut is overruled.

  The ranking argument was accepted and the conclusion was not: the cost
  I named — an officer arriving cold from a notification — **is the case
  the page exists for.** "Which file is this on" is the question she has
  before she has any other.

  The success page's matter block is not a substitute. It serves
  somebody who just MADE the deed and might start a related one; this
  serves somebody RETURNING to one. Cut later only on evidence nobody
  uses it. The ruling is recorded in the page source, where somebody
  would go to cut it.

- **FOLLOW-UP — the PCOR and BOE-502-D offers exist ONLY on the success
  page** (surfaced confirming DEEDDETAIL's premise, 2026-08-13).

  A pre-filled companion form, built from facts the deed already holds,
  reachable for exactly one page view. Leave and it is gone: nothing on
  the deed page, Past Deeds or the tracker offers it, and the officer
  has no way to know it ever existed.

  Every conveyance is legally incomplete without a concurrent BOE-502-A
  (R&T §480.3), so this is not a convenience that expires — it is the
  companion document, lost on navigation.

  Not built: it is not in the ruled order for the deed page, and adding
  it there is a decision about that page's contents rather than a
  defect fix. Sized: the endpoints exist (`/deeds/{id}/pcor`,
  `/deeds/{id}/death-statement`) and the deed page already fetches one
  payload, so it is a section and a download handler.

- **FOLLOW-UP — `handleShare` on the success page still navigates**
  (same investigation, 2026-08-13).

  `router.push('/past-deeds?id=X&action=share')` — the exact pattern
  #178 replaced on the preview page with a dialog opened in place. It
  sends her to a list to re-find the deed she is looking at, so she can
  be asked a question that could have been asked where she stood.

  Left alone deliberately: it is the success page's, not the deed
  page's, and folding it into Unit 2 would have widened that diff.
  Small — the modal and its provider are already imported on pages
  either side of it.

- **SIXTH SIGHTING, one hour after recording the fifth — and the fix
  that finally generalises** (2026-08-13).

  The pins protecting the matter-section ruling asserted that
  `data-testid="matter"` APPEARS IN THE SOURCE. A probe changed the
  guard to `{false && detail.matter && (` — the section gone from every
  screen, every string still present — and all 31 pins passed.

  **The ledger entry recording the fifth sighting was written an hour
  earlier, by me, and I wrote three more of the same pin immediately
  after.** That is not carelessness; it is the entry's own claim
  demonstrated: the lesson does not transfer by being known.

  **What changed this time:** for a service, "convert the assertion to a
  call" means calling the function. For a PAGE it means RENDERING it —
  and until now nothing in this suite ever had. `jest-environment-jsdom`
  and `@testing-library/react` were both installed and entirely unused
  across 60 suites of source-text pins.

  `deedPageRender.test.tsx` asks what an officer SEES for a given
  payload. It does not replace the source pins beside it: those assert
  rules about how the code is WRITTEN (no state vocabulary in the
  screen, sentences rendered verbatim), which rendering cannot check.
  One proves the rule is stated, the other proves it is reached.

  **The class is now closed for this page** and the technique is
  available to every other one. The parked string-presence audit (43
  files, ~600 assertions) should be re-scoped against it: the branch-
  subject pins on RENDERED surfaces have a real fix now, not just a
  warning.

  A second trap worth recording, found building it: `jest.mock` is only
  hoisted above the imports when babel sees the GLOBAL `jest`. Every
  other file here imports `jest` from `@jest/globals`, which silently
  disables hoisting — the page loaded first, captured the real
  `useRequireAuth`, found no token, and rendered an empty string with no
  error and no warning. **A test that produces nothing looks exactly
  like a test with nothing to say** — the same disease one level up.

- **STANDING CHECK — quality tracks the feedback loop** (two consecutive
  tickets, 2026-08-13). Not a lesson. A question to ask on every ticket.

  **#192**: the notary's availability inputs sat in `grid-cols-2` at
  every width and truncated on a phone. `RequestSigningModal`, one file
  over, had `grid-cols-1 sm:grid-cols-2` WITH labels the whole time.

  **#193**: registration stored `"not-a-phone!!"` verbatim and production
  holds a nine-digit number. A full phone normalizer has existed in BOTH
  languages since PARTNER2, refereed by a shared corpus, and the partner
  screens have used it all along.

  Both capabilities were already in the tree. Both were absent from the
  surface a STRANGER meets — the notary with no account, the visitor who
  has not signed up. The fix landed everywhere a user could complain and
  nowhere they could not.

  **THE CHECK, to run when fixing any surface:** what capability already
  exists elsewhere in this repo that THIS surface never adopted? The
  answer is usually "the one whose users could complain."

  Two-for-two on consecutive tickets is a pattern, not a coincidence.
  Worth stating that the surfaces without a feedback loop are exactly the
  ones where somebody who is not our customer forms an impression of our
  customer.

- **A refusal must distinguish a typo from a policy** (SIGNUP1,
  2026-08-13). `AAA` is a malformed state code. `AZ` is a real state we
  do not serve. Collapsing them into "invalid state" tells somebody their
  typo was a business decision — and tells somebody in Arizona that they
  mistyped.

  Pinned by ORDER: the format check runs first, then the served-state
  refusal. Two answers, in the order that makes each one true.

  The same ticket's larger half: **removing the dropdown while the
  endpoint still accepts the value is cosmetic.** Registration is public.
  An API caller opens an account the product cannot serve and discovers
  it by hunting for forms that do not exist.

- **A RULE ABOUT A PAIR CANNOT BE SURFACED BY A RULE ABOUT ONE FIELD**
  (SIGNUP1, 2026-08-13). New, and found by a render test.

  "Show errors for fields she has touched" is correct for single fields
  and WRONG for pairs. The company name and type are one fact in two
  inputs: filling the type and leaving the name raises the error on the
  NAME, which she has not visited — so the filter hid it, and the form
  refused to submit while saying nothing.

  **A silent form that will not submit is worse than the missing check
  it replaced.** Touching either half now reveals both.

- **LEGAL1 APPLIED BEFORE THE MISTAKE, for once** (SIGNUP1,
  2026-08-13). Noted with approval because the opposite is the norm.

  The interest signal could have been a second write-only column —
  exactly `subscribe`, which was collected, stored, and readable by
  nobody, manufacturing a record that looked like information and could
  not function as one. It reaches the admin user view instead, and the
  copy promises nothing, because a promise would have made it a consent.

  The lesson transferring is rarer than it should be. Four sightings this
  week of a lesson NOT transferring; this is the one that did.

## Standing product positions — DECIDED and BUILT, and they govern future work

Not "closed": these are live constraints on what may be built next. Filed
separately from the closed list because an entry read as history is an
entry nobody checks a new feature against.

- **PCOR-WIZ — buyer-assisted PCOR completion.**
  **DECIDED** 2026-08-26, owner-ruled — investigation reported, all
  rulings made, **the allowlist has no undecided members.**
  **BUILT** — no. Step 1 unblocked and not started.

  **THE BOUNDARY, which does not reopen.** The buyer answers facts about
  their own transaction. Part 1's seventeen reassessment exclusions route
  to the officer. Those boxes are legal characterizations sworn under
  penalty of perjury — *"solely between spouses"* covers a divorce
  settlement mid-decree, a spouse added who is not on the loan, a
  domestic partnership never registered with the Secretary of State — and
  a consumer with no counsel must not be asked them by us. **The
  protection is structural first and disclosed second: a disclaimer over
  an interface that asks the question anyway has not protected anyone.**

  **THE SPLIT, measured against `boe502a_rev18.pdf` (hash-pinned in
  `services/county_forms.py`), not recalled.** 228 AcroForm entries; 177
  actual input widgets (65 text, 112 button); the rest are parent nodes.

  | bucket | widgets |
  |---|---|
  | already filled from the deed | 9 |
  | buyer-answerable | 111 |
  | officer-only | **57** |

  Officer-only = Part 1's 44 lettered widgets + **5 unlettered ones** + 7
  moved by §14.23 + the transfer date.

  **CORRECTED 2026-08-26 BY BUILDING IT, and the correction is the
  convention working rather than a slip caught late.** This table first
  read `111 / 55` with two fields still unplaced, and **9 + 111 + 55 = 175
  against a measured 177** — the residue sat outside the table without the
  table saying so, which is the only reason the arithmetic looked wrong
  rather than the classification. Their rulings took one each way, and
  **step 1's tripwire then found a 57th** (below).

  The counts are now **generated from the module and asserted against the
  reference** in `test_pcor_field_split.py`: 9 + 111 + 57 = 177. That is
  the same fix as TRIAL1's mirror — the advertised number and the acting
  number must be one number, stated once per side — applied one document
  over. **Prose that restates a measurement drifts from it; prose that is
  checked against it cannot.**

  **THE HAZARD THAT SHAPES THE BUILD.** Part 1 cannot be identified by
  letter prefix in either direction. The form reuses letters across parts
  (`A.` is both the spouses exclusion and Part 2's property type), and
  **item L1's three sub-checkboxes carry no letter at all** — named
  `This is a transfer of property 1. to/from a revocable trust…`, plus
  item Q's free text. A prefix classifier routes trust characterizations
  to a consumer and looks like a working implementation. **The officer-only
  set is an enumerated allowlist of exact field names pinned by set
  equality, never a pattern.**

  **THE RULINGS.**

  1. **§14.23 created** — a fact whose only use is a legal determination
     goes to the officer regardless of who holds it. Moved both lease
     terms (item M's 35-year threshold), the improvement bond and its
     balance, and the bare `DATE OF DEATH` (item D). The special-terms
     paragraph moved on a separate ground: **a paragraph cannot be
     allowlisted.**

  2. **`A. Date of transfer, if other than recording date` — OFFICER-ONLY.**
     Measured at page 2 top: its `A.` is **Part 2's**, not Part 1's. The
     buyer cannot decline it, because **both states are answers** —
     filling it claims the transfer date differs from recording, leaving
     it blank claims they match — and one of them moves a tax year.
     Compare the deed-side `transfer_date`, ruled blank because we cannot
     know when an unsigned deed was executed; **this is worse, because
     there blank was an omission and here blank is an assertion.**

  3. **The personal-property pair — BUYER-ANSWERABLE, ruled together,
     two conditions.** It is their furniture and they are the only ones
     who know; removing the question does not remove the incentive, it
     removes the disclosure, and the form's own instructions already
     answer the worry by requiring an itemized list before any
     adjustment. **Condition one:** guidance is explanation-only and must
     not invite allocation — no examples of what counts, no mention of
     the tax effect in either direction. **Condition two:** both answers
     are flagged explicitly in the officer's review, because a
     personal-property allocation is the field an assessor questions and
     she should look at it deliberately rather than scan past it.

  4. **Token surface — street segment only**, and on a NEW argument.
     NOTARY2's reasoning does not transfer: a PCOR buyer owns the
     property and knows its address. What survives is about the token
     rather than the addressee — **a token in an inbox is not proof of
     identity**, so a page showing legal description and APN to whoever
     holds the link is a leak regardless of whether the addressee would
     have been entitled. Never: APN, legal description, county, deed
     type, grantor, full address, the deed itself, **or any Part 1 field
     in any form — including greyed out or captioned "your officer will
     complete this,"** which has still shown a consumer the question.

  5. **Retention — three lifetimes, not one.** Buyer contact purges at
     `CONTACT_RETENTION_DAYS` (imported, not re-declared). The answers are
     **deleted at the moment the officer accepts them** rather than aged
     out, so the sensitive data lives afterwards only on the deed record
     she already controls. Abandoned wizards purge on **the token's own
     expiry**, with an immediate officer cancel available but not relied
     on: waiting for her to cancel holds purchase price and financing
     terms indefinitely on the strength of someone noticing that nothing
     happened, and **a retention promise that depends on noticing an
     absence is not a promise** (§14.18).

  6. **No model.** Every explanation the wizard needs is a definition or
     a "look on line X of your closing statement" — static, pinnable,
     no drift, no latency, per GUIDE0. A free-text channel becomes a
     ticket only if the pilot shows buyers asking what the copy does not
     answer — an observation, not a prediction (§14.20).

  7. **Every question has three responses**, not two: an answer, *"I
     don't know"*, and *"ask my escrow officer"*. They mean different
     things and do not collapse into one control. Both exits leave the
     field **empty** — never a sentinel that could reach a form.
     Consequence: **no required fields and no validation that blocks
     submission.** A buyer may submit having answered nothing, and that
     is information the officer did not have before.

  8. **The invitation email names HER, not us**, and says what to do if
     they were not expecting it. **An unexpected email asking for a
     purchase price is what a phishing attempt looks like** — so the
     sender must be the person the recipient already knows, and the
     message must offer a route back to her that does not go through the
     link. A page whose only proof of legitimacy is its own link is
     indistinguishable from what it is trying not to be.

  **BUILD ORDER — allowlist first, and the ordering is the point.** (1)
  the split as data, 55 names, pinned by set equality, no UI; (2) the
  token package and its frozen key set; (3) the request + worklist chase
  row; (4) the wizard, static guidance, three exits, no progress
  indicator; (5) the review screen — **its own ticket**, because
  confirming a consumer's assertion is a different thing to get wrong
  than confirming a machine's proposal; (6) retention. If the data path
  completes before the filter exists, **the only thing closing that
  window is somebody remembering.**

  **STEP 1 IS BUILT (2026-08-26).** `services/pcor_field_split.py` +
  `tests/test_pcor_field_split.py`. The 57-name allowlist, the 9 filled
  names, `buyer_answerable()` by SUBTRACTION so an unclassified field
  defaults to nobody rather than to the consumer, and an extraction floor
  asserting the reference still yields 228 / 177 / 65 / 112.

  **Two findings from building it, both about transcription rather than
  logic:**

  1. **§14.24 — an allowlist of foreign strings cannot be verified by
     reading.** Two of the 57 names contain characters invisible in an
     editor: item A's `yes` box carries U+00AD SOFT HYPHEN, item J's `no`
     box carries U+2011 NON-BREAKING HYPHEN, and both render as ordinary
     hyphens. A hand-typed list would carry two entries matching nothing
     while the file still read as complete and still counted 57 — **every
     check a human can perform on the list passes while it is wrong.**
     Remedy is two things: generate the literals from the PDF, AND pin
     that every entry exists in the reference. Probed by replacing the
     soft hyphen with an ordinary one — four pins fail; without the
     existence pin, none would.

  2. **§14.25 — the enumeration is the mechanism, the pattern is the
     smoke detector.** The 57th field was found by the tripwire, not by
     the decision. A deliberately untrusted prefix pattern — kept as an
     ALARM precisely because the ruling forbids classifying with one —
     flagged item J's *"if yes, please explain"* free text in the buyer's
     set. No letter AND a county typo (*"recorded only a requirement"*),
     so it survived a careful manual pass over all 177 widgets by someone
     who knew what they were looking for. It fired on its first run.
     **A heuristic too weak to decide can be strong enough to point, and
     a pointer's failure mode is a false alarm rather than a silent wrong
     answer.**

  **What a reader who believes this entry should still ask:** steps 2–6
  are not built and are not scheduled. There is no token surface, no
  request, no wizard, no review screen and no purge — **the allowlist
  protects a path that does not exist yet.** Its value today is that it
  cannot be skipped later, not that anything is currently filtered by it.
  And the timing question is open and is the owner's: whether PCOR-WIZ
  ships with the pilot so buyers exercise it, or after, so the pilot
  validates a product that already works.

- **FEES — we never quote, process, split, or suggest one.**
  **DECIDED** — NOTARY0b: no fee handling in v1. **Refined by EMAIL2:**
  displaying a figure the officer typed is *passing information between
  two people, not brokering between them* — and the difference is
  entirely that **no code has an opinion about the number.** A default
  would be a suggestion. Arithmetic would be a quote.
  **BUILT** — yes, and enforced by TWO pins doing different jobs:

  1. `test_the_availability_path_carries_no_fee_at_all` — asserts `fee`
     is not in `inspect.signature()` of either `notary_invited` or
     `send_notary_invited`. **Pinned at the signature, not the output:**
     *a `fee` parameter that exists is a fee somebody wires up later.*
  2. `test_nothing_anywhere_computes_defaults_or_suggests_a_fee` — sweeps
     every `fee`-mentioning line in `email_templates.py` and
     `notifications.py`. This is the one that keeps the ruling intact;
     the signature pin covers one path.

  **And the two paths differ for a reason, which is the substance.** On
  DISPATCH a fee attaches to a specific job at a specific time, so a
  figure is a term of that job. On the AVAILABILITY path she is posting
  windows before anything is agreed, so a figure shown then **reads as an
  offer surviving whatever time gets picked** — the product implying a
  term nobody agreed to. `notary_dispatched` takes `fee`; `notary_invited`
  cannot.

  **WHY THIS ENTRY EXISTS AT ALL, and it is the finding (2026-08-26).**
  This position was ruled, refined, implemented and double-pinned — and
  had **no ledger entry** for weeks. It surfaced only because it was
  cited from memory as an example in a doctrine section, could not be
  verified against either document, and was omitted for that reason
  (§14.22's provenance note).

  **That is the inverse of this ledger's usual failure.** The convention
  at the head of this file exists because entries were read as describing
  shipped things that were not built — prose outrunning code. This is
  code outrunning prose: **a rule with a mechanism and no entry.** It is
  the less dangerous direction and it is not harmless, because the
  question *"may we show a fee here?"* has a real answer that nobody
  could look up, and the answer is neither yes nor no but *depends which
  path*. Anyone who reasoned about it from the code alone would have had
  to find both pins to learn that.

  **What a reader who believes this entry should still ask** (per the
  second convention — naming the question this entry would otherwise
  close):

  · **The sweep names its two modules.** It covers
    `email_templates.py` and `notifications.py` *by filename*, and
    **nothing asserts those are the only two places a notary fee could
    appear.** A third module would be unswept and green.

  · **No frontend pin covers this at all.** Checked, and the result needs
    stating precisely rather than reassuringly: a word-boundary search
    finds `fee` in five frontend files, and **all five are a DIFFERENT
    fee** — Stripe processing fees in the admin revenue tab, our own plan
    fees in `/terms` and the pricing page, a document-prep comparison in
    `pricing.ts`. **None is the officer↔notary fee this ruling governs.**
    So the position is not currently violated on the frontend; it is
    simply not *defended* there, and those are different claims.

  · One frontend file carries the doctrine without being asked to:
    `partnerRegistry.ts` records *"deliberately no field here for a
    default, an auto-apply, a fee"* — §1's reasoning arriving in a
    registry. Evidence the rule spread, not evidence it is enforced.

## Findings that changed how we work

- **CORS1 — A REQUIRED VARIABLE THAT NOTHING READ, SET CORRECTLY, AND
  IRRELEVANT TO THE FAILURE IT WAS BELIEVED TO CAUSE** (2026-08-18).
  **DECIDED** 2026-08-18 — the middleware reads `ALLOWED_ORIGINS`; the
  wildcard and the dead glob go; the method list is pinned against the
  route table.
  **BUILT** — yes, CORS1.

  **The defect, in one word.** `allow_methods` omitted `PATCH`.
  `profileSave.ts` saves by PATCH, so every settings and onboarding save
  died at the CORS preflight — OPTIONS advertising GET returned 200, the
  same request advertising PATCH returned 400. The owner could not set
  his own recording county. The browser's report, "failed to fetch", is
  what it says when a preflight is refused and is indistinguishable from
  the API being down, which is how it was read for two rounds.

  **THE PART WORTH KEEPING IS NOT THE BUG.** `ALLOWED_ORIGINS` was:
  declared in `render.yaml`, classified **REQUIRED** in the environment
  manifest, named as missing by the boot check on a production deploy,
  set by hand by the owner on the strength of that report, and then
  reported healthy — while being **read by nothing at all**. `main.py`
  hardcoded its own origin list.

  **A boot check verifies PRESENCE, not CONSUMPTION.** It answers "is
  this variable set", and it cannot answer "does anything use it". Every
  signal in the loop was green and the loop was closed around nothing.
  §14's family — a record that states more than it checks — this time in
  the instrument built to catch exactly that class.

  **AND THE CORRECTION WAS ALREADY WRITTEN.** The manifest entry had
  been fixed weeks earlier to say "Read by NOTHING today… its absence
  changes no behaviour and setting it changes none either." That
  sentence was written before the incident and read after it. A record
  being correct is not the same as a record being consulted, and this is
  the second time in two weeks that an accurate entry failed to reach
  the person who needed it — the first being W0 §3, which is why
  DECIDED/BUILT became fields.

  **The wildcard is why none of it was falsifiable.** `"*"` sat in the
  origin list, so every origin was already accepted and no CORS
  experiment could fail on origin grounds. It also made
  `allow_credentials=True` invalid per spec — browsers reject that pair
  on credentialed requests — which happened not to bite only because the
  app authenticates with an `Authorization` header rather than cookies.
  A permissive setting that hides the setting that matters is worse than
  a strict one that breaks loudly.

  **Two more live defects found in the same read:**
  `"https://deedpro-frontend-new-*.vercel.app"` was a literal string in
  `allow_origins`, where Starlette compares exactly and never globs — it
  has never matched a preview deployment, and previews worked only
  because of the wildcard. And every preflight OPTIONS opens a database
  connection before CORS answers it, because CORS is the innermost of
  three middlewares (measured: one connection per preflight, pool of
  40). The first is fixed via `allow_origin_regex`; the second is
  reported and held.

  **What now catches it:** `test_cors_contract.py` compares the route
  table against `allow_methods` — the two declarations that nothing was
  comparing — and sends real preflights through the middleware stack for
  every method. Removing PATCH again turns five tests red, including the
  live preflight.

- **The `ALLOWED_ORIGINS` floor comes out of the code — WITH A NAMED
  TRIGGER** (CORS1/CORS2, 2026-08-18).
  **DECIDED** 2026-08-18 — the deploy config should own the origin list.
  **BUILT** — half, deliberately: the env variable is read and ADDS to
  the list in code. It cannot remove from it.

  **Why the half.** Replacement is one line (`return accepted or
  list(DEFAULT_ORIGINS)`), and taking it in CORS1 would have handed the
  middleware whatever the dashboard value happens to be — a variable
  nobody has ever had a reason to keep correct, because nothing read it.
  If that value is the single origin `render.yaml` declared, replacement
  drops `deedpro.io` and takes the real domain offline: a total outage
  shipped by the ticket that fixed CORS. Owner-ruled: keep additive.

  **THE TRIGGER, so this is not a permanent accommodation.** The API now
  prints its effective CORS policy at boot, tagging each origin `[env +
  code]` or `[code]`. **When that log shows the env value alone covering
  both production origins, the floor is removed and the env replaces the
  list.** That is a one-line change plus the pin flip, and it is a real
  ticket rather than a someday: a floor in code plus a list in config is
  two declarations again, which is the disease this whole finding is
  about.

- **CORS is the OUTERMOST middleware, and that is a position nothing can
  see in a diff** (CORS2, 2026-08-18).
  **DECIDED** 2026-08-18 — register CORS last so preflights short-circuit
  before the metrics and connection middlewares.
  **BUILT** — yes, CORS2.

  The alternative was an OPTIONS early-return inside
  `db_connection_middleware`, rejected on the owner's rule: it is safe
  only because no route registers OPTIONS *today*, and that becomes false
  silently. **"Safe today but becomes false silently is the exact
  condition we stopped accepting."**

  **The cost, named:** `metrics_middleware` no longer sees preflights, so
  they stop being counted. Accepted — a preflight is not a request whose
  latency anyone cares about.

  **Why it needed a pin anyway.** `add_middleware` prepends, so the
  behaviour is decided by WHERE IN THE FILE the block sits. Moving it
  back up to the natural place — where it lived for the project's whole
  life — silently puts a database connection in front of every preflight
  again, and nothing about that edit would look wrong. Two pins: the
  position, and a measured preflight that must open zero connections.
- **A TEST THAT STATED ITS ASSUMPTION IN A COMMENT AND DID NOTHING TO
  MAKE IT TRUE** (CORS2's CI failure, 2026-08-18).
  **DECIDED** 2026-08-18 — the suite waits for schema convergence once,
  before anything runs, and fails loudly rather than hanging.
  **BUILT** — yes, in `backend/tests/conftest.py` (CORS2).

  **The failure.** Five tests red at once — `relation "users" does not
  exist`, `relation "user_profiles" does not exist`, and the four billing
  tables missing — in a run where nothing was wrong with the code. All
  five were the earliest tests alphabetically.

  **The diagnosis.** `database.py` converges the schema in a DAEMON
  THREAD started at import. That is right for the service and the reason
  is on the record: converging on the import path once blocked uvicorn's
  port binding, exceeded Render's port-detection window, and timed out a
  deploy with the old instance still serving.

  For the SUITE it is an undeclared race — and
  `test_the_four_tables_exist_after_convergence` **states the assumption
  in its own comment**: *"Schema is already converged when tests run."*
  A belief about TIMING, held by a test that does nothing to make the
  belief true. That is §14's family inside the suite's own setup: an
  instrument measuring something other than what it claims, and the
  claim written down beside it in prose.

  **Why the fix does not call `create_tables()` mid-suite** — and this is
  the part a future reader will otherwise "simplify". Calling it
  mid-suite issues `ALTER TABLE users`, which queues behind any open
  transaction and then blocks every later reader. That is the same
  hazard the daemon thread exists to avoid. So the fixture WATCHES for
  the convergence the service already performs; it does not perform one.

  **And it fails loudly at 90 seconds** rather than waiting forever: a
  schema that will not converge is a real failure, and an unbounded wait
  converts it into a hung job with no message.

  **Proved, not retried.** Against an empty database the failure
  reproduces exactly as CI reported it; with the fixture the same empty
  database passes. Scope added inside a CORS ticket, flagged rather than
  buried, and owner-ruled to stay: *"the alternative was pushing empty
  commits until the race went our way."*

- **PILOT2 — the pre-charge notices exist; THE CRON DOES NOT**
  (2026-08-18).
  **DECIDED** 2026-08-18 — two notices, 15 and 5 days before the charge,
  off the date and amount Stripe computes, via the E1 transport.
  **BUILT** — the job, the templates, the schema and the webhook signal.
  **The Render cron service is NOT created: that is deploy topology and
  therefore the owner's.**

  **Until that service exists, the coupon path sends nothing.** Unlike
  the purge, there is no in-request fallback carrying this work. The
  `customer.subscription.trial_will_end` handler covers the 14-day trial
  three days out, and the pilot's 100%-off coupon emits no trial event at
  all. Stated loudly because a job nobody scheduled produces exactly the
  customer experience of the gap it was written to close.

  **The service, when it is created:**
  `python backend/scripts/send_renewal_notices.py`, daily at 15:00 UTC,
  with `DATABASE_URL`, `STRIPE_SECRET_KEY`, `FRONTEND_URL`,
  `SENDGRID_API_KEY` and `EXPECTED_DATABASE=deedpro`. Exit 1 on any
  failed send, so the cron's own alerting sees it.

  **The date question, ruled.** `current_period_end` and `discount.end`
  were both wrong; the upcoming invoice is authoritative because Stripe
  computes it with the discount applied. The design persists nothing that
  decides anything — `trial_end`, `renewal_at` and `renewal_amount_cents`
  are a record for the admin view and for reconstructing what we
  believed, never an input.

  **A gap this closed that was never pilot-only:** the existing 14-day
  trial charged with no warning. `trial_end` was present on every
  subscription event and persisted nowhere, `trial_will_end` returned a
  bare 200, and no template existed.

- **LEDGER SWEEP — WHAT IT COVERED, AND WHAT IT DID NOT** (2026-08-19).
  **DECIDED** 2026-08-18 — convert existing entries to DECIDED/BUILT,
  promoted ahead of DASH3's build after the third instance.
  **BUILT** — the queue table (all ten rows, each answered from named
  code), the convention header, and both founding cases. **NOT the whole
  document**, and saying so is the point: a sweep that claimed
  completeness it did not have would be this convention's own defect,
  committed by the ticket that exists to fix it.

  **Swept:** the RED0 queue table; `EMAIL_VERIFICATION_REQUIRED`
  (Ledgered triggers); W0 §3 (already converted by HOME2-FOLLOWUP); the
  CORS1/CORS2/PILOT2 entries, which were written in the convention.

  **Not swept, and left honest rather than half-marked:** "Closed by the
  owner", "Closed — do not re-report", the ADMIN/UX waves, and the
  findings section. Those record things that HAPPENED rather than things
  DECIDED, so the two fields would mostly read "BUILT — yes, that is what
  the entry is". A second pass should convert any of them that record a
  ruling rather than an event.

  **The yield, against the prediction.** HOME2-FOLLOWUP predicted "two
  known cases and an unknown number of others" and said finding nothing
  more would itself be a result. It found **six more, all in the queue
  table, and all under-claiming** — five shipped tickets listed as work
  still to do. The prediction was wrong in the direction that matters:
  the convention pays for itself on entries that overstate, and it turned
  out the bigger population was entries that understate.

- **GUIDE0 — in-product assistance. INVESTIGATION, and it found the
  feature was dark.**
  **DECIDED** 2026-08-20, owner-ruled: three tickets, GUIDE1 → GUIDE2 →
  GUIDE3. **BUILT** — GUIDE1 yes (this ticket); GUIDE2 next; GUIDE3 held.

  **THE HEADLINE. `/api/ai/chat` has had no reachable caller since
  2026-04-28.** The legacy-wizard removal (`0f16a1a`) deleted the render
  sites of `AIHelpButton` and `VestingInput`, its only two callers.
  **RED-H1.3 hardened the endpoint 2026-08-04; Doctrine B rewrote its
  prompts 2026-08-10** — three and four months later. Neither noticed.
  `deed_type_advisor`, the prompt Doctrine B most carefully rewrote, has
  never been delivered to anyone.

  **Which explains Doctrine B's empty log**, and retires the deferral it
  rests on. That ticket recorded "two days of an empty table" and
  deferred the usage evidence pending accumulation. Two days was true and
  irrelevant: nothing could write to that table, so waiting produces the
  same zero forever. A query returning zero cannot distinguish "nobody
  asked" from "nobody could ask" — recorded as §14.5's fifth habitat, an
  EVIDENCE SOURCE.

  Production could not be queried from the build session (Render
  credentials are Tier 3 and were not requested). **The call-site census
  is the stronger evidence anyway** and is what the finding rests on.

  **THE SECOND FINDING, and it is good news.** What ships under a toggle
  labelled "AI Assist" is hand-written static copy — no request, no
  model, nothing that can drift — and **it is already doctrine-compliant**:
  hedged, citing statutes rather than outcomes, never asserting what a
  recorder will accept. The EXPLAIN half of Doctrine B was built and
  shipped months ago while the endpoint meant to provide it sat dark.
  **What Jerry asked for mostly exists; it was mislabelled.**

- **GUIDE1 — delete the dead stack, and stop claiming AI.**
  **DECIDED** 2026-08-20. **BUILT** — yes, 2026-08-20.

  Deleted (no render sites): `AIHelpButton`, `VestingInput`, `AIGuidance`,
  the `AIGreeting` component, the `AIApplied` export.

  Renamed to what they are: `AISuggestion` → `FieldGuidance`, `AIHint` →
  `FieldNote`, `AIToggle` → `GuidanceToggle`, `AIAssistContext` →
  `GuidanceContext`, `ai-helpers.ts` → `vestingSuggestion.ts`; the
  toggle's visible label "AI Assist" → **"Field help"**. Owner-ruled: the
  label is a claim the code does not support — **the banned-claims family
  arriving in a UI label rather than marketing prose**, which is harder to
  catch because nobody reviews a component name for truth (§14.10). It
  returns honestly if a model ever backs the surface.

  **The storage key was NOT renamed**, deliberately:
  `deedpro_ai_assist_enabled` is where a user's saved preference lives,
  and renaming it would silently turn guidance back on for everyone who
  had turned it off, because the default is `true` and a missing key is
  indistinguishable from a fresh browser. A persisted key is a data
  migration wearing a rename.

  **`services/aiAssistant.ts` is KEPT and now has no callers**, with the
  reason written at the site: GUIDE3 rules wire-or-retire, and deleting
  the client now would make "wire" mean "rebuild". Held, not overlooked —
  the distinction §14.5 exists to force.

  **Two gates fired on their own first real encounters**, which is the
  §14.9 test answered rather than assumed. The eslint gate refused the run
  at 291 files against a floor of 294 and demanded the deletions be
  acknowledged deliberately. And `tsc` fell 88 → **83**; the baseline was
  lowered to lock it in.

  U3's "no dead chat promise" ruling was WIDENED rather than retired: it
  was pinned on a file this ticket deleted, which would have satisfied it
  trivially. It now covers the dashboard, the builder and the header —
  and matters more than when written, since the endpoint behind any such
  promise is dark.

- **GUIDE2 — the two static-copy surfaces.**
  **DECIDED** 2026-08-20, approved. **BUILT** — no; next ticket.
  Violet-proposal explanation (what an exemption covers — the proposal
  already stores `basis`, so explaining it makes the recorded basis
  legible rather than inferring anything) and amber-field provenance
  (what a value is and where it came from — a fact about our data, not
  about her transaction). Static copy: zero cost, pinnable, reviewable by
  someone who knows recording practice, cannot drift.

- **GUIDE3 — wire the assistant or retire it. HELD, with a decision
  date.**
  **DECIDED** 2026-08-20: hold. **BUILT** — no.
  **TRIGGER, owner-ruled:** when a design partner has used the product
  for a month, **or** when a real question arrives that the static copy
  cannot answer — whichever comes first. **A decision date, not a
  someday:** what must not continue is the current state, an endpoint
  hardened, metered and boundary-ruled that nothing calls, accruing
  doctrine while dark.

  The reasoning for holding: the questions officers ask AFTER the static
  explanations exist are different from the ones they would ask now, and
  those are the evidence Doctrine B actually wanted.

- **ESLINT1 — turn the disabled gate back on.**
  **DECIDED** 2026-08-20, owner-ruled: report the count before flipping;
  if large, a baseline-with-a-ceiling like tsc rather than a hard zero,
  and `rules-of-hooks` promoted to error regardless of the rest.
  **BUILT** — yes, 2026-08-20 (`frontend/scripts/eslint-gate.mjs`, and
  the `eslint-gate` job in `.github/workflows/test.yml`).

  **The count, reported before anything was flipped:** 136 errors and 58
  warnings across 294 files. **104 of the 136 errors are
  `no-explicit-any`** — style debt, not a defect class. The remaining 32
  are 18 `no-require-imports` (test files), 10 `no-unescaped-entities`,
  3 `no-html-link-for-pages`, 1 `prefer-const`.

  **The decisive number is a zero, not the 136.**
  `react-hooks/rules-of-hooks` — the rule this whole ticket came from —
  has **zero violations across the tree**, and so do seven other
  defect-catching rules, each checked individually rather than assumed.
  So they are pinned at zero *independently of the ceiling*, at no cost.
  That is the only moment pinning a rule is free, and it does not recur.

  **Why the flag was off.** `git log -S` puts it in the commit that
  CREATED `next.config.js`, beside `typescript.ignoreBuildErrors: true`
  and a commented-out rewrite marked *"temporarily disabled to fix build
  issue"*. **A deploy unblock, not a decision about linting** — and a flag
  with no argument behind it is a different object from one set on
  principle, because there is nothing to overcome, only something to
  notice.

  **The flag itself STAYS for now, and this is the honest half of the
  report.** Flipping `ignoreDuringBuilds` alone fails every build on the
  136 pre-existing violations, and a build that suddenly fails on old
  style debt is a gate everyone re-disables — which is how the flag came
  to be written. The enforcement moved to a blocking CI job instead, and
  `next.config.js` now carries the whole story at the site so the file
  stops reading as "we do not lint". Remove the flag when the ceiling
  reaches zero errors; the gate makes that a matter of time.

  Probed by committing all four failures the gate exists to catch: the
  hooks defect reinstated, a blanket `eslint-disable`, a file that fails
  to parse, and new violations above the ceiling.

  **Owner ruling, 2026-08-20, on what made this work.** *The distribution
  made the decision* — 136 sounds like a wall until 104 of it is
  `no-explicit-any`. **Separating the defect rules from the ceiling is the
  load-bearing choice:** one shared number lets 104 stylistic errors buy
  room for a single hook bug, and the budget gets spent on the wrong
  violation. Leaving `ignoreDuringBuilds` in place is correct and
  correctly stated — flipping it fails every build on pre-existing debt,
  which is the outcome the ticket exists to avoid, and *repeating the
  original mistake with better intentions is still repeating it*.

  **And the pinning window is real, so it is written down here rather
  than left as a nice observation.** Eight defect rules pinned at zero
  cost nothing because they were already at zero. **A month from now the
  first violation arrives and the pin becomes a negotiation** — someone
  with a deadline, one violation, and an argument that the rule is
  pedantic. The moment a rule is free is the only moment it is
  uncontested, and it does not come back. General form, for any future
  gate: **pin every rule that is currently clean, at the moment you first
  measure, not the ones you expect to matter.**

  **§14.9 applied to itself on day one.** The new gate went green on its
  first CI run, which is the state §14.9 says is indistinguishable
  between enforcing and doing nothing. Confirmed by READING THE LOG — it
  printed the same eight-rule distribution measured locally — rather than
  by trusting the tick, on the one ticket whose entire subject is
  controls that look equipped.

- **DASH3 — the dashboard becomes a worklist. FIVE RULINGS, then build.**
  **DECIDED** 2026-08-19.
  **BUILT** — yes, 2026-08-20. `backend/services/worklist.py` assembles
  the rows; `frontend/src/features/dashboard/Worklist.tsx` renders them;
  the dashboard page is the three-branch result it now holds. All five
  rulings pinned in `backend/tests/test_dash3_worklist.py` and
  `frontend/src/__tests__/dashboardWorklist.test.ts`, every pin probed by
  mutation.

  1. **Consequence-first, confirmed.** The mockup's annotation says
     "ranked cheapest-to-clear first"; its own rows do not — "Archive all
     4" is the cheapest action and sorts LAST, "Prepare it" is expensive
     and outranks "Choose exemption". The rows run
     someone-else-is-blocked → your-turn → nobody-waiting, which the
     stale row states in its own copy: *"Nobody is waiting on these but
     you."* **The annotation is SUPERSEDED** and recorded as such so
     nobody re-derives cheapest-first from a file we committed.
  2. **Rows become the hero's unit.** A worklist's count must equal what
     is on screen or it is a metric again. The two-population rule (
     unconfirmed candidates + required-and-empty) survives as **what
     makes a row appear and what the row says**, never as the headline
     number — row #93, with every field confirmed, is correctly a row.
     **The group header counts rows too, or names its unit explicitly:**
     "6 open" meaning documents beside a hero counting rows is two units
     on one screen, which is what DASH-FIX spent itself killing.
  3. **The §16 list.** The day-one variant STAYS (collapsing empty into
     clean reverses #206, and `open_documents` exists to tell them
     apart). The resume target REHOMES to the first row of the your-turn
     group — #203 ruled the accuracy list as its source because that list
     existed, and the intent outlives the source. The lineage banner
     needs a home before ship: a disqualifying stop with nowhere to
     render does not fire. "Archive all 4" inherits the per-row refusals
     and reports what it did. **Colour is FIXED, not adopted:** queue
     state takes NEUTRAL spines, because amber-for-waiting and
     violet-for-your-turn repurposes the doctrinal palette exactly as
     ADMIN-BRAND was corrected for — and the one row where violet lands
     correctly (an unconfirmed transfer-tax exemption) is coincidence,
     not compliance.
  4. **The recording counts read `recorded_at IS NOT NULL`, never
     `status = 'completed'`.** Otherwise "4 recorded" silently means "we
     rendered a PDF" — the `deeds.status` disease reappearing inside a
     count. Recording is real and is the officer's own statement
     (`POST /deeds/{id}/recording`, RED0 R3-8); the count is honest only
     while it reads the statement rather than the artifact.
  5. **The chip annotations go** — "most used", "1 this year". They are
     the only statistics left in a design whose purpose is removing
     statistics.

  **What the build found, and none of it was in the design.**

  a. **A crash on the one screen everybody lands on.** The greeting's
     `useState`/`useEffect` went in beside the markup that uses them,
     which is after `if (loading) return …`. First paint runs two fewer
     hooks than the second, and React tears the component down the moment
     the profile answers. **tsc is blind to it; jest is blind to it here,
     because these suites read source text rather than mounting through
     the transition.** `eslint`'s `react-hooks/rules-of-hooks` sees it —
     and `next.config.js` sets `eslint.ignoreDuringBuilds: true`, so
     **nothing we run in CI would have stopped it.** Pinned as "no hook
     is declared after the first early return".

  b. **F4's ruling was one deletion from being reversed.** The redesign
     removed the renderer of `deedsError` while the error was still being
     set. A failed `/deeds` load then leaves the list empty → `hasDeeds`
     false → "Nothing here yet.", the first-run welcome, shown to an
     officer whose documents merely failed to load. That is the exact bug
     F4 fixed. I found it while deleting the state as dead — **an error
     that renders nothing is indistinguishable from having nothing, which
     is what makes this class of regression invisible.**

  c. **Two pins whose fixes were each other's defect.** The row hrefs,
     copied from the module being replaced, used `/signings?focus=` — a
     RETIRED alias kept for mail already sent, caught by
     `test_link_contract.py`. Correcting them to the canonical tracker
     route satisfied that contract and broke the orphan ruling, because
     the canonical tracker is still a tracker. The deed page answers
     both. **Neither pin could see the other's subject.**

  d. **A pin that passed for a reason other than its property.** The
     unknown-age test used `None` against `2`, which orders correctly
     with the None-rule DELETED — `-(None or 0)` and `-(2)` differ
     anyway. Only `None` against `0` can tell them apart. **The mutation
     probe found it; the test read correctly to me before and after.**
     Recorded as §14.1.1's sibling: a pin can assert the right property
     against inputs incapable of distinguishing it.

  e. **The renderers outlived their render sites.** `ActionQueue`,
     `QueueList`, `StatCard` and `DeedRow` stayed in `page.tsx`,
     unreferenced, for one build — 450 lines of a second, unreachable
     dashboard. Nothing failed: tsc does not flag an unreferenced
     function and the suites assert what renders. §14.5's fourth
     instance, in a single file.

  **Both self-review items ruled by the owner 2026-08-20.** The
  `N recorded` button DOES carry DASH1's every-count ruling adequately — a
  count with a destination is what that ruling asked for, and the four
  tiles were four counts *without* destinations until they were made
  clickable. And `That's everything.` STAYS: the empty state as a result
  rather than an absence is a ruled behaviour, and that sentence is what
  makes it one. (I had named it as the thing I would cut first; that was
  the wrong instinct about which part was load-bearing.)

  **The F4 near-reversal, marked.** The redesign removed the renderer of
  `deedsError` while the error was still being set, so a failed deed load
  would have shown the first-run welcome to an officer whose documents
  merely failed to load. **That is the empty-vs-error collapse this
  product has ruled twice, one deletion from returning** — and it was
  found only because I went looking for dead state, not because anything
  flagged it. Nothing could have: an error that renders nothing is
  byte-identical, on screen, to having nothing.

  Fourteen pins across six suites broke on the removal, each carrying a
  previously-ruled behaviour. **None was deleted.** Each is recorded in
  place with where its ruling went: superseded by owner design (the
  three-column split), satisfied more strongly by subtraction (one status
  vocabulary — the dashboard now speaks none), moved server-side (the
  wording, the threshold, the destinations), or **reported as not
  surviving** (the feed's last-touched ordering, which has no subject and
  is deliberately NOT re-homed onto the worklist's consequence order —
  that would be a different rule wearing compliance).
- **HOTFIX — property autofill was dead in production, and HOME2 did it**
  (2026-08-19).
  **DECIDED** 2026-08-19 — the builder loads Places from its own render
  path; the loader resolves rather than polls; an unavailable lookup says
  so in the field.
  **BUILT** — yes, this hotfix.

  **What broke.** HOME2 (#223) removed the Google Maps script from
  `layout.tsx`. The written rationale — mine — was that `useGoogleMaps`
  appends its own tag "so every consumer already loads it on demand".
  **`useGoogleMaps` was imported nowhere in the repository.**
  `PropertySection` checked `window.google` at mount and once at 1s and
  loaded nothing itself. The layout tag was the builder's only loader, so
  the address field stopped doing anything at all — no error, because
  `if (!isGoogleLoaded) return` is a bail and a bail is silent.

  **The review failure, plainly.** The removal was approved on a claim
  about CONSUMERS, verified against the SOURCE OF THE THING CONSUMED.
  §14.5's second instance and the first to reach production. A
  justification containing "every" or "already" is a claim about a
  population; the population is what needs counting.

  **Three fixes, because the trace surfaced three defects:**
  (1) the loader is called from `PropertySection` itself, so a tag
  removed anywhere else cannot silence it again; (2) it resolves on the
  script's `load` event instead of polling twice — a script arriving at
  1.2s used to be missed permanently, a race the deleted tag happened to
  win; (3) an unavailable lookup now says so in the field, with the way
  forward. The old fallback copy was the most confident sentence on the
  screen — "we'll pull the APN, owner, and legal description
  automatically" — and it appeared ONLY in the state where none of it was
  true.

  **The pin mounts the component**, not the file: removing the loader
  from the section's render path turns it red, and moving the loader
  elsewhere reachable does not. Probed by reinstating the production
  defect.

## Parked tickets (scoped, not scheduled)

- **ENGINE1 — reposition the public pages for the integrator.**
  **DECIDED** 2026-08-27, owner-ruled. **BUILT** — partially; the
  enforceable half only. See the split below.

  **PROVENANCE (§14.17): the ruling list below is REPORTED, not
  repository-verified.** It arrived as ticket text. What has been checked
  against the tree is marked as such; everything else is recorded in the
  owner's voice because that is what it is.

  **Governing rule:** the trust page's honesty gradient — *"including the
  parts that are not finished"* — applies to all four pages. **Bracket a
  gap visibly or cut the section. No future tense written as present.**

  ═══ BUILT ═══

  · **The CUT list is now ENFORCED rather than remembered.** Measured
    first: the 23 CUT items were run through `check_banned_claims.py`
    and **22 of 23 passed cleanly** — only "SOC 2" was caught. Every
    other claim an integrator buys on (a status page, an SLA, insurance,
    data residency, an SDK) walked through a gate whose entire subject
    is claims we cannot honour. **13 rules added**, 14 → 28.
  · **A defect in an existing rule, found the same way.** The uptime
    pattern was `99(?:\.9+)?` — decimals had to be NINES — so
    **"99.95% uptime" walked straight through**: `99.9` matched and then
    `\s*%` could not consume the `5`. Now `\.\d+`. That rule's own
    comment describes this failure mode and the fix repeated it one
    character deeper.
  · **`~9 clicks` cut**, the only CUT item that was live. Two sites on
    the homepage. The stat slot now reads `API_DEED_TYPES.length` — a
    value the code can answer, which also puts the app/API distinction on
    the homepage.
  · **Two false positives verified and NOT cut**, both of which a naive
    rule would have broken: `Delaware` appears in `vestingSplit.ts` as
    RECORDED VESTING LANGUAGE (`A DELAWARE LIMITED LIABILITY COMPANY`) —
    somebody else's text on an instrument; and `webhook` appears in
    `billingPortal.ts` as Stripe's INBOUND hook and on the homepage in
    *"there is no client, no webhook, no stub"* — copy DENYING the
    feature. The new rules are scoped so both pass.
  · **A superseded pin rewritten, not deleted** (§14.12):
    `homepageTruth.test.ts` had a test named *"the stats bar states what
    is true and specific"* whose first assertion pinned **`~9 clicks`**.
    **The name asserted the property; the body pinned an invention.**

  ═══ NOT BUILT, AND BLOCKED ═══

  · **The positive design of the four pages.** The ticket says build
    against `docs/design/` (homepage, developers, confirmation, trust).
    **Those four artifacts are not in this repository.** `docs/design/`
    contains `dashboard_v2.html`, `dashboard_day_one.html`,
    `dashboard_steady_state.html`, `dashboard-soften/` and
    `email_signing_request.html` — nothing else, and no homepage,
    developers, confirmation or trust document exists anywhere under
    `docs/`. Checked, not assumed.

    **CAUSE FOUND (owner, 2026-08-27): they were committed to a
    `design-ref` branch that was never pushed.** Verified against the
    REMOTE rather than the local tree — `git ls-remote --heads origin`
    carries no `design-ref`, and the four design branches that ARE
    pushed (`claude/dash3-design-input`, `claude/deeddetail-design`,
    `claude/f6-v0-design`, `v0/design-drop`) carry none of the four
    files either. **UNBLOCKS WHEN THE OWNER PUSHES `design-ref`.**

    Worth its own line: a mockup that exists only on an unpushed branch
    is indistinguishable, from every other machine, from a mockup that
    was never made — and the ticket that depends on it reads as a
    reasonable instruction right up until somebody looks.

  ═══ NOT BUILT, NOT BLOCKED — awaiting sequencing ═══

  · **KEEP, corrected:** Wyoming and Glendora not Delaware (already true
    since ENTITY1; the new rule guards the regression) · the ENTITY1
    eight subprocessors named rather than `[N]: [hosting], [database],
    [email]` · drafts expire in **7 days, not 30** · DPA bracketed as
    drafted-pending-counsel.
  · **Contract vocabulary is the SHIPPED one:** `pending_confirmation`,
    `urls.confirmation`, `approver`, `status: "completed"`,
    `POST /api/v1/deeds` on the current host. Copying the mockup's names
    documents a contract the API does not serve — the split-brain
    reversed.
  · **State the app/API distinction rather than blurring it.** *"No path,
    app or API, without a named person"* is true of the API since #263,
    and in the app it is the SESSION rather than a confirmation record.
    **That sentence is the page's central claim and cannot be the
    imprecise thing on it.**
  · **`draft_sha256` on the hosted path**, client hashes the bytes it
    displayed, mismatch returns 409. Docs must say precisely what it
    proves: **it binds the name to those bytes and shows the browser
    fetched them; it does NOT prove a human read them.** Partner
    `POST /deeds/:id/confirm` held for a first integrator.
  · **The auditor artifact** — draft hash, PDF hash, confirmed_by, role,
    timestamp, declarations. Per-key export stays cut.
  · **`reviewer.license` optional**, recorded when present, **never
    required and never displayed as verification** — we would not verify
    it, a required-but-unverified field is stronger-looking provenance a
    vendor review will ask about, and "license" is not one thing across
    escrow, title, bar and notary.

  **What a reader who believes this entry should still ask:** the four
  pages are unchanged apart from the two `~9 clicks` edits. The CUT list
  is enforced against FUTURE copy — it does not mean the pages have been
  rewritten, and the gate cannot tell you whether a page says something
  true, only that it does not say one of 28 specific false things.

- **TSC-PARSE — the tsc baseline has no parse-error floor, and eslint's
  is what caught it.**
  **DECIDED** 2026-08-26, owner-ruled — this gets its own ticket.
  **BUILT** — no.

  **Measured, not predicted.** During DEED-POLISH a JSX comment placed in
  an expression position broke `InputSection.tsx`. The tsc count went
  **83 → 9**: a file that cannot be parsed stops reporting its errors, so
  the only-goes-down invariant was satisfied by *breaking the thing it
  measures* — **in the direction that reads as an improvement.**

  §14.4 predicted exactly this and gave the eslint gate a parse-error
  floor, a blanket-disable refusal, and a linted-file floor. `tsc-baseline`
  received none of the three. The asymmetry was never argued; eslint's
  gate was written later and its author had §14.4 in hand.

  **What actually caught it was gate diversity, not a gate.** eslint moved
  the OTHER way — 127 errors against a ceiling of 126 — because a parse
  failure makes eslint report a fatal message rather than fall silent. Two
  gates over the same tree with opposite failure modes is why the drop was
  visible. That is worth stating because it is not a property either gate
  has on its own, and it is not one we designed.

  **RECORDED AS LUCK, DELIBERATELY (§14.19's family).** Nobody chose to
  give the two frontend gates opposing failure modes; it fell out of what
  eslint and tsc each do with an unparseable file. **An accident that
  carries weight, written down as a control we built, teaches the next
  reader that the coverage is deliberate — and so stops them asking
  whether it holds anywhere else.** It does not: no other pair of gates in
  this repository is known to have this property, and none has been
  checked. That is the sentence this entry exists to prevent someone
  assuming away.

  **AND THE INSTINCT FOR THE HARD HALF (owner, 2026-08-26): the answer is
  probably not a number.** A suspicious-drop threshold forbids legitimate
  improvement, which is §14.4 running in reverse — the ratchet defended by
  refusing the thing it exists to encourage. The parse floor works because
  it is CATEGORICAL: *did the measurement happen at all?* Look for the
  categorical form of "the measurement happened" — every file the compiler
  was asked about was actually read — before reaching for a delta.

  **Scope when it runs:** a floor on the tsc side — fail if any file
  fails to parse, and fail if the count drops by more than some margin
  without a corresponding file-count explanation. The second half is the
  harder one and is NOT scoped here: a legitimate large drop (a real fix,
  a deletion) must remain possible, so the floor cannot simply forbid
  improvement. Investigation before building.

- **SUMMARY-CLASS — the other single-field section summaries.**
  **DECIDED** 2026-08-26, owner-ruled — ledgered as the class, not a
  ticket. **BUILT** — `recording` only.

  §14.20's instance was Recording Info: five fields, a summary reading
  one, and the officer who commissioned the escrow field concluding it did
  not exist. Fixed. **The shape is a class and the survey found two more:**

  · **The typed-facts section** — `state.affidavit?.declarantName ||
    state.affidavit?.decedentName`, reporting one of two named parties
    while the section holds the instrument's whole typed-facts block.
  · **Property** — reports `address` while `PropertyData` carries city,
    state, zip, APN, county and legal description.

  `transferTax` is the one that already did it right (a computed
  multi-part summary) and is the model `recording` now follows.

  **Not built, and the reason is not effort.** Neither remaining case has
  a *reported* miss behind it, and §14.20's whole point is that we cannot
  tell from inside which sections are actually hard to use. Fixing them on
  the strength of the pattern would be guessing at findability — the thing
  the section says a gate cannot measure. **These wait for a pilot
  observation, not for a spare afternoon.**

- **DARK-ORPHAN-PARTIAL — `templates/grant_deed_ca/header_return_block.jinja2`
  is included by nothing.**
  **DECIDED** — no. **BUILT** — no. **DARKSWEEP family.**

  Found during DEED-POLISH #1 while sweeping every template that renders
  the mail-to block: this partial renders one (with its own markup —
  `<div>` per line rather than `<br>`, plus escrow/title-order lines the
  index templates place elsewhere) and **no template `include`s it and no
  Python references it.**

  It therefore did NOT receive DEED-POLISH #1's empty-address prompt,
  which is correct — nothing renders it — but it now differs from the 21
  templates that did, so **a future author who wires it in inherits the
  old behaviour** without any diff recording the choice. That is the
  DARKSWEEP shape in a template rather than a component: dead code that
  reads as a maintained alternative.

  Retire or wire, same as the other DARKSWEEP items — a product decision,
  not cleanup, and NOT decided here.

- **PCOR3-ADDR — should the builder capture the GRANTEE'S MAILING
  ADDRESS?**
  **DECIDED** — no. **BUILT** — no. **OPEN, and deliberately so: the pilot
  answers it faster than reasoning does.**

  **Owner-reframed 2026-08-24: this is a WORKFLOW question, not a form
  question.** Whether an officer holds the buyer's mailing address at
  drafting time depends on where in the file the deed is prepared — and
  that varies by shop, not by statute. Reading more forms cannot settle
  it, which is what separates it from PCOR3-DOD: that one looked like a
  cost trade and turned out to be answerable by reading the instrument.
  This one is not.

  **THE CROSS-REFERENCE IN THIS ENTRY WAS STALE WITHIN AN HOUR OF BEING
  WRITTEN** — it said PCOR3-DOD "is also still open" while that question
  was being closed. Fixed here, and noted because it is the ledger
  sweep's exact subject: an entry that describes another entry's state
  starts decaying the moment it is written.

  **The question.** The PCOR's buyer box and the 502-D's affiant box each
  read *"Name and mailing address"* — one AcroForm field, two facts. We
  hold the name and place it; **no mailing address for either party
  exists in builder state, in the generate payload, or on the deed row.**
  PCOR3b leaves those lines empty and says so in the instructions.

  **Why it is worth asking.** A grantee mailing address would serve two
  places, not one: the PCOR's buyer block, and the deed's own mail-to,
  which today defaults to the PROPERTY when the officer picks "grantee".

  **Why it is not obviously worth building.** It is new product surface on
  every conveyance, and **the officer may simply not hold it at drafting
  time** — a buyer's forwarding address is often unsettled while the deed
  is being prepared. A required field she cannot answer is worse than an
  empty box the buyer completes.

  **What must never happen, and is now pinned:** the address must NOT come
  from the mail-to block. That is a different fact — where tax statements
  go — and it is frequently the title company. Sourcing it there would put
  a title company's address on a form the buyer signs under penalty of
  perjury, and it would look filled rather than wrong.

- **PCOR3-DOD — should the affidavit family collect a DATE OF DEATH?**
  **DECIDED 2026-08-24 — NO. RESOLVED BY RESEARCH, and the research
  answered a better question than the one asked.** **BUILT** — nothing to
  build; the closure is the decision.

  **The question was framed as a convenience trade** — is prefilling one
  box on the 502-D worth a field across five instruments? The advisor
  leaned no on cost. **The owner's review of the actual forms made the
  cost argument unnecessary:**

  **THE AFFIDAVIT OF DEATH DOES NOT ASK FOR A DATE OF DEATH.** LA,
  Ventura, San Bernardino, Santa Clara and Sacramento all name the
  decedent, reference *"the attached certified copy of Certificate of
  Death"*, cite the prior deed and legal description — and never ask for
  the date. **Probate Code §210 requires the certificate as an
  attachment, so the instrument references the document rather than
  restating its contents.**

  So collecting it would add a field to five instruments **for a fact the
  instruments themselves do not ask for**, to prefill one box on a
  companion form, where the county already requires the source document.
  Product surface without gain.

  **The 502-D instruction PCOR3a wrote is the correct and sufficient
  answer** — it names the death certificate as where the buyer finds the
  date, which is exactly where the affidavit points too.

  **The generalisable half:** the convenience question ("is the fill worth
  the field?") was the wrong question, and reading the instrument
  answered it by dissolving it. **Before costing a field, check whether
  the document asks for the fact.**

- **NOTIF1 — BUILT, and then corrected the same day.**
  **DECIDED** 2026-08-20 (investigate), 2026-08-21 (build as a separate
  strip). **BUILT** — yes, #244 and #245.

  **What it fixes.** The worklist selects `ds.status IN ('sent','viewed')`
  — the two UNDECIDED statuses — because a worklist shows outstanding work
  and an approval is the END of outstanding work. So a resolved share does
  not change its row. **It removes it.** A vanished row is
  indistinguishable from one she handled, one that expired, one that was
  revoked, and from nothing at all. **A disappearance is not a
  notification.** Until this strip, the email was the only thing telling
  her — E1's own named failure.

  **NOT a fourth worklist band** (owner-ruled): the hero counts rows and
  promises "things that need you"; an approval needs nothing, and counting
  it inflates the number with finished work. An approval is news, not a
  task, and the two do not share a container.

  **TASK-FREE, with the gap closed by NAVIGATION** (owner-ruled). She
  learns her reviewer approved and would otherwise have to go find the
  deed. The property is a LINK — not a "Review it" button, which would
  turn news into work. Pinning that surfaced a second affordance nobody
  had noticed: the sentence was also a button, giving one destination two
  pressable surfaces and making a statement read as a prompt. The sentence
  is text now; the dismiss is the only button.

  **THE DEFECT #244 SHIPPED, FOUND BY THE OWNER AND FIXED IN #245.** The
  strip read `(n.payload->>'deed_id')::int`, and
  `utils/notifications.create_notification` has no `payload` parameter —
  it never has. **NULL for every production row, while the unit tests
  passed on a fixture that supplied `deed_id` directly.**

  *The rule was right and the corpus could not exercise it* — the same
  shape recorded in #243 hours earlier, repeated by the person who
  recorded it (§14.7). Both consequences were silent: the strip could name
  no property, and its href fell through to the stored `link`, which is a
  TRACKER — **the orphan ruling broken a second time by the same
  preference for a stored destination over a known document** the worklist
  had already corrected once.

  `deed_id` is now a COLUMN. **A link is a destination, not a schema:**
  parsing a deed id out of a query string would make every future route
  change a silent data migration, and `focus` is the share row's id
  anyway.

  **Two of four call sites were REVERTED rather than patched**, and a
  static scope check is what found it — `_tell_everyone` and
  `_tell_officer_dispatch_declined` take only `request_id` and never load
  the deed, so passing one would have been a runtime `NameError` on paths
  nothing exercises without a live signing. No test could have caught
  that; reading the signatures did.

  **The status-collision report was checked and did not hold.** The
  `status = 'viewed'` write lives on the VIEW endpoint and is guarded
  twice (`if status == 'sent' and not viewed_at`, plus `WHERE id = %s AND
  status = 'sent'`). Approve writes `'approved'`, reject writes
  `'rejected'`; they cannot collide.

  **Three pins were corrected while being written**, each for a different
  reason, and all three are the same family: one asserted the OLD href
  precedence (the defect); one forbade the noun `payload` and tripped on
  the SQL comment explaining the fix, so the pin now strips SQL comments
  as `code_only` strips Python ones; one forbade `/Resolve/` anywhere and
  tripped on the component's own name `RecentlyResolved`.

- **NOTIF1 — the approval record has no reader, and the worklist
  structurally cannot be one.**
  **DECIDED** — investigation reported 2026-08-20; the build is NOT ruled.
  **BUILT** — no.

  **The question asked:** does the worklist already surface approvals
  through share status? If so the in-app records are redundant and
  retiring the writer is the honest answer.

  **The answer is no, and the reason is structural rather than
  incidental.** `routers/dashboard.py`'s awaiting query selects
  `ds.status IN ('sent', 'viewed')` — the two UNDECIDED statuses — with
  the comment: *"A share that was approved, rejected, revoked or expired
  is not waiting on anybody."* That is correct for a worklist. A worklist
  shows outstanding work, and **an approval is the end of outstanding
  work**, so the row does not change: it DISAPPEARS.

  **A disappearance is not a notification.** The officer sees a row for a
  share she is waiting on; when the reviewer approves, the row is simply
  gone next time she looks. Nothing on any screen says it was approved —
  swept `features/` and `app/`, and the only approval-aware surfaces are
  the reviewer's own `/approve/[token]` confirmation, an admin email-log
  filter, and an account-settings toggle describing the email.

  **So the email is the only channel that tells her**, which is exactly
  the failure mode E1's comment names: *"Before this, the approval
  existed only as an email; a transport failure erased the event from the
  owner's world entirely."* The in-app record was written to survive that
  failure and currently survives it into a table nobody reads.

  **The records are therefore NOT redundant — they carry the one event
  this product cannot otherwise show.** Retiring the writer would restore
  the exact defect E1 was built to fix.

  **What wiring would cost, honestly.** The destination is not a bell.
  The worklist's unit is a ROW representing outstanding work, and an
  approval is finished work — so it does not fit the existing bands
  (chase / you / stale) without changing what a row means. Three shapes,
  none of them free:

    1. **A fourth band ("resolved since you last looked")** — fits the
       screen, but the hero counts rows and the hero's promise is "things
       that need you". An approval needs nothing. It would inflate the
       count with work that is done, which is the metric-vs-worklist
       error DASH3 spent itself removing.
    2. **A separate strip above or below the worklist** — does not touch
       the count, needs a read endpoint (the router, un-gated), a
       last-seen marker, and a dismissal rule. Smallest honest version.
    3. **On the deed's own row/page** — an approval is a fact about a
       document, and `/deeds/{id}` already tells that story. Cheapest,
       but only reaches her if she goes looking, which is the thing the
       record exists to avoid.

  **Recommendation: (2), and it is a real ticket, not a flag flip.** The
  flag is off, the UI is deleted, and the read API has never served a
  request. **Not started — this is the report, and the ruling is the
  owner's.**

- **GUIDE2 — in-product explanation, as static copy.**
  **DECIDED** 2026-08-20, owner-ruled (GUIDE0 ranks 1 and 2).
  **BUILT** — yes, 2026-08-20. `frontend/src/lib/provenanceLabels.ts`,
  `frontend/src/lib/exemptionScope.ts`, pinned by
  `frontend/src/__tests__/guidanceCopy.test.ts`.

  **What the build FOUND, which was not what the ticket expected.** The
  amber surface was scoped as "add an explanation". It needed a
  correction first: `ConfirmableField` showed one hardcoded sentence —
  **"From county records — confirm"** — on every unconfirmed field, and
  `FieldSource` has six members. It is false for `google` (a mapping
  service), false for `prelim` (a title company's work product), and
  worst for **`ai_suggested`: a value this software proposed, wearing a
  badge that credited the county.** The amber rule exists to say where a
  value came from, and the label was saying something we did not know.

  **The violet surface had a gap on the path that matters most.** The
  proposal block already carried a code section, a title and a
  fact-grounded explanation. **The MANUAL dropdown carried none of it** —
  an officer selecting "R&T 11923 — Court Order / Decree" was told
  nothing about what 11923 covers, and she is the officer deciding
  *unaided*, with no suggestion guiding her. Help concentrated where the
  software is already confident is help pointed away from the person who
  needs it. Both paths now carry scope.

  **The doctrine split, kept sharp.** `dttSuggestions.explanation` says
  why we propose this FROM HER FACTS. `exemptionScope` says what the
  SECTION reaches. Scope is a fact about California law, not about her
  transfer — **the basis made legible, not an inference stacked on one.**

  **Pinned as prohibitions, because that is the shape of the risk.** Copy
  cannot fail loudly: a sentence that quietly recommends an instrument,
  or asserts what a recorder will accept, renders exactly as neatly as one
  that does not. Seven mutation probes, each biting — including one that
  first reported `Tests: 0` because my probe was invalid syntax and the
  suite never ran. §14.2: that is not a bite, it is the control not
  running, and it was re-probed with valid code.

  **Cost: zero.** No endpoint, no model, no quota. A pin refuses a
  `fetch` in either module, because turning fixed reviewable copy into an
  inference with a bill would look like an improvement in review.

- **DARK1 — the dark page, the landing-page claims, and three things
  found by checking rather than reading.**
  **DECIDED** 2026-08-20, owner-ruled. **BUILT** — yes, #238, #239, #240.

  **What shipped.** `/team` deleted (a dark page claiming an unbuilt
  workspace and a Team tier). Every AI claim removed from the landing
  page and the components it renders. `VideoPlayer.tsx` deleted. The
  comparison table's `Multi-user collaboration ✓` replaced with an X.
  The banned-claims team rule widened from three spellings to its
  property.

  **THE RICKROLL A GREEN PIN WAS CERTIFYING.** `homepageLinks.test.ts`
  asserted `components/landing-v2/VideoPlayer.tsx` does not exist, with a
  comment reading *"The placeholder 'demo' iframe (a rickroll) can never
  return."* It never left: a second copy at `components/VideoPlayer.tsx`
  embedded `dQw4w9WgXcQ` under `title="DeedPro Product Demo"`, and the
  pin was green **because** it named one path rather than the property.
  §14.1.1's silent half in its most exact form — the pin did not merely
  fail to catch it, it certified its absence, and nobody re-opens a file
  whose guard is passing. Now asserted as the property, probed both ways.

  **THE AUTHORSHIP CLAIM ABOVE THE FOLD, AND DARK1 MISSED IT ONCE.**
  `AnimatedDeed.tsx` rendered a hero badge reading "AI Generated" — the
  strongest form of the claim, since it says the software authored the
  instrument, and the exact string HOME2 corrected on the static twin. It
  survived because DARK1 surveyed `app/page.tsx` and not the components
  that page renders: **one path instead of the property, in the same
  session, while fixing the VideoPlayer pin for that same reason.**
  Recorded at §14.7 — the interval between naming a shape and repeating
  it is not measured in weeks.

  **THE GATE NARROWER THAN ITS OWN `why`.** Recorded at §14.13. The rule
  stated its subject correctly and matched three spellings of it;
  "Multi-user collaboration" needed the word "seats" to be seen.

  **Two rulings on the copy.** The `Multi-user collaboration` row KEEPS
  its label with the gate's allow-comment — owner-ruled: a table that
  silently omits a capability the reader is shopping for reads as an
  oversight, while a row that names it and answers X is a straight
  answer, and the allow mechanism exists for exactly a denial that must
  name what it denies. **SmartReview stays as written** — the copy is
  careful: "Formatting checks passed — County recorder formatting rules"
  says our checks ran, not that a recorder will accept; "Ready to
  generate" is the word that could have overclaimed and does not; "Legal
  description confirmed — by your officer" attributes correctly.

  **THE 16 COMPONENTS, resolved per-component as ruled.**

  *Deleted (7)* — unruled, unpinned, unimported, and nothing referenced
  them after removal: `Particles`, `Navbar`, `ProgressOverlay`,
  `RecentPropertiesDropdown`, `DeedPreviewPanel`, `FeedbackModal`,
  `DeedPreview`. (`VideoPlayer` was the eighth and went in #239, because
  a ruling REQUIRED its deletion — HM1's, which the pin had been
  guarding at the wrong path.)

  *Kept, no decision needed (4)* — UI primitives: `Skeleton`,
  `MoneyInput`, `TextareaUnderline`, `RadioGroupRow`. Owner-ruled:
  deleting a design-system primitive because nothing imports it YET is
  how a system gets rebuilt piecemeal later.

  *Deleted after the carve-out check (4)* — owner-ruled 2026-08-20:
  `NotificationsBell`, `ToastCenter`, `PartnersManager`,
  `PropertyMatchPicker`. **A scaffold, not a decision.** If in-app
  notifications become wanted they get designed against the product as it
  is now — a worklist and a queue that already surface what needs her —
  rather than resumed from a January scaffold predating all of it.
  Keeping them carried the same maintenance as the seven, plus the risk
  that *"there's already a bell"* shapes a future design badly.

  **THE CARVE-OUT, CHECKED BEFORE DELETING, AND THE ANSWER WAS NEITHER
  YES NOR NO.** The condition was: if `routers/notifications.py` writes
  the in-app record CANCEL1/E1 depends on — the approval that must
  survive an email failure — the backend half stays.

  It does not. **A DIFFERENT MODULE DOES.**
  `utils/notifications.create_notification` writes that record, is NOT
  flag-gated, and is called live from `sharing.py`, `signing.py`,
  `users_auth.py` and `api_key_requests.py`. Its call site in
  `sharing.py` states the rule: *"the in-app record comes FIRST — an
  approval must be unlosable regardless of email transport."* Nothing in
  this ticket touches it, and nothing should.

  `routers/notifications.py` is the flag-gated READ side — `GET /`,
  `GET /unread-count`, `POST /mark-read`, plus an admin broadcast INSERT
  that is its own feature. **Two modules, near-identical names, opposite
  answers to the carve-out.** Had the check stopped at the filename, the
  wrong half would have been protected and the right half deleted.

  **THE BACKEND IS UNTOUCHED, AND ONE QUESTION IS LEFT OPEN FOR THE
  OWNER.** The live writes now have no reader at all: records accumulate
  in `notifications` / `user_notifications` on every approval, and the
  only API that could read them is flag-gated off with its UI deleted.
  That is not a defect — the record's purpose is to be unlosable, and it
  still is — but it is a growing table nobody can see. Whether the router
  is retired, or wired to something the current product actually renders,
  is a product decision and is NOT decided here.

  **A CAVEAT ON THE SWEEP'S METHOD, recorded before it is used again.**
  DARKSWEEP matched importers by BASENAME across the tree. Two files
  sharing a basename in different directories would credit one with the
  other's references, in either direction. **Checked, and inert here:**
  no basename among the 16 appears more than once anywhere in `src` (the
  only duplicates are `index`, `page`, `layout`, `route`, `finalizeDeed`
  — framework files, none of them components). The verdicts stand. The
  caveat is recorded so a future sweep on a tree with duplicated
  basenames does not inherit a confidence this one earned by luck.

- **DARKSWEEP — enumerate every unreachable route and page component, and
  report what each one CLAIMS.**
  **DECIDED** 2026-08-20, owner-ruled. **BUILT** — no.
  **Investigation only. Report before deleting anything: a page is a
  product decision, not cleanup.**
  **DO NOT START until GUIDE2 lands.**

  **Why it exists: three dark surfaces, found three different ways, none
  of them by looking.**

  1. `/api/ai/chat` — no reachable caller since 2026-04-28. Found by a
     call-site census during GUIDE0, four months later, after two tickets
     had hardened and re-ruled it.
  2. `ActionQueue`/`QueueList`/`StatCard`/`DeedRow` — renderers outliving
     their render sites, found in DASH3 while auditing dead state.
  3. `/team` — no inbound link from anywhere, found incidentally while
     grepping for AI labels in GUIDE1.

  **Finding the fourth by accident is the wrong way to find it.** Each of
  these was invisible for the same reason: nothing fails when code is
  unreachable, so nothing prompts anybody. That is §14.5's whole family,
  and the answer to a family of defects is a sweep rather than a habit.

  **What the sweep produces:** every route and page component with no
  inbound link and no importer; what each one claims in its user-visible
  text; and whether it renders anything a stranger could reach — because
  an unreachable-by-navigation route may still be served by URL, which is
  a different risk from dead code.

  **`/team` is IN this sweep rather than decided now** (owner-ruled), and
  it is flagged: it claims *"Collaborative AI-powered deed creation
  workspace"* and *"✨ AI Assisted"* — **the exact claim GUIDE1 removed
  everywhere reachable.**

  **The banned-claims question, answered.** The gate ALREADY covers
  `/team` regardless of reachability: `files_to_check()` rglobs
  `frontend/src` and never consults routing, which is the right design
  and needed no change. It does not fire because **there is no RULE for a
  capability claim** — all fourteen are certifications, security grades,
  or unbuilt features (SSO, white-label, seats). So this is a rule gap,
  not a scope gap, and the distinction matters: no plumbing to build,
  only a rule to write.

  **The rule is deliberately NOT added yet.** Adding an AI-capability
  rule today fails the gate on `/team`, which forces the page to be fixed
  or allowlisted — pre-empting the decision this sweep exists to make.
  It goes in when DARKSWEEP resolves `/team`, and that sequencing is the
  point rather than a delay.

- **W0 §3 — A RULING DECIDED, PARKED, AND NEVER BUILT** (surfaced by
  HOME2, 2026-08-18). Recorded loudly because it was invisible for weeks
  and because of HOW it stayed invisible.

  **The ruling.** Model 2 — confirmation stays in our UI; API submissions
  land as drafts with a confirmation URL. Decided 2026-07-30.

  **What is actually deployed (updated 2026-08-27).** API-CONFIRM built
  Model 2. `POST /api/v1/deeds` inserts `pending_confirmation`, holds
  preview bytes, and returns a confirmation URL. A stored PDF exists
  only after the named approver confirms. See the closed W0 §3 line.

  **What is on the marketing surfaces.** API-CONFIRM rewrote both. The
  homepage says a human confirms the deed; `/developers` documents
  draft-and-confirm. Those surfaces were written on the branch. Production
  kept serving the old one-call contract because **#263 was approved
  and not merged** — the docs were not wrong; the merge was missing.

  **THE LEDGER ENTRY READ AS IMPLEMENTED TO THE PERSON WHO MADE THE
  RULING.** The line says *"DECIDED: Model 2 = confirmation in our UI…
  PR #79 closed as decided; the W1 draft stays parked pending the owner's
  lane call."* Every word is true, and the owner read it as built. The
  qualification that mattered — parked, never implemented — is prose in
  the middle of a sentence about something else.

  **This is §14's family, in the ledger itself, and it is the second
  time.** The first was `EMAIL_VERIFICATION_REQUIRED`, recorded as
  evidence that required verification was ready to switch on, while it
  was defined in one file and read nowhere — and the same entry described
  verification as "resend-only" when the resend endpoint had no caller.
  A record that overstates is found before a launch or during an
  incident. This one was found four days before pilot traffic.

  **ADOPTED 2026-08-18 — DECIDED and BUILT are now FIELDS.** The
  proposal this entry carried was ruled on the same day: "adopt as
  fields, repo-wide… two fields make 'decided, not built' scannable
  rather than reconstructed." The convention is written at the top of
  this file, W0 §3's own line in the closed section is the first entry
  converted, and the sweep of existing entries is HOME2-FOLLOWUP —
  ruled a separate ticket rather than folded into the one that proposed
  it.

  **NOT built as part of HOME2.** Model 2 is a partner-API change with a
  versioning question and belongs to the parked W1 lane. Building it as a
  side-effect of a homepage ticket would be the largest scope creep in
  the engagement (owner-ruled).


- **HOME2-FOLLOWUP — convert existing ledger entries to DECIDED/BUILT.**
  **DECIDED** 2026-08-18 — the two-field convention is adopted repo-wide
  (see the top of this file).
  **BUILT** — partially: the convention is written and W0 §3 is
  converted, as the entry that motivated it. **The sweep of every other
  entry is not done, by ruling** — "sweep existing entries as a follow-up
  ticket, not now."

  **Scope when it fires.** Every entry recording a decision gets both
  fields. The work is not mechanical: for each one, `BUILT` has to be
  ANSWERED rather than transcribed, and the answer comes from the code,
  not from the entry's own prose — which is the entire failure this
  convention exists to prevent. An entry converted by re-reading its own
  sentence reproduces the defect in a new format.

  **Expected yield, stated in advance so it can be checked:** two known
  cases (W0 §3, `EMAIL_VERIFICATION_REQUIRED`) and an unknown number of
  others. If the sweep finds nothing beyond the two, that is a real
  result and worth recording as one — the convention still pays for
  itself on entries written from here on.

- **`STRICT_PUBLIC_ENV` is on.**
  **DECIDED** 2026-08-18 — the site's public environment is checked at
  boot, with a strict flag that refuses to start when a REQUIRED variable
  is missing (§14.8).
  **BUILT** — yes, ENTITY1. The FLAG is on (`frontend/vercel.json`).

  The three contact variables were supplied in the same change. A
  missing contact address is a broken deploy. Values are configuration,
  not credentials — they do not appear in this file.

- **ENTITY1 — legal counterparty named.**
  **DECIDED** 2026-08-27 — owner supplied the entity. Footer reads the
  three public env vars. Terms §11 states the counterparty. Privacy §4
  names the measured subprocessors. DRAFT banners stay until counsel
  says otherwise.
  **BUILT** — yes, #264.

  **The sweep is the ticket's substance.** Two processors no candidate
  list would have produced: Google Places (browser → Google, not via
  our API — every address typed in the builder reaches a third party
  without touching our servers) and OpenAI (authenticated endpoint
  live, no UI caller; an endpoint that can receive property text is a
  processor whether or not anything calls it today). The
  swept-and-omitted list is what makes the included list trustworthy:
  TitlePoint, Anthropic, Cloudflare, Redis, Sentry, PostHog, Twilio,
  PDFShift, Vercel Analytics — checked and not live.

  **Two flags, named and accepted.** (1) Two copies of one fact: footer
  reads env, legal pages hardcode. Right call — a legal document
  reading its counterparty from an environment variable would be
  worse — and still two copies. Pinned: the entity name in Terms
  equals the env value the footer prints (`entityIdentity.test.ts`).
  (2) Strict refusal is a Vercel-boot property. `npm run build` does
  not inject `vercel.json` env, so the loud failure happens where it
  matters and nowhere CI exercises.

- **Approved and merged are different states, and only one of them is
  production.** Third instance, 2026-08-27. #263 went green on eight
  checks and was approved; the conversation moved to ENTITY1 and nobody
  merged it. Production `/developers` kept serving the one-call
  contract; the homepage's "a human confirms the deed" claim sat on a
  branch. Same shape as `authoringStateHint` ruled-cut and living in
  `main` for three PRs, and as W0 §3 reading BUILT while parked — three
  directions, one disease. Approval is not a deploy.

- **A plan card for the RETURNING officer** (day-one diff, owner-ruled a
  candidate 2026-08-14 — ledgered rather than built). `DayOneRail`
  carries Plan and Recording county and disappears with the setup
  checklist, because the mockup only draws it in the day-one view.

  The card is arguably useful to a returning officer too — her plan and
  her default county do not stop being facts once she has made a deed.
  **Not built on that inference.** `dashboard_day_one.html` draws no
  returning-state rail, and its returning section is a populated queue;
  inventing a layout for a view the design does not cover is a different
  ticket from correcting one it does.

  **What it would need first:** a ruling on where it sits relative to the
  queue and the accuracy figure, both of which currently own the top of
  that page for a returning officer. Not a rendering question — an
  ordering one, and ordering on this screen has been ruled twice.

  **Explicitly NOT in scope if it fires:** the deeds-this-month row.
  MONEY1 stands — Free is uncapped, `max_deeds_per_month` is `null` so
  that no consumer infers a cap, and a screen is the harder place to see
  a false limit than a payload.


- **Audit the string-presence pins whose subject is a BRANCH** (CANCEL1
  item 4 finding, owner-ruled a class 2026-08-12). Looked at
  opportunistically as ruled, and the population is larger than an
  opportunistic pass: **43 test files read source, carrying roughly 600
  `toContain` assertions.**

  Most are safe, and the discriminator is what makes this a ticket rather
  than a grep: **is the assertion's subject a CONSTANT or a DECISION?**

  - A constant — a copy string, a forbidden term, a class name, an
    import — is fully checked by its presence. `expect(PAGE).not
    .toContain('SOC 2')` cannot be fooled by dead code, because dead code
    containing it is still a violation.
  - A decision — "this button appears when X" — is NOT checked by
    presence. `{false ? (` leaves every string in the file and the pin
    stays green with the feature switched off, which is exactly what
    happened here.

  **The remedy generalises:** when a pin's subject is a decision, extract
  the decision into a callable rule and test it with inputs.
  `lib/signingRowAction.ts` and `lib/signingCopy.ts` are the two examples;
  `lib/sitexProperty.ts` carried the reasoning first — *a rule you can
  only test through a UI is a rule you do not test.*

  **Not swept now, deliberately.** Six hundred assertions triaged badly is
  worse than six hundred untriaged, because a pass that says "audited"
  stops the next person looking. Effort: half a day to triage, unknown to
  fix, and the fix is per-pin.



- **CANCEL1's three post-creation gaps** (audit finding, ledgered
  2026-08-12 with the ticket that made them survivable). Every field on a
  signing request is create-only: the notary cannot be reassigned, the
  time/location/signers cannot be edited, and an invitation cannot be
  resent. All three are real.

  **They wait because cancel-and-recreate is a working path for all
  three, and cancellation is its precondition** — which now exists, with
  notices, so the clumsy path is at least an honest one: everybody is
  told the old arrangement is off before the new one arrives.

  **TRIGGER: an officer doing it twice.** Cancel-and-recreate costs three
  emails and retyping the signers. That is tolerable once and grating on
  repetition, and the repetition is the signal that the shortcut is worth
  its own state. Reassign-notary is the likeliest first: a notary
  declining is a normal outcome, not an error.



- **Retire NOTARY1's read-side routes — DONE 2026-08-12, and VERIFIED
  CLOSED 2026-08-12 before the follow-up ticket was started.** The route
  table now carries only `/approve/{token}`, `/approve/{token}/pdf` and
  `POST /approve/{token}` — the REVIEW share surface, which is the live
  model and was never NOTARY1's. Nothing remained to retire; the
  follow-up ticket shipped inside #170. All four
  removed (the ledger said three; `GET /approve/{token}/pcor.pdf` was
  not in the count), with `_signing_share_by_token`,
  `_pcor_deed_for_token`, `_tell_the_officer`, the `WindowChoice` /
  `OfficerSchedule` models, the dead half of `services/signing.py`, the
  orphaned `signing_time_recorded` email, and the approve page's window
  picker.

  **The trigger's second half was answered by argument rather than by a
  survey**, and that is worth stating plainly: nobody enumerated every
  database that runs this schema. The reason it did not need to is that
  **the read side was never the recovery path — the migration is.**
  `migrate_notary1_signings.py` still reads `deed_shares` directly,
  still carries a share into the NOTARY2 aggregate, and now names the
  database it is in first. A row found anywhere is migrated into the
  model the product believes in rather than served through one it does
  not. Pinned.

  A link held by somebody from that era now says what happened and what
  to do, rather than opening onto a page with no actions — invariant #4
  wearing an empty state. The `deed_shares` columns stay; a column drop
  is irreversible and was not ruled.

- **Sweep for pins reading files nothing imports** (FLOW1 item 6
  finding, owner-ruled as its own category). `shareEntryPoints.test.ts`
  spent two tickets asserting properties of `SigningRequestModal.tsx`
  while the page rendered `RequestSigningModal` — the test file's own
  comment said so. **A pin reading a file with no importers is passing
  for a reason unrelated to the property it claims to guard**, which is
  worse than a failing pin: it is green and meaningless. Ruled to be
  swept opportunistically rather than as a scheduled ticket. Heuristic:
  any source file a test reads that no non-test file imports is
  suspect.

- **DEEDDETAIL — there is no deed detail route** (FLOW1 finding, owner
  ruled: scope and ledger as its own ticket, not FLOW1's). `/deeds/{id}`,
  `/deed/{id}` and `/past-deeds/{id}` all 404. Every deed-level action —
  share for review, request a signing, download, view — exists only as a
  control inside a list row, so there is nowhere to LINK a deed from.
  This is why the Signings agenda card points at `/past-deeds` and loses
  which signing you were looking at, and why an approval notification's
  `?focus=` parameter has nothing to focus. It is a structural gap rather
  than a bug: nothing is broken, and several things cannot be built
  correctly until it exists. Scoping this properly means deciding what a
  deed's page IS (the instrument? its history? its people?) before
  building one, which is why it is parked and not folded into a UX
  ticket.

- ~~**Deed supersession model**~~ — **BUILT AND SHIPPED, T-5 (PR #124).**
  Corrected 2026-08-04; this entry was stale for a day and is left
  visible rather than deleted, because a parked list that quietly loses
  entries cannot be trusted to still hold the others.
  `deeds.superseded_by` / `superseded_at` exist, `services/supersession.py`
  refuses every way the chain can be corrupted, and the T-0 copy pin
  retired in the same diff that made its promise true. The admin
  deed-edit capability it blocked is unblocked.
- **VERIFY1 — wizard-deed public verification** (ADMIN0 finding, queued
  AFTER the admin wave; roadmap, not admin). The uncalled
  `create_document_authenticity` helper was deleted during DX-BRUTAL;
  the only live writer of `document_authenticity` remains the partner-API
  lane (`routers/api_v1/router.py`). So wizard deeds carry a stored
  `deed_pdfs.sha256` but no verifiable short code, and the admin
  Verification tab shows API-lane documents only. Whether public
  verifiability was ever intended for wizard deeds is a product
  question — doctrine §3 removed QR codes from recorded pages on the
  reasoning that "verification survives as data."

- **DX-BRUTAL — inert options in the public request contract.**
  **DECIDED** 2026-08-27 — a documented API field must control the
  advertised behavior. `include_notary_page` did not: the acknowledgment
  page was already included unconditionally by the templates, so changing
  the option changed no PDF bytes. `include_qr_code` was inert too, and
  recorded pages already carried no QR. This is the dead-control class
  first found in `EMAIL_VERIFICATION_REQUIRED`, now at an integration
  boundary where a partner could code against the nonexistent capability.
  **BUILT** — PR #262 removes both fields and pins that the request schema
  advertises neither; acknowledgment rendering itself is unchanged.

- **DX-BRUTAL follow-up — should `exempt_code` become a validated
  vocabulary?**
  **DECIDED** — no decision. This is a product-contract question, not a
  documentation correction.
  **BUILT** — no. The API accepts a free-form string and validates against
  no code list. PR #262 documents exactly that and removes the proposed
  curated examples: publishing a list would imply a closed vocabulary the
  API does not enforce. Any future validation requires its own ruling and
  one shared corpus for validation and documentation.

- ~~**Connection-helper LIFECYCLE collapse**~~ — **RESOLVED AS RED-S1,
  shipped 2026-08-04.** `db.conn` is now a per-request proxy over a
  pooled connection; the shared connection and its healing ladder are
  both gone. The risk note below was the right one and it is preserved
  as the record of why this needed its own ticket — the direction chosen
  was "converge on per-request", and the `close()` hazard it warned about
  is handled by the proxy refusing `close()` outright (pinned).
  **One thing it named is NOT done and is deliberately out of S1's
  ruled scope:** `database.get_db_connection()` still opens a FRESH
  connection per call rather than drawing from the pool. That is correct
  (RED-H1.2 made every one of those close on every exit) but it means an
  endpoint using both helpers holds two connections for one request.
  Converging it is an efficiency change, not a correctness fix — it is
  flagged here rather than folded in, because folding unruled work into
  the ticket that fixes the outage is how a safe diff becomes an unsafe
  one.
  Parked 2026-08-03 by owner
  ruling; explicitly NOT to be absorbed into another ticket. PR #107
  unified the ROW CONTRACT (one cursor factory, rows readable both
  ways, pinned). What remains is that the two helpers differ in
  lifecycle: `database.get_db_connection` returns a FRESH connection per
  call and its callers `conn.close()` it; `db.get_db_connection` returns
  the SHARED module-level connection carrying the #100 healing ladder.
  **Risk note (the reason it is its own ticket):** naively pointing the
  fresh-connection callers at the shared helper means their existing
  `close()` calls would close the shared connection out from under every
  other request — a #100-class production outage, arriving by the same
  door as the last one. Either direction (converge on per-request, or
  converge on shared and strip every close) is a real architecture
  decision with a live blast radius, and needs its own scoped ticket
  with its own verification.

## Ledgered triggers (machine-side, fire on condition)

- **THE ESLINT CEILING DRAWDOWN — `ignoreDuringBuilds` comes out when
  the error count reaches ZERO.**
  **DECIDED** 2026-08-20, owner-ruled. **BUILT** — no; this is the
  trigger, and the flag is still in `frontend/next.config.js`.

  **The condition is machine-reported, not remembered.**
  `frontend/scripts/eslint-gate.mjs` prints
  `::notice::eslint improved to N/M — lower CEILING…` on every run where
  the count drops. When the error half of that notice reads **0**, the
  remaining work is three lines: delete the `eslint` block from
  `next.config.js`, delete the explanation above it, and keep the CI job
  as the warning ratchet.

  **Why it is a trigger and not a ticket.** The 136 come down as a side
  effect of other work — 104 are `no-explicit-any`, which get typed
  properly when their files are touched for other reasons. Scheduling a
  ticket to fix 136 style violations would be make-work; scheduling a
  ticket to *notice* they are gone is exactly what a trigger is for.

  **The failure mode this guards.** A ceiling with no drawdown condition
  is a debt ledger nobody reads — the count stops being a target and
  becomes furniture, which is how the flag itself survived eight months.

- **CI ACTION VERSIONS — `actions/checkout@v4` and `actions/setup-node@v4`
  are being force-run on Node 24.**
  **DECIDED** — not yet; parked with its trigger. **BUILT** — no.

  Surfaced by #234's own CI logs 2026-08-20: *"Node.js 20 is deprecated.
  The following actions target Node.js 20 but are being forced to run on
  Node.js 24."* A **warning today, on every job, not a failure** — which
  is precisely the profile of a thing that becomes a failure on a
  Wednesday with no diff to blame.

  **Deliberately NOT bundled into ESLINT1.** Bumping the actions is a
  change to CI topology, and riding it in on a lint ticket is how a
  green-CI change becomes an unexplained red one later. Its own ticket,
  small, whenever it is scheduled.

  **The trigger:** the first CI run where this warning becomes an error,
  or any ticket that touches `.github/workflows/` for another reason —
  whichever comes first.

- **THE LEDGER SWEEP RECURS — every wave boundary, or every 10 merged
  tickets, whichever comes first.**

  **THE DECAY RATE, MEASURED (2026-08-24), and it is a stronger argument
  than the original finding.** The sweep was justified by six stale rows
  out of eight — a snapshot of accumulated drift, which invites the reply
  "then sweep occasionally". PCOR3-ADDR's entry said PCOR3-DOD "is also
  still open" **while that question was being closed in the same
  session** — stale in under an hour, by the same author, in the same
  ticket.

  Six-of-eight says the ledger drifts. Under-an-hour says **an entry that
  describes another entry's state begins decaying the moment it is
  written**, and no plausible sweep interval catches that. What the
  trigger buys is not freshness; it is a scheduled moment at which
  cross-references are re-read as claims rather than as context.
  **DECIDED** 2026-08-19, owner-ruled.
  **BUILT** — the trigger is this entry; the sweep itself is a person
  reading code, deliberately, and that is the whole point.

  **Why it is a scheduled item and not a habit.** The first sweep found
  six stale rows in a table whose own header calls itself the authority,
  "re-ruled, not re-derived". Nobody neglected it; there was simply no
  moment at which re-ruling was anybody's job. **"Someone will remember"
  is the mechanism that produced six stale rows**, and §14.7 rejects that
  trade wherever a mechanism can replace it.

  **What the pin does NOT cover, which is why this exists.**
  `backend/tests/test_ledger_built_paths.py` catches ROT and
  OVER-CLAIMING — a `BUILT — yes` citing a module that has since moved.
  It cannot catch UNDER-claiming, which is what the sweep actually found:
  nothing mechanical separates "queued, correctly" from "queued, but
  shipped three weeks ago", because the second requires reading code the
  row never mentions. The pin holds one direction; this trigger is the
  only thing holding the other.

  **How to run it, in one line:** for every row and parked entry claiming
  NOT built, go and look for the module, endpoint or script that would
  exist if it were — and answer from what you find, never from the
  entry's own sentence.

  **Last run:** 2026-08-19 (six rows corrected, all under-claiming).
  **Next due:** at the next wave boundary, or after ten merged tickets.



- **Verification-at-registration** — ~~stays resend-only for now~~
  **DECIDED** (original) — stay resend-only.
  **BUILT** — resend: **yes** (VERIFY-CHECK). Gating on `verified`:
  **no**, by owner ruling, and `test_verify_check.py` holds the product
  to no-gate until that is re-ruled.
  *One of the two founding cases for this convention — the entry cited
  `EMAIL_VERIFICATION_REQUIRED` as existing plumbing while it was read
  nowhere.*
  **PARTLY FIRED (VERIFY-CHECK, 2026-08-13). This entry was wrong in two
  ways and both are worth keeping visible.**

  "Stays resend-only" described a resend nobody could reach:
  `POST /users/verify-email/request` had **no caller anywhere in the
  repo** — not registration, not the frontend, no button. And the
  plumbing cited as existing, `EMAIL_VERIFICATION_REQUIRED`, was
  **defined in `auth_extra.py` and read nowhere**. An operator could
  have set it on Render before a launch, believed required verification
  was on, and nothing whatsoever would have changed. A dead control is
  worse than dead code, and a ledger entry citing it as evidence is how
  it survives.

  **Now true:** registration sends the link, the product tells the
  account holder whether their address is confirmed and offers to resend,
  and one place mints the token. `EMAIL_VERIFICATION_REQUIRED` is
  deleted.

  **Still open, and still the trigger:** nothing is GATED on `verified`,
  by owner ruling — every existing account is unverified because nobody
  had ever been asked, so a gate switched on today locks out the whole
  customer base. `test_verify_check.py` holds the product to no-gate
  until that is ruled otherwise. Gating needs two decisions, not a
  commit: **which surface** (sharing is the narrowest defensible one;
  login is the widest and worst) and **what happens to existing rows**
  (grandfather, or send everybody a link at once). It also couples
  customer access to our own email deliverability, which is a thing to
  choose rather than inherit.

  **Fire when:** first real customer onboarding or public launch — and
  the honest order is send → watch how many verify → then gate.
- ~~Parties JSONB migration~~ — FIRED and executed (PR #86).
- **"Compact chassis" CSS variant** — consider if more one-page
  instruments accumulate (spike report note; the inline-acknowledgment
  mode of PR #87 covers the current cases).
- **H1.3 usage-evidence review** (Doctrine B, deferred 2026-08-06 —
  **deferred, not cancelled**). Doctrine B shipped on the boundary
  alone: explain-yes / select-no decides `deed_type_advisor` regardless
  of what officers ask, because a "help users select" prompt cannot
  survive select-no. What the evidence would have shaped is **how much
  explanation** officers actually want, and the
  explain-only-vs-delete call on `deed_type_advisor` deserves it too.
  The review did not happen because the evidence does not exist yet:
  `ai_exchange_log` landed 2026-08-04 (PR #128) and held **zero rows**
  two days later. Empty because the table is new, not because the
  review is unwanted.
  **Trigger — whichever comes first:** ~100 real exchanges accumulated,
  OR the first design-partner month completes.
  **On firing:** read the log; append real questions and real answers to
  `backend/services/ai_boundary_cases.json` (which is built to receive
  them — today's cases are honest reconstructions and say so); tune the
  explain-only prompt's depth against what was actually asked; and give
  the explain-only-vs-delete call its evidence.
  **The query (read-only, owner-side — production Postgres is Tier 3):**
  ```sql
  SELECT prompt_key, status, count(*) AS n,
         count(boundary_flags) AS flagged,
         min(created_at) AS first, max(created_at) AS last
  FROM ai_exchange_log GROUP BY 1,2 ORDER BY n DESC;
  ```
  `boundary_flags` is NULL when the response was clean, so
  `WHERE boundary_flags IS NOT NULL` is the whole conformance audit.

- **NOTARY1 deferrals** (2026-08-10, all deferred WITH triggers — the
  first slice is officer↔notary coordination and nothing else):

  - **Signer contact and messaging.** DEFERRED WITH A HIGH BAR, not
    parked. Owner ruling 1 is that the officer relays; the product holds
    no signer contact and messages no signer. It is pinned fail-closed
    in both suites, so building this is a deliberate act that trips a
    test, which is the intent.
    **Trigger:** a design partner asks for it *by name* AND a consumer
    privacy posture exists to hold it against (what we store, for how
    long, how a non-user asks us to delete it). Volume alone is not the
    trigger; the trigger is having an answer to "what are you doing with
    my client's phone number."
  - **Counter-proposal loop** (the notary offers a time the officer did
    not propose). Today she picks one of up to three, or they settle it
    on the phone and the officer records it — both paths work, and the
    second is not a workaround so much as what people actually do.
    **Trigger:** officers report the phone-call path being used *because*
    no window fit, more than occasionally. Until then a negotiation UI is
    machinery for a conversation that takes fifteen seconds.
  - **Calendar sync** (two-way, CalDAV/Google). The `.ics` attachment
    ships now and covers "put it in my calendar."
    **Trigger:** a partner asks for availability to be *read* from a
    calendar rather than a file being sent to one — that is a different
    product with OAuth, token refresh and a support surface, and it
    should not arrive by increment.
  - **The `matters` table.** Signing requests hang off a deed today. A
    matter with several instruments signed in one sitting wants one
    arrangement, not one per deed.
    **Trigger:** the matters work itself (T-4's grouping is derived, not
    a table); this rides it rather than preceding it.
  - **RED-S5** (organization-scoped partners) — see the interaction
    below, which is the reason it is named here.

- **RED-S5 consequence, recorded now so it is not discovered as a bug**
  (2026-08-10, NOTARY1 §6): **partners are scoped `user-{id}`.** A notary
  added by one officer is invisible to her colleague at the same company,
  who must add the same notary again, under her own account, with her own
  typo. Nothing here is broken — it is what user-scoped partners *mean* —
  but a two-officer design partner will experience it as a bug on their
  second week, and "we know, it is the org-scoping ticket" is a much
  better answer than discovering it live. It gets worse rather than
  better as the partner list becomes load-bearing, which the signing
  handoff makes it.
  **Trigger:** the first design partner with more than one officer.

- **A reminder written for a notary.** The signing request has no resend
  today: the `share_reminder` template says "waiting on your review,"
  which is the wrong question to re-ask somebody who was asked about her
  availability. Both the button and the endpoint refuse it rather than
  send the wrong words.
  **Trigger:** the first signing request that goes unanswered long enough
  for an officer to ask for a nudge. It is a template plus a route
  branch, not a design question.

## NOTARY2 — the reversal, and what it obliges (2026-08-11)

- **The signer-contact ruling is REVERSED.** Signers participate
  directly; recorded in DOCTRINE_CONFORMANCE §13.1 with the owner's
  reasoning ("the signers are the scheduling constraint, so routing
  around them recreated the phone tag the feature exists to kill"), and
  with NOTARY0b's superseded paragraph kept verbatim rather than
  rewritten. §13 otherwise stands: booked is not happened.

- **OWNER ITEM — a privacy statement covering non-users.** NOTARY0b's
  own argument against involving signers was that they "cannot see what
  we hold and cannot ask us to delete it." The reversal does not answer
  that objection; it converts it into a requirement. What we hold about
  a signer (name, email, optional phone, their answers), for how long
  (90 days past completion or expiry, proposed), and how a non-user asks
  for removal. **Should ship WITH NOTARY2's build, not after it** — the
  first real signer email is the deadline. Not a machine decision.

- **OWNER ITEM — transactional email to consumers.** Signer invitations
  are transactional rather than marketing, but they reach somebody who
  never signed up, from a brand they do not know. Worth a look before
  the first send.

- **OWNER ITEM (Tier 3) — a Render Cron Job for the purge.** There is
  **no scheduler in this deployment**: no cron, no worker, no
  APScheduler, no Celery; `render.yaml` defines web services only.
  NOTARY2 will ship the purge as a function with two invocations — a
  script ready for a cron service, and a throttled in-request sweep that
  needs no topology change. The sweep is a real mechanism and it is
  tested, but it runs only when somebody uses the product, so it LAGS
  gracefully rather than failing. That is acceptable for a retention
  practice and **not** acceptable as the backing for a stated deletion
  window. If the privacy language says "within 90 days," the cron
  service stops being optional. Creating it is a deploy-topology change,
  which is Tier 3.

- **OPEN QUESTION for the owner** — the notary's display name on the
  signer token view. A consumer asked to meet a stranger arguably should
  know who; equally it is another party's information on a surface whose
  whole point is minimum. Currently proposed IN the allowlist. See
  `docs/NOTARY2_PLAN.md` §2.

- **SCOPE FLAG — NOTARY2 as specified is ~11.5 working days**, which is
  past two weeks once anything goes wrong. Recommended cut: Part D's
  month grid becomes a sorted agenda list in v1 (~1 day, and no workflow
  depends on the grid). Recommended AGAINST cutting: the signer
  counter-proposal loop, which is the second-largest saving and is
  precisely the hole the reversal was made to close — cutting it spends
  two weeks rebuilding Option A with extra steps.

- **PARTNER2 note (2026-08-11): the fifth partner-category copy is gone.**
  PARTNER1 aligned two lists by hand and said hand-alignment has a shelf
  life; it did. A third copy in `QuickAddPartnerModal` had `realtor` as a
  CATEGORY while everywhere else it is a role belonging to
  `real_estate` — one word, two positions in the model, in one product.
  There is now one registry (`lib/partnerRegistry.ts`), every surface
  derives from it, and a pin fails if any surface grows its own list.
  `QuickAddPartnerModal` had no importers at the time; it was aligned
  anyway rather than left dead, because NOTARY2 Part B revives it.

## Purge cron — deployed 2026-08-11, after four sequential failures

The NOTARY2 signer-contact purge now runs on a Render Cron Job. Owner
ruling 3's hard requirement is **met**: the cron exists before the first
real signer email, which matters because the privacy statement will name
a retention window and that converts the practice into a promise.

Current state: **green — "purged contact details on 0 participant rows."**
Zero is the correct answer today; there are no signing requests old
enough to purge. The number to watch is `--status`'s `overdue`, which is
rows that SHOULD be purged and are not.

**The four failures, in order, because each one is a different lesson:**

1. **Python 3.14.** Render defaults a NEW service to the newest Python,
   where `pydantic_core` has no wheel — so pip falls back to building
   from source, and the Rust build then fails on a read-only filesystem.
   Two independent reasons it cannot work, which is why the error is
   confusing: the first line blames Rust and the last blames permissions.
   Fixed by pinning `PYTHON_VERSION` **to match `deedpro-main-api`** —
   matching the API specifically, not merely pinning something, because
   a cron running a different interpreter than the API it shares a
   codebase with is a second class of bug waiting.
2. **Internal hostname did not resolve.** Render's internal Postgres
   hostname resolves from a web service and NOT from a cron service. The
   External Database URL is required for cron.
3. **`signing_participants` missing.** Read as "the schema has not
   converged," which was wrong — the table was missing because of (4).
4. **THE REAL ONE: the external URL pointed at a DIFFERENT DATABASE.**
   `deedpro_database` on `dpg-d1vbos95pdvs73d2lvng`, not the API's
   `deedpro` on `dpg-d208q5umcj7s73as68g0`. The cron had been connecting
   successfully, to the wrong Postgres, and reporting a missing table.

Failure 3 is the one worth sitting with. **A connection that succeeds
tells you nothing about whether it is the right database.** "Table does
not exist" and "you are looking at the wrong server" are the same error
message, and the first reading is the one that wastes an afternoon.

### Standing rule 1 — every Render service pins `PYTHON_VERSION`

Not "the ones that have broken." A service without an explicit version
inherits whatever Render's default happens to be on the day it builds,
which means the runtime can change under a service that nobody touched.

**Open item:** `render.yaml` in this repo pins `PYTHON_VERSION` for
**nothing** — the main API included. Either the deployed services are
configured in the Render dashboard and `render.yaml` is no longer
authoritative (in which case the file is misleading and should say so),
or it is authoritative and the main API has exactly the exposure the cron
just demonstrated. Worth resolving; it is a deploy-topology question and
therefore Tier 3.

### Standing rule 2 — a `DATABASE_URL` is verified before it is trusted

Any service handed a `DATABASE_URL` must be checked against the API's
own, by identity rather than by the connection succeeding:

```sql
SELECT current_database(), inet_server_addr(), inet_server_port(),
       current_setting('server_version');
```

Run it from the new service and from the API, and compare. A matching
`current_database()` on a different host is still the wrong database —
two instances can carry the same database name, and in this account they
nearly did.

The cheap version, for a service whose job involves a specific table:
have the service assert the table exists at startup and say WHICH
database it looked in when it does not. "signing_participants not found
in deedpro_database on dpg-d1vb…" would have ended this in one run.

### Owner item — a second Postgres instance exists in the account

`deedpro_database` on `dpg-d1vbos95pdvs73d2lvng` is not the API's
database and nothing in this repo references it. It may be a
pre-engagement fossil. **Owner investigating.**

Same class as the `deedpro-external-api` ghost service (deleted
2026-08-03): infrastructure that exists, costs money, answers when
something connects to it, and corresponds to no code. The pattern is
worth naming — a ghost service returns 401s and a ghost database returns
"table does not exist," and both look like bugs in the thing that found
them rather than what they are.

**Do not delete it on our say-so.** A database that might hold real rows
from before this engagement is Tier 3 twice over: irreversible, and
possibly somebody's data. The useful next step is read-only — list its
tables and row counts — and that is the owner's to run.

## `render.yaml` — owner ruling, and which reality we are in (2026-08-11)

**Ruling:** pin `PYTHON_VERSION` explicitly for every service defined in
`render.yaml`, matching what production actually runs. Whichever of the
two possibilities is true, the fix is the same — the repo should express
the rule, and an unpinned runtime on the customer-facing API is the same
latent failure the cron just demonstrated, one Render default bump away.

**RESOLVED 2026-08-11: `PYTHON_VERSION = "3.12.7"`, landed.**

The evidence, since the header line in the build log was truncated: the
main API's wheel tags read `cp313` on sqlalchemy and greenlet, so it runs
**3.13**. The cron got **3.14**, today's Render default — which is what
caused the original failure.

**The pin is a DELIBERATE DOWNGRADE to 3.12.7** (owner-ruled): broadest
wheel coverage across the current dependency set, one minor below the
edge, and — the part that matters more than the number — it removes the
"whichever default existed the day this service was created"
nondeterminism entirely. Three services on three Pythons is not a
configuration; it is an accident with a history.

**OPEN, AND THE OWNER'S TO CLOSE: redeploy `deedpro-main-api` and watch
the build.** This changes the interpreter under a service that serves
every customer, from 3.13 to 3.12.7. The change is safe in expectation —
3.12 has strictly better wheel coverage than 3.13 for this dependency set
— but "safe in expectation" is what the cron's first build also was. It
is not settled until a clean build on the pinned version has been seen.

Pinned by `backend/tests/test_render_service_pins.py`, which asserts
every service block in `render.yaml` carries the pin AND carries THIS
value — "pinned to something" is a weaker claim than "pinned to the thing
we chose", and two services on two pinned versions is the same
nondeterminism with extra steps. Probed three ways: removing the pin,
changing the version, and adding a second unpinned service.

### Which reality we are in: the dashboard is authoritative

The question was whether `render.yaml` describes production or the
dashboard does. **It does not describe production, and this is checkable
without any dashboard access:**

`render.yaml` defines **exactly one service** — `deedpro-main-api` — plus
a database reference. Production runs at minimum:

| running | in `render.yaml`? |
|---|---|
| `deedpro-main-api` (web) | yes |
| the purge cron job | **no** |
| Postgres `deedpro` | by reference only |

The cron the owner created and debugged over four failures **appears
nowhere in this file.** So the file is already a partial description, and
anything reading it as the deployment inventory is reading a subset that
does not announce itself as one.

That is worse than the version-pin problem it was found by. A config file
that lies by OMISSION is harder to catch than one that lies by contents:
nothing about `render.yaml` says "this is some of what runs."

**OWNER RULING (2026-08-11): do the expensive half — but AFTER Part C.**
Bring the purge cron, and any other service added outside the file, into
`render.yaml`, and make the repo authoritative for deploy topology. Its
own ticket, sequenced after NOTARY2 Part C completes rather than folded
into this wave — a deploy-topology change landing in the middle of a
feature wave is how a bad afternoon becomes a bad week. The interim
header stands until then.

**Two ways to make it honest, and the owner has now chosen (1):**

1. **Bring the cron into `render.yaml`** so the file is the inventory,
   and keep it that way. More work, and it makes the repo the source of
   truth for deploy topology — which is a real commitment, not a
   formatting preference.
2. **Say so at the top of the file** — a header stating that services are
   managed in the Render dashboard and this file is a reference for the
   main API only. Cheap, honest, and it stops the next person trusting
   it.

Doing neither leaves a file that will be believed. Recommended: (2) now,
(1) if deploy topology ever gets complicated enough to need review.

## TICKET — services assert their tables and name the database (DONE)

**Shipped 2026-08-12.** `backend/services/db_identity.py`, called by the
purge, the NOTARY1 migration and the plan backfill; `--verify` on the
purge; `backend/tests/test_db_identity.py` holds it. Two departures from
the text below, both deliberate and both argued in the PR:

1. **"Naming both databases" needed something to compare against.** The
   example message below names an expected database, and nothing in the
   repo declares one — the purge legitimately runs against `deedpro`,
   `deedpro_test` and `deedpro_ci`, so a hardcoded name would be wrong
   three ways. Delivered as an optional `EXPECTED_DATABASE` a deployment
   sets; with it the message names both, without it the tables are still
   asserted. See the owner card above.
2. **Two callers were swept in beyond the purge**, because both were the
   same defect: `migrate_notary1_signings.py` carried its own two-line
   copy of the identity query (database and host, no assertion at all —
   so a wrong database would have reported a confident "found: 0"), and
   `backfill_plan_sync.py` rewrites `users.plan` from a Render shell with
   no identity line whatsoever.

**Found while doing it, NOT fixed — needs a ruling.** `s1_concurrency_proof`
and `s2_restore_drill` write to `users` and `deeds` in whatever
`DATABASE_URL` points at, and `s2` runs `pg_dump`/`pg_restore`. Pointed
at production they would insert junk rows into real tables. `assert_tables`
is the wrong tool — production HAS those tables, so the assertion would
pass — and the check they actually want is "is this a throwaway
database", which is a different mechanism (a refusal unless the database
name is test-shaped, or an explicit `I_AM_A_SCRATCH_DATABASE`). They are
exempted with that reason recorded in the test rather than given a check
that would not have caught anything.

## The original ticket text, for the record

**Why it is a ticket rather than a note.** It cost an afternoon of the
owner's time and two redeploys on an untested hypothesis. Invariant #4
applied to diagnostics: an error that names its context is a different
quality of error.

`relation "signing_participants" does not exist` sent us hunting for a
schema that had never run. The same failure, phrased with its context —

```
signing_participants not found in deedpro_database on dpg-d1vbos95… —
expected deedpro on dpg-d208q5um…
```

— ends the investigation in one run and names the actual defect.

**Scope.** A small startup assertion, used by any service that depends on
specific tables:

- `services/db_identity.py` — `assert_tables(conn, *names)` which, on a
  miss, raises with `current_database()`, `inet_server_addr()`,
  `inet_server_port()` and the missing table names in the message;
- called from `scripts/purge_signer_contact.py` before it does anything;
- an optional `--verify` flag printing the same identity block, so
  "which database is this service on" is answerable without a psql
  session;
- the same call available to any future worker or cron.

**Acceptance.** Pointing the purge script at the wrong database produces
a message naming both databases; pointing it at the right one is silent.
Tested by running it against a database that lacks the table.

**Effort.** Half a day. **Not urgent** — the specific defect is fixed and
the standing rule is recorded — but it is the difference between a rule
people must remember and a mechanism that remembers for them, which is
the same distinction the purge itself was held to.
