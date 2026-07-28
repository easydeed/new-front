# Doctrine Conformance Report

**Status: DRAFT — pending owner decisions on the three flagged items (§7).**

This document records DeedPro's standing product-safety invariants, the
habitats swept for each, what the sweep found, and the automated test that
now enforces each invariant globally. It is written to be read cold by a
diligence reviewer: every claim below is backed by a named test that runs
in blocking CI (`.github/workflows/ci.yml` — jobs `test` (backend pytest),
`build-and-test` / `tsc-report` (frontend)); a regression fails the build.

Sweep date: 2026-07-28. Method: deliberate habitat-by-habitat inspection of
every place each invariant could be violated — all PDF templates and every
PDF-rendering code path, every frontend API proxy, every backend endpoint,
and every UI gate — following a week in which four latent violations were
each discovered *incidentally* by unrelated work.

---

## 1. Legal choices are never auto-applied

**Statement.** A legal choice (documentary transfer tax declaration,
vesting) is never pre-decided by the system. The AI or a data source may
propose; the field stays unset until the escrow officer explicitly accepts;
the acceptance is recorded (`LegalChoiceRecord` — source, confirmedAt, code
section, basis) into `deeds.metadata.provenance`.

**Habitats checked.**
- Builder UI (transfer-tax and vesting flows — suggest → confirm → record,
  Tickets TT and vesting sibling)
- All five deed templates (a template default IS an auto-applied choice)
- Backend context mapping (`services/deed_pdf._map_dtt` — maps recorded
  decisions, invents none)
- Partner API (`POST /api/v1/deeds` — caller supplies the declaration
  explicitly in `transfer_tax`; nothing is defaulted)

