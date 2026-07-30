# FORMS-SPIKE — Verdict Report: Affidavit of Death (Joint Tenancy)

**Status: the form is built, pinned, and selectable. This report is the
priced half of the deliverable.**

## What was built

One complete new instrument, end to end: PCT reference form #4 fetched and
measured (pdfplumber: letter page, caption at ~192pt, jurat lower half,
one page) → doctrine classification → chassis template
(`templates/affidavit_death_jt_ca/`) → **new shared jurat partial**
(`templates/_partials/notary_jurat.jinja2`, Gov C §8202) → type
registration → builder path (Property → Affidavit Facts → Recording) →
generation gate → stored hash-stamped PDF → resume. 8 backend pins +
frontend pins; all pre-existing gates green.

## Doctrine pass results

| Classification | Elements |
|---|---|
| **Form furniture** (renders always) | Title; the sworn recitals ("…of legal age, being first duly sworn, deposes and says", "…is the decedent mentioned in the attached certified copy…as joint tenants, recorded on…"); ATTACH-DEATH-CERTIFICATE directive; recorder header; the §8202 jurat with its §8202(b) disclaimer box. Precedent applied: Flag-3 — instrument-defining recitals are furniture because *choosing the instrument is the officer's decision*. |
| **Officer-supplied facts** (typed; missing facts render as the reference's blank lines, never invented) | Affiant, decedent, JT-deed date / grantor / grantees, recording date, instrument number; plus the standard chassis fields (APN, county, legal description — provenance-confirmed when county-sourced; requested-by ± address; mail-to; order/escrow). |
| **Legal choices** | **None found.** No DTT (not a conveyance — title passes by survivorship; the reference carries no tax block, and the template renders none). No vesting. No exemption elections. |

**Judgment calls flagged, not silently decided:**
1. *Substantive gate strictness:* generation requires affiant + decedent +
   legal description + the JT deed's recording reference (date +
   instrument number). The other recital facts (JT deed date/grantor/
   grantees) may print as blank lines, as the reference tolerates. Owner
   may want them required too — one-line change.
2. *Row-display aliasing:* the `deeds` table's party columns hold decedent
   (grantor_name) and affiant (grantee_name) so Past Deeds rows read
   sensibly and existing validation applies. The authoritative facts live
   in `metadata.affidavit`. Fine at this scale; a `parties` JSONB column
   is the eventual clean answer if the catalog grows past ~10 types.
3. *Signature line:* reference-faithful bare line (no printed name
   beneath) — the affiant signs at notarization.
4. *Companion filings:* counties commonly want a **BOE-502-D** (change in
   ownership — death of real property owner) with this affidavit. That is
   PCOR-family — Tier B, owner-directed LAST. Noted, not designed.

## What generalized from the deed chassis for FREE

- The entire recorder page-one geometry (header block, open recorder
  space, caption boundary, APN line) — copied conventions, zero rework,
  and the G2/G3 pin discipline applied verbatim.
- The whole persistence machine: metadata extras, autosave/draft rows,
  resume with provenance, the generation gate, stored PDF + sha256,
  honest pdf_error surfacing. **Zero backend flow changes** — one dict
  key (`affidavit`) added to the extras tuple and models.
- The builder shell: accordion, one-truth counter, Next buttons,
  click-to-fix preview, property search with confirm-cards — all
  type-parameterized rather than rebuilt.
- WeasyPrint render path, no-chrome enforcement, six-flow untouched.

## What did NOT generalize (the one-time builds)

| Piece | Cost | Reusable for the catalog? |
|---|---|---|
| Jurat partial (§8202) | ~1 hr | **Yes — every sworn instrument** (entire affidavit family) now has it for free |
| Type-branching in validation (`isAffidavitType`, per-type sections/substantive checks) | ~1 hr | Partially — the *pattern* now exists; each family adds a branch. At >3 families this should become a per-type config table (see below) |
| Affidavit facts plumbing (types → section component → payload → proxies → resume → template context) | ~1.5 hr | The *shape* repeats per form; the mechanical steps are now a known checklist |
| Template body + page-budget tuning | ~1 hr | Body is per-form by definition; the chassis CSS made it fast |

**Total spike cost: roughly a half-day of focused work, most of it
one-time.**

## Projected marginal cost per additional Tier-A form

- **Affidavit-family siblings** (Aff. Death – Trustee, – Community
  Property w/ROS, – TOD beneficiary): **~1–2 hrs each.** Same jurat, same
  section pattern, different recital text + 1–3 field differences.
- **Deed variants** (JT Grant Deed, CP w/ROS Grant, Corporation Grantor,
  etc.): **~1–2 hrs each** — the deed chassis already does everything;
  these are mostly title/recital/vesting-default variants of the five
  shipped types.
- **New families** (homestead declaration, trust certification): **~half
  day for the first of each family**, sibling rate after.

**Architecture recommendation before wave 1:** promote the per-type
branches into a small form-registry config (sections list, substantive
checks, payload mapper, template name per type). The affidavit proved the
branch pattern works; a registry keeps type #7 from costing more than
type #2. Half-day refactor, pays for itself by the third form.

## Surprises

1. **No doctrine surprises** — the suggest→confirm→record machine and the
   blank-contents rule mapped onto a sworn instrument without strain. The
   jurat fork was exactly the shaped hole the ticket predicted.
2. The **one-page budget** was the only real fight (the deed chassis
   spends vertical space freely because deeds run two pages; the
   affidavit must not). Worth a shared "compact chassis" CSS variant if
   more one-pagers come.
3. `is_test`-style aliasing debt (judgment call 2) is the only schema
   smell — flagged above with its exit ramp.

---

## Addendum — owner rulings on the four flags (2026-07-30)

1. **Gate strictness:** stays as built — reference-faithful; tolerated
   blanks stand. Owner may tighten later (one-line change).
2. **Party-column aliasing:** accepted. **LEDGERED:** migrate to a
   `parties` JSONB column when EITHER trigger fires — catalog exceeds
   10 types, OR the first form arrives whose parties cannot map onto
   grantor_name/grantee_name.
3. **Bare signature line:** approved as built.
4. **BOE-502-D:** stays Tier B, last. A PASSIVE success-page notice now
   ships (registry `companionNotice`) linking the state BOE forms page —
   guidance only, no form-fill work.

Registry refactor: executed (lib/formRegistry.ts; labels, titles,
sections, family, notarial cert, DTT flag, and companion guidance all
derive from one entry per type). Wave 1 fires on the owner's ranking.
