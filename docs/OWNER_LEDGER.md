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

## Parked tickets (scoped, not scheduled)

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
