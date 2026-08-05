# H1 — TitleSense → DeedPro Finding Contract

**Version:** v1.1 — **ratified**
**Status:** Approved by the DeedPro side and ratified by the owner (Jerry), August 2026, under §7 of the DeedPro ↔ TitleSense Integration Plan. v1 was approved subject to one amendment (finding supersession, §3.2); that amendment is incorporated here.
**Producer:** TitleSense. **Consumer:** DeedPro.
**Amendment rule:** either session may propose amendments; the owner rules; this document is then versioned and re-shared so exactly one current agreement exists.

---

## 0. What this document is

The wire contract for findings crossing from TitleSense into DeedPro. It defines **finding types, envelope semantics, the fact/interpretation split, provenance, confidence, and coverage**.

It deliberately does **not** define leaf field shapes for TitlePoint-derived payloads. The captured TitlePoint documentation (53 QA2 pages) specifies request envelopes completely but result payloads only at the container level — the one documented result envelope, `DocumentListResult`, elides the interior of `Parties`, `Items`, and `DocumentIdentifications`, which is exactly where recording date, instrument number, and party position live (source: `PropertyParameters.html`).

Every field whose shape is not documented is marked **`pending: live_capture`**. It is filled from one real captured production result, after the TitlePoint ToS review clears — never from inference.

**No field in this contract was invented.** That is the document's central discipline, and any amendment that adds a field must state whether it is documented, observed in a live capture, or a TitleSense construct.

---

## 1. Scope and non-goals

**In scope (v1):** findings TitleSense produces and DeedPro consumes; the routing rule that determines whether a value arrives amber or violet in DeedPro; the provenance and confidence a DeedPro officer sees at decision time.

**Not in scope:** transport and auth (DeedPro DX0 owns these); the deep-link URL pattern (H2); the loop-closure webhook (H3); TitleSense's internal interpretation algorithms; rendering.

**Non-goal:** this contract does not make TitleSense a component of DeedPro. TitleSense v1 ships standalone to Pacific Coast Title with no DeedPro dependency. This contract describes an optional consumer.

---

## 2. The law

These rules are not defaults. They are the reason the integration is safe to build.

**2.1 — Facts may be prefilled; conclusions may not.**
Raw recorded facts (recording date, instrument number, party names *as recorded*) cross as **candidate facts** and arrive amber in DeedPro, requiring officer confirmation. Every conclusion — "appears released," "current vesting reads X," "likely match" — crosses as a **proposal** and arrives violet, requiring explicit officer acceptance recorded with source, timestamp, and the basis shown at decision time.

**2.2 — Mixed content is emitted split, never whole.**
A vested-owner string such as `JOHN DOE AND JANE DOE, HUSBAND AND WIFE AS JOINT TENANTS` is a name **plus** a legal characterization. TitleSense emits the parties as facts and the vesting characterization as a separate interpreted field. TitleSense never emits the composite string as a single value in a fact position. The composite may be carried in `verbatim` for audit, flagged `mixed_content: true`.

**2.3 — Basis names whose conclusion it is.**
Two violet proposals of equal confidence can carry unequal warrant. "The underwriter's prelim asserts it" and "TitleSense inferred it from the chain" are different claims, and the officer accepting one deserves to know which. `basis.claimant` is mandatory on every interpretation.

**2.4 — Consumed conclusions are disclosed, not laundered.**
Where TitleSense relies on a third party's judgment (notably TitlePoint's `OpenEncumbrances` filter), that reliance is disclosed in the payload rather than merged into a TitleSense confidence tier. Disagreement between a consumed conclusion and a TitleSense conclusion is a **first-class state**, not an error to reconcile away.

**2.5 — Absence is stated, never implied.**
"No matching release was identified" is a claim about what was searched. It is only meaningful alongside `coverage` (§5). A finding without coverage is not deliverable.

---

## 3. Envelope

Every payload crossing the wire:

```
{
  "contract_version": "1.1",
  "producer": "titlesense",
  "emitted_at": "<ISO-8601>",
  "client_request_key": "<string>",     // see §4
  "subject": { ... },                   // see §4
  "coverage": { ... },                  // see §5
  "findings": [ <Finding>, ... ]
}
```

Each `Finding`:

```
{
  "finding_id": "<stable id, TitleSense-issued>",   // idempotency / dedup key — see §3.2
  "type": "<one of §6>",
  "status": "active" | "withdrawn",     // see §3.2.4
  "supersedes": "<finding_id>" | null,  // immediate predecessor only — see §3.2
  "supersession_reason": "<see §3.2.3>" | null,
  "source": "titlesense.prelim_extraction" | "titlesense.titlepoint",
  "retrieved_at": "<ISO-8601>",
  "facts": { ... },                     // → amber in DeedPro
  "interpretations": [ <Interpretation>, ... ],   // → violet in DeedPro
  "verbatim": { ... }                   // optional; source strings for audit
}
```

