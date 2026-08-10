# NOTARY2 — the coordination loop: build plan

**Status: plan for owner review. No Part C code written.**
Parts A (PARTNER2) and B (share entry points) ship separately and are
not blocked on this.

---

## 0. The reversal, and why it is the right call

NOTARY0b ruled **Option A**: the officer relays, the product coordinates
officer↔notary only, no signer contact anywhere. NOTARY1 built exactly
that, and pinned it fail-closed in both suites.

The owner has reversed it. The reasoning, recorded because a reversal
without its argument is just churn:

> **The signers are the scheduling constraint.** Routing around them
> recreated the phone tag the feature exists to kill.

That is correct, and it is worth being precise about *why* Option A
looked right and was not. Option A optimised for the thing we could see —
the data we would hold about a non-user — and treated the officer's
relaying as free. It is not free; it is the entire cost of the problem.
A notary posts three windows, the officer phones two signers, one can do
Tuesday, the other cannot, and the officer is back on the phone to the
notary. The product had removed one leg of a three-leg negotiation and
called it coordination.

**What the reversal does NOT change.** §13 stands unchanged: an
arrangement is not an act, booked ≠ happened, `completed` stays
officer-asserted, nothing renders "scheduled" as a claim the signing will
occur. What changes is a single sub-ruling — *who may be contacted* —
and the pins that enforce it get **retargeted, not deleted**: from "no
signer contact anywhere" to "no signer contact outside one purgeable
row." That is a narrower promise, and it is the one we can keep.

**The pins will fail on the first Part C commit, by design.** NOTARY1's
sweep is fail-closed across both trees precisely so that adding signer
contact is a deliberate act that trips a test. Part C's first change is
to retarget it. Nothing about that is a workaround — it is the pin doing
its job and being answered.

---

## 1. Schema

### Why not extend `deed_shares`

NOTARY1 put the signing request on `deed_shares` with `share_kind`,
because one share = one recipient = one row, and there was one recipient.
NOTARY2 has **one request with N participants**, each with their own
token, their own view, and their own answers. That is an aggregate with
children, and flattening it onto `deed_shares` means either N rows that
have to be re-associated by convention, or JSONB blobs carrying identity
and access — both of which put the token, the contact and the answers in
a place nothing can constrain.

So: `deed_shares` stays what it is (**review shares only**), and the
signing request becomes its own small aggregate. NOTARY1's
`share_kind`/`proposed_windows`/`scheduled_*` columns are migrated and
then left in place, unused, rather than dropped — additive-only DDL is
the house rule, and a column nobody reads costs nothing.

### The four tables

```sql
signing_requests
  id                  BIGSERIAL PRIMARY KEY
  deed_id             INT NOT NULL REFERENCES deeds(id)
  officer_user_id     INT NOT NULL REFERENCES users(id)
  location            TEXT                    -- defaults to the property address
  tz_name             VARCHAR(64) NOT NULL    -- IANA, e.g. 'America/Los_Angeles'
  expires_at          TIMESTAMPTZ NOT NULL
  cancelled_at        TIMESTAMPTZ             -- orthogonal fact, its own column
  booked_at           TIMESTAMPTZ             -- the agreed instant
  booked_by           VARCHAR(16)             -- 'convergence' | 'officer'
  booked_asserted_at  TIMESTAMPTZ
  signer_proposals    INT NOT NULL DEFAULT 0  -- the round-trip counter
  contact_purged_at   TIMESTAMPTZ
  created_at, updated_at TIMESTAMPTZ

signing_participants
  id                  BIGSERIAL PRIMARY KEY
  signing_request_id  BIGINT NOT NULL REFERENCES signing_requests(id) ON DELETE CASCADE
  party_role          VARCHAR(16) NOT NULL    -- 'notary' | 'signer'
  display_name        VARCHAR(255)
  email               VARCHAR(320)            -- PURGEABLE for signers
  phone               VARCHAR(32)             -- PURGEABLE for signers
  partner_id          UUID                    -- set for the notary; NULL for signers
  token               UUID NOT NULL UNIQUE
  expires_at          TIMESTAMPTZ NOT NULL
  revoked_at          TIMESTAMPTZ
  last_viewed_at      TIMESTAMPTZ
  reminders_sent      INT NOT NULL DEFAULT 0
  contact_purged_at   TIMESTAMPTZ
  created_at, updated_at TIMESTAMPTZ

signing_windows
  id                  BIGSERIAL PRIMARY KEY
  signing_request_id  BIGINT NOT NULL REFERENCES signing_requests(id) ON DELETE CASCADE
  starts_at           TIMESTAMPTZ NOT NULL
  ends_at             TIMESTAMPTZ NOT NULL
  origin              VARCHAR(16) NOT NULL    -- 'notary' | 'signer_proposal' | 'officer'
  proposed_by         BIGINT NOT NULL REFERENCES signing_participants(id)
  declined_at         TIMESTAMPTZ
  created_at          TIMESTAMPTZ

signing_responses
  id                  BIGSERIAL PRIMARY KEY
  window_id           BIGINT NOT NULL REFERENCES signing_windows(id) ON DELETE CASCADE
  participant_id      BIGINT NOT NULL REFERENCES signing_participants(id) ON DELETE CASCADE
  answer              VARCHAR(16) NOT NULL    -- 'available' | 'unavailable'
  asserted_at         TIMESTAMPTZ NOT NULL DEFAULT now()
  UNIQUE (window_id, participant_id)          -- changing your mind is an UPDATE
```

