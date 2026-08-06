# DX0 — the partner door

**Investigation only. No build.** Scoped to partner #1 = **TitleSense**
per the ledgered ruling: SDK shape, webhook events, API-key lifecycle for
a known first consumer, the deep-link pattern (external finding → DeedPro
opens with a document staged from the payload), and the inbound rule that
**external interpretations arrive as PROPOSALS, never facts** —
`titlesense` joins the source enum on that footing.

Everything below was read out of the code named in it, on `main` at
`34de330`. Where the answer is "nothing exists", that is stated rather
than described as a gap to be filled later.

The four ledgered pre-inputs (source sub-granularity, `ClientRequestKey`,
`openness_basis: conflict`, `pending: live_capture`) are addressed in §7,
each against what the code can actually receive today.

---

## 0. The finding that reorganises the rest

**The partner door is two doors, and only one of them is built.**

| | **built** | **DX0's brief** |
|---|---|---|
| direction | outbound render | inbound findings |
| caller supplies | a complete, decided deed | observations and interpretations |
| DeedPro returns | a finished PDF | a staged draft for an officer |
| officer | **not in the loop** | **is the entire point** |
| success | bytes rendered | a human opened it and decided |

`POST /api/v1/deeds` is a rendering service. The caller states the deed
type, the parties, and the transfer-tax declaration explicitly (nothing
is defaulted — §1, and A2 pinned it), and gets an instrument back. It has
no concept of a candidate, a proposal, a confirmation, or amber.

The TitleSense door is the opposite in every one of those respects. It
carries things nobody has decided yet, and its output is not a document
but a **decision surface**.

These are not two verbs on one endpoint. Designing the second as a
variant of the first is the single largest architectural risk in this
work, because every default that makes the render API convenient — a
complete payload, a synchronous PDF, no human — is a doctrine violation
on the findings path.

---

## 1. What exists today

`/api/v1`, seven routes, deed-family only (§8):

```
POST /api/v1/deeds                    create + render
GET  /api/v1/deeds                    list
GET  /api/v1/deeds/{id}               read
GET  /api/v1/deeds/{id}/pdf           bytes
POST /api/v1/transfer-tax/calculate   stateless calculator
GET  /api/v1/verify/{document_id}     PUBLIC authenticity check
GET  /api/v1/openapi.json             the published contract
```

Auth is `Authorization: Bearer <key>`, prefix lookup + hash validation,
per-hour and per-day rate limits with `X-RateLimit-*` headers, and an
`Idempotency-Key` header backed by a unique index. `api_usage_log`
records every call. The `/developers` page documents idempotency and
retries honestly.

That surface is in good shape **for what it is**. The findings below are
about what it is not.

---

## 2. `api_deeds` is disjoint from `deeds` — the staging endpoint cannot be built on it

The load-bearing structural fact.

`POST /api/v1/deeds` writes to **`api_deeds`**, keyed to `api_key_id`.
That table has **no `user_id` column** — not unset, absent — and the
insert names every column it fills:

```
INSERT INTO api_deeds (
    deed_id, document_id, api_key_id, deed_type, status,
    property_address, property_city, property_county, property_apn,
    grantor_name, grantee_name, transfer_tax_amount, transfer_tax_exempt,
    pdf_data, request_data, authenticity_id, idempotency_key)
```

The builder reads **`deeds`**, scoped to `user_id` on every query. So:

> Nothing created through the partner API is visible to any logged-in
> officer, by construction. The two systems share a database and no rows.

For a rendering service that is correct — the caller is a machine and
there is no officer. For a **staged draft it is fatal**: a deep link that
opens DeedPro on an `api_deeds` row would open on something the session
cannot read.

**Therefore the first real decision DX0 surfaces:**

> **Who owns an inbound staged draft?**

Three shapes, with their costs:

| option | mechanism | cost |
|---|---|---|
| **A. Partner names the officer** | payload carries an officer identifier; draft lands in `deeds` with that `user_id` | TitleSense must know DeedPro user identities — a mapping neither side has, and a privacy surface |
| **B. Org inbox** | draft lands against an organisation; any member claims it | `api_keys.organization_id` exists but **`deeds` has no org column**, and RED-S5 (the org model) is deferred by decision. This option silently un-defers it |
| **C. Claim-by-token** | draft lands unowned; partner returns a one-time link; the first authenticated officer to open it takes ownership | no new identity mapping, no org model; but "unowned draft" is a new lifecycle state, and an unclaimed one needs an expiry policy |