Each `Interpretation`:

```
{
  "field": "<name>",
  "value": <any>,
  "confidence": "confirmed" | "likely" | "possible" | "none_found",
  "basis": {
    "claimant": "titlesense_inference"
              | "underwriter_prelim"
              | "titlepoint_filter"
              | "county_record",
    "statement": "<plain-language sentence shown to the officer at decision time>",
    "evidence": [ <reference to facts in this or another finding> ]
  }
}
```

**`basis.statement` is the string DeedPro records as "the basis shown at decision time."** It is written for an officer, not a developer. It must be true, specific, and free of the language prohibited in §8.

### 3.1 Confidence tiers

| Tier | Meaning |
|---|---|
| `confirmed` | A direct documentary reference ties the records together (e.g. the release names the original recording). |
| `likely` | Parties, lender, amount, sequence, and timing strongly align; no direct reference. |
| `possible` | Some information aligns; material gaps remain. |
| `none_found` | No supporting record was identified **within `coverage`**. Never rendered as "none exists." |

Confidence describes TitleSense's own reasoning only. It never absorbs a third party's certainty — see §7.3.

### 3.2 Identity, idempotency, and supersession

Escrow reality: prelims are amended constantly — supplemental reports, date-downs, revised exceptions are routine, and a re-search returns a changed world. The contract must say what happens when TitleSense re-extracts after an officer has already accepted proposals from the original. This is DeedPro's document-lineage law (T-5) applied to the wire: **recorded decisions are never retroactively altered.**

#### 3.2.1 Producer obligations

1. **`finding_id` is the idempotency and dedup key.** DeedPro may receive the same `finding_id` more than once and must treat repeats as the same finding.
2. **A finding's content is never mutated.** A finding is never re-emitted with changed `facts`, `interpretations`, `coverage`, or `status` under the same `finding_id`.
3. **Re-emission is permitted only when content is unchanged.** Byte-identical re-emission under the same id is a safe no-op — that is what makes the id an idempotency key rather than merely a label.
4. **Change is expressed as a new finding** carrying `supersedes: <predecessor finding_id>` and a `supersession_reason`.
5. **A finding is never deleted.** Removal is expressed as withdrawal (§3.2.4), never absence.

#### 3.2.2 Chains and granularity

`supersedes` names the **immediate predecessor only**. Chains are permitted and expected (original → amended → date-down); DeedPro walks the chain rather than TitleSense flattening it.

**Granularity rule:** a successor is emitted **only for findings whose content actually changed.** When an amended prelim alters three exceptions out of forty, three successors are emitted; the other thirty-seven persist under their original `finding_id`. Re-emitting unchanged findings as successors would generate spurious "review the successor" notices and train officers to dismiss the signal that matters.

**Consequence for `coverage`:** when the source document itself changes, `coverage.prelim_document` changes for every finding derived from it. Coverage is therefore carried at envelope level and versioned there — an unchanged finding under its original id remains true; the *envelope* states which document version was in hand at emission. Where a coverage change materially alters what a finding claims (a narrowed search, a different plant date), that finding *has* changed and requires a successor.

#### 3.2.3 `supersession_reason` — the world changed, or we did

An officer told "the source finding has a successor" deserves to know which happened. These are not the same event and must not share a label:

| Value | Meaning |
|---|---|
| `amended_source_document` | The prelim was supplemented, amended, or dated down. The world changed. |
| `re_search` | A later TitlePoint search returned different records. The world changed. |
| `producer_correction` | TitleSense's earlier extraction or interpretation was wrong. **We** changed. |
| `coverage_change` | The search scope behind the finding changed materially. |

`producer_correction` is the one that matters most and the one a lesser contract would hide. When TitleSense was wrong, the successor says so plainly in its `basis.statement`, and DeedPro's officer sees that they accepted a proposal we have since corrected — not a vague notice that something moved.

#### 3.2.4 Withdrawal

An amended prelim can delete an exception outright, leaving no successor content. This is expressed as a successor finding with `status: "withdrawn"`, an empty `facts` and `interpretations`, a `supersession_reason`, and a `basis.statement` explaining the removal. One mechanism, not two — a withdrawal is a supersession whose successor asserts nothing.

`status: "withdrawn"` never means "this was never true." It means "this is no longer asserted as of this emission."

