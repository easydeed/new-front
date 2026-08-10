# NOTARY0b — scheduling coordination

**Investigation only. No code, no schema, no PR.** Read against `main` at
`c5db5c4` (PRICING1 merged). Everything below was read out of the code
named in it.

**One limit stated up front.** NOTARY0's report is not in this
repository — it was the Cursor agent's investigation, relayed by the
owner. I have its *rulings* from `OWNER_LEDGER.md` but I have never seen
its §7 pricing table, so §1 below re-prices the v1 baseline from the
current code rather than diffing against numbers I cannot read. Where I
say "cheaper", I mean cheaper than it would have been before the waves
that have landed since — not cheaper than a figure I am comparing
against.

---

## 1. The v1 baseline, re-priced against current `main`

NOTARY0's v1, per the ledger: notary partner category · `share_kind:
signing_request` on `deed_shares` · token package view with PCOR access
and no approve/reject branch · `share_signing_request` E1 template ·
matter File status line · officer-asserted completion.

| slice | state on `main` | direction |
|---|---|---|
| **notary partner category** | `partners` has `category`/`role` columns with values driven by two frontend arrays. PARTNER1 rebuilt the screen: slide-over editor, per-row actions, Title Case chips from `titleCase()`, category tones from one map | **near-free — confirmed.** Adding `notary` to `CATEGORIES` and `notary_public` to `ROLES` is two array entries; the chip, the form select, the search filter and the stats card all derive. The pins that would need touching are the tier/brand ones, not the category ones |
| **address on the notary row** | PARTNER1 shipped capture, table display, the "Add address" gap affordance, and `partner_address_line()` | **already done, and unplanned-for.** A signing needs a location. The notary's address is now captured and assembled by a lifted, tested helper |
| **`share_kind` on `deed_shares`** | no `kind` column exists; `deed_shares` is (id, deed_id, owner_user_id, recipient_email, token, status, expires_at, feedback\*, viewed\*, reminder\*) | unchanged — one nullable column + a backfill-free default |
| **token package view** | `/approve/{token}` renders; `/approve/{token}/pdf` streams | **cheaper than it was.** #130 fixed the share PDF path — see §4 |
| **PCOR in the package** | `/deeds/{id}/pcor.pdf` exists and is **session-auth only** (`Depends(get_current_user_id)`) | **more expensive than the ledger line implies** — see §4 |
| **E1 template** | 12 templates through one choke point; TRIAL1 added the twelfth and the count trip-wire fired as designed | unchanged, and the pattern is now well-worn |
| **matter File status line** | `services/matters.py` exists (carry-forward, `matter_key`); there is still **no `matters` table** — grouping is derived | unchanged |
| **officer-asserted completion** | RED-S4 shipped exactly this shape for recording: `recorded_at`, `instrument_number`, `recording_asserted_by`, `recording_asserted_at` | **materially cheaper.** There is now a *precedent in the schema* for "a human asserted this, and we recorded who and when" — see §5 |

**Net:** the two slices that got cheaper (category, officer-assertion
shape) are cheaper because other tickets happened to build the pattern
first. One slice got **more expensive** (PCOR token access). Nothing in
the v1 list is blocked.

---

## 2. The signer party problem — **owner ruling required**

### What exists today

**Nothing.** `deeds` carries `grantor_name` and `grantee_name` (strings)
and a `parties` JSONB for single-party instruments. There is no email,
no phone, no address, no row of any kind for a signer. The only email on
the sharing path is `deed_shares.recipient_email`, and that is the
*share recipient* — a colleague or reviewer the officer sends a draft
to, not a person signing the instrument.

So scheduling that reaches signers is not an extension of anything. It
is a new class of data.

### The three options, priced

**Option A — the officer relays. The product coordinates officer↔notary
only.**

The officer proposes windows, the notary picks one, the officer tells her
own clients by whatever means she already uses. We store no signer
contact information.

- Cost: **zero beyond §3's mechanism.** No new PII, no retention policy,
  no consent question, no unsubscribe obligation, no deliverability
  problem, no "why did DeedPro text my client" phone call.
- What it gives up: the signers are not in the loop automatically.
- **This is how escrow actually works.** The officer owns the client
  relationship, has their number, and is the one they call back. A
  product that emails her buyer directly is inserting itself into a
  relationship the officer is paid to hold.

**Option B — signer contact captured, stored on the deed.**

`deeds.metadata.signers` = `[{name, email?, phone?}]`, or a `deed_signers`
table.

- Cost: capture UI in the builder, storage, and then the real cost —
  **consumer PII with no account.** A signer never agreed to our terms,
  has no login, cannot see what we hold, and cannot ask us to delete it.
  That means a retention rule, a deletion path, and a defensible answer
  to "what do you do with it", none of which exist. `metadata` is a
  JSONB blob with no retention machinery whatsoever.
- Also: it makes every deed row contain third-party contact data, which
  changes what a database dump *is*.

**Option C — signer contact, transient.**

Captured at signing-request time, used to send, then discarded.

- Cost: everything in B minus the retention question, plus the awkwardness
  that a re-send needs a re-type.
- Honest assessment: "transient" is a discipline, not a mechanism, unless
  something enforces the deletion. Nothing here enforces it today.

### Recommendation for the ruling

**Option A.** Not primarily because it is cheapest — because it is right:
the officer is the party with the relationship, the obligation and the
phone number. Every escrow office already runs this loop. The product's
job is to stop her chasing the *notary*, which is the leg she does not
control.

If the owner wants signer-side contact later, the trigger should be
evidence from real use that officers *want* us to message their clients —
not an assumption that automating a message is automatically better.

**Do not assume signers must be contacted by us.** Flagged, held.

---

## 3. Scheduling mechanism — three options

### The state question first, because it decides the rest

NOTARY0 flagged a status-vocabulary collision. **This codebase has
already ruled on exactly this question once**, in T-5, and the reasoning
transfers verbatim (`database.py`, the `superseded_by` comment):

> the lineage state is DERIVED from this pointer rather than added to
> `deeds.status`. That column already carries a lifecycle vocabulary in
> active use (draft/completed/deleted) and the admin console filters on
> it. Adding 'superseded' would make it mutually exclusive with
> 'completed', and those are orthogonal facts.

`deed_shares.status` today holds `sent · viewed · approved · rejected ·
revoked · expired`. A signing request is not approved or rejected — it is
*scheduled*, and "scheduled" is orthogonal to "viewed". Adding
`scheduled` to that column makes a scheduled-and-viewed request
impossible to express, which is the same defect T-5 refused.

**So: scheduling state does not go in `deed_shares.status`.** It goes in
its own columns on `deed_shares` (`scheduled_at`, `scheduled_by`,
`scheduled_asserted_at`) with the state DERIVED — the T-5 shape, already
precedented and already understood by whoever reads this next. **No new
table is needed for (a).** (b) and (c) change that; see below.

### (a) Proposed windows + one-tap response

Officer proposes 2–3 windows in the signing request; notary taps one;
`scheduled_at` is set; officer is notified.

- **Schema:** `share_kind`, `proposed_windows JSONB`, `scheduled_at`,
  `scheduled_by`, `scheduled_asserted_at`. All nullable, all additive,
  no backfill.
- **Surfaces:** window picker in the request flow (three datetime
  inputs); three buttons on the token view; a notification + an E1 email
  back to the officer; a line on the deed.
- **Cost: ~1.5–2 days on top of NOTARY0's v1.** The token view, the
  E1 choke point, the notification table and the officer's status line
  all exist. This is a JSONB column, three buttons and one email.
- **What it buys:** the entire leg the officer does not control. She
  stops playing phone tag with the notary. That is the actual pain.

### (b) Full back-and-forth

Notary counter-proposes; officer accepts/declines; repeat.

- **Schema:** now a real negotiation log — proposals need identity,
  authorship, ordering and supersession. `deed_shares` stops stretching;
  this wants a `signing_proposals` table.
- **Surfaces:** a threaded UI on both sides, a "whose turn is it" state,
  notifications in both directions, and a decision about what happens
  when both sides act at once.
- **Cost: ~4–6 days on top of (a)**, and it grows: every negotiation
  loop eventually needs cancellation, expiry and reminders.
- **What it buys:** less than it looks. Two counter-proposals is a phone
  call. The owner has *already ruled out notary-side negotiation UI* in
  NOTARY0 — (b) is that ruling, reversed, at 3× the cost of (a).
- **Assessment: do not build.** If (a) ships and officers report
  round-tripping, that is the trigger.

### (c) Calendar integration

Availability sync, `.ics` invites, external calendar writes.

- **Cost:** `.ics` attachment alone is cheap (~0.5 day, a text format
  through the existing E1 attachment path). Everything else is not:
  OAuth to Google/Microsoft, token storage and refresh for a *third*
  provider, per-provider availability semantics, sync failure modes, and
  a support surface where "my calendar didn't update" becomes our
  problem.
- **Cost: 2+ weeks and a permanent maintenance tax**, plus new
  credentials in an environment that already has an unattended
  `STRIPE_*` gap.
- **What it buys:** convenience that a calendar invite already provides.
- **Assessment: `.ics` attachment is a candidate for (a)+; sync is a
  different product.**

---

## 4. What the notary receives — and the one thing that got more expensive

**Package path is clean.** #130's fix is on `main`: the share PDF query
reads `deed_pdfs.pdf_data` via `LEFT JOIN deed_pdfs p ON p.deed_id =
d.id`, not the `deeds.pdf_data` column that never existed. The endpoint
that 500'd and poisoned the connection is fixed and pinned
(`test_share_pdf_source.py`, executable against a real database).
**Serving the deed to a notary token costs nothing new.**

**PCOR is the expensive part, and the ledger line understates it.**
`/deeds/{deed_id}/pcor.pdf` is `Depends(get_current_user_id)` — session
auth, owner-scoped. A notary holding a share token has no session and is
not the owner. So "token package view with PCOR access" is **not** a
matter of adding a link; it needs a token-authenticated PCOR route with
its own scoping, which means:

- a second public endpoint serving a generated document,
- the same expiry/revocation checks the deed route has,
- and a decision about whether an expired token can still fetch a PCOR.

**Cost: ~0.5–1 day**, not zero. Worth flagging because it is the kind of
line that reads as free in a table.

**One design note in its favour:** the PCOR is deliberately unflattened
and unhashed ("this is the buyer's form, and freezing a document somebody
else must complete and sign would be the wrong kind of faithful"). That
is exactly right for a signing package — the notary hands it over to be
completed, not to be admired.

---

## 5. The doctrine boundary for scheduling

**A scheduled time is an arrangement, not a legal act.** Nobody's rights
change because a calendar says Tuesday. So scheduling does *not* need the
violet-proposal machinery that vesting and DTT need — it is closer to a
fact than a legal choice.

**But "confirmed" must still mean somebody said so**, and there is now a
precedent in the schema for exactly that shape. RED-S4 shipped:

```
recorded_at · instrument_number · recording_asserted_by · recording_asserted_at
```

— the recording is *the officer's statement*, attributed and timestamped,
never the system's inference. Scheduling should mirror it exactly:
`scheduled_at`, `scheduled_by`, `scheduled_asserted_at`.

**Who may assert what:**

| state | who sets it | why |
|---|---|---|
| `scheduled` | **the notary**, by tapping a window (or the officer, recording an out-of-band agreement) | the notary is the one whose availability it is. Both paths record *who* asserted |
| `completed` | **the officer only** | NOTARY0's standing ruling, and it holds. The notary is not our user, has no account, and a tap on a public token is not an attestation that a notarial act occurred |

**The standing ruling holds and should be restated in the doctrine
section when this builds: the system never asserts a signing occurred.**
A scheduled time that has passed is not a completed signing. No
inference, no timer, no "auto-complete after the window" — the same
refusal §11 makes about characterizations and §12 makes about
recommendations, in a third costume.

One sharper corollary for the ruling: **a notary tapping a window is
asserting availability, not attendance.** If the product later shows
"scheduled" anywhere that reads as "will happen", that is a claim nobody
made.

---

## 6. Recommendation — the smallest sellable slice

### Build: NOTARY0 v1 + option (a), officer-relays (option A)

**~4–5 days (NOTARY0 v1) + ~1.5–2 days (windows) + ~0.5–1 day (PCOR
token route) ≈ 6–8 days.**

What it delivers: the officer picks a notary from her own partner list
(now with an address, thanks to PARTNER1), sends a signing request with
2–3 proposed windows, the notary opens a token link, sees the package,
and taps a time. The officer gets a notification and an email. She tells
her clients herself, as she does today.

**That removes the leg she does not control and touches no consumer PII.**

### Deferred, with triggers

| deferred | trigger |
|---|---|
| **Signer contact + direct messaging** | evidence from real use that officers *want* us to message their clients. Requires a retention and deletion answer first |
| **Counter-proposal loop (b)** | officers reporting round-trips on (a). Reverses a standing owner ruling, so it needs a fresh one |
| **`.ics` attachment** | first officer who asks. Cheap, and it rides the existing E1 attachment path |
| **Calendar sync (c)** | not before a design partner is live and asking by name |
| **A `matters` table** | still derived; unchanged by this work |
| **Multi-user office** | RED-S5, deferred by decision. Note the interaction: partners are scoped `user-{id}`, so **a notary added by one officer is invisible to her colleague** |

### What we deliberately do not build

- **A notary marketplace.** We are not a directory. The officer brings
  her own notary — that is the whole premise, and it is why this is
  coordination rather than matching.
- **Ranking or reviews.** Ranking notaries means asserting one is better,
  which is a judgment we cannot support and would be liable for.
- **Fees or payment routing.** Money between the officer and her notary
  is theirs. Touching it makes us a party to it.
- **RON (remote online notarization).** A different regulatory surface
  entirely, with credential, recording and storage obligations we have
  not assessed. Not "later" — *not this product* without a deliberate
  decision.
- **Availability sync.** See (c). A permanent maintenance tax for
  convenience an invite already provides.
- **SMS.** New vendor, new consent regime (TCPA), new opt-out
  obligation, and it messages consumers we have no relationship with.
  Option A avoids the entire category.
- **Auto-completion.** Never. A passed window is not a signing, and §5 is
  the reason.

---

## Open questions for the owner

1. **Signer contact: Option A (officer relays) confirmed?** This is the
   ruling that shapes everything else. Recommended: yes.
2. **PCOR over a share token** — expired-token behaviour: still fetchable,
   or not? (Recommend: no, matching the deed.)
3. **May the officer set `scheduled` herself** to record an agreement
   reached by phone? (Recommend: yes — otherwise the product's status is
   wrong whenever the humans are efficient.)
4. **`.ics` attachment in the confirmation email** — in the first slice or
   deferred?