**C is the only one that does not require a deferred ticket to fire
first**, and it reuses machinery that exists (`deed_shares` tokens). It is
not recommended here — this is investigation — but the sequencing
consequence should be explicit: **A needs an identity contract, B needs
RED-S5, C needs neither.**

---

## 3. API-key lifecycle: two defects, both live

### 3.1 `scopes` is decoration

`api_keys.scopes` is declared, defaulted to
`ARRAY['deed:create','deed:read']`, selected in the auth query, and
returned in the auth dict:

```python
scopes = row['scopes']
...
return {"id": ..., "scopes": scopes or [], ...}
```

**It is never read again.** Grep the whole backend: no endpoint checks it,
no dependency enforces it, nothing compares a route to a scope. Every
valid key can call every `/api/v1` route.

Today that is nearly harmless — one shape of consumer, all routes
equally available. It stops being harmless **the moment there is a second
kind of key**, which is exactly what DX0 introduces: a TitleSense key
should be able to *stage findings* and must **not** be able to *render
finished deeds*. That distinction is the entire reason the column exists,
and the column does not work.

**This is a precondition, not a nice-to-have.** Shipping a findings
endpoint before scopes are enforced means the first partner key can
render instruments.

### 3.2 `revoked_at` is written by nothing and read by nothing

The column is declared. `DELETE /admin/api-keys/{id}` sets
`is_active = false` and nothing else. The auth query selects `is_active`
and tests it; it does not select or test `revoked_at`.

So the column is a lifecycle feature that does not exist, shaped exactly
like one that does. The hazard is specific and near: a future revoke path
written by someone who reads the schema rather than the auth query would
set `revoked_at`, believe the key dead, and **leave it working**.

Either make it authoritative (write it on revoke, test it in auth) or
delete it. What it must not stay is a column that looks like a guarantee.

### 3.3 What has no answer at all

- **Expiry.** No `expires_at`, no rotation, no grace period. Keys are
  eternal until an admin deactivates one by hand.
- **Rotation.** No mechanism to issue a successor and retire a
  predecessor with overlap. For a partner integration this is the
  difference between a routine credential change and an outage.
- **Per-key secrets for inbound verification.** Nothing exists — see §4.

---

## 4. Webhooks: greenfield, and the word is doing work

There is **no outbound webhook infrastructure**. The only webhook code in
the repo is `phase23_billing/router_webhook.py`, which *receives* Stripe
events. Nothing signs, sends, retries, or logs a delivery.

So "webhook events" in the DX0 scope is not an extension. Everything
listed below is unbuilt:

- an event taxonomy and payload envelope
- a per-endpoint signing secret (distinct from the API key: an API key
  authenticates *them to us*; a signing secret authenticates *us to them*)
- delivery attempts, retry with backoff, and a dead-letter state
- a delivery log the partner can inspect when they believe they missed one
- replay protection on the receiving side

**And a scoping question worth asking before any of it is designed:**
what events does TitleSense actually need? If the deep-link pattern (§5)
carries the officer from their system into ours, the return path may be
*one* event — "the officer completed a document for your
`ClientRequestKey`" — rather than a general event bus. A one-event
integration and an event platform are different bodies of work by an
order of magnitude, and the brief does not yet say which this is.

---

## 5. The deep link: a precedent exists, and it should be extended rather than replaced

The builder already opens from a stored document:

```
/deed-builder/[type]?resume=<deedId>
```

`resume` is read in `page.tsx` and restores through `lib/deedResume.ts`,
which is where the provenance-restoring rules live (a resumed draft never
invents a `confirmedAt` — pinned in `s3_thursday_walkthrough.py`).

A staged inbound draft is the same shape: a document that exists, is
incomplete, and must restore with its provenance intact. **The staging
link should be a variant of `resume`, not a parallel mechanism.** Two
independent restore paths would drift, and the one that drifts is the one
that loses the amber/violet distinction — the exact defect Doctrine A
just spent a ticket removing from the extraction paths.

The restore path is also where §7's `pending: live_capture` lands
safely: a field that has not arrived is a field the draft simply does not
have, which the builder already handles (U0 — absence is not a candidate).

---

## 6. The inbound rule already has machinery — Doctrine A and B built it

The ruled inbound rule is *external interpretations arrive as proposals,
never facts*. That is now a shape the product has, not a principle it
aspires to:

| the rule needs | what exists after A and B |
|---|---|
| facts land amber, confirmable | `Sourced<T>` + `FieldStatus = 'candidate' \| 'confirmed'` |
| interpretations land violet, not confirmable by the field gate | `VestingProposal` with `status: 'proposed'`, deliberately **outside** `FieldStatus` (§11) — the generation gate is type-incapable of offering one |
| every interpretation names whose conclusion it is | `basis` (H1 §2.3), and `vesting_split.basis_for()` already maps `titlesense.prelim_extraction` → *"The preliminary title report states"* |
| mixed content never occupies a fact position | `vesting_split` / `vestingSplit.ts` + the shared corpus |
| prose never chooses for the officer | §12's scanner and prompt boundary |

**This is the most reassuring finding in the investigation.** The doctrine
work of the last two tickets was not preparation for the partner door by
accident — it built the exact receiving shape the contract requires. An
inbound proposal has somewhere correct to land.

One caveat, stated because it will be tempting: `vesting_split` runs on
**inbound composites** too. H1 §2.2 obliges TitleSense to emit split
values, but DeedPro should split again rather than trust the wire —
the internal rule does not defer to the sender. Cheap, and it removes a
class of trust the contract cannot enforce.

---

## 7. The four ledgered pre-inputs, against what the code can receive

**1 — sub-source granularity.** `FieldSource` is a flat union in
`frontend/src/types/builder.ts`:

```ts
type FieldSource = 'sitex' | 'google' | 'user' | 'titlepoint' | 'prelim' | 'ai_suggested';
```

`titlesense.prelim_extraction` and `titlesense.titlepoint` are the same
proposal colour and a different **warrant**. Two options: dotted
sub-source strings in the same union (cheap, and `basis_for()` already
keys on the dotted form), or a `{source, subSource}` pair (cleaner, and
touches every provenance reader and the persisted `deeds.metadata`
shape — including rows already written). **The persisted-shape migration
is the real cost, and it is the reason to decide this before the first
payload rather than after.**

**2 — `ClientRequestKey` as the matter/escrow join.** `Idempotency-Key`
exists with a unique index on `(api_key_id, idempotency_key)`, and it is
the right *mechanism*. But it is not the right *key*: idempotency is
per-key and per-request, while a matter join is per-escrow-file and
outlives many requests. `services/matters.py` threads documents by
escrow number today. **These are two different identifiers that will be
tempting to collapse into one**, and collapsing them means a second
document on the same escrow file reads as a duplicate submission.

**3 — `openness_basis: conflict` has no home.** Searched: there is **no
disagreement state anywhere in the product**. Every field is one value
with one provenance and one status. A first-class "two sources disagree"
display state is new data shape *and* new UI, and it is the largest
unbuilt piece in the inbound direction. The doctrine constraint is clear
(never auto-reconciled — picking a winner silently is auto-applying a
legal conclusion under a data label); the affordance for showing a
disagreement to an officer does not exist and has never been designed.

**4 — `pending: live_capture`.** Handled by §5's restore path and U0: a
leaf that has not arrived is simply not in the draft, and absence is not
a candidate. **The instruction to design against envelope semantics only
should be followed literally** — no leaf mappers. The one place a mapper
would be justified is `prelim_data` → the five T-6 slots, and that
mapping is already written against a document that exists
(`docs/PRELIM_FIELD_MAP.md`, whose row 3 now maps three ways after
Doctrine A).

---

## 8. What DX0 recommends be decided, in order

Investigation output. No build, and none of these are decided here.

1. **Ownership of an inbound staged draft** (§2, A/B/C). Everything else
   depends on it, and B silently un-defers RED-S5.
2. **Scope enforcement** (§3.1) — a precondition for a second kind of
   key, not a follow-up.
3. **`revoked_at`: authoritative or deleted** (§3.2).
4. **Is the return path one event or an event platform?** (§4) — an
   order-of-magnitude difference the brief does not yet settle.
5. **Sub-source shape: dotted string or pair** (§7.1) — decide before the
   first payload; the cost is a persisted-shape migration.
6. **Whether `ClientRequestKey` and `Idempotency-Key` are one identifier
   or two** (§7.2). They are two.
7. **The disagreement affordance** (§7.3) — the largest unbuilt piece,
   and the one furthest from anything the product currently does.

## 9. What DX0 found in good order

Recorded because a report that only lists problems misdescribes the
codebase.

- Idempotency is real, indexed, and honestly documented.
- Rate limiting works, with correct headers, per hour and per day.
- `api_usage_log` records every call; attribution exists.
- The public `verify/{document_id}` surface is the right shape for a
  partner to link to.
- The doctrine receiving shape (§6) is built and pinned.
- `/developers` documents what is true and does not promise webhooks,
  SDKs or scopes that do not exist. **That honesty is load-bearing** —
  the page could easily have described the scope model that does not work.
