# PRELIM_FIELD_MAP — DeedPro's extraction slots

**Purpose.** This is the named input to open item #1 of
[`docs/integrations/H1_CONTRACT.md`](integrations/H1_CONTRACT.md) (§6.1,
§10.1): the inventory of every slot DeedPro's T-6 prelim PDF import
fills, so structured `prelim_data` from TitleSense and DeedPro's own
extraction land in **the same slots** — with the PDF parser demoted to
third-party-paper fallback rather than kept as a parallel truth.

**Status.** Descriptive of what ships today, not aspirational. Every row
below was read out of the code named in it. Where the contract and the
product disagree, the disagreement is stated rather than smoothed —
§6.1's whole point is that structured findings must land where the
parser already lands, and that is only checkable if this document is
honest about where that is.

---

## 1. The slots

T-6 (`backend/services/prelim_import.py`, `FIELD_LABELS`) extracts
**five** fields. That number is a ruling, not a limit reached by
accident: it is the set an officer retypes from a prelim every time.

| # | extraction key | label shown | builder field | save-contract field | type | arrives |
|---|---|---|---|---|---|---|
| 1 | `apn` | APN | `property.apn` | `apn` | string | **amber** — candidate |
| 2 | `legal_description` | Legal description | `property.legalDescription` | `legal_description` | string (long) | **amber** — candidate |
| 3 | `vested_owner` | Vested owner | `property.owner` | `current_owner` | string | **amber** — candidate ⚠️ **see §3** |
| 4 | `county` | County | `property.county` | `county` | string | **amber** — candidate |
| 5 | `property_address` | Property address | `property.address` | `property_address` | string | **amber** — candidate |

Sources of truth for that table:

- extraction keys and labels — `backend/services/prelim_import.py`
- builder fields — `PropertyData` in `frontend/src/types/builder.ts`
- save-contract fields — `DeedCreate` in `backend/routers/deeds_crud.py`

---

## 2. Amber semantics

Every extracted value is a **candidate**, never a confirmed value. The
carrier is `PropertyProvenance` (`frontend/src/types/builder.ts`):

```ts
{ value: string; source: FieldSource; status: FieldStatus; confirmedAt?: string }

FieldSource = 'sitex' | 'google' | 'user' | 'titlepoint' | 'prelim' | 'ai_suggested'
FieldStatus = 'candidate' | 'confirmed'
```

Rules that hold for every row above:

- **`source: 'prelim'`** on import. Deliberately **not** `ai_suggested`:
  a labelled pattern match is not a suggestion, and mislabelling it
  would smuggle in an LLM ruling nobody has made.
- **`status: 'candidate'`** on arrival. `confirmedAt` is absent until the
  officer acts; a resume that invented one would forge a review that
  never happened (pinned in `scripts/s3_thursday_walkthrough.py`).
- **An empty field has nothing to confirm** and never blocks generation
  (U0). Absence is not a candidate.
- **A field with no provenance stamp is treated as a candidate** — legacy
  data fails toward re-asking, never toward assumed-confirmed.

### For the wire (§2.1)

Rows 1, 2, 4, 5 are **facts** and map cleanly onto contract candidate
facts. They arrive amber in both worlds and the mapping is one-to-one.

Row 3 does not. See below.

---

## 3. ⚠️ Row 3 is mixed content — the one slot that does not map

`vested_owner` is extracted by this pattern
(`prelim_import.py`, `_VESTED`):

> `Title to said estate or interest at the date hereof is vested in:`

What follows that phrase on a real preliminary report is typically:

```
JOHN A. DOE AND JANE B. DOE, HUSBAND AND WIFE AS JOINT TENANTS
```

That is **a name plus a legal characterization of how title is held** —
precisely the case H1 §2.2 legislates:

> **2.2 — Mixed content is emitted split, never whole.** […] TitleSense
> emits the parties as facts and the vesting characterization as a
> separate interpreted field. TitleSense never emits the composite string
> as a single value in a fact position. The composite may be carried in
> `verbatim` for audit, flagged `mixed_content: true`.

**Today DeedPro does the thing the contract forbids**: the composite
lands whole in `property.owner`, a fact position, as a single candidate.
RED0 found the same defect from the inside (R3-2) — the taxonomy is
drawn by field *name* rather than by *content*, and the one field whose
content is mixed slipped through on its label.

So this row is the mapping's open edge, and it is open on **both** sides
of the wire for the same reason.

**Resolved by Doctrine A** (queued, ruled): extraction emits names as
fact-candidates and the vesting characterization as a separate violet
proposal; the composite is carried verbatim for audit, flagged
`mixed_content`; no code path may write a characterization into a
confirmed field without an acceptance record. When that ships, row 3
becomes:

| extraction key | lands as | position | arrives |
|---|---|---|---|
| `vested_owner.parties` | `property.owner` | fact | amber — candidate |
| `vested_owner.vesting_characterization` | vesting section | **interpretation** | **violet — proposal**, acceptance recorded |
| `vested_owner.verbatim` | audit only | neither | `mixed_content: true` |

**This table is the acceptance criterion for Doctrine A**, and it is
also what §10.1's mapping work should be written against — not against
today's single slot, which is the defect.

---

## 4. What T-6 does NOT extract

Named so §6.1's mapping does not assume a slot that does not exist.
`prelim_data` facts outside this list have **no landing slot today**;
adding one is a product decision, not a mapping detail.

- exception / requirement items (numbered) — **not extracted**
- recording references as cited — **not extracted**
- effective date of the report — **not extracted**
- order number — **not extracted** (the builder has `title_order_no`,
  but the officer types it; the parser does not read it)
- vesting *document* references — **not extracted**

§6.1 lists several of these as `prelim_data` facts. That is a real gap
between what the contract can send and what DeedPro can currently
receive, and it is the substance of open item #1 rather than an
oversight to be papered over.

---

## 5. Refusal semantics — what "no data" means

Relevant to the mapping because a structured `prelim_data` finding must
not be able to produce a state the parser refuses to produce.

- **No text layer** (a scanned prelim) → `PrelimUnreadable`, raised
  loudly. Never an empty-but-successful result. `MIN_TEXT_CHARS = 200`,
  because scanned PDFs commonly yield a handful of stray characters from
  a fax banner and `== 0` would let exactly those through.
- **Readable but unparseable** → also a refusal. An empty candidate list
  rendered as a result would tell the officer her prelim was empty,
  which is a different and untrue statement.
- **Per-field absence** → the field is simply not in `candidates`, and
  appears in `not_found`. The officer types it.

The mapping consequence: a `prelim_data` finding carrying *no* facts is
a refusal, not an empty success, and must surface as one.

---

## 6. Underwriter templates — UNVERIFIED

`prelim_import.TEMPLATES` names five underwriters (First American,
Fidelity National, Chicago Title, Old Republic, Stewart). **All five
currently use the generic patterns**, and all are marked `UNVERIFIED` in
source: they are hypotheses about label conventions, not observations of
real reports.

Recorded here because it bears directly on §6.1's "demoted to
third-party-paper fallback": the fallback is weaker than its structure
suggests, which strengthens rather than weakens the case for structured
`prelim_data`.

Verification needs real prelims from each underwriter — an owner-side
input, already ledgered.

---

## 7. Change discipline

This document is an **input to a contract**. If the slots change, this
file changes in the same PR, and §10.1's mapping is re-checked.

Adding an extraction key without adding it here means the contract is
mapping against a product that no longer exists.
