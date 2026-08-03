# Owner ledger — canonical open/closed list

**This file is the ledger.** Agent reports cite it; corrections land HERE
(not only in chat) so the list survives context windows. No credential
values ever appear in this file — item names and status only.

_Last corrected: 2026-08-03 (ADMIN0 rulings recorded: wave order,
audit-log shape, supersession + VERIFY1 parked)._

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
**ADMIN1 ✅ → BILL1 ✅ → ADMIN1.5 (+ADMIN-BRAND) → ADMIN3 → ADMIN2 →
ADMIN4 → ADMIN5 → ADMIN6.**

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
  against real serialised output.
- **ADMIN-BRAND** — the console adopts the BRAND2 tokens. Rides with or
  immediately after ADMIN1.5. Not cosmetic: the current orange palette
  predates the brand and collides with doctrine, since amber now means
  unconfirmed external data. Decorative amber/violet dies; the doctrinal
  colors appear in admin only with their meanings.

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
- **ADMIN3 — email outcome persistence.** Generalize the one working
  pattern (`api_key_requests.notify_error`) to the other ten templates;
  10 of 11 send outcomes are currently printed and discarded.
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

- **Deed supersession model** (doctrine §9, 2026-08-03) — a corrected
  deed is a NEW record superseding the old, both retained, relationship
  recorded. `document_authenticity` already models this shape
  (`status='superseded'` + `superseded_by`); `deeds` has no equivalent.
  This is design work, not cleanup, and is explicitly NOT to be absorbed
  into an admin ticket. **Blocks:** any admin deed-edit capability.
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

- **Connection-helper LIFECYCLE collapse** — parked 2026-08-03 by owner
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
