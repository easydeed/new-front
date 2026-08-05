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
| 3 | `vested_owner` | Vested owner | `property.owner` (**parties only**) | `current_owner` | string | **amber** — candidate ⚠️ **see §3** |
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

## 3. Row 3 is mixed content — split, as of Doctrine A

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

**Until Doctrine A, DeedPro did the thing the contract forbids**: the
composite landed whole in `property.owner`, a fact position, as a single
candidate. RED0 found the same defect from the inside (R3-2) — the
taxonomy is drawn by field *name* rather than by *content*, and the one
field whose content is mixed slipped through on its label.

**Doctrine A shipped the split.** Row 3 now lands in three places:

| extraction key | lands as | position | arrives |
|---|---|---|---|
| `vested_owner.parties` | `property.owner` | fact | amber — candidate |
| `vested_owner.vesting_characterization` | vesting section | **interpretation** | **violet — proposal**, acceptance recorded |
| `vested_owner.verbatim` | audit only | neither | `mixed_content: true` |

That table was written as Doctrine A's acceptance criterion before the
work started, and it is what §10.1's mapping should be written against.

**In the code:** `backend/services/vesting_split.py` and
`frontend/src/lib/vestingSplit.ts` — one rule in two languages, held
together by the shared corpus at `backend/services/vesting_cases.json`
which both test suites read. The prelim parser and the county-record
(SiteX) mapping both go through it; neither has its own.

**On the wire**, `import_prelim` now returns:

```
candidates    facts only — the PARTIES, amber, confirmable
proposals     the CHARACTERIZATION — status 'proposed', never
              'candidate', carrying a basis naming its claimant
verbatim      {vested_owner: {text, mixed_content}} — audit only, a bare
              string so nothing that walks `candidates` can offer it
needs_review  read but not separable. NOT the same as `not_found`.
```

### The one thing this split refuses to do

A composite with a name on **both** sides of a characterization —

```
JOHN DOE, AN UNMARRIED MAN AND MARY ROE, A SINGLE WOMAN,
AS TENANTS IN COMMON
```

— is not split at all. Cutting at the first marker would file MARY ROE
inside the characterization and drop a real owner out of the fact
position; a missing grantor is worse than an unsplit string. Both halves
are withheld, the original is shown as printed, and the officer types
them. Same posture as §5's refusals: an honest "we could not separate
this" beats a confident wrong answer.

### And the characterization is the OLD one

`vested_owner` says how the **current** owner holds title. It is not how
the grantees will hold title under the deed being drafted. The proposal
is labelled "How title is held TODAY", its basis says so in words, and
nothing is pre-selected from it — the officer's acceptance is what writes
a vesting, recorded as a legal choice with the basis she read.

A mapping note for §10.1: structured `prelim_data` arriving already split
(H1 §2.2 requires TitleSense to emit it split) maps straight onto these
three slots. Structured data arriving UNSPLIT is a contract violation on
the sender's side, and DeedPro will split it again rather than trust it —
the internal rule does not defer to the wire on this.

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