**Findings.** The G3 rebuild (PR #51) found and fixed the last violation:
the quitclaim and warranty templates defaulted the DTT declaration to
$0.00 with "full value" and "unincorporated" pre-checked when no decision
existed. Now blank until declared.

**Enforced by.**
- `backend/tests/test_deed_pdf.py::test_dtt_blank_until_declared`
- `frontend/src/__tests__/dttSuggestions.test.ts`,
  `vestingDecision.test.ts` (suggest/confirm/record flow)
- `frontend/src/__tests__/provenance.test.ts` (generation-gate provenance)

---

## 2. Certificate contents are never pre-filled

**Statement.** We generate the notary form, never its contents (Ticket N).
The §1189 acknowledgment body — date, notary name, signer name — renders as
blank lines for the notary; only the venue county pre-fills. One
certificate per document.

**Habitats checked.** All five deed templates plus the shared partial
(`templates/_partials/notary_acknowledgment.jinja2`), which is the single
acknowledgment source since G3.

**Findings.** The G3 sweep found that three templates (quitclaim,
interspousal, warranty) carried an *inline duplicate* acknowledgment with
the signer's name pre-filled into "personally appeared" — the exact
violation Ticket N fixed in the shared partial, surviving in copies.
Removed; the shared partial is now the only certificate.

**Enforced by.**
- `backend/tests/test_deed_pdf.py::test_all_types_have_exactly_one_acknowledgment`
  (occurrence-counted across every deed type, signer line asserted blank)
- `backend/tests/test_deed_pdf.py::test_acknowledgment_body_is_blank_except_county`
- `backend/tests/test_deed_pdf.py::test_acknowledgment_page_on_all_five_deed_types`
  (§1189 disclaimer verbatim)

---

## 3. No chrome on recorded pages

**Statement.** Pages a county recorder touches carry no branding, no
color, no QR codes, no gray fills, no drawn recorder box (Gov. Code
§27361.7 reproducibility; §27361.6 recorder's space). Verification
survives as data (`deed_pdfs.sha256`, metadata, `/api/verify/{code}`).

**Habitats checked.** Every PDF-rendering code path in the backend:
- `services/deed_pdf.py` (stored-PDF pipeline) → five chassis templates ✔
- `routers/deeds.py`, `routers/deeds_extra.py` (generate endpoints) →
  same five templates ✔
- `routers/api_v1/router.py` (partner API) → **was a separate habitat**
- `api/generate_deed.py` → dead endpoint (flagged, §7)
- `phase23_billing/services/invoicing.py` → invoices, not recorded
  instruments; out of scope by definition

**Findings (fixed this sweep).** The partner API built its PDF from an
inline f-string HTML template: no recorder's space, no DTT declaration, no
acknowledgment page, and the Document ID + verify URL printed on the
instrument itself. It now maps its request onto the shared chassis
(`build_render_row` → `services/deed_pdf.render_deed_html`), so every
geometry and chrome invariant applies to partner deeds automatically.

**Enforced by.**
- `backend/tests/test_deed_pdf.py::test_all_types_carry_recorder_furniture_and_no_chrome`
- `backend/tests/test_deed_pdf.py::test_grant_deed_recorded_pages_carry_no_chrome`
- `backend/tests/test_api_v1_render.py` (partner API: chassis furniture
  present, no Document ID / verify URL / branding on the instrument)

---

## 4. Errors are never swallowed into empty-states or fake successes

**Statement.** A failed backend call surfaces as an error the UI can show —
never a `200 []`, never a fabricated success body. (Bug #12b's class: the
partners dropdown showed "No partners yet" over real errors.)

**Habitats checked.** All 21 frontend API proxy routes under
`frontend/src/app/api/**/route.ts`; the dashboard, past-deeds, partners,
and builder fetch paths.

**Findings (fixed this sweep).** `api/ai/chat` returned `success: true`
with canned assistant text from its catch block — outage copy rendered as
if the AI had said it — and resolved its backend origin via
`NEXT_PUBLIC_BACKEND_URL || localhost:8000`, a resolver drift of bug
#12a's species that pointed at localhost wherever that variable was unset,
with the fabricated success hiding the failure. Both fixed: standard
resolver chain; failures return 502 `success: false` (the caller already
handles thrown errors and degrades gracefully).

**Enforced by.**
- `frontend/src/__tests__/proxyErrorHonesty.test.ts` — source-scans every
  proxy route: no empty-array response bodies; no `success: true` in any
  catch block; every catch that returns JSON carries an explicit 4xx/5xx.
- `frontend/src/__tests__/integration/fault-injection.test.ts`

---

## 5. Server truth over localStorage

**Statement.** Access and progress gates rest on server-verified state.
localStorage may cache for fast paths and display, never decide alone.
(Bug #10's class: the onboarding gate lived only in localStorage and
trapped completed users on fresh devices.)

**Habitats checked.** Every page combining `localStorage.getItem` with a
redirect: dashboard, onboarding, admin layout, account-settings,
past/shared-deeds, builder success, preview.

**Findings.** None new. The dashboard/onboarding gate reads
`onboarding_completed` + `total_deeds` from `GET /users/profile` (server
truth, F3); the admin layout's client-side role check is display-only —
every `/admin/*` API endpoint independently enforces
`get_current_admin` server-side (see §6); remaining token-presence checks
are login-redirect UX backed by middleware plus per-endpoint auth.

**Enforced by.**
- Server-truth profile fields: `PATCH/GET /users/profile` round-trip
  (verified against live Postgres in F3; profile fields in the OpenAPI
  route contract snapshot)
- Admin server-side enforcement: see §6 — the client gate is redundant by
  construction.

---

## 6. Auth guards are real

**Statement.** Every `/admin/*` endpoint enforces admin auth server-side,
and the guard functions themselves are real implementations — not stubs.

**Habitats checked / enforced by.** Globally pinned since PR #40:
`backend/tests/test_admin_auth_coverage.py` walks every registered
`/admin` route and asserts an auth dependency, and **source-inspects the
guard functions** to reject trivial `return True` implementations (the
class-killer for stubbed guards). Six-flow baseline exercises real JWT
issuance and authenticated flows against live Postgres.

---

## 7. Flagged for owner decision (not changed by the sweep)

1. **`POST /api/generate-deed` is dead code with a live route.** Its
   template map references filenames that don't exist
   (`grant_deed_template.html` vs. the actual legacy `grant_deed.html`),
   so every call fails; no frontend caller exists. The legacy flat
   templates `templates/grant_deed.html` / `quitclaim_deed.html` (and
   `frontend/src/utils/deedDataMapper.ts` which documents them) are
   orphaned pre-chassis artifacts. Removing endpoint + files is a route
   surface change (OpenAPI snapshot re-record) — excision needs approval.
2. **`POST /api/ai/chat` (backend) requires no authentication.** Any
   unauthenticated caller can spend AI tokens. Adding an auth dependency
   is the obvious fix but changes behavior for any anonymous UI surface
   using the assistant — owner call on whether AI assist is
   logged-in-only.
3. **Categorical exemption recitals** in the interspousal (§11927) and tax
   deed (§11922) templates are baked into the forms rather than
   officer-declared. These are the defining recitals of those instrument
   types (an interspousal transfer deed *is* the §11927 form), so they are
   treated as form furniture, not auto-applied choices — recorded here so
   the distinction is a documented decision, not an oversight.

---

## Change log

| Date | Change |
|---|---|
| 2026-07-28 | Initial sweep: partner-API chassis fix, AI-chat proxy honesty fix, proxy source-scan test, partner-render tests. Draft pending owner decisions on §7. |