### Three schema decisions worth arguing

**(a) There is no `status` column, and that is deliberate.** The four
states the owner named are all derivable and none of them is a fact:

| state | derivation |
|---|---|
| requested | no rows in `signing_windows` |
| windows posted | windows exist, nobody has converged |
| partially agreed | ≥1 `available` response, not a full set |
| booked | `booked_at IS NOT NULL` |

T-5's ruling, third application: orthogonal facts do not share a column.
`cancelled_at` is its own column for the same reason — a cancelled
request that had been partially agreed must stay expressible.

**(b) `booked_at` is WRITTEN, not derived — and that is not a
contradiction.** Convergence is computable, so deriving it is tempting.
It is wrong for two reasons. An agreement is an **event with a moment**,
and the moment is the last party's answer, not the moment somebody
happened to run the query. And the officer's override must be able to
disagree with the computation (owner ruling: she retains an override); a
derived value has nothing for an override to disagree *with*. So it is
written once, SQL-guarded (`WHERE booked_at IS NULL`) exactly like T-5's
supersession pointer, and it carries the RED-S4 trio:
`booked_at` / `booked_by` / `booked_asserted_at`. `booked_by` is
`'convergence'` or `'officer'`, so the record never claims the parties
agreed to a time the officer set.

**(c) One timezone per request, named, not per-window offsets.** NOTARY1
stored ISO strings with offsets in JSONB and assumed UTC for naive times
— a latent hour-out bug in the `.ics`. A signing happens at **one place**,
so the request carries one IANA zone, every window is a `TIMESTAMPTZ`,
and every surface renders in that zone. This fixes a NOTARY1 weakness
rather than porting it.

### Migration off NOTARY1's model

One transform: every `deed_shares` row with `share_kind='signing_request'`
becomes a `signing_requests` row + one `notary` participant (carrying the
existing token, so live links keep working) + one window per entry in
`proposed_windows` + an `available` response if `scheduled_at` was set.
Idempotent, guarded on a `migrated_from_share_id` column. Expected row
count in production today: **zero or near it** — NOTARY1 merged hours
ago and there is no design partner yet — but the transform is written and
tested rather than assumed, because "there is probably no data" is how
data gets lost.

---

## 2. Token-surface inventory

This is the part of the plan I would most like challenged, because the
signer surface is **the first consumer surface this product has ever
had** and the cost of getting it wrong is not a bug report.

Each surface is an **allowlist pinned by exact key-set equality**, not a
denylist of excluded fields. A denylist enumerates the examples somebody
thought of; an allowlist enumerates the property, and a new field cannot
leak in without failing the pin.

