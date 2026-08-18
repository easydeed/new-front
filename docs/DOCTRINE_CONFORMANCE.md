# Doctrine Conformance Report

**Status: FINAL — all flagged items ruled by the owner 2026-07-28 (§7).**

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

## §0 — Why this product keeps declining heuristics

**Owner-ruled 2026-08-12 (UX2 item 1). Read this before arguing for the
next one.** It is not a new rule; it is the argument underneath a dozen
existing ones, written down once so each of them stops having to make it
from scratch.

> **A tie-breaking rule invents an answer that will be right often enough
> that nobody checks it.**

That is the whole objection, and the crucial word is *often*. **A
heuristic that is wrong 5% of the time is more dangerous than one that is
wrong 50% of the time**, because the 5% version earns trust it cannot
sustain. The 50% version is discovered in an afternoon and removed. The
5% version becomes the thing everybody relies on, and its failures arrive
individually, months apart, on documents nobody is re-reading.

**The same reasoning kills a confidence score.** A number between 0 and 1
invites a threshold, and a threshold is where invented answers come from:
somebody picks 0.8, nothing visibly breaks, and the product now asserts
things it does not know at a rate nobody has measured. The answers this
product gives are a value or nothing.

Where this argument has already done the work:

| Declined | What the heuristic would have invented |
|---|---|
| §1 | A vesting or DTT choice inferred from the facts on the deed. |
| §11 | A field's kind guessed from its NAME rather than its content. |
| §11.1 | A person's pronouns or licensure guessed from their name or role. |
| §13.2 | An answer attributed to the signer that the officer gave. |
| §13.3 | A parcel picked out of two candidates on one address. |
| Doctrine A | A relationship read out of two owners sharing a surname. |

Every row is the same shape: a rule that would be right most of the time,
declined because *most* is not a standard a recorded legal document can
be held to, and because the failures would be invisible in exactly the
cases where they matter.

**What is permitted instead.** Normalising SPELLING is not a heuristic —
`5th Street` and `5TH ST` are one thing written twice, and no property
changes hands over the difference. Deciding IDENTITY is. When the two are
hard to tell apart, the test is: could this rule ever make two different
real things into one? If yes, it is identity, and it is declined.

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

**Findings (H1, the silent-PDF-store incident — 2026-07-28).** Production's
`deeds` table never received the `completed_at` column that the stored-PDF
pipeline stamps: the ALTER had been applied to the six-flow **test**
harness's own schema list instead of the production schema path, so the
baseline verified a schema production didn't have. Every production PDF
store failed; the failure was print-only and non-blocking (the bug #8
rollback made it resilient — and therefore silent), so the UI celebrated
every generation while storing nothing. Three fixes: (1) `create_tables`
is now the **single schema authority** — all columns/tables the code
needs converge there idempotently at startup, and the test harness derives
from that same function with no schema statements of its own (any
deliberate test-only divergence requires a cited comment); (2) stuck
deeds self-heal on next download; (3) a save whose PDF store fails now
carries `pdf_error` in the response, the builder warns instead of
celebrating, and the post-generation page shows an honest "PDF Not Ready"
state. **Lesson recorded:** resilience without surfacing is camouflage —
every non-blocking catch must emit a caller-visible signal.

**Findings (FLOW1 item 0 — the Shared Deeds contract, 2026-08-11).** An
external audit reported the Shared Deeds page as rendering **fabricated
rows**: Invalid Date, NaN days left, blank Deed Type, blank Shared With,
and a Status of "Viewed" beside a Response of "Not viewed", with a row
count equal to the number of completed deeds. **The verdict was: not
fabricated.** The page fetches `GET /shared-deeds` on mount and renders
the real rows — through eight wrong key names. `undefined` is not an
error in JavaScript; it is a blank cell, and `new Date(undefined)` is
Invalid Date. Every symptom was one of those eight.

That makes this a §4 finding rather than an invariant-#4 one, and the
distinction matters: **nothing was invented, and the screen still made
claims it could not support.** "Not viewed" beneath a badge reading
"Viewed" is a false statement about a real share. The failure mode of
this class is a page that *looks like it is lying* while behaving
exactly as written.

Three things it also found, each a fact the surface displayed and the
system never held: `recipient_name` was accepted by the create route,
used to greet the recipient, and then discarded — no column, so the
"Shared With" column had no source; there was no record of **when** a
recipient responded (`updated_at` is not that fact — a revoke bumps it
too); and the feedback modal fell back to a row field the list endpoint
has never sent, so a failed fetch opened a modal reading "(No comments
provided)" — a swallowed error presented as the reviewer's answer.

**Lesson recorded:** two declarations of one contract, in two languages,
with nothing comparing them, will drift — and TypeScript cannot check a
`fetch` it did not author, so the compiler is not the thing that
notices. The fix is a **shared corpus both suites read**
(`backend/services/shared_deed_row_keys.json`, the phone_cases.json
pattern), a single row builder asserting its key set by equality, and a
surface that renders "—" for a date it does not have rather than
whatever `Date` makes of nothing.

**Enforced by.**
- `frontend/src/__tests__/proxyErrorHonesty.test.ts` — source-scans every
  proxy route: no empty-array response bodies; no `success: true` in any
  catch block; every catch that returns JSON carries an explicit 4xx/5xx.
- `backend/tests/test_flow1_shared_deeds_contract.py` +
  `frontend/src/__tests__/sharedDeedsContract.test.ts` — the same corpus
  read from both sides; absence crosses the wire as `null` and never as
  `""`; a deed that was never shared produces no row.
- `frontend/src/__tests__/integration/fault-injection.test.ts`
- One schema authority: `scripts/six_flow_baseline.py::ensure_schema`
  contains no ALTER/CREATE statements — schema comes only from
  `database.create_tables`, the path production runs at startup.

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

**Findings (2026-08-12, NOTARY1 read-side retirement). A revoked share
link kept serving the deed.** `GET /approve/{token}` checked expiry and
never checked `status = 'revoked'`, so after an officer revoked a share
that URL went on returning the deed type, property address, APN, county
and both party names — indefinitely, to anybody holding the link. The
PDF route next door 403s a revoked share, and the retired
`_signing_share_by_token` did too.

**How it survived a suite that tests revocation:** every existing
revocation test went through one of those two paths. The gap was found
by RETARGETING a NOTARY1 test onto a review share — the live kind — when
its original subject was removed. A pin that only ever exercises the
strict door does not discover the unlocked one beside it.

The rule is the one the same handler already states about expiry, and
this is the half that was missing: **honouring a revocation on some URLs
and not others is not honouring it.** Revocation is a deliberate act by
the officer, not a timer.

Fixed and pinned in
`backend/tests/test_notary1_signing.py::test_a_revoked_link_stops_answering`.

---

## 7. Flagged items and owner rulings (2026-07-28)

1. **`POST /api/generate-deed` was dead code with a live route.** Its
   template map referenced filenames that never existed
   (`grant_deed_template.html` vs. the actual legacy `grant_deed.html`),
   so every call failed; no frontend caller existed.
   **Ruling: excised.** The endpoint, `backend/api/generate_deed.py`, the
   orphaned pre-chassis templates `templates/grant_deed.html` /
   `quitclaim_deed.html`, and the consumer-less
   `frontend/src/utils/deedDataMapper.ts` are removed; the OpenAPI route
   snapshot was re-recorded with exactly that one route removal, citing
   this ruling.
2. **`POST /api/ai/chat` (backend) required no authentication** — any
   caller could spend AI tokens.
   **Ruling: logged-in-only.** The endpoint now requires the standard
   user auth dependency; the proxy forwards the caller's bearer token and
   the UI service sends it (both consumers live inside the authenticated
   builder, so nothing anonymous was lost). The route joined the
   guard-inspection discipline:
   `backend/tests/test_ai.py::test_chat_requires_authentication` walks the
   dependency tree and fails if the guard is ever dropped. The endpoint's
   no-API-key path also fabricated success (`success: true` with canned
   text — the same disease as the proxy, §4); it now returns 503.
3. **Categorical exemption recitals** in the interspousal (§11927) and tax
   deed (§11922) templates are baked into the forms rather than
   officer-declared. These are the defining recitals of those instrument
   types (an interspousal transfer deed *is* the §11927 form), so they are
   treated as form furniture, not auto-applied choices — recorded here so
   the distinction is a documented decision, not an oversight.
   **Ruling: confirmed as documented.** The officer's choice of instrument
   is the decision; anything variable within an instrument gates.

---

## 8. The API's doctrine boundary: deed family only (2026-08-03, owner-ruled)

The partner API (`/api/v1`) hands instrument generation to a caller's
software. The wizard, by contrast, puts every legal choice in front of a
human officer with the amber/violet honesty machinery around it. That
difference is the whole question, and the ruling draws the line by
instrument family:

**Deeds — exposed.** The API caller is the officer's system. Escrow and
title platforms have licensed humans behind them, and W0's Model 2 ruling
(confirmation happens in our UI) already establishes where human
decisions live when they must be ours. A deed's variable choices —
consideration, vesting, DTT basis and exemption — arrive as typed facts
from a system whose operator is accountable for them, the same way the
wizard receives them from an officer.

**Affidavits and declarations — held.** These instruments carry
execution-act machinery: sworn statements under jurat, initial lines,
checkbox elections, blank-contents doctrine. Their entire premise is a
human hand at the moment of execution — the cert-of-trust ruling
(blank initial lines and unmarked checkboxes, always) exists precisely
because a pre-marked election is a fabricated assertion. Piping those
through machine-to-machine calls without a per-family doctrine pass
would be shipping the auto-applied-exemption bug (§1) at the API layer.

