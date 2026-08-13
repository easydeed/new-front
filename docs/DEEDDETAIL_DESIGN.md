# DEEDDETAIL — the design conversation, before any build

The owner's framing, brought to this document as the proposal rather
than a blank page:

> **A deed's page is its WORKFLOW, anchored by the instrument.** The
> instrument alone is a PDF viewer she already has; history matters
> intensely but rarely and would leave the page empty for most deeds;
> people is a slice of workflow rather than a peer. What she opens the
> page to answer is "where is this and what's next". So: the instrument
> at the top as the thing being worked on; current state and next action
> prominent; participants shown as parties to whatever is pending;
> history present only when it exists.
>
> Structural argument: an officer's model of one deed is currently
> scattered across Past Deeds, Requests and the dashboard queue, and this
> is the page where a file becomes one thing.

I agree with the frame. My disagreements are below, and they are about
what goes on the page rather than what the page is for. But the
premises have to be corrected first, because two of them are wrong and
one of them changes the shape of the ticket.

---

## PREMISE CORRECTIONS — the page exists. Twice. They disagree.

The ledger and several code comments say there is no officer-facing
route for a single deed — `SigningAgenda.tsx` still says so in a comment
this ticket should fix. **That is not true, and has not been for some
time.**

### 1. `/deeds/{id}/preview` exists