### Officer (session-authenticated, no token)

Everything she already sees, plus the request detail and the scheduling
page. No change to what an authenticated owner may read about her own
deed. She sees participant names and emails **she herself typed**.

### Notary token — `GET /signing/{token}`

| field | why |
|---|---|
| property address (full), county | she is going to that address |
| deed type | she is notarising this instrument |
| officer name + company + email | who engaged her; she must be able to reply |
| signer **display names** | she checks their ID at the table |
| windows: her own, plus signer proposals awaiting accept/decline | the job |
| booked time, if any | the job |
| expiry | so she knows the link dies |
| the deed PDF + the PCOR | NOTARY1 already gives her the package; she needs it |

**Not present:** signer emails, signer phones, other partners, anything
about the officer's other files.

### Signer token — `GET /signing/{token}` — MINIMUM SURFACE

| field | why |
|---|---|
| property **street address** (first comma segment only) | so they know which signing this is |
| coordinating officer: name + company | who is asking, and who to contact |
| notary display name | *proposed — see the open question below* |
| windows offered + their own current answer | the task |
| expiry | so they know the link dies |

**Excluded, and pinned by the allowlist rather than by name:** APN,
county, legal description, deed type, grantor/grantee names, vesting,
transfer tax or any figure, the deed PDF, the PCOR, any other signer's
name, and every participant's email and phone including the notary's.

**Open question for the owner:** the notary's *display name* on the
signer view. Argument for: a consumer being asked to meet a stranger
should know who. Argument against: it is another party's information on
the minimum surface, and "a notary will meet you at the time you pick" is
sufficient. I have it in the allowlist above; say the word and it comes
out. This is the only item on the signer surface I am not certain about,
and it is exactly the kind of call I would rather flag than decide.

**Abuse surface.** These are unauthenticated consumer endpoints, so they
get `utils/throttle.py` per-token and per-IP on view, respond and
propose — the RED-H1.2 treatment. A token that is enumerated is a
property address disclosed.

---

## 3. Convergence, and the round-trip cap

**A window books when** it is not declined, the notary answered
`available`, and **every** non-revoked signer answered `available`.
Checked after every response write, inside the same transaction, and the
booking is the SQL-guarded single write described above.

**A signer proposing a time outside the notary's windows creates a
proposal, not a booking.** It lands as a `signing_windows` row with
`origin='signer_proposal'` and an implicit `available` response from its
proposer. The notary accepts (answers `available` — which may
immediately converge) or declines (`declined_at`, which removes it from
every surface and tells the proposer).

