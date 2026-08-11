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

## Change log

| Date | Change |
|---|---|
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