#### 3.2.5 Consumer obligations (DeedPro)

1. **Recorded decisions stand as recorded.** An officer decision made against a superseded finding remains valid as recorded — the basis they saw is the basis that was true at decision time. Supersession never retroactively alters a recorded acceptance, its timestamp, or its stored basis string.
2. **Supersession surfaces as information, never as silent revision.** "The source finding has a successor; review it" is shown to the officer. Amber fields are not silently re-prefilled and violet proposals are not silently re-proposed on the strength of a successor.
3. **Withdrawal does not retract a decision.** It informs; the officer decides what follows.

---

## 4. Identity anchors

| Key | Role | Status |
|---|---|---|
| `subject.apn` + `subject.fips_code` | Primary join for property-level findings. FIPS preferred over county name — `CreateService4` exists specifically because county-name spellings diverge (source: `AddlServicesCreateService.html`). | Documented |
| `subject.recording_reference` (`record_date` + `instrument_number`) | Document-level match; the H3 loop-closure key. | Documented as *input* params (`Document.RecordDate`, `Document.InstrumentNumber`, source: `DocumentParameters.html`); output shape `pending: live_capture` |
| `client_request_key` | DeedPro matter / escrow number. Carried by TitlePoint via `General.ClientRequestKey`, documented as "data for the client's use, round-tripped with the results" (source: `GeneralInputParameters.html`). No side table needed. | Documented |
| `subject.address` | Convenience only. **Never** a join key. | — |

---

## 5. Coverage block

Mandatory. Without it, `none_found` is unfalsifiable and every absence claim is misleading.

```
"coverage": {
  "plant_type": "titlepoint" | "tpx_geo" | "tpx_gg" | "hybrid" | "n/a_prelim",
  "fips_code": "<5-digit>",
  "plant_dates": { pending: live_capture },   // container documented in DocumentListResult
  "search_from_date": "<requested>",
  "chain_anchor": { ... },                    // see §6.3; chain findings only
  "document_scope": [ <category codes actually requested> ],
  "not_searched": [ <plainly stated exclusions> ],
  "prelim_document": { ... }                  // prelim findings only: doc id, effective date, hash
}
```

`not_searched` exists because our most valuable claims are negative. "No matching reconveyance identified" is honest only when paired with what was excluded from the search.

---

## 6. Finding types

Ordered by **contractibility**, not product appeal. Each ships only when the one above it is stable.

### 6.1 `prelim_data` — v1, active

The only finding type in the standalone PCT product, and the first payload expected to cross the wire. Derived from a preliminary title report supplied to TitleSense, not from TitlePoint.

- `source`: `titlesense.prelim_extraction`
- **Facts:** transcribed values with a locator back into the source document — APN, legal description text, parties as printed, exception/requirement items as numbered, recording references as cited, effective date, order number.
- **Interpretations:** any characterization of what an item *means* — including vesting characterization (§2.2), whether an exception is monetary, whether an item is likely to be cleared at closing.
- **Warrant note:** where the prelim states a conclusion, `basis.claimant` is `underwriter_prelim` and `basis.statement` says so explicitly ("The preliminary report states X"). TitleSense does not adopt the underwriter's conclusion as its own.
- **Fact-that-a-document-says-X:** the presence and exact text of a statement in the prelim is a **fact**. Our reading of what it means is an **interpretation**. Both may appear in one finding.
- **Leaf status:** shapes are TitleSense's own, derived from documents we hold. **Not `pending`** — this is the one finding type fully specifiable at v1.