**Corollary (A2) — accepting and discarding a legal input is silently
deciding.** Two exposed instruments fix their own vesting: their titles
*are* the vesting decision, and their templates deliberately never read a
supplied vesting value. A caller who sends one and receives a 200 would
reasonably believe their input shaped the instrument. It did not. That is
invariant #4's API-shaped cousin — a fabricated *influence* rather than a
fabricated success — and it is worse than a plain error, because nothing
in the response reveals it. The API therefore **refuses** the input and
names the instrument that decided, rather than swallowing it. Same
reasoning covers the entity deeds' required recitals: rendering a blank
line inside a granting clause where a fact belongs produces a defective
instrument while reporting success. Pinned in
`backend/tests/test_api_catalog_and_rates.py`.

**Consequence.** v1's exposed type set is deed-family only, pinned in
`backend/tests/test_api_v1_structure.py::test_api_exposes_deed_family_only`.
Each additional family requires its own doctrine pass before exposure —
and the boundary is stated plainly in the partner documentation, not
hidden as a gap: *the API will not decide legal choices for you, and
some instruments require a human flow by design.* That sentence is a
disclosure to a title company's counsel, not an apology.

---

## 9. A stored instrument is never overwritten (2026-08-03, owner-ruled)

**Statement.** Once a deed's PDF is stored, those bytes and their sha256
are the artifact. A regeneration may not silently replace them.

**Finding (ADMIN0).** `services/deed_pdf.py:166-173` stores via
`INSERT ... ON CONFLICT (deed_id) DO UPDATE SET pdf_data = EXCLUDED.pdf_data`.
`deed_pdfs` is keyed by `deed_id`, one row per deed, so a re-store
overwrites the prior bytes **and the prior hash** in place. Nothing
records that a previous artifact existed. The draft path is properly
guarded — a resume against a completed deed returns 409
(`routers/deeds_crud.py:184-193`) — so this is not reachable through
the ordinary builder today. It is a *latent* violation: the guard lives
one layer above the destructive statement, and any future path that
reaches the store directly inherits the overwrite.

This matters more than an ordinary data bug because the hash is the
verification substrate. Doctrine §3 removed QR codes from recorded pages
on the reasoning that "verification survives as data" — that data is
`deed_pdfs.sha256`. A silent overwrite invalidates every prior
verification of that document without leaving a trace that anything
changed.

**Ruling.** Two parts, deliberately separated by size:

1. **Insert-or-refuse (minimal, ADMIN1).** A store against an existing
   row whose hash differs is a **loud refusal**, surfaced to the
   operator — never an overwrite. Re-storing identical bytes is a
   no-op. This closes the destructive path without designing anything.
2. **Supersession (its own designed ticket).** A corrected deed is a
   NEW record that supersedes the old one, with both retained and the
   relationship recorded — the pattern `document_authenticity` already
   models with `status='superseded'` + `superseded_by`
   (`database.py:296-298`) and which `deeds` has no equivalent of.
   Designing that is not cleanup, and it is ledgered as such.

**Consequence for the admin console.** No admin deed-edit capability
ships until the supersession model exists. An "edit" affordance over a
last-write-wins store is how an operator destroys an instrument while
believing they corrected one.

**UPDATE — T-5, 2026-08-04: the parked model is built.** `deeds` now
carries `superseded_by` (self-FK) and `superseded_at`, mirroring
`document_authenticity`'s proven shape.

Supersession is **a new row and a pointer**. The superseded deed is not
edited, not deleted and not hidden: its PDF, hash, status and content are
untouched, and the single write is `superseded_by` going from NULL to the
correcting document's id — guarded `WHERE superseded_by IS NULL` so the
pointer is written once even under concurrency. A pin asserts the
supersede path writes those two columns and nothing else, because
supersession that learns to edit content is editing *with a lineage row
for cover*, which is worse than editing openly.

**One deliberate divergence from `document_authenticity`'s shape.** That
table folds lineage into `status` (`active|revoked|superseded`). `deeds`
derives it from the pointer instead, because `deeds.status` already
carries a lifecycle vocabulary in active use (`draft|completed|deleted`).
Overloading it would make "superseded" exclusive with "completed", and
those are orthogonal: **a superseded deed is still a completed deed.** It
was generated, it exists in the world, and saying otherwise is the
un-recording this model refuses.

**The history is visible by design.** A superseded deed stays fully
readable with its state shown, and the lineage view returns both
directions. Hiding it would recreate in the UI exactly the un-recording
the data model refuses.

**And the officer is told the truth about what a correction is:** a new
instrument, requiring its own signing and notarisation. We record the
relationship; we do not un-record documents. That sentence returned to
the generation gate in this same change — T-0 had removed it precisely
because the record could not keep it.

---

## §10 — Facts carry between documents; legal choices do not

**Ruled T-4, 2026-08-04.**

An officer working one escrow file produces several instruments about
the same property. Re-asking her for the APN she confirmed an hour ago
is busywork, so **facts carry forward** when she starts a related
document.

They carry with their **original provenance** — the original source and
the original `confirmedAt`, never a fresh stamp. A confirmation records
a moment a human looked at a value and said yes; re-stamping it on copy
would forge a second look that never happened, and the record would
claim two confirmations where there was one. Every carried field is
additionally marked `carriedFrom`, because inherited data must never
present itself on screen as freshly entered.

**Legal choices never carry**, and this is the sharper half. The
documentary-transfer-tax treatment, an exemption claim, the
characterisation of how title passed — each is a decision *about an
instrument*, not a fact about a property. R&T 11927 accepted on Monday's
interspousal transfer is not thereby correct on Tuesday's quitclaim.

Carrying one would auto-apply a legal choice to a document nobody has
read yet — §1's exact prohibition — and it would do so **wearing the
officer's own recorded acceptance**, which makes it worse than a plain
auto-apply rather than better: the record would show a human decision
where none occurred.

The keys are enumerated in `services/matters.LEGAL_CHOICE_KEYS` and
pinned one test per key by name.

**Corollary — derivability is a reason for restraint, not licence.**
The affidavit variant tells us how title passed. The temptation is to
pre-check the succession box on the BOE-502-D because we are so
obviously right. But being *derivably* right is what makes it a legal
conclusion rather than an observation — so it arrives as a violet
proposal and the officer's acceptance is what writes it. (T-3/T-3b:
`check_fields` empty and pinned empty on both county forms.)

---

## §11 — A field's kind is decided by its content, not its name

**Ruled Doctrine A, 2026-08-05.** The internal statement of
`docs/integrations/H1_CONTRACT.md` §2.2.

**Statement.** §1 says a legal choice is never auto-applied. §11 is what
§1 needs in order to mean anything: the system must be able to *tell*
which values are legal choices. It had been telling by **field name** —
`vesting` is a legal choice, `owner` is a fact — and that works right up
until a single field carries both.

One does. A preliminary report says

> Title to said estate or interest at the date hereof is vested in:
> **JOHN A. DOE AND JANE B. DOE, HUSBAND AND WIFE AS JOINT TENANTS**

and a county record returns the same composite as `OwnerName`. The left
half is a transcription. The right half is a legal characterization with
consequences for survivorship, severability, who must sign, and the form
of the next instrument. Both arrived in `property.owner` — a fact
position — as one amber candidate.

**Why that is worse than a plain auto-apply.** The officer was asked to
confirm a legal conclusion using the affordance built for confirming an
APN, and her confirmation was then recorded as if she had checked a
transcription. §1 was not bypassed; it was satisfied on paper by a record
that described the wrong act. RED0 found it from the inside (R3-2); H1
§2.2 legislates it on the wire. Same defect, two vantage points.

**The rule.** Mixed content is emitted **split, never whole**.

| half | position | arrives as |
|---|---|---|
| the parties | fact | amber candidate — confirmable, unchanged |
| the characterization | interpretation | **violet proposal** — `status: 'proposed'`, never `'candidate'`, carrying a basis that names its claimant |
| the composite | neither | `verbatim`, audit only, `mixed_content: true` — a bare string, so nothing that walks the candidate list can offer it |

`'proposed'` is deliberately not a member of `FieldStatus`. That is the
enforcement, not the labelling: the generation gate
(`collectCandidateFields`, `propertyCandidatesRemaining`) is
type-incapable of picking a proposal up and offering it beside an APN.

**And when we cannot tell, we say so.** A composite with a name on both
sides of a characterization —
`JOHN DOE, AN UNMARRIED MAN AND MARY ROE, A SINGLE WOMAN, AS TENANTS IN
COMMON` — is not split at all. Cutting at the first marker files MARY ROE
inside the characterization and drops a real owner out of the fact
position; a missing grantor is worse than an unsplit string. Both halves
are withheld, the original is shown as printed, and the officer types
them. Same posture as T-6's refusal on a scanned prelim.

**Corollary — the characterization we read is the OLD one.** It says how
the *current* owner holds title, not how the grantees will hold it. The
two questions are answered in the same words, which is exactly why the
proposal is labelled "How title is held TODAY", why its basis says so in
a sentence, and why nothing is pre-selected from it. Related to §10's
corollary: being derivably right is what makes something a conclusion.

**Corollary — a dormant code path is still a code path.** Doctrine A
deleted `suggestVesting`/`detectMarriedCouple` from
`services/propertyPrefill.ts`, which inferred *community property with
right of survivorship* from two owners sharing a last word, and wrote it
into `state.vesting` with no acceptance record. Nothing imported it —
which is the only reason no deed carries a vesting DeedPro invented from
a surname match. It was deleted rather than deprecated because "no code
path may write a characterization into a confirmed field without an
acceptance record" includes the paths not currently called.

### §11.1 — The same rule applied to people (FLOW1, 2026-08-11, owner-ruled)

**Statement.** The product never infers a fact about a *person* from
their name or their role. Not their pronouns, not their licensure, not
what they are permitted to do.

**Why it belongs here.** §11 says a field's kind is decided by its
content, not by what it is called. §11.1 is the same argument one level
up: a human being's attributes are decided by what they told us, not by
what their name or their job suggests. Both failures look like helpful
inference and both put a claim in the record that nobody made.