**The cap: 3 signer proposals per request, aggregate.** Not per signer —
two signers alternating twice each is six emails and the same deadlock.
At the cap the propose action is refused with an honest sentence ("these
haven't converged — {officer} will call you"), the officer is notified,
and picking from the notary's existing windows still works. An
unbounded thread is how a scheduling tool becomes a chat app nobody
moderates, and the graceful degradation is the phone call that already
works.

---

## 4. The purge — and the one thing that needs an owner decision

The owner's ruling: *the purge is a mechanism, not a discipline — a real
job with a real test.* Agreed, and here is the problem.

**There is no scheduler in this deployment.** No cron, no worker, no
APScheduler, no Celery. `render.yaml` defines web services only. I
checked before designing around it.

So the purge is built in two halves:

1. **`services/signing_purge.py::purge_signer_contact()`** — idempotent,
   batched, returns a count. Finds signer participants whose request is
   terminal (booked and past, or expired, or cancelled) by more than
   **90 days** (proposed default, configurable), NULLs `email` and
   `phone`, stamps `contact_purged_at`. **`display_name` survives** — a
   name is not contact information, and the record of who agreed to what
   must outlive the ability to contact them.
2. **Two invocations, same function.**
   - `backend/scripts/purge_signer_contact.py`, ready for a Render Cron
     Job. **Creating that cron service is a deploy-topology change,
     which is Tier 3 — owner-only, not delegated.** It is the durable
     answer and I am flagging it rather than building toward it.
   - Until then: an **in-request sweep**, throttled to at most once an
     hour via a `system_jobs(job_name, last_run_at)` row taken with
     `FOR UPDATE SKIP LOCKED`, called from the signing router. No
     topology change, genuinely a mechanism, and testable.

**The honest caveat, stated because it will matter later:** the
in-request sweep runs only if somebody uses the product. For a retention
deadline that lags gracefully, that is acceptable. It is **not**
acceptable as the backing for a promise of deletion within a stated
window. If the privacy language ever says "within 90 days," the cron
service stops being optional.

**Tests:** contact is gone after the window; `display_name` and the
responses survive; a request still inside the window is untouched;
running twice changes nothing the second time; the throttle actually
throttles.

---

## 5. What ships around the loop

**Emails (5 new templates, all through the one E1 transport with the
ADMIN3 ledger):** notary invited; signer invited; windows posted (to
signers); proposal received (to notary); **booked** (to everyone, with
the `.ics`). Signer-facing copy gets its own review pass — it is the
first email this product sends to somebody who did not sign up.

**Reminders:** officer-triggered only in v1, per the ruling, capped at 3
per participant. A consumer surface with an uncapped send button is a
spam vector pointed at our own customers' clients.

**`.ics` to everyone on booking**, `METHOD:PUBLISH`, one zone, per §13's
existing treatment.

---

## 6. Part D — the scheduling page

Read-only aggregation over `signing_requests` for the officer: date/time,
property, notary, derived state. Month grid + week/list toggle as
specified. No new state, no availability engine, no external sync.

---

## 7. Honest estimate — and this does not fit two weeks

| part | estimate |
|---|---|
| A — PARTNER2 (phone masking, role registry) | 0.5 d |
| B — share entry points split | 1 d |
| C — schema + services + convergence | 2 d |
| C — three token surfaces + officer multi-signer create flow | 2 d |
| C — 5 templates + `.ics` + notifications | 1 d |
| C — purge mechanism + job + tests | 0.5 d |
| C — reminders | 0.5 d |
| C — tests, doctrine, pin retargeting, NOTARY1 migration | 2 d |
| D — calendar month grid + week/list | 2 d |
| **total** | **11.5 days** |

**That is past ~2 weeks once anything goes wrong, and something always
does.** Flagging it now, as instructed, so the cut is deliberate.

### The cut I recommend

**Cut Part D's month grid; ship a sorted agenda/list view in v1.**
Saves ~1 day and lands the total near 10.5. A list sorted by date
answers "what is coming up and what is stuck" completely; the month grid
is the attractive version of the same information, and it is the only
item on this list that no workflow depends on.

### The cut I recommend AGAINST

**Do not cut the signer counter-proposal loop**, even though it is the
second-largest saving (~1.5 days with its cap, the notary's
accept/decline, and its template). Cutting it means signers may only
pick from windows the notary posted, and when none work the officer is
back on the phone — which is **precisely the hole this reversal was made
to close**. Cutting it would spend two weeks rebuilding Option A with
more steps.

### If more must come out

In order, least damaging first: reminders → v1.1 (the officer can resend
from the request page, ~0.5 d); then the notary's PCOR on the signing
token (~0.25 d, she can get it from the officer). Both degrade into an
existing manual path. Neither touches the coordination itself.

---

## 8. Owner items this raises (not code, and not mine to decide)

1. **A privacy statement covering non-users.** NOTARY0b's own argument
   against Option B was that signers "cannot see what we hold and cannot
   ask us to delete it." The reversal does not answer that objection — it
   converts it into a requirement. What we hold (name, email, optional
   phone, their answers), for how long (90 days proposed), and how a
   non-user asks for removal, should ship **with** Part C rather than
   after it.
2. **Transactional email to consumers.** These are transactional, not
   marketing, but somebody who never signed up will receive mail from a
   brand they do not know. Worth a look before the first send.
3. **The Render Cron Job** for the purge — Tier 3, and the difference
   between a retention practice and a retention promise.
4. **The signer surface's notary-name question** in §2 above.

None of these blocks Parts A or B, and none blocks *starting* C. Item 1
should land before the first real signer email goes out.
