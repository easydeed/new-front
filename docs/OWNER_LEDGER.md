# Owner ledger — canonical open/closed list

**This file is the ledger.** Agent reports cite it; corrections land HERE
(not only in chat) so the list survives context windows. No credential
values ever appear in this file — item names and status only.

_Last corrected: 2026-08-04 (RED-H1 wave closed; the RED0 remediation
queue re-sequenced by owner ruling; NOTARY1 and RED-S5 recorded as
deferred-by-decision with named triggers)._

## The queue — RED0 remediation, as ruled

Owner-ruled order. Nothing here is "next" by inference; this list is the
authority and it is re-ruled, not re-derived.

| # | ticket | state |
|---|---|---|
| 1 | ~~**RED-S1**~~ — per-request pool, per-request transactions, induced-failure concurrency test, 20 RPS + burst run, healing ladder RETIRED | **SHIPPED** |
| 2 | **RED-S2** — object storage for `deed_pdfs`, `ON DELETE CASCADE` removed, backup runbook, EXECUTED restore drill with hash verification | **next** |
| 3 | **RED-S3** — sessions: refresh + revocation (jti), login lockout, edge rate limiting, and frontend expiry as pause → preserve → re-auth → resume, never data loss | queued |
| 4 | **RED-S4** — recording fields (`recorded_at`, `instrument_number`) as officer-recorded statements, + the rate-registry version stamped into deed metadata at generation | queued |
| 5 | **Doctrine ticket A** — vested-owner extraction SPLIT: names flow as fact-candidates; the vesting characterisation routes to the vesting section as a violet proposal, never a carried fact | queued (ruled) |
| 6 | **Doctrine ticket B** — the AI boundary: explain-yes / select-no, refusal behaviour pinned, ruled against the transcript evidence H1.3 is now logging | queued (ruled) |
| 7 | **DX0** — investigation only, no build. Scoped to **partner #1 = TitleSense** | queued |
| 8 | **TP0** — TitlePoint investigation, no build | queued |
| — | **NOTARY1** | **deferred by decision** — see below |
| — | **RED-S5** (org model) | **deferred by decision** — see below |

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

- **Junk seed cleanup** (test rows in production data).
- **TitlePoint / SiteX credential rotations.**
- **DTT city-rates review** (`frontend/src/lib/dttCalc.ts`) — owner's
  escrow review is authoritative.
- **HM2 inputs**: sales/contact email → `CONTACT_SALES_EMAIL` constant;
  footer entity details.
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
- **W0 §3** — DECIDED: **Model 2 = confirmation in our UI** (corrected
  2026-07-30; an earlier ledger entry inverted this as "asserted
  confirmations" — the owner's definition governs). PR #79 closed as
  decided; the W1 draft stays parked pending the owner's lane call.
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

## Parked tickets (scoped, not scheduled)

- ~~**Deed supersession model**~~ — **BUILT AND SHIPPED, T-5 (PR #124).**
  Corrected 2026-08-04; this entry was stale for a day and is left
  visible rather than deleted, because a parked list that quietly loses
  entries cannot be trusted to still hold the others.
  `deeds.superseded_by` / `superseded_at` exist, `services/supersession.py`
  refuses every way the chain can be corrupted, and the T-0 copy pin
  retired in the same diff that made its promise true. The admin
  deed-edit capability it blocked is unblocked.
- **VERIFY1 — wizard-deed public verification** (ADMIN0 finding, queued
  AFTER the admin wave; roadmap, not admin). `create_document_authenticity`
  (`routers/verification.py:227`) has zero callers — the only live writer
  of `document_authenticity` is the partner-API lane
  (`routers/api_v1/router.py:438`). So wizard deeds carry a stored
  `deed_pdfs.sha256` but no verifiable short code, and the admin
  Verification tab shows API-lane documents only. Whether public
  verifiability was ever intended for wizard deeds is a product
  question — doctrine §3 removed QR codes from recorded pages on the
  reasoning that "verification survives as data."

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

- **Verification-at-registration** (E1 Phase 1 ruling, 2026-08-03):
  stays resend-only for now — enable required email verification at
  registration **before first real customer onboarding or any public
  launch**. The plumbing exists (`EMAIL_VERIFICATION_REQUIRED` +
  `/users/verify-email`); the trigger is the go-to-market moment, not a
  code change.
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