A full page: fetches the deed, renders a PDF, shows a deed-details
panel, and (as of #178) opens the share and signing modals.

**Nothing links to it.** No `router.push`, no `href`, anywhere in the
app. It is reachable only by typing the URL. A substantial single-deed
surface was built and then orphaned — which is also why nobody has
noticed the defect in point 3.

### 2. `/deed-builder/{type}/success` is the other one

It reads FOUR deed-scoped endpoints — `/deeds/{id}`, `/pcor`,
`/death-statement`, `/matter` — and serves the instrument through
`/deeds/{id}/download`. It is, in substance, the deed page already,
wearing a name that says it is a post-generation receipt.

That name is why it cannot simply be promoted: "success" is a moment,
and a deed page is a place she returns to. But almost everything
DEEDDETAIL would need is already assembled there.

### 3. THE TWO PAGES DISAGREE ABOUT WHAT THE INSTRUMENT IS

This is the finding that matters, and it lands directly on the word
"anchored".

- **The success page serves the STORED instrument.** It fetches
  `/deeds/{id}/download`, with a comment saying exactly that.
- **The preview page RE-RENDERS.** It POSTs the deed's fields to
  `/api/generate/{type}` on every visit and displays the result. Its
  Download button hands over *that* blob.

`deed_pdfs` is one row per deed, INSERT-OR-REFUSE under doctrine §9,
with a sha256 stamped on the deed row — deliberately immutable, because
"verification survives as data" and that hash is the substrate. The
preview page routes around all of it.

The two agree as long as templates, the rate registry and the deed's
own fields are unchanged since generation. Nothing checks that they
agree, and RED-S4 is queued specifically because the registry version
is not yet stamped at generation time — i.e. we already know one of
those inputs moves.

So a page whose stated job is to anchor on the instrument currently
shows, on one of its two implementations, a document that is *probably*
the instrument. Probably is the wrong word for the thing being signed.

**This is not a DEEDDETAIL feature request. It is a defect the ticket
should absorb**, because DEEDDETAIL is the ticket that decides what "the
instrument" means on screen, and it would otherwise inherit the
ambiguity and enshrine it.

---

## WHERE I DISAGREE WITH THE PROPOSAL

### A. Lineage is not history. It is identity, and it belongs at the top.

The proposal files history as "present only when it exists", at the
bottom by implication. `/deeds/{id}/lineage` returns the supersession
chain: whether this deed was corrected and replaced, and by what.

If a deed has been superseded, **the officer is looking at a document
that is no longer the operative one.** That fact does not belong in a
section she scrolls to. It changes the meaning of every other thing on
the page — the state, the next action, the instrument itself. A "next
action" offered on a superseded deed is an invitation to work on the
wrong document.

My position: split what the proposal calls history in two.

- **Superseded-by / supersedes → a banner at the top**, above the
  instrument, whenever it exists. It is a correction to the page's own
  premise.
- **Everything else that happened → the bottom**, when it exists, as
  proposed.

The general rule, which I think is the reusable half: *a fact that
invalidates the page cannot be rendered as an item on the page.*

### B. The matter is missing, and it outranks history.

The proposal names four candidates: instrument, state and next action,
participants, history. `/deeds/{id}/matter` is a fifth and it is not in
the list — the other documents on the same escrow or title order.

I think it should be prominent, and the argument is the owner's own:
*"this is the page where a file becomes one thing."* A file, in escrow,
is not one deed. It is the grant deed and the interspousal transfer and
the death statement that all belong to one transaction. The T-4
endpoint already threads them by escrow number.

"What else is on this file" is asked constantly. "What happened to this
deed six months ago" is asked rarely — the proposal says so itself
about history. If rarity is the argument for putting history at the
bottom, frequency is the argument for putting the matter near the top.

The honest caveat: `matter` returns `{grouped: false}` when the deed has
no escrow or title order number, and that will be common for
single-document users. So it is prominent *when it exists*, which is the
treatment the proposal reserved for history — I am arguing the two
should swap places.

### C. Participants are TWO populations, and merging them is a doctrine risk.

The proposal says participants are "shown as parties to whatever is
pending". I think one heading over both populations is the mistake the
codebase has spent several tickets undoing.

- **Parties to the INSTRUMENT** — grantor, grantee, the `parties` JSONB.
  Legal, permanent, printed on the document. The deed has never held a
  way to reach any of them, by design (§13.1).
- **Parties to the PROCESS** — reviewer, notary, signers. Transient,
  per-request, contactable, and living in `deed_shares` /
  `signing_participants` precisely so their contact details never touch
  `deeds`.

Under one heading these read as one list of "people on this deed", and
the next request is "email the grantor" — for which there is no address
and must not be one. The separation is not tidiness; it is the
§13.1 boundary rendered.

My position: two sections, named for what they are. *On the document*
and *Working on it*.

### D. "The instrument at the top" — agreeing, with a precision

I read "anchored by the instrument" as naming and reaching it, not
embedding a viewer — the proposal says as much ("the instrument alone
is a PDF viewer she already has"). Recording the distinction because
the existing preview page took the other reading, embedded a generated
PDF as the dominant element, and is the one nobody links to.

What I would put at the top: the deed type, the property, the stored
instrument's date and hash, and a download. One line, not a frame.

---

## THE PANEL-REDUNDANCY QUESTION — asked and answered

Raised in #179 and ruled a design input rather than a cost to absorb:
if a deed workflow page and the expandable signing panel render the same
view, which survives?

**The page survives. The panel collapses into a link.**

Reasoning:

1. The panel exists *because* there was no page. Its own docstring says
   so — "there is no officer-facing route for a single signing, so the
   row EXPANDS rather than navigating". The condition it was built
   around is the thing DEEDDETAIL removes.
2. A signing is one facet of a deed. The full view of it belongs where
   the other facets are, or the officer has two places to understand one
   file — which is the scattering DEEDDETAIL exists to end.
3. Two implementations of one view is the disease this whole wave keeps
   closing.

**What must NOT collapse**: the agenda row keeps its state, its
summary sentence and its stuck marking inline. Scanning "what has gone
quiet" across every file must never require opening anything — that is
the agenda's entire job and it is a cross-deed question the deed page
structurally cannot answer.

**The cost, named rather than discovered**: cancelling a signing is one
click from the agenda today. After this it is a navigation plus a click,
and it happens on a page about the deed rather than in the list where
she spotted the problem. I think that is the right trade — cancelling is
rare, deliberate, and benefits from the context the deed page carries —
but it is a real regression in a real workflow and the owner should
price it rather than inherit it.

---

## WHAT I WOULD BUILD, IF THE ABOVE SURVIVES REVIEW

Not a proposal to start; a proposal to react to.

1. **Resolve which page it is** — extend `/deeds/{id}/preview` and give
   it an entrance, or promote the success page's content under a new
   route and retire preview to an alias. My preference is the second:
   the success page already assembles four endpoints correctly and
   serves the stored instrument, and preview's PDF-viewer shape is the
   reading I argue against in (D).
2. **Fix the instrument divergence first**, as its own unit, because it
   is a correctness defect and not a layout question.
3. Then the layout: superseded banner → instrument line → state and next
   action → matter → participants (two sections) → history.
4. Then the panel collapse, once there is somewhere to collapse into.

Steps 1 and 2 are worth doing even if every layout opinion above is
overruled.

---

## OPEN QUESTIONS FOR THE OWNER

1. **Does the escrow read agree that the matter outranks history?** This
   is the disagreement I am least able to settle from the code — it is a
   claim about what an officer asks, and I have inferred it from the
   endpoints rather than from watching anyone work.
2. **Is the cancel-from-agenda regression acceptable?** Named above.
3. **Should the deed page be reachable from the Requests rows too**, or
   only from Past Deeds? Every row on the merged tracker is about a
   deed, and the honest answer might be that the tracker's rows become
   links to the deed page — which would be a larger change than this
   ticket, and worth knowing before the layout is settled.

---

# UNIT 2 INPUTS — three investigations, reported before building

## 1. The `/api/generate/{type}` proxy routes — REPORT, ruling needed

Asked: confirm nothing external calls them, and whether the builder needs
them under another name.

**The builder does not need them.** It generates through
`/api/deeds/generate`, a different Next route that maps the builder's
payload to `DeedCreate` and forwards to backend `POST /deeds` — the path
that stores. The six Next proxies at `app/api/generate/*` forward to
backend `/api/generate/*`, and after DEEDPREVIEW-FIX **no source in the
app calls any of them.**

But they are not unreachable in the `/security` sense, and the difference
matters:

- `docs/API.md` documents both layers explicitly, as the frontend's
  route handlers.
- `middleware/qa_instrumentation.py` carries a latency budget for
  `/api/generate/grant-deed-ca`.
- **`admin_api_v2.py` tells an admin to use them.** When a deed has no
  stored PDF it returns: *"PDF not available. Use
  /api/generate/{deed_type} to regenerate."*

**And that message is this ticket's defect one layer over.** The backend
`/api/generate/*` handlers take a *render context* — not a deed id — and
they **render and stream, storing nothing**. So an admin following that
advice gets a fresh document that is not the instrument, and the deed
still has no stored PDF afterwards. It is advice that cannot fix the
problem it is offered for, and it produces exactly the "document that
resembles the instrument" DEEDPREVIEW-FIX deleted.

The correct advice is `/deeds/{id}/download`, which self-heals a
completed deed and now refuses a draft.

**My recommendation, not applied:** fix the admin message first — it is a
live instruction pointing somewhere wrong. Hold the deletion question
separately: removing the Next proxies would be cosmetic while the backend
render endpoints they front stay documented and referenced, and those
endpoints may be a deliberate capability (`grant-deed-ca-pixel` suggests
a pixel-comparison path). Deleting a documented API because the app
stopped calling it is a different decision from deleting `/security`,
which had no caller *and* no documented contract.

## 2. Invariants enforced only by conditional rendering — SWEPT

Asked after the draft-finalisation catch. Method: every status-gated
conditional in `app/` and `features/`, then the endpoint behind each.

| gated action | UI condition | server |
|---|---|---|
| Download a deed | `status === "completed"` | **WAS UNGUARDED** — fixed in DEEDPREVIEW-FIX |
| Approve/reject a share | already-decided message | guarded, 409 "already been {status}" |
| Resend a share | — | guarded, 400 "Cannot resend - share is {status}" |
| Revoke a verified document | `status === 'active'` | guarded, 400 "already revoked" |
| Continue/edit a deed | `status === "draft"` | protected by §9 itself: regenerating different bytes raises `StoredPdfConflict` |
| Delete a deed with a live signing | — | guarded, 409 naming the notary (CANCEL1) |

**Result: the download case was the outlier, not the pattern.** The rest
were already enforced below the UI.

This is a SAMPLE, not an inventory — it covers status-gated conditionals,
which is where the class was found, and not every action in the app. A
pass that says "audited" stops the next person looking, so: what was
checked is the table above.

## 3. The activity element — WHAT EXISTS, honestly

Ruled as load-bearing and new to both proposals: "the reviewer responded
Tuesday, the notary accepted Wednesday." **There is no events table.** So
the question is which timestamps are real recorded moments and which
would be inferred.

### Real, and usable today

Each of these is a column written at the moment the thing happened.

| event | source |
|---|---|
| deed started | `deeds.created_at` |
| deed generated | `deeds.completed_at` (stamped by `store_deed_pdf`) |
| deed superseded | `deeds.superseded_at`, `superseded_by` |
| review sent | `deed_shares.created_at` |
| reviewer opened it | `deed_shares.viewed_at` |
| reviewer decided | `deed_shares.responded_at` — written on BOTH the approve and reject paths, and backfilled from `feedback_at` |
| signing requested | `signing_requests.created_at` |
| a party opened their link | `signing_participants.viewed_at` |
| **a party answered a time** | `signing_responses.asserted_at` + `answer` + `participant_id` |
| signing booked | `signing_requests.booked_at`, `booked_by` |
| signing cancelled | `signing_requests.cancelled_at` |
| document revoked | `document_authenticity.revoked_at` + reason |

`signing_responses` is the best event data in the product: one row per
answer, with who and when. It is already an event log.

### What would be SYNTHESIZED, and must not be

- **Status transitions other than the decision.** `status` is
  current-state; only `responded_at` has a time. "Marked viewed at 3pm"
  is available, "moved to expired at midnight" is not — expiry is
  computed from `expires_at`, not recorded as an event.
- **View counts as events.** `view_count` is a counter and `viewed_at`
  is one timestamp. Rendering "opened 4 times" as four entries would
  invent three moments.
- **Reminders as a series.** `reminder_count` + `last_reminder_sent_at`
  gives the LAST one only. Three reminders is one known time and two
  fabrications.
- **Anything from `updated_at`.** It moves for reasons that are not
  events.

### The gap worth naming

`notifications` is close to an event log — type, title, message, link,
created_at — but has **no `deed_id`**. The deed is encoded in the `link`
URL. So "everything that happened on this deed" cannot be answered from
it without parsing links, and it only holds events worth notifying
about.

### The smallest honest version

A per-deed activity list assembled as a UNION of the columns in the first
table, each rendered with the sentence its own subsystem already writes
(§13 rule 3 — no screen composes an account of a scheduling state), and
**nothing shown that is not one of those recorded moments.**

It is never empty: `deeds.created_at` always exists, so the list has at
least "started" and, for any generated deed, "generated".

If that is too thin to be worth the section, the honest alternative is to
record real events first — not to pad it.
