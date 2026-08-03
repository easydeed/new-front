# Owner ledger — canonical open/closed list

**This file is the ledger.** Agent reports cite it; corrections land HERE
(not only in chat) so the list survives context windows. No credential
values ever appear in this file — item names and status only.

_Last corrected: 2026-07-30 (owner corrections relayed post-wave-1)._

## Open — owner's card

- **Demo password rotation** (X0 follow-up).
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
- **PDFShift account closure** (code removal shipped in PR #71; Render
  env vars `PDFSHIFT_API_KEY`/`PDF_ENGINE` deletion rides with it).
- **Second Render service `deedpro-external-api` — DELETE** (A1, Flag-1
  ruling; Tier 3, owner-executed). Its `render.yaml` block is gone as of
  A1, but Render does not remove an existing service when the blueprint
  drops it. The service ran a broken second API (every partner call
  401'd while `/healthz` stayed green); suspend or delete it in the
  Render dashboard. Its env vars go with it — `MAIN_API_INTERNAL_TOKEN`,
  `ADMIN_SETUP_SECRET`, and the frontend's
  `EXTERNAL_API_ADMIN_SETUP_SECRET`/`EXTERNAL_API_BASE_URL` in Vercel
  are now referenced by no code.
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

## Parked tickets (scoped, not scheduled)

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
