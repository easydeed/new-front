# FLOW0 — why the signing flow reads as a reviewer flow

**Investigation only. No code changed.** Verified against `main` at
`55dc747`.

---

## The short answer

**The owner did not use the signing path.** There are two buttons on a
deed row and they look almost identical — same size, same colour, same
position, differing only by icon. The Share icon opens the REVIEW flow,
whose recipient picker offers **every partner including notaries, with
nothing to indicate that picking one is a mistake.**

So a notary was picked from a reviewer's picker, got a reviewer's email,
and landed on a reviewer's page with Approve and Request Changes buttons.
Every piece of that is working as built. **The defect is that the review
path never asks who it is talking to.**

---

## 1. Every path that can create a signing request

| # | Path | Endpoint | Creates | Live? |
|---|---|---|---|---|
| 1 | Past Deeds → **Share** icon → `ShareForReviewModal` | `POST /shared-deeds` | **review share** | ✅ live |
| 2 | Past Deeds → **calendar** icon → `RequestSigningModal` | `POST /signing-requests/v2` | `signing_requests` aggregate (NOTARY2) | ✅ live |
| 3 | `SigningRequestModal` (NOTARY1) | `POST /signing-requests` | `deed_shares` + `share_kind='signing_request'` | ⚠️ **no importer — dead UI, live endpoint** |
| 4 | Shared Deeds → **"Share New Deed"** | *(none)* | nothing — routes to `/past-deeds` | ✅ live |

**Only path 2 produces a NOTARY2 signing.** Path 1 is the one the owner
hit.

### What makes path 1 a trap

`ShareForReviewModal` renders the recipient picker with **no
`suggestCategory`**, so every partner appears, sorted by nothing.
`RequestSigningModal` passes `suggestCategory="notary"`, which floats
notaries up but — by deliberate earlier design — **hides nobody from
either list**.

That symmetry was correct when the picker's only job was "pick a
recipient". It is wrong now: one of these two flows is meaningful for a
notary and one is not, and the picker cannot tell them apart because
nothing asked it to.

**The two buttons are the second half of it.** Same shape, same slate
background, adjacent, distinguished only by `Share2` vs `CalendarClock`
and a `title` attribute that requires a hover. On a row of icon buttons,
"the one that means signing" is not discoverable — it is remembered.

---

## 2. Reviewer copy on the signing path — audit

Nothing on the **NOTARY2** path (path 2) addresses a reviewer. That path
is clean: `RequestSigningModal` → `notary_invited` email → `/signing/{token}`.

Everything below is what a notary sees **when reached through path 1 or
path 3**, which is where the owner ended up.

### Path 1 (review share sent to a notary) — all reviewer semantics

| Surface | What it says | File |
|---|---|---|
| Create modal | "Share for review", "Ask for a review from", "Send the review request" | `ShareForReviewModal.tsx` |
| Email subject | "Review requested — {address}" | `email_templates.share_invite` |
| Email body | "is asking you to review it and approve or request changes" | same |
| Email button | "Review the document" | same |
| Token page header | "Deed Review" | `app/approve/[token]/page.tsx` |
| Token page actions | **"Approve Deed"**, **"Request Changes"** | same |
| Token page card | "Your Decision" | same |
| Shared-deeds row | status badges: sent / viewed / **approved** / **rejected** | `app/shared-deeds/page.tsx` |
| Reminder | "waiting on your review" | `email_templates.share_reminder` |

### Path 3 (NOTARY1 signing share) — mixed, and reachable by API

`GET /approve/{token}` branches on `share_kind` and suppresses
approve/reject for a signing (`can_approve: false`), and `POST /approve/{token}`
refuses with 409. So the NOTARY1 path is *internally* honest.

But its UI has no importer, so the only way to reach `POST /signing-requests`
now is directly. **An endpoint whose only client was deleted is a live
endpoint nobody is testing against a real screen.**

---

## 3. The "Share New Deed" button

`app/shared-deeds/page.tsx:281` → opens a modal titled **"Share Deed for
Review"** whose entire body is:

> To share a deed, please go to the Past Deeds page and click the Share
> button on a completed deed.

…and a button that routes to `/past-deeds`.

It is a placeholder that predates every share flow this project has
built. It is not deed creation — it is a signpost to the page that has
the real buttons — but from the officer's seat the distinction is
academic: **she pressed a button labelled "Share New Deed" and got told
to go somewhere else and press a different button.**

Three things are wrong with it and only one is cosmetic:

1. It does nothing.
2. It says "for Review" — so the one entry point on the sharing page
   commits to reviewer semantics before asking what she wants.
3. **Shared Deeds does not show NOTARY2 signings at all.** They live in
   `signing_requests`; that page reads `deed_shares`. So the page named
   for sharing shows one of the two things she can share, and the page
   that shows the other (`/signings`) is not linked from it. Neither page
   mentions the other — verified, zero cross-references.

---

## 4. Are both generations live?

**Yes, and that is the honest answer rather than a comfortable one.**

| Generation | Storage | Endpoints | UI |
|---|---|---|---|
| NOTARY1 | `deed_shares.share_kind` | `POST /signing-requests`, `POST /approve/{t}/schedule`, `POST /shared-deeds/{id}/schedule`, `GET /approve/{t}/pcor(.pdf)` | **none** |
| NOTARY2 | `signing_requests` + 3 tables | `/signing-requests/v2/*`, `/signing/{token}/*` | Past Deeds calendar button, `/signing/[token]`, `/signings` |