> **Open (item #1):** DeedPro's T-6 prelim PDF import produces candidate fields today. Its extraction-slot inventory arrives as `docs/PRELIM_FIELD_MAP.md` and gets mapped against this finding type in v1.2, so structured `prelim_data` and DeedPro's own extraction land in the same slots.

### 6.2 `recorded_instrument_observed` — v2

The lowest-interpretation chain finding, and the H3 loop-closure primitive.

- `source`: `titlesense.titlepoint`
- **Facts:** recording date, instrument number, document type and subtype as returned, parties as recorded with position, APN(s) touched.
- **Interpretations:** `ts_class` normalization (§7) only.
- **Leaf status:** `pending: live_capture` for all fields. Containers documented (`Parties`, `DocumentIdentifications`, `Items`); interiors are not.
- **Note:** `truncateDocumentParties` truncates party names per position (source: `AddlServiceGetResultByID.html`). If used, `facts.parties[].truncated: true` is mandatory — a truncated name must never be emitted as a complete one.

### 6.3 `chain_summary` — v2

Ownership history. Sourced via `GetFilteredResultByID` with the `Deedchain` filter.

- **Critical scope property:** `Deedchain` returns **only** document types in the Conveyances and Full Value Deeds categories (source: `AddlServiceGetResultByID.html`). Loans, assignments, and reconveyances are excluded by design. `chain_summary` is ownership-only and must never be presented as a complete document history.
- **`chain_anchor` is mandatory.** The filter finds the last Full Value Deed dated *at or older than* the From Date; where the nearest FVD is newer, the system walks back to the next oldest — potentially far earlier than requested. The chain's true start is therefore data-determined.

```
"chain_anchor": {
  "requested_from_date": "<what we asked for>",
  "actual_anchor_fvd": { pending: live_capture },
  "anchor_predates_request": true | false
}
```

Every rendering of a chain — officer-facing or client-facing — states the **actual anchor**, never the requested From Date. Reporting the request as the review period claims a review we did not perform.

- **Retrieval note:** use `Deedchain`, **not** `DeedchainOnly`. The `Only` variants drop the unfiltered chain to reduce payload size; open-item detection requires the unfiltered set as its denominator.

### 6.4 `open_encumbrance` — v2

- **Facts:** the underlying instrument records, per §6.2.
- **Interpretations:** whether an encumbrance appears open, and any release/assignment matching.
- **`openness_basis` mandatory:**

```
"openness_basis": "titlepoint_filter"        // TitlePoint's OpenEncumbrances filter says open
                | "titlesense_release_match" // our release matching says open
                | "both_agree"
                | "conflict"
```

`conflict` is a first-class deliverable state. It surfaces to the officer as a conflict, with both bases stated. It is never silently resolved in favour of either party, and it never collapses into a confidence tier — TitlePoint's filter is TitlePoint's conclusion, and we do not know its basis.

- **Retrieval note:** use `OpenEncumbrances`, not `OpenEncumbrancesOnly`, for the same reason as §6.3.

### 6.5 `current_vesting` — v2, last

Deliberately last. It is the mixed-content case (§2.2) in its purest form, and shipping it before the split has been exercised on simpler findings means shipping the split untested.

- **Facts:** parties as recorded, source instrument recording reference.
- **Interpretations:** vesting characterization, marital/entity/trust status, tenancy form — each separately, each with its own confidence and basis.
- **Prohibited:** emitting a composite vested-owner string in any fact position.

---

## 7. Document block

Carried on every finding that references a recorded document.

### 7.1 The vocabulary problem

The corpus contains at least three mutually incompatible document vocabularies, selected by plant and service family. They are not interchangeable and must not be flattened.

| Vocabulary | Source | Values |
|---|---|---|
| TitlePoint categories | `General.DocTypeCategoryList` (`GeneralInputParameters.html`) | `Conveyances`, `CourtRelated`, `Delinquencies`, `FVD`, `IME`, `Miscellaneous`, `NME`, `VME` |
| TPX/Xpress numeric | property-search `DocumentTypeCategory` (`PropertySearchParameters.html`) | `1`=Conveyance, `2`=Mortgage, `4`=Judgment & Lien, `6`=Easements, `7`=Restrictions, `8`=Leases, `9`=Misc, `All` |
| DocType / DocSubtype pairs | Appendix G (`DocType.html`) | ~27,000 lines, scoped "TitlePoint searches only" |

Notes carried forward deliberately: the TPX numeric list **skips 3 and 5** — the captured pages do not say what they are. "Mortgage" exists as a TPX category with no TitlePoint-category equivalent; TitlePoint splits the same ground across `VME` and `IME`. A fourth matching syntax exists on `General.DocList` (`DOC.SUB` / `DOC.` / `DOC` for explicit-subtype, blank-subtype, any-subtype).

**Appendix G is quarantined.** An initial structural parse produced ~6,779 candidate rows but drifted on repeated headers and inconsistent column counts. Those rows are not used and no mapping table is built on them until a real parser exists. The category names above are read directly from the parameter reference and are authoritative.

### 7.2 Shape

```
"document": {
  "raw": {                              // FACT → amber
    "doc_type": "<as returned>",
    "doc_subtype": "<as returned>",
    "source_vocabulary": "tp_category" | "tpx_numeric" | "doctype_subtype",
    "plant_type": "<see §5>",
    "fips_code": "<5-digit>"
  },
  "normalized": {                       // INTERPRETATION → violet
    "ts_class": "<closed set below>",
    "confidence": "<tier>",
    "basis": { ... }
  }
}
```

`ts_class` closed set (TitleSense construct, versioned with this contract):
`conveyance`, `security_instrument`, `assignment`, `release`, `involuntary_lien`, `default_notice`, `court`, `restriction`, `easement`, `lease`, `misc`

`raw` is always emitted. DeedPro never receives `normalized` without `raw`.

### 7.3 Party names

`parties_raw` (as recorded, fact) and `parties_normalized` (interpretation, with confidence and basis) are **both always emitted**. Normalization lives in TitleSense because it is interpretation. DeedPro never sees only the normalized form.

---

## 8. Language rules on the wire

`basis.statement` and any TitleSense-authored prose crossing the wire uses cautious construction:

**Permitted:** appears released · likely related · may still affect the property · no matching release was identified · recorded ownership indicates · professional review recommended

**Prohibited:** the title is clear · the loan is paid · this lien is invalid · you legally own the property · there are no title problems

The product explains records. It does not perform a title examination, and nothing crossing this wire may read as though it did.

**Enforced at both ends.** DeedPro pins this prohibited-phrase list into its own banned-claims gate for any surface rendering TitleSense content. The producer does not emit it; the consumer does not render it. Shared law, checked twice — a phrase that slips one gate still fails the other.

---

## 9. Pending live-capture register

Everything below is unknown from documentation and blocks no envelope work. Filled from one real production result after ToS review.

| Item | Needed for |
|---|---|
| `Parties` interior — party position, name fields, role encoding | 6.2, 6.5, 7.3 |
| `DocumentIdentifications` interior — instrument number, recording date field names | 6.2, H3 |
| `Items` interior — per-document row shape | 6.2, 6.3, 6.4 |
| `PlantDates` shape | §5 coverage, Q2 monitoring decision |
| `LegalInformation` interior | 6.1 reconciliation, 6.5 |
| `GetFilteredResultByID` filtered-result shape vs. unfiltered | 6.3, 6.4 |
| Whether `OpenEncumbrances` exposes any basis for its determination | 6.4 — if it does, `conflict` becomes more informative |

---

## 10. Known open items for v1.2

1. **DeedPro prelim-import field mapping** — align `prelim_data` facts with DeedPro's existing extraction slots (§6.1). DeedPro is producing its T-6 extraction-slot inventory (field name, type, builder section, amber semantics) as `docs/PRELIM_FIELD_MAP.md`; that document is the input to this item. Structured `prelim_data` must land in the same slots T-6's PDF parser fills, with the parser demoted to third-party-paper fallback.
2. **Live capture** — resolve §9; requires ToS clearance first.
3. **Appendix G parser** — produces the `doctype_subtype` → `ts_class` mapping table (§7.1).
4. **County build order** — v2 search-input construction is per-county in California (~2,800 lines of county-specific map codes and required fields in `CA.html`). Starts with PCT's working counties only. Input constraints already known: `customerRef` capped at 11 alphanumeric for San Diego and Imperial, 9 numeric for Los Angeles, 15 elsewhere (`AddlServicesCreateService.html`).
5. **ToS step 0, first question:** *are TitlePoint-derived results licensed for display to non-title-professional end users?* This decides whether the consumer-facing Property Story exists at all, and therefore whether any consumer-path finding semantics belong in this contract.

---

## 11. Coverage confirmed (informational)

Los Angeles (06037), Orange (06059), Riverside (06065), San Bernardino (06071), and San Diego (06073) are all TitlePoint plant counties — the modern plants with address/owner/APN cross-references (source: `titleplants.html`). The narrower list sometimes mistaken for coverage (Alameda, Contra Costa, Sacramento, San Francisco, Merced, Solano, Stanislaus, San Joaquin) is only where `Property.MajorLegalName` is *required* (`PropertyParameters.html`). PCT's and DeedPro's home market sits on the good plants.

---

## 12. Changelog

- **v1.1** — ratified. Adds §3.2 (identity, idempotency, supersession): `finding_id` named explicitly as the idempotency/dedup key; findings immutable once emitted; change expressed as a successor carrying `supersedes`; chains permitted with immediate-predecessor naming; successors emitted only for findings that actually changed; `supersession_reason` distinguishing *the world changed* from *we were wrong*; withdrawal as a successor asserting nothing; consumer obligations recording DeedPro's T-5 lineage law on the wire — recorded decisions stand as recorded, supersession surfaces as information. Adds the both-ends enforcement note to §8. Adds `docs/PRELIM_FIELD_MAP.md` as the named input to open item #1.
- **v1** — initial draft. Five finding types in contractibility order; envelope, confidence, basis, coverage, document block, language rules. All TitlePoint-derived leaf shapes marked `pending: live_capture`. Appendix G quarantined. Approved subject to the supersession amendment.