**Findings.** `share_signing_request` told a notary, in a live email,
*"Picking a time tells {owner_name} you are available then; **she**
confirms the appointment with the signers **herself**."* `owner_name` is
a real escrow officer whose pronouns this product has never been told
and has no way to learn, and the message goes to her own professional
contact — so the product was making a claim about its customer, to her
colleague, on nothing. The same sentence existed twice, HTML and plain
text. `RequestSigningModal` had it on screen too, about a notary the
officer had picked out of her rolodex moments earlier.

Ruled the same family as FLOW1's **"filed as"** constraint, which came
from the other direction: a partner's category records how the officer
*files* them and may never be read as a statement about their authority
or licensure (`partnerRegistry.ts`). "Nora is filed as a Notary" is true
about a rolodex. "Marcus is not a notary" would be a claim about Marcus.

**Two habitats keep gendered wording, and must.** The California
all-purpose acknowledgement (Civil Code §1189) — *"acknowledged to me
that he/she/they executed the same in his/her/their authorized
capacity"* — is prescribed wording on a certificate a notary signs under
penalty of perjury, and it names nobody: it says "person(s)". Rewriting
it would be a legal choice auto-applied (§1) to the one kind of text §2
says we never pre-fill. Vesting terms of art ("a married man as his sole
and separate property") are a legal characterization the officer selects
and the recorder expects. The rule is *pronouns referring to a **named
party***; neither of these names one.

**Enforced by.** `backend/tests/test_flow1_copy_and_agenda.py` — a
fail-closed sweep of every email template (docstrings excluded: prose
about a role is not a claim made to anybody) and every Jinja template,
with an allowlist of one file, a cited statutory reason, and a test that
the exemption still exists and still contains the statutory text.
Frontend half in `frontend/src/__tests__/officerTrackers.test.ts`.

---

**Habitats checked.**
- T-6 prelim import (`services/prelim_import.import_prelim`)
- County-record prefill (`lib/sitexProperty.mapSiteXResponse`)
- The dormant enrichment prefill (`services/propertyPrefill.ts`)
- The generation gate (`lib/provenance.collectCandidateFields`)

**Enforced by.** One rule in two languages —
`backend/services/vesting_split.py` and
`frontend/src/lib/vestingSplit.ts` — held together by a shared corpus,
`backend/services/vesting_cases.json`, that **both** test suites read. A
change made in one language and not the other fails in the language that
did not change, which is the only failure mode that catches a one-sided
edit.

- `backend/tests/test_vesting_split.py` (corpus; position; marker mirror)
- `frontend/src/__tests__/vestingSplit.test.ts` (same corpus; position
  asked of the real county-record mapping; gate cannot offer a proposal)
- `backend/tests/test_prelim_import.py` (no marker in any candidate;
  proposal is `'proposed'`; unsplittable offers neither half)
- `backend/tests/test_prelim_field_map.py` (the map describes the split
  the code performs)

**A note on the pin that would have caught it earlier.** The test that
shipped with T-6 asserted `"MARIA L. TORRES" in by_key["vested_owner"]`.
That passes just as happily on the composite. The assertion is now
equality, and the property pin does not ask about the splitter at all —
it asks whether anything in a fact position matches a characterization
marker, of every corpus case, on both import paths.

---

## §12 — The AI boundary: explain yes, select no (closes R3-5)

**Ruled Doctrine B, 2026-08-06.** The third citizen.

**Why there is a third citizen.** Every earlier section governs DATA —
which values may be prefilled (§1), what a confirmation stamps (§10),
whether a field's content matches its name (§11). Two kinds of thing were
legislated: facts and legal choices. RED0's R3-5 named the third, and it
had no law at all.

The assistant emits **prose** to an escrow officer inside a deed builder.
That is the largest legal-influence surface in the product, and it had no
suggestion marker, no confirmation, and — until RED-H1.3 — no record. The
confirmation trail could prove exactly which data the officer accepted
and nothing whatsoever about what the machine told her first. In a
dispute that asymmetry points one way: the record incriminates the human
and exonerates the software.

**Statement.** The assistant may **explain** what an instrument does. It
may not tell the officer which instrument to **use**.

| | |
|---|---|
| allowed | "A quitclaim conveys whatever interest the grantor has, with no warranties. A grant deed carries the two implied warranties of Civil Code §1113." |
| allowed | "Interspousal transfers are commonly exempt under R&T §11927." |
| **forbidden** | "You should use a quitclaim deed for this." |
| **forbidden** | "An interspousal transfer deed is the right choice here." |
| **forbidden** | "I'd go with a grant deed." |

The line is not about tone, hedging or confidence. It is about **who
decides**. Every allowed sentence leaves the officer holding the
decision; every forbidden one takes it. A *correct* recommendation is
still a recommendation — correctness is not the test.

**Why the line is drawn at selection and not at silence.** An officer who
understands the difference between a grant deed and a quitclaim decides
better. Deleting the explanation would make the product worse and the
officer no safer. Selecting the instrument, by contrast, is the largest
legal choice in the workflow — it determines warranties, transfer-tax
treatment, reassessment exposure, and what her carrier says afterwards.
That is the thing a non-attorney provider is most exposed on, and it was
being done by a prompt that read, verbatim, *"help users select the
appropriate deed type for their transaction."*

**Three layers, and what each one actually does.**

1. **The prompt states the boundary** (`services/ai_prompts.py`,
   `_STANDING`). This is the layer that **prevents**. RED-H1.3 shipped
   "do not provide legal advice"; that is a disclaimer, and a model can
   satisfy it while telling an officer which deed to draw. The standing
   instruction now names the act it forbids and the sentence it expects
   instead — *the choice is theirs*.
2. **The server scans every response** (`services/ai_boundary.scan`) for
   recommendation language **pointed at an instrument**, and records what
   it finds in `ai_exchange_log.boundary_flags`, NULL when clean. This
   layer **detects**.
3. **The tests ask the forbidden questions**
   (`tests/test_doctrine_b_ai_boundary.py`) against a corpus of the
   answers a model actually gives, asserting explanation-present /
   selection-absent / deferral-present on the compliant ones and a catch
   on the violating ones.

**The scanner flags; it does not block.** Stated plainly because a reader
who assumes otherwise trusts something that does not exist: **a flagged
response is still returned to the officer.** Blocking on a pattern match
would let a false positive swallow a correct answer mid-file with nothing
on screen to say so. The prompt is the prevention; this is the instrument
panel, and what it buys is that "is the assistant staying inside the
line?" becomes a query rather than an assurance. If flags accumulate, the
escalation is a prompt change or a hard refusal — ruled on the flag data,
which is the mistake RED-H1.3 declined to repeat by ruling before
evidence existed.

**`deed_type_advisor` was rewritten, not deleted.** The key name is
unchanged (the client sends it; renaming would be a breaking change
wearing a doctrine fix's clothes) and its instruction is now the
permitted half. That call was made on the boundary alone: the usage
evidence RED-H1.3 built the log to collect did not exist — two days of an
empty table — and the boundary decides the prompt regardless, because a
"help users select" prompt cannot survive select-no. What the evidence
would have shaped is *how much* explanation officers want. Deferred with
a trigger, in OWNER_LEDGER; not a pending gate.

**MATCH STATEMENTS, NOT STRINGS.** The word "recommend" is not a
violation — "recommend consulting an attorney" is the *opposite* of
selecting, and it appears in our own shipped prompts. What makes a
sentence a selection is a recommendation cue aimed at an instrument
name, which is why the scanner pairs cue with instrument inside a
proximity window and allowlists professional referral.

**And the instrument list is built from the deed-type registry**
(`form_families.FAMILY_BY_DEED_TYPE`), so a new form cannot enter the
product and stay invisible to the scanner. Same failure mode as A2's
third city list: a hand-kept copy nobody compares.

**The suite passed on its first run, which is why it was not trusted.**
A corpus and a matcher written in the same sitting agree with each other
by construction. Probing with phrasings the corpus did not contain found
three defects immediately — two false positives ("the parties *may use* a
grant deed", "officers commonly *use* a grant deed": describing practice
is not directing this officer) and one false negative ("a quitclaim deed
*is what you want*", the same statement the cue list already caught, in
the other word order). All three are pinned in the corpus's `probes`
section, with the fixes, so they cannot regress.

**Enforced by.**
- `backend/tests/test_doctrine_b_ai_boundary.py` — transcript cases,
  phrasing probes, prompt content, scanner properties, response-path wiring
- `backend/tests/test_red_h1_ai_containment.py` — the containment
  guarantees, with H1.3's flag-and-pin **retired in this diff**: it
  demanded a warning label for a defect that no longer exists, and a
  placeholder outlives its purpose the moment the ruling lands.

---

## §13 — An arrangement is not an act; the system never asserts a signing occurred

**Ruled NOTARY1, 2026-08-10.**

**Why this needed a section at all.** A scheduled time looks like the
least legally freighted thing in the product. Nobody's rights change
because a calendar says Tuesday, so this needs none of the violet
machinery a vesting choice needs (§1) and none of the immutability a
stored instrument needs (§9).

The risk is the opposite one. It is that a *low-stakes* fact acquires
authority nobody granted it, quietly, because the words drifted. "Nora
said she is free at 10" becomes "the signing is scheduled for 10" becomes
"the signing happened at 10" — and the last of those is a claim about a
**notarial act**, which is a legal event with a legal record kept by
somebody who is not us.

**Statement.** The product records that an arrangement was **made**. It
knows nothing about whether the arrangement was **kept**, and says
nothing about it.

| | |
|---|---|
| allowed | "Notary confirmed availability for September 1, 2026 at 10:00 AM" |
| allowed | "You recorded a signing time of September 1, 2026 at 10:00 AM" |
| allowed | "Signing request sent — 2 times proposed, none chosen yet" |
| forbidden | "The signing is confirmed for September 1" |
| forbidden | "This deed was signed and notarized on September 1" |
| forbidden | anything derived from the clock passing a scheduled time |

**Three rules follow, and each has a pin.**

1. **No auto-completion, no timer, no inference from a passed window.** A
   time that has come and gone is not evidence that anybody met. There is
   no scheduler, no background job, and `scheduling_state()` is
   type-incapable of returning a state meaning "happened" — pinned by
   walking its AST rather than by reading its source, so the vocabulary
   is checked and not the spelling.
2. **`completed` is officer-only.** The notary is not our user, has no
   account, and a tap on a public token is not an attestation that a
   notarial act was performed. The tap records availability.
3. **The words are written once.** `services/signing.scheduling_label()`
   is the only function in the product that turns a scheduling state into
   a sentence. Both frontends render its output verbatim and both suites
   pin that they do not compose their own — because "scheduled" drifting
   into a promise is a *wording* failure, and a wording failure spreads
   one screen at a time.

**The assertion shape mirrors RED-S4 exactly.** `scheduled_at` beside
`scheduled_by` beside `scheduled_asserted_at`, the same trio as
`recorded_at` / `recording_asserted_by` / `recording_asserted_at`. The
system's knowledge of a signing time is always somebody's statement, and
the record keeps the two possible somebodies apart: a notary who tapped a
window, and an officer recording something agreed on the phone (owner
ruling 3). Both are humans; they are different humans, and a record that
blurred them would let a phone call become the notary's own assertion.

**The state is DERIVED, not a status value (T-5, transferred verbatim).**
T-5 refused to add `superseded` to `deeds.status` because a superseded
deed is still a completed deed — two orthogonal facts cannot share one
column without one of them becoming unsayable. A signing request that has
been VIEWED and SCHEDULED is the normal case, so `scheduled` never enters
`deed_shares.status`; `scheduled_at` is its own column and the state is
computed from it.

**AMENDED 2026-08-11 (NOTARY2) — see the reversal below.** The paragraph
that follows was the rule as NOTARY1 shipped it. It has been reversed by
the owner and is kept verbatim, because a doctrine section that quietly
rewrites its own history is worth less than one that shows its work.

**No signer contact, anywhere (owner ruling 1, SUPERSEDED).** Signers — grantors and
grantees — are consumers. They have no account, never agreed to our
terms, cannot see what we hold and cannot ask us to delete it. Storing a
grantor's email would change what a database dump IS, and it would do so
to automate a message the officer is better placed to send herself. So
the product coordinates officer↔notary and stops: it captures no signer
contact information, stores none, and messages no signer. `deeds` carries
party NAMES because names print on the instrument; that is the whole of
it.

This is pinned **fail-closed**, the way the row-contract sweep is: the
pins sweep the entire backend and the entire frontend for a field shaped
like a way to reach a grantor or grantee, so the field cannot arrive in
some unrelated ticket six months from now and be noticed by a customer
first.

**One expiry semantic per link (owner ruling 2).** An expired or revoked
token is expired or revoked for everything it reaches — the deed, the
PDF, and the PCOR answer identically. "Which URL did you ask" is not a
property a permission may have. Applied as a class rather than to the
PCOR it was asked about, which is how the second defect below surfaced.

**Enforced by.**
- `backend/tests/test_notary1_signing.py` — the fail-closed signer sweep,
  the derived-state pins, the vocabulary pin, the assertion shape, one
  expiry semantic across four routes, and the whole handoff end to end
- `frontend/src/__tests__/signingHandoff.test.ts` — the same signer sweep
  over the TypeScript tree, and that no screen writes its own sentence

**Two defects found on the way past, both pre-existing, both fixed here.**
`POST /shared-deeds` never checked whose deed it was sharing — any
authenticated user could mint a share link for anyone's deed and read the
address, APN, county, party names and stored PDF through it. And
`GET /approve/{token}` returned 410 only while the status was still
`sent`, so a link that had been opened once kept serving the deed
forever after expiry, while the PDF route next door refused it. Both are
recorded in full in the PR and pinned as classes, not sites.

### §13.1 — The signer-contact reversal (2026-08-11, owner-ruled)

**The ruling above is reversed.** Signers now participate directly: the
notary posts availability, the signers pick or propose, and when they
converge it is booked. The officer initiates and is notified; she does
not gate the final time.

**The owner's reasoning, recorded because a reversal without its argument
is just churn:**

> The signers are the scheduling constraint, so routing around them
> recreated the phone tag the feature exists to kill.

That is right, and it is worth being exact about how Option A came to
look correct. Option A optimised for the cost it could SEE — data held
about a non-user — and treated the officer's relaying as free. It is not
free; it is the entire cost of the problem. A notary offers three
windows, the officer phones two signers, one can do Tuesday and the other
cannot, and she is back on the phone to the notary. The product had
removed one leg of a three-leg negotiation and called it coordination.

**What did NOT change.** Everything else in §13 stands. An arrangement is
still not an act; booked is still not happened; there is still no
auto-completion and no timer and no inference from a passed window;
`completed` is still officer-asserted; no surface may render a booking as
a claim that the signing will occur. The reversal is about *who may be
contacted*, and nothing else.

**What the pins become.** NOTARY1 pinned "no signer contact anywhere,"
fail-closed across both trees, precisely so that adding it would be a
deliberate act that trips a test rather than a diff nobody read. That pin
did its job and is being ANSWERED, not deleted. It is retargeted to the
narrower promise we can actually keep:

| | |
|---|---|
| was | no signer contact exists anywhere in the product |
| is | signer contact exists on ONE purgeable row, reaches no other table, and is deleted on a schedule by a mechanism with a test |

Specifically, and pinned: no signer contact column on `deeds`, no
contact-shaped key written into the `parties` JSONB, none on `users`,
`partners`, or any other profile table, and exactly one table in the
schema that holds it.

**The obligation the reversal creates rather than removes.** NOTARY0b's
argument against involving signers was that they "cannot see what we hold
and cannot ask us to delete it." Reversing the ruling does not answer
that objection — it converts it into a requirement. A retention rule
(proposed: 90 days past completion or expiry) and a way for a non-user to
ask for removal are now part of the feature, not adjacent to it, and the
purge must be a MECHANISM rather than a discipline. Recorded in
`OWNER_LEDGER.md` as an owner item, because what we tell a consumer about
their data is not a machine decision.


---

### §13.2 — Who asserted the answer (FLOW1 item 7, 2026-08-11, owner-ruled)

**Statement.** A recorded answer carries who gave it. When the escrow
officer records her signers' agreement to a time she arranged with them
by phone, the record says **she** asserted it — never that the signers
answered.

**Why this needed a column.** Owner research into escrow practice: the
officer knows when the documents are ready, schedules with the signers
directly, and dispatches a notary for that time, who accepts or declines.
NOTARY2's loop inverts that — the notary posts availability, the signers
converge — which is right for *finding* a time among people with no prior
contact and wrong for the ordinary case.

`converged_window_id` required the notary **and every live signer** to
have answered `available`. Under dispatch the signers never answer this
product, so convergence could never fire and a request would sit in
`partially_agreed` forever while everyone involved believed it was
booked.

Two ways to close that, and they are not equivalent. The officer's
existing override works today with no code at all — she creates the
request, the notary accepts, she presses override, and `booked_by =
'officer'` is *true*. It is clunky and nothing about it is dishonest.
The alternative is to let convergence count a signer row the officer
wrote — and **without a column saying so, that row would claim a signer
answered when the officer did.** That is precisely the distinction
`booked_by` and RED-S4's `recording_asserted_by` exist to preserve, one
level down: the same argument applied to the answers a booking is built
from rather than to the booking itself.

So `asserted_by` is **one additive column whose justification is
doctrinal, not technical**. `answer` / `asserted_by` / `asserted_at` is
RED-S4's trio, complete.

**§13.1 IS UNTOUCHED, and the precision matters.** Its argument was that
routing *around* the signers recreated the phone tag the feature exists
to kill. Dispatch does not route around them — the officer talks to them
*first*, which is the leg she was always going to do herself. What
changes is who proposes the time, not who is included. Signer contact
still lives on one purgeable row and nowhere else.

**§13 IS UNTOUCHED TOO.** Nothing is booked until the notary accepts;
`state_label` refuses to call an officer-vouched booking "everyone
agreed" and says what actually happened instead; the signers are not
emailed a time nobody has accepted, because telling a consumer their
signing is at 10am on Tuesday before the person who has to show up has
answered is booked-is-not-happened committed to somebody's inbox.

**The consumer surface carries it.** A signer opening their link sees
"{officer} told us this time works for you — tap to change it" rather
than a silent tick. The one audience with no account, no history and no
way to check is the one that most needs to be told who spoke for them,
and the control stays live so they can say otherwise.

**The fallback is nearly free, which is not a coincidence.** A declined
assignment leaves a request with no live window — exactly the state a
fresh request is in — so the availability loop resumes with no new code.

**Enforced by.** `backend/tests/test_flow1_dispatch.py` — an
officer-asserted answer counts toward convergence; the notary's
acceptance is still required; the booking sentence refuses "everyone
agreed"; a dispatch awaiting acceptance says so; an assertion with no
time is refused; a naive time is refused before anything is written; a
declined dispatch returns to `requested` and the loop resumes; no signer
is emailed before acceptance; an officer window is not attributed to the
notary.

### §13.3 — Who chose the record the facts came from (UX2 item 1, 2026-08-12)

**Statement.** Every county-record field on a deed — APN, legal
description, vested owner — descends from ONE row of a candidate list.
The record says whether the officer picked that row or the system matched
it, because **confirming a value proves the officer read it; it does not
prove the value belongs to the property she meant.**

**Why this is §13.2 and not a new idea.** §13.2 kept an officer-asserted
answer from being recorded as the signer's. This is the same rule one
level further out: the parcel is the source every other assertion is
drawn from, and a parcel chosen by the system must not be indistinguishable
from a parcel chosen by a human. `ParcelSelection.basis` is
`exact_address_match` (the server matched it), `officer_choice` (she
clicked it), or `only_county_match` (nobody chose — there was one).

**The failure it exists to prevent.** An exact autocomplete selection
returned 76 candidates with the chosen address not first and neighbouring
parcels above it. A wrong click does not error. It produces a complete,
plausible, confidently wrong deed out of a real county record with the
officer's confirmation on every field — the one failure the confirmation
model structurally cannot catch, because the confirmation is genuine and
the source is genuine and only the correspondence between them is wrong.

**Why the automatic selection is narrow to the point of stubbornness.**
`services/address_match.py` selects only when EXACTLY ONE candidate is
unambiguously the address chosen. Zero or several and it declines, every
candidate goes to the officer, and nothing is chosen on her behalf. Two
candidates on one address is not a tie to be broken — it is usually a
multi-unit building where the unit is the deciding fact, and any rule
that breaks such a tie invents an answer it will be right about often
enough that nobody checks it. There is deliberately **no confidence
score**: a number between 0 and 1 invites a threshold, and a threshold is
where invented answers come from.

Normalisation is about SPELLING (`5th Street` / `5TH ST`), never about
identity. `1358` and `1356` are different properties and a pin holds them
apart.

**And it is visible.** When the server matched the parcel, the screen
says so in the same place the officer is about to start confirming
fields, with "not this one?" next to it and every alternative behind it.
A selection recorded but not shown would satisfy the letter of §13.2 and
miss the point of it.

**Enforced by.** `backend/tests/test_ux2_property_exact_match.py` and
`frontend/src/__tests__/propertyExactMatch.test.ts`.

---

## §14 — A record of what we can do states what was EXECUTED, not what exists (2026-08-13)

**Statement.** When the ledger, a doc, or a comment claims the product
*can* do something, the claim names what was run and what it produced.
"The plumbing exists" is not a capability claim; it is a description of
files.

**The three sightings.** All the same shape, all found by executing
rather than reading:

1. **`EMAIL_VERIFICATION_REQUIRED`** — the ledger cited it as evidence
   that required verification was ready to switch on. It was defined in
   `auth_extra.py` and **read nowhere**. An operator could have set it on
   Render before a launch, believed verification was required, and
   nothing whatsoever would have changed. The same entry said
   verification "stays resend-only", describing a resend endpoint with no
   caller and no button — a resend nobody could reach.
2. **The tsc baseline** read 114 in the ledger while CI enforced 94.
3. **`scripts/role_census.py` and `company_name_consolidation.py`** were
   both recorded as the "count first" mechanism and **neither had ever
   run successfully** — two import-order defects and a miscalled
   `assert_tables`. A green sweep asserted the call existed; nothing
   asserted the call worked.

**Why the direction matters.** Every one of these erred PERMISSIVELY:
the record claimed more capability than existed. A record that
understates is discovered the moment somebody needs the thing. A record
that overstates is discovered at the worst moment — before a launch, in
an incident, or during the run that was supposed to inform a decision.

**The rule, operationally.**

- A capability claim in the ledger cites the command that was run and
  what it printed, or it says "not executed".
- A flag, env var or switch is not evidence of a capability unless
  something **reads** it — and "reads it" means a test drives the
  behaviour, not that the name appears twice.
- An enforcement sweep that checks a mechanism is *called* is not a check
  that the mechanism *works*. Presence of a call is not correctness of a
  call.

**Why this is §0 applied to our own records.** §0 is about the product
declining to state more than it knows. This is the same refusal pointed
at the documents we use to decide with — and the reason it needed
writing down is that all three sightings were in records written
carefully, by people who believed them.

**Enforced by.** Nothing automatic, and that is stated rather than
glossed: this is a rule about prose. What is mechanical is narrower and
real — `backend/tests/test_db_identity.py` pins the call SHAPE of every
`assert_tables` caller and the exact set of unparseable files;
`backend/tests/test_verify_check.py` pins that the verification chain is
connected at both ends and gated at neither.

---

### §14.3 — One DECLARATION, not one screen: a mirror is re-scoped when its subject gains a second surface (2026-08-14)

**Statement.** A control that compares two sides of a boundary is only as
good as its reading of each side. When a value gains a second home on one
side, a mirror that still reads the first home **stays green through the
exact divergence it exists to catch.**

**How it was found — by nearly violating it.** TRIAL1 built a mirror: the
advertised trial length and the length Checkout charges on must be one
number, because *"a trial whose advertised length and actual length
differ is discovered by the customer, on the day it ends — by being
charged."* The frontend side was a const in `app/page.tsx` carrying the
comment:

> `// TRIAL1's mirror reads this number off the page and compares it with`
> `// the server's TRIAL_PERIOD_DAYS. One number, stated once per side.`

That was **true when it was written and false the moment a second surface
mentioned a trial.** The day-one rail is that second surface. Typing `14`
into it would have created two claims on the frontend side while the
mirror read one, and the mirror would have reported agreement while a
customer was shown a number nobody had checked.

**The correction, and its durable form.** *One number per side* means
**one DECLARATION per side, not one per screen.** The constant moved to
`lib/trial.ts`; both surfaces import it; the mirror follows the
declaration rather than the file it happened to start in.

And the closing half matters more than the move: the gate now also
**refuses the length written as prose anywhere** — a screen that retypes
the digits instead of importing them is a second claim, and a mirror that
only counts declarations would not see it. Narrowing a control to what it
can currently read is how it becomes decorative.

**Same shape, three times now.** `code_only()` — one opinion about what a
comment is, not one per suite. The DTT rate mirror — one rate table, not
one per surface. This — one declaration, not one screen. The recurring
error is not the duplication; it is a **rule whose scope was stated in
terms of the world at the time it was written**, and which nobody
re-reads when the world grows.

**The self-check this earns.** When adding a second surface for any value
a mirror or sweep protects, ask what that instrument READS — not what it
asserts. An instrument's scope is a fact about its implementation, and
the comment describing it is the least reliable place to learn it.

---

### §14.4 — A monotonic invariant is satisfied by breaking the thing it measures (2026-08-18)

**Statement.** Any gate of the form *"this number may only go down"*
has a failure mode its author did not intend: **destroy the measurement
and the number improves.** Such a gate needs a floor as well as a
ceiling — or, better, an assertion that the measurement was possible at
all.

**The instance.** A stray `{/* comment */}` in a ternary branch made
`app/dashboard/page.tsx` unparseable. TypeScript stops type-checking
what it cannot parse, so every error inside that file and everything
depending on it left the total.

**The count fell from 88 to 6.**

The tsc gate compares the count against a baseline and fails when it
RISES. It was delighted. Read as a number, 88 → 6 is the best result the
project has ever posted, and the notice it prints in that case invites
you to lock the improvement in.

**And the other suite could not help.** Jest stayed green at 1084 the
entire time, because **no test imports the dashboard page.** The
frontend suite is fully compatible with the dashboard being
unparseable — a fact worth knowing on its own, separately from this
gate.

So the two instruments that could see it were `tsc` and `next build`,
which are precisely the two a shape-based gate-selection rule would have
let a frontend-only change skip. **This is the third argument in one day
for running everything, and the strongest**, because the other two were
about coverage and this one is about a gate actively reporting success.

**The fix, and its shape.** The floor is not a smaller number — a
number cannot express "the measurement happened". It is a separate
assertion that nothing failed to PARSE: `tsc`'s TS1xxx family is
syntactic (`TS1005 ')' expected`, `TS1128 declaration or statement
expected`, `TS1382 unexpected token`), and a parse error means a file is
not code rather than that a file has debt.

**The general test, usable on any threshold gate:** *what would happen
to this number if the thing it measures stopped existing?* If the answer
is "it improves", the gate is measuring the wrong thing in one
direction, and no amount of tuning the threshold fixes it.

---

### §14.5 — Checking that a change is right is not checking what it exposes (2026-08-18)

**Statement.** A review that establishes a change is CORRECT has not yet
established that it is SAFE. Those are different questions, and the
second one is about the paths the change newly makes reachable.

**The instance, and it shipped.** DASH-FIX #1 pointed the day-one
checklist's "Set county" button at `/account-settings`, because the
county field belongs on the settings form and the endpoint had accepted
`default_county` since SETTINGS1. That reasoning was checked carefully
and is still right.

What was not checked: `/onboarding` wrapped its save in a two-attempt
retry, added because this API sleeps and the first request after a quiet
period can fail to arrive. `/account-settings` had a bare `fetch`. The
routing decision moved a **first-run action onto a page without
first-run tolerance** — and a brand-new account is precisely the one
nobody has warmed up.

The owner hit it on their first new user: *"I tried to set county and it
said failed to fetch."*

**Why this is its own shape rather than "the change was wrong".** The
change was not wrong. Every premise in it held. The defect is entirely
in the difference between the OLD population of that page (a returning
officer, editing her profile, on a warm server) and the NEW one the
routing created. Nothing in the diff shows that difference; it is
visible only by asking who arrives now who did not before.

**The question this earns, for any change that adds a route, a link, a
redirect or a CTA:** *who reaches this page now who did not before, and
what does that page assume about them?* Tolerance, guards, empty states
and error copy are all written against an assumed visitor, and a new
entry point is a new visitor.

---

### §15.1 — A rule about how a surface must be ENTERED is invisible where it is written on the surface (2026-08-18)

**Statement.** §15 says a rule enforced only by a screen is a rule the
next screen does not have. This is its documentation twin: **a rule
written at a destination is invisible to the code that constructs
entries to it.** Nobody adding a link reads the docstring of the page
they are linking to.

**The instance.** `app/past-deeds/page.tsx` opens with, in its own words:

> *Stat tiles are drill-downs now ("4 Drafts" → those drafts)… A link
> that arrives and shows an unfiltered list is the dead-button defect
> wearing a URL: the affordance promises a filtered view and the outcome
> is not one.*

The dashboard's "Last 30 days" tile linked to `/past-deeds` with no
filter. The tile counting ten recent deeds and the tile counting all ten
deeds were one click with one outcome — **the exact defect, named
precisely, on the page being linked to.** The rule was written in the one
place its violators would never look.

**Where such a rule belongs.** One of two places, and preferably both:

1. **Where entries are constructed** — beside the links, in the
   component that builds them.
2. **In a pin that sees BOTH sides** — one that reads the link and the
   destination's filter vocabulary together, and fails when a link
   carries no filter the destination understands. That is the only form
   that survives somebody adding a fifth tile.

**The general shape.** Any invariant of the form "callers must X" is
mis-filed if it lives only with the callee. The callee is where the rule
is UNDERSTOOD; the callers are where it is BROKEN. Documentation follows
understanding and defects follow construction, and those are different
files.

---

## §16 — When a ruling's literal reading would remove something previously ruled, build the unambiguous half and flag the rest (2026-08-14, owner-ruled)

**Statement.** Rulings are executed by their intent where letter and
intent agree, and **split** where they do not. If a ruling's literal
reading would delete behaviour an earlier ruling deliberately put there,
the executor builds the half that is unambiguous, holds the half that
collides, and says which is which. Neither half is decided silently.

**This is the deviation doctrine applied to half a ruling rather than a
whole one**, and it exists because the collision is usually invisible to
the person ruling — they are answering the question in front of them, not
re-reading a decision they made weeks earlier about a different screen.

**It fired twice on its first day, both times against the same owner.**

1. **The empty queue card.** Ruled: the "Nothing is waiting on anyone"
   module *goes*. The stated intent was the day-one officer being told
   three times that nothing needed her before she had done anything. Read
   literally it also deletes the card for a returning officer whose queue
   is genuinely clear — and for her, DASH1 ruled that sentence in on
   purpose: *the empty state is a RESULT, not an absence*, the screen
   saying so rather than rendering nothing and leaving her to wonder
   whether it loaded. Built for the deedless officer, held for the
   returning one. **Owner confirmed the split and kept both.**
2. **The greeting.** Ruled: keep *the one-line greeting* as drawn. The
   mockup's complaint is that the greeting was a HERO — weight and
   position — and both were fixed. Read literally, "one line" also
   deletes *"Here's where your deeds stand"*, which is U3's ruling, added
   so the greeting states what the page IS rather than making a
   chat-style promise with no chat behind it. Weight and position built;
   the sentence held. **Owner confirmed and kept the sentence.**

**Why to expect more of these, not fewer.** Both collisions were a new
ruling brushing an earlier ruling by the same person. That is the
predictable consequence of accumulated doctrine: the denser the body of
decisions, the more often a new one lands on top of an old one without
anybody noticing. **Frequency is evidence the split is load-bearing, not
evidence that the executor is being difficult.**

**How to tell a split from an ordinary ambiguity.** A split is warranted
only when the literal reading would remove something **previously
ruled** — recorded in this document, in a ticket, or in a comment citing
one. An ambiguity with no prior ruling on either side is an ordinary
judgement call: make it, state it, move on. The test is not "could this
be read two ways" — it is "does one reading overturn a decision already
made?"

---

## §15 — The enforcement point is the endpoint that PRINTS, not the builder (2026-08-13, owner-ruled)

**Statement.** Every rule this document states about what may reach a
recorded instrument is enforced at the endpoint that renders and stores
the PDF. **A rule enforced only by a screen is a rule the next screen
does not have.**

**How it was found, and why it is the most consequential instance.**
REQUIRED1 set out to unify "required" and found the loosest definition
was the front door:

| where | required |
|---|---|
| `POST /deeds` — the endpoint that prints | grantor, grantee, legal description |
| the partner API | + `transfer_tax` (required model field), vesting per type, entity recitals |
| the browser gate | + vesting AND a transfer-tax decision, family-aware |

So the wizard's protection was **a property of the client, not of the
product**. Anything reaching that endpoint another way — a script, a
retry, a replayed request, a future integration — created a deed and
stored its PDF having skipped both legal decisions, holding nothing but
an ordinary user token.

Every finding in the sections above is a smaller version of this shape.
This one landed on the legal decisions the whole document exists to
protect: §1 says a vesting or transfer-tax choice is never auto-applied,
and the endpoint that prints the instrument never asked whether one had
been made.

**The corrected premise, recorded because the ruling was made on the
inverted one.** The partner API is the STRICTEST surface, not the
loosest — `CreateDeedRequest.transfer_tax` has no default, and
`api_catalog.TYPE_REQUIREMENTS` enforces vesting per instrument. There
was no versioning question and no integration to break; the tightening
was entirely internal.

**And the line the proof harness drew.** Tightening the print path broke
the Thursday walkthrough, correctly: its step 2 posted an officer's
PARTIAL work to `POST /deeds`, and a partial save is a different act.

> A legal decision is required before the product PRINTS. Requiring one
> before it SAVES would be the product hurrying a choice §1 forbids it to
> make.

`POST /deeds/draft` therefore stays permissive, deliberately, and its own
model says why: *a draft may be arbitrarily incomplete.* The walkthrough
now posts to the endpoint the product actually uses for a partial save —
which made it more faithful rather than more permissive, since its
comment had claimed to exercise "the REAL save contract" while using the
finalize path. **That distinction is what separates a legitimate harness
change from making the instrument agree with the result.**

**Enforced by.** `backend/tests/test_required1.py`, in particular
`test_the_endpoint_that_enforces_is_the_one_that_PRINTS` — it fails if
`generate_and_store` leaves that handler, because a refactor moving the
render elsewhere would silently relocate this section's enforcement
point — and its sibling asserting the autosave path never acquires the
check.

---

### §14.1 — A sweep matches the PROPERTY, not the spelling (2026-08-13)

**Statement.** An enforcement sweep that enumerates syntax patterns is
only as wide as the imagination of whoever wrote the list, **and it fails
silently**: the forbidden thing gets added, the suite stays green, and
the pin reads as proof.

**Three sightings, in three languages.**

1. The `job_title` sweep listed six literal patterns and walked past
   `user.get('job_title') == 'Administrator'` — a closing quote sat where
   the list expected a paren.
2. The `assert_tables` sweep checked that a call *existed*. Three callers
   had never worked.
3. The first `verified` sweep matched lines rather than expressions, and
   flagged an error message about transfer-tax rates and a sentence about
   signing keys — the English word inside a string.

**The rule.** Ask what CHARACTERISES the thing being forbidden, then
match that:

- a gate is a value that **steers** — so parse, and look inside `If`,
  `IfExp`, `While`, `Assert` tests and comprehension conditions;
- a miscall is an **argument shape** — so parse, and inspect the arg
  nodes;
- "one definition" is a **second occurrence** — so count occurrences of
  the definition, not spellings of the use.

When the property is structural, use `ast`. A regex over source is the
right tool for prose and the wrong tool for grammar.

**And know what the stripper does.** `code_only()` removes comments and
docstrings. It does **not** remove string contents, because they are
code. A sweep for a word that also occurs in English must therefore go
through the AST, not through `code_only` plus a better regex — no amount
of refining a pattern teaches a matcher that a string is not a gate.

**The related habit.** Sweeps have four times caught their own
explanation — the comment describing the forbidden thing IS the
forbidden thing, textually. Reading through `code_only()` is the fix
where the property is textual; where it is structural, the AST never had
the problem.

---

### §14.1.1 — A pin asserts the PROPERTY it guards, never the line that currently expresses it (2026-08-18)

**Statement.** A pin that quotes an implementation verbatim breaks on
every correct change to that implementation, and breaks **without saying
whether the rule it was protecting still holds.** A pin that cannot
distinguish "the rule is broken" from "the code was rewritten" is a pin
that gets edited to match whatever the code now says — at which point it
has become a TRANSCRIPT of the code rather than a CONSTRAINT on it.

**The instance.** UX2 item 4 ruled that two numbers on the dashboard are
deliberately different: the sidebar badge counts PRESENCE ("there are
things here") and the attention number counts SILENCE ("these have gone
quiet"). Collapsing them would make the badge alarming and the attention
number decorative.

A jest test guarded that ruling by reading `officer_queue.py` and
asserting the literal:

    "needs_attention": len([r for r in awaiting if r["stale"]])

When a later ruling made the attention number count lapsed requests as
well as stale ones, the pin went red — correctly reporting that the line
had changed, and saying nothing whatever about whether the badge and the
attention number were still two numbers. The ruling was intact; the
transcript was stale.

**The corrected form** asserts what UX2 item 4 actually decided: that the
two counts are computed from DIFFERENT predicates. It is probed by
collapsing them into `len(awaiting)` — the single thing the ruling
forbids — which is a probe the literal version could not express, because
"the line is different" was already its only failure.

**Where this sits.** It is §14.1 (match the property, not the spelling)
arriving in a pin that was ALREADY guarding a ruling — which is why it
deserves its own entry rather than a footnote. §14.1's instances were
sweeps whose authors reached for syntax when they meant semantics. This
one is subtler and more likely to recur: the author knew exactly which
ruling they were protecting, wrote it down in the docstring, and then
asserted the current code instead of the rule. **Knowing the property is
not the same as asserting it.**

**═══ AND THE OTHER SYMPTOM, WHICH IS THE DANGEROUS ONE ═══**

The instance above is the loud half: the pin breaks on a correct change,
somebody notices, somebody updates it. Annoying, self-announcing,
survivable.

The same root produces a silent half. `StartSomethingNew`'s own test
asserted `screen.getByText('grant-deed')` — so **the test for a component
rendering raw storage slugs was checking that it rendered raw storage
slugs.** UX2 item 3 had already replaced that vocabulary on three
surfaces with `deedTypeLabel`, because a slug is our storage key and the
officer never chose it. This was the fourth surface, and it stayed the
fourth for months.

**The mechanism is worth naming, because it explains the survival.** A
sweep looking for the defect had no reason to open this file: its test
was green, and its test was green *because it asserted the defect*. A
pin written against the storage key rather than against the product's
language does not merely fail to catch the bug — it **certifies** it, and
tells every later audit that this file is done.

So the two symptoms of one root:

| the pin quotes | what happens on a change | what you get |
|---|---|---|
| an implementation, and the code is later fixed correctly | goes red while the rule is intact | noise, and a transcript that gets "updated" |
| an implementation, and the implementation is the defect | stays green forever | a defect with a certificate |

The second cannot be found by watching CI, which is why the tell below
is a REVIEW question rather than a build one.

**The tell, usable during review:** ask what a correct, unrelated rewrite
of the code under the pin would do to it. If the answer is "the pin goes
red and somebody updates it to match", the pin is a transcript. A real
constraint survives refactors of the thing it constrains, and dies only
when the rule dies.

---

### §14.2 — A control is checked before its result is believed (2026-08-13)

**Statement.** Verification instruments fail in ways that look exactly
like success. Before acting on what a check reports, establish that the
check ran and measured what you think it measured.

**Four in one week, and none of them looked wrong at the time.**

1. **A probe that broke the fixture.** Removing an entry from
   `required_fields.json` left a trailing comma; the suite ERRORED on
   malformed JSON while `grep -c FAILED` counted zero. The probe was
   read as "the pin holds". A probe that breaks the fixture proves
   nothing about the pin, and "0 failures" reads identically either way.
2. **A comparison against the wrong baseline.** Checking whether a change
   broke a harness, `git stash` was a no-op because everything was
   already committed — so the "does main break too?" run tested the very
   branch under suspicion, and would have exonerated it.
3. **A measurement counting the wrong things.** A regex over
   `deedPayload.ts` matched every four-space-indented key and so counted
   nested object contents as top-level, reporting 36 silently dropped
   fields. Two were real. **The 33-name exemption list it produced looked
   exactly like a considered decision.**
4. **A sweep that could not see its subject.** `test_every_write_side_script_says_which_database`
   asserted that each script CALLS `assert_tables`. Three callers had
   never worked; presence of a call is not correctness of a call.

**The rule.** A check gets a validity question of its own, separate from
its result: *did it run, against the thing I meant, and would it have
failed if the property were false?* The last clause is what a mutation
probe answers, which is why probes are run — and why a probe needs the
same question asked of it.

**Why it belongs beside §14.** §14 is about records overstating what
exists. This is the same failure in the instruments: a green tick and an
unexecuted check are indistinguishable from the outside, and both are
believed by default.

**And the fifth, which is the same family from the other end: an
instrument that ALTERS what it measures.** `git stash` was used twice in
one day as though it were a query — "does this break on main too?" is a
read-shaped question, and the command answers it by pocketing the entire
working tree. The first time it made an empty stash and the comparison
silently tested the branch under suspicion; the second it removed a
narrowed `ADMIN_ROLES` and an edited model, so three passing tests looked
broken and two phantom failures were chased before the cause was found.

The generalisable form: **a command that changes state is not a query,
however read-shaped the question was.** For "does main break too", copy
the file or use a second checkout; never move the tree you are standing
on.

---

## Change log

| Date | Change |
|---|---|
| 2026-08-18 | §14.4 and §14.5 added, from one bug report. §14.4: a monotonic invariant is satisfied by breaking the thing it measures. A stray `{/* comment */}` in a ternary branch made `dashboard/page.tsx` unparseable, tsc stopped type-checking it and everything depending on it, and the error count fell from 88 to SIX — a gate that fails when the number RISES was delighted, and prints a notice inviting you to lock the improvement in. Jest stayed green at 1084 throughout because no test imports that page, so the frontend suite is fully compatible with the dashboard being unparseable; the only two instruments that could see it were tsc and next build, which is exactly what a shape-based gate rule would have permitted skipping. The fix is a FLOOR that is not a number — an assertion that nothing failed to parse (tsc's TS1xxx family is syntactic) — because no count can express "the measurement happened". General test for any threshold gate: what would happen to this number if the thing it measures stopped existing? §14.5: checking that a change is right is not checking what it exposes. DASH-FIX #1's routing of "Set county" to account-settings was correct on every premise and moved a first-run action onto a page whose save had no retry, while the page it came from had one for exactly this sleeping API — the owner hit it on their first new user. The defect lives entirely in the difference between the page's old population and the one the routing created, which no diff displays. The question it earns for any new route, link, redirect or CTA: who reaches this page now who did not before, and what does that page assume about them? |
| 2026-08-18 | §14.1.1 gains its second and more dangerous symptom, and §15.1 added. THE SILENT HALF: `StartSomethingNew`'s own test asserted `getByText('grant-deed')`, so the test for a component rendering raw storage slugs was checking that it rendered raw storage slugs — which is why it survived UX2 item 3's sweep across three other surfaces. A pin written against the storage key rather than the product's language does not merely fail to catch the defect, it CERTIFIES it: the sweep had no reason to open a file whose test was green, and the test was green because it asserted the defect. One root, two symptoms — quote an implementation that is later fixed and the pin goes red while the rule is intact (noise); quote an implementation that IS the defect and it stays green forever (a defect with a certificate). The second cannot be found by watching CI, which is why the tell is a review question. §15.1: a rule about how a surface must be ENTERED is invisible where it is written on the surface. Past Deeds' own docstring names the dead-button-defect-wearing-a-URL and the dashboard's "Last 30 days" tile committed it, linking to that page unfiltered — the rule was written in the one place its violators never look. Any invariant of the form "callers must X" is mis-filed if it lives only with the callee: the callee is where the rule is understood, the callers are where it is broken, and documentation follows understanding while defects follow construction. |
| 2026-08-18 | §14.1.1 added — a pin asserts the PROPERTY it guards, never the line that currently expresses it. A jest test held UX2 item 4 (the badge counts presence, the attention number counts silence, and they must not become one number) by quoting `officer_queue.py`'s literal `"needs_attention": len([r for r in awaiting if r["stale"]])`. When a later ruling made that number count lapsed requests too, the pin went red while the ruling it guarded was intact — reporting that a line had changed and saying nothing about whether the two counts were still two. A pin that cannot tell "the rule is broken" from "the code was rewritten" gets edited to match whatever the code now says, which makes it a transcript of the code rather than a constraint on it. This is §14.1 arriving in a pin that already knew which ruling it protected and named it in the docstring — knowing the property is not the same as asserting it. The tell, usable in review: ask what a correct unrelated rewrite would do to the pin; if the answer is "it goes red and somebody updates it", it is a transcript. Also: EXECUTION_POLICY's gate-selection table REPLACED rather than amended. Its premise — that a change's shape bounds which gates can fail — is false in this repo by design, because suites read the other language's source so that one decision is not made twice; a backend-only change is policed by the frontend suite on purpose. The rule is now to run both suites and the harnesses, four minutes together, which is cheaper than the reasoning required to skip one correctly — and that reasoning is not available anyway, since what bounds the blast radius is which files the suites READ, which the diff cannot tell you. Recorded with the meta-lesson: the first gate-selection error produced the table, the second happened with the table available and consulted, and the response to a judgement failure was a finer judgement aid when the correct response was removing the judgement. |
| 2026-08-14 | §16 added — when a ruling's literal reading would remove something previously ruled, build the unambiguous half and flag the rest. Fired twice on its first day, both times where a new owner ruling brushed an earlier owner ruling: the empty-queue card (ruled "goes"; DASH1 had ruled it in for the returning officer as a RESULT rather than an absence) and the greeting (ruled "one line"; U3 had ruled the sentence under it in so the greeting states what the page IS). Both splits confirmed by the owner, both prior rulings kept. Recorded with the owner's reading of the frequency: accumulated doctrine gets dense enough that new rulings collide with old ones, so expect more of these rather than fewer. §14.3 added — one DECLARATION, not one screen. `TRIAL_DAYS` was a const in `app/page.tsx` commented "one number, stated once per side", true while the landing page was the only surface mentioning a trial and false the moment the day-one rail became a second; retyping 14 there would have made two claims on the frontend side while TRIAL1's mirror read one, and the mirror would have stayed green through exactly the divergence it exists to catch. Moved to `lib/trial.ts`, both surfaces import it, the mirror follows the declaration, and the gate now also refuses the length written as prose anywhere — narrowing a control to what it can currently read is how it becomes decorative. Same shape as `code_only()` and the DTT rate mirror: the error is not the duplication but a rule whose scope was stated in terms of the world at the time it was written. |
| 2026-08-13 | §15 added (REQUIRED1) — the enforcement point is the endpoint that PRINTS, not the builder. Three definitions of "required" were live and the loosest was `POST /deeds`, which renders and stores the PDF: grantor, grantee and legal description, with no vesting statement and no transfer-tax declaration, while the browser gate demanded both and the partner API demanded both. The wizard's protection was a property of the CLIENT, not of the product — anything reaching that endpoint another way stored an instrument having skipped both legal decisions on an ordinary user token. Recorded with the corrected premise, since the ruling was made on the inverted one: the partner API is the strictest surface, not the loosest, so there was no versioning question and no integration to break. Also records the line the Thursday walkthrough drew: a legal decision is required before the product PRINTS, and requiring one before it SAVES would hurry a choice §1 forbids it to make — so `POST /deeds/draft` stays permissive and the walkthrough moved to it, which made the harness more faithful rather than more permissive. §14.2 added — a control is checked before its result is believed, from four instruments in one week that failed in ways indistinguishable from success: a probe that broke its fixture (the suite errored on malformed JSON while `grep -c FAILED` counted zero), a `git stash` no-op that made the "does main break too?" run test the branch under suspicion, a regex that counted nested keys as top-level and produced a 33-name exemption list that looked exactly like a considered decision, and a sweep asserting a mechanism is CALLED while three of its callers had never worked. |
| 2026-08-13 | §14 and §14.1 added (VERIFY-CHECK, ROLE1 step 3). §14: a record of what we can do states what was EXECUTED, not what exists. Three sightings, all erring in the PERMISSIVE direction — `EMAIL_VERIFICATION_REQUIRED` was cited in the ledger as evidence that required verification was ready to switch on, and was defined in one file and read nowhere, so an operator could have set it on Render before a launch and had nothing change; the same entry described verification as "resend-only" when the resend endpoint had no caller and no button. The tsc baseline read 114 in the ledger while CI enforced 94. `role_census.py` and `company_name_consolidation.py` were both recorded as the count-first mechanism and neither had ever run successfully. A record that understates is found when somebody needs the thing; a record that overstates is found before a launch or during an incident. §14.1: an enforcement sweep matches the PROPERTY, not the spelling, because a list of syntax patterns is as wide as its author's imagination and fails SILENTLY — three sightings in three languages, most sharply a `job_title` gate sweep that walked past `user.get('job_title') == 'Administrator'` because a quote sat where the list expected a paren. Also recorded: `code_only()` strips comments and docstrings but NOT string contents, so a sweep for a word that also occurs in English belongs in the AST rather than in a better regex. |
| 2026-08-12 | §13.3 added (UX2 item 1) — who chose the record the facts came from. An exact autocomplete pick returned 76 county candidates with the chosen address not ranked first; APN, legal description and vested owner all descend from whichever row is clicked, so a wrong row produces a confidently wrong deed out of a real source with a genuine confirmation on every field. `services/address_match.py` selects a parcel only when EXACTLY ONE candidate is unambiguously the chosen address, declines otherwise, and exposes no confidence score. Also recorded: the audit's proposed root cause — "we re-search by address string instead of passing the autocomplete's identifier" — was checked and is not fixable as framed. Google's `place_id` is not a SiteX key; SiteX takes an address or a FIPS+APN, and the FIPS+APN only exists once SiteX has answered. The defect was real and the diagnosis was not, which is a distinct outcome from DASH1's route rename, where neither was. |
| 2026-08-11 | §13.2 added (FLOW1 item 7, DISPATCH) — `signing_responses.asserted_by`. See the section for the full reasoning; the short version is that convergence had to be able to count an officer-asserted signer answer without any surface being able to call it the signer's. Also: the §11.1 sweep was WIDENED after it missed two live habitats it should have caught — `services/signing_loop.state_label()` (the one function that turns a scheduling state into a sentence for every surface) and the `.ics` description that lands in the officer's own diary. Both said "she" about a notary. `services/vesting_split.py` exempted with a cited reason: it MATCHES recorded vesting language rather than writing prose about anybody. |
| 2026-08-11 | §11.1 added (FLOW1 items 3–4) — the product never infers a fact about a PERSON from their name or role. A live email told a notary that the officer "confirms the appointment with the signers herself", asserting an escrow officer's pronouns to her own professional contact on no information; the screen did the same about the notary. Ruled the same family as the "filed as" constraint, which forbids reading a partner's category as a statement about their authority — one direction infers what someone IS, the other what they MAY DO, and both put a claim in the record nobody made. Swept fail-closed across every template. Two habitats exempted with cited reasons and their own liveness test: the Civil Code §1189 all-purpose acknowledgement (prescribed certificate wording, names no party) and vesting terms of art. Also item 4: the Signings agenda's stuck age was reconstructed as `expires_at − 21 days`, duplicating `default_expiry()`'s constant into TypeScript as a bare number — the server sends `created_at` now. And its "soonest first" claim covered rows sorted by `COALESCE(booked_at, expires_at)`, two orthogonal facts under one sort key (T-5 one layer up); booked and being-arranged are now separated and each sorted by the fact it has. |
| 2026-08-11 | §4 — FLOW1 item 0. Shared Deeds reported as showing fabricated rows; verdict recorded as NOT fabricated — a real fetch read through eight wrong key names, so `undefined` rendered as blank cells and Invalid Date. Recorded under §4 rather than invariant #4 because nothing was invented and the screen still asserted what it could not support ("Not viewed" under a badge reading "Viewed"). Three absent facts given columns: `recipient_name` (accepted, greeted with, never stored), `responded_at` (`updated_at` was not that fact — a revoke bumps it too), and a real `expires_at` (previously spent on a display string nothing rendered). Contract now pinned from both sides against one corpus; absence crosses the wire as `null`, never `""`. The feedback modal's fallback to a field the list endpoint never sent — a failed fetch reading as "the reviewer left no comments" — removed. |
| 2026-08-11 | §13.1 — the signer-contact ruling REVERSED (NOTARY2). Signers now participate directly; the notary posts availability, signers pick or propose, convergence books it, and the officer is notified rather than gating. Owner's reasoning recorded: the signers are the scheduling constraint, so routing around them recreated the phone tag the feature exists to kill — Option A had priced the officer's relaying at zero when it is the entire problem. The superseded paragraph is kept verbatim rather than rewritten. §13 otherwise stands unchanged: booked is still not happened. NOTARY1's fail-closed sweep is ANSWERED rather than deleted — retargeted from "no signer contact anywhere" to "one purgeable row, no other table, deleted by a mechanism with a test." The retention rule and a non-user's route to removal become part of the feature, ledgered as owner items. |
| 2026-08-10 | §13 added (NOTARY1) — an arrangement is not an act. A scheduled signing time is the least legally freighted fact in the product, which is exactly the risk: authority acquired by wording drift rather than by decision. Three pinned rules: nothing infers a signing from a passed window (`scheduling_state()` is AST-pinned type-incapable of a "happened" state), `completed` stays officer-only, and `scheduling_label()` is the single place a scheduling state becomes a sentence. Assertion shape mirrors RED-S4 (`scheduled_at` / `scheduled_by` / `scheduled_asserted_at`), keeping the notary's tap and the officer's phone call apart. State DERIVED, never folded into `deed_shares.status` — T-5's ruling transferred verbatim. No signer contact anywhere, pinned fail-closed across both trees. One expiry semantic per link, applied as a class. Two pre-existing defects fixed in passing: share creation never checked deed ownership (cross-user deed disclosure), and an opened link kept serving the deed after expiry. |
| 2026-08-06 | §12 added (Doctrine B) — the AI boundary, explain-yes/select-no; closes RED0 R3-5. The third citizen: earlier sections legislate facts and legal choices, and the assistant emits PROSE, which had neither a suggestion marker nor a confirmation nor (until H1.3) a record. Three layers: the system prompt STATES the boundary (prevents), a server-side scanner pairs recommendation cues with instrument names and records findings in `ai_exchange_log.boundary_flags` (detects, does not block — a flagged response still reaches the officer, and blocking on a pattern would let a false positive swallow a correct answer), transcript-style tests ask the forbidden questions. `deed_type_advisor` REWRITTEN to explain-only, not deleted: the boundary decides the prompt regardless of usage evidence, and deleting would remove the permitted half. H1.3's flag-and-pin retired in the same diff that cured its condition. Usage-evidence tuning deferred with a trigger (OWNER_LEDGER) — the log was two days old and empty. |
| 2026-08-05 | §11 added (Doctrine A) — a field's kind is decided by its content, not its name. `vested_owner` carried a name PLUS a legal characterization into a fact position on both import paths, so the officer confirmed a legal conclusion with the affordance built for an APN and the record described the wrong act. Split into fact / violet proposal / audit `verbatim`; `'proposed'` deliberately outside `FieldStatus` so the generation gate is type-incapable of offering it. Unsplittable composites offer NEITHER half. `suggestVesting` (community property inferred from a shared surname) deleted from the dormant prefill — a dormant code path is still a code path. One rule in two languages, pinned by a corpus both suites read. |
| 2026-08-04 | §9's parked supersession model BUILT (T-5). `deeds.superseded_by` + `superseded_at` mirror `document_authenticity`'s shape; lineage state is derived rather than folded into `deeds.status`, because a superseded deed is still a completed deed. Supersession is a pointer written once (SQL-guarded), never a mutation — pinned. The T-0 copy removal reversed in the same diff that made the promise true. |
| 2026-08-04 | §10 added — facts carry between documents with their ORIGINAL provenance (never re-stamped, always marked `carriedFrom`); legal choices never carry. T-4's matter grouping made the question live: an accepted DTT exemption travelling to the next instrument would be an auto-applied legal choice wearing the officer's own signature. Corollary recorded from T-3b: derivability is a reason for restraint, not licence — being derivably right is what makes something a legal conclusion. |
| 2026-08-03 | §9 added — stored instruments are never overwritten. ADMIN0 found `deed_pdfs` stored via `ON CONFLICT DO UPDATE SET pdf_data`, replacing prior bytes AND their sha256 in place; the draft-resume 409 guard sits a layer above it, making this latent rather than live. Ruled in two parts: insert-or-refuse in ADMIN1 (differing hash = loud refusal, identical = no-op), full supersession as its own designed ticket. No admin deed-edit until supersession exists. |
| 2026-08-03 | §8 added — API doctrine boundary ruled: v1 = deed family only; affidavit/declaration families held pending per-family passes (execution-act instruments require human flows by design). A1 also recorded three never-run defects in the mounted `/api/v1` (tuple-read auth, unassigned `full_address`, metering aborting the deed transaction) — all three survived because the only tests bypassed the HTTP and database layers, the test-vs-production asymmetry lesson under invariant #4. |
| 2026-07-28 | Initial sweep: partner-API chassis fix, AI-chat proxy honesty fix, proxy source-scan test, partner-render tests. Draft pending owner decisions on §7. |
| 2026-07-28 | Owner rulings executed: /api/generate-deed excised (snapshot re-recorded), /api/ai/chat logged-in-only + guard test + no-key 503, recitals ruling recorded. Report finalized. |
| 2026-07-28 | H1 silent-PDF-store incident recorded under invariant #4: one-schema-authority rule (create_tables converges production + tests), store-failure surfaced in response/UI, resilience-without-surfacing lesson. Feature candidate ledgered: true builder resume (persist/restore keyed to deed id), pending usage evidence. |
