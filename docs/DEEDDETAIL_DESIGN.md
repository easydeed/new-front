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