The #156 migration moves NOTARY1 **rows** into the new aggregate. It does
not remove NOTARY1's **write path**, and nothing in the merge said it
would — a migration carries data, not routes.

So: no surface creates a NOTARY1 signing today, and `POST /signing-requests`
will still make one if called. Every migration run after that call would
carry it across, so nothing is lost — but the two models are both
writable, and only one is reachable from a screen.

---

## 5. The design finding: dispatch, not negotiation

Owner research into escrow practice: **officer knows when docs are ready
→ schedules with the signers directly, usually by phone → dispatches a
notary for that time, who accepts or declines.** The notary is a
contractor receiving an assignment.

NOTARY2's default inverts this: notary posts availability → signers
converge → it books. That is the right model for *finding* a time among
people with no prior contact. It is the wrong model for the ordinary
case, where the officer already has her clients on the phone and needs
somebody to show up.

Worth stating plainly: **the reversal that produced NOTARY2 was correct
and this does not undo it.** §13.1's argument was that routing *around*
the signers recreated phone tag. Dispatch does not route around them —
the officer talks to them *first*, which is the leg she was always going
to do herself. What changes is who proposes the time, not who is
included.

### What dispatch needs

**The four tables already carry almost all of it.**

| Need | Have it? |
|---|---|
| A time the officer chose | ✅ `signing_windows.origin = 'officer'` — the value exists and the #156 migration already writes it |
| The notary accepting | ✅ `signing_responses(answer='available')` on that window |
| The notary declining | ✅ `signing_windows.declined_at`, or an `unavailable` response |
| Booking without every signer answering | ❌ **the one gap** |
| Falling back to negotiation | ✅ the notary posts windows; the existing loop runs unchanged |

**The gap, precisely.** `converged_window_id` requires the notary **and
every live signer** to have answered `available`. In dispatch the signers
never answer — the officer already spoke to them. So convergence can
never fire, and the request would sit in `partially_agreed` forever
while everyone involved believes it is booked.

Two ways to close it, and they are not equivalent:

**(a) The officer's override, unchanged — zero schema change.** She
creates the request with her window, the notary accepts, she presses
override. `booked_by = 'officer'`, which is *true*: she asserted the
time. This works **today**, with no code at all. It is clunky — she
presses a button after the notary already said yes — but nothing about
it is dishonest.

**(b) Record that the officer asserted the signers' agreement.**
`signing_responses` has no column for *who* asserted an answer; a row
says a participant answered. Writing signer rows on the officer's say-so
would make the record claim a signer answered when the officer did —
which is precisely the distinction RED-S4 and `booked_by` exist to
preserve, one level down.

So (b) is **one additive column** — `signing_responses.asserted_by`
(`'participant' | 'officer'`) — and the reason for it is doctrinal, not
technical. With it, convergence can count an officer-asserted signer row
while every surface can still say who actually spoke.

### Cost estimate

| Piece | Est. |
|---|---|
| `asserted_by` column + convergence counts it + pins | 0.5 d |
| Create flow: "propose a time" as the default, "ask for availability" as the alternative | 1 d |
| Notary token page: accept/decline an assignment (the page already renders windows and answers) | 0.5 d |
| Signer notice: "your signing is set for X" rather than "pick a time" — one template, one branch | 0.5 d |
| Copy pass across create/email/token/agenda for the dispatch register | 0.5 d |
| Tests: dispatch happy path, decline → fallback to negotiation, mixed | 1 d |
| **Total** | **≈ 4 days** |

The fallback is nearly free because it is the flow that already exists:
a declined dispatch leaves a request with no live window, which is
exactly the state a fresh request is in, and the notary posting
availability resumes the built loop.

---

## 6. What I would fix, in order

Ranked by how much of the reported problem each removes.

1. **The review picker must know what a notary is.** Either exclude the
   notary category from the review picker, or — better, since her rolodex
   is hers — keep them listed and interrupt: *"Nora is filed as a notary.
   Did you mean to request a signing?"* with a button that switches
   flows. This alone prevents the reported failure. *(~0.5 d)*
2. **The two buttons must not be twins.** Labels, not just icons and
   hover titles. *(~0.25 d)*
3. **Shared Deeds' dead button.** Make it a real chooser — "Share for
   review" / "Request a signing" — or delete it. Either beats a signpost.
   *(~0.5 d)*
4. **Show signings where she looks for them.** Shared Deeds and Signings
   do not link to each other; the page named for sharing shows half of
   what she shares. *(~0.5 d)*
5. **Retire NOTARY1's write path** once #156's migration has run against
   production with a zero count confirmed. Its UI is already gone; the
   endpoints are what remain. *(~0.5 d)*
6. **Dispatch as the primary path** — §5 above. *(~4 d)*

Items 1–4 are the reported bug. Items 5–6 are the model catching up to
how the work is actually done.

---

## Appendix — what this investigation did NOT verify

- **No production data was read.** Whether any NOTARY1 signing rows exist
  is unknown from here; `migrate_notary1_signings.py --dry-run` answers
  it, and that is the owner's to run.
- **The `/approve` token page was not exercised against a live NOTARY1
  signing share**, because no UI creates one. The branch is covered by
  backend tests; it has never been seen on a screen.
- **No copy was changed and no route was touched.** Read-only, as ruled.
