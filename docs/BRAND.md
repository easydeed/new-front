# DeedPro Brand — canonical identity

_BRAND1, owner-approved mark. This file is the identity's single written
source; `frontend/src/components/brand/Logo.tsx` is the mark's single
geometry source; `frontend/tailwind.config.js` `brand.*` is the color
tokens' single source._

## The mark: the Stamped Page

A recorded instrument, reduced to its essence — a purple document with a
folded corner, three lines of text, and a **two-ring recorder's seal** in
the lower half.

The seal is the story. DeedPro's product is not "documents" — it is
*recordable* paper: measured to the recorder's conventions (Gov C
§27361.6), free of chrome (§27361.7), immutable once generated, and
hash-stamped (`deed_pdfs.sha256`). The mark is that promise drawn small:
a page a county recorder would accept, already carrying its seal.

Small-size optics (≤20px, favicons): the mark simplifies to two text
lines and a single thicker seal ring — same concept, tuned for pixels.
This is the normal small-size variant, not a second logo.

**The hard rule (G2 no-chrome):** the mark appears on app and marketing
surfaces ONLY. Recorded instrument pages carry no branding of any kind —
the backend leak pins enforce this structurally (`7C4DFF` may never
appear in generated deed HTML). The brand's strongest statement is its
absence from the paper.

## Color

Tokens live in `tailwind.config.js` under `brand.*` — reference by
token, never raw hex, on app surfaces. (The Logo component is the one
exception: SVG fills can't read Tailwind classes.)

| Token | Value | Role |
|---|---|---|
| `brand-500` | `#7C4DFF` | Primary purple — the mark, actions, focus |
| `brand-600` | `#6a3de8` | Hover |
| `brand-700` | `#5b32d1` | Active (the mark's fold uses the adjacent `#5B35D5`) |
| `brand-50..900` | scale | Tints/shades around 500 |
| ink | `#1F2B37` | Wordmark "Deed", headline text on light surfaces |

**Doctrinal colors are brand.** Two colors carry meaning in the product
and must never be reassigned:

- **Amber** (`warning.*`, `#F59E0B` family) — *unconfirmed external
  data*: county-sourced candidates awaiting the officer's confirmation,
  preflight warnings, honest-failure panels. Amber says "a machine
  suggested this; a human has not yet said yes."
- **Violet** (brand purple family) — *proposed legal choice*: the DTT
  exemption proposal, the vesting suggestion. Violet says "the system
  proposes; only the officer's explicit acceptance records it."

These are the suggest→confirm→record doctrine expressed as color. A
designer changing amber to blue is changing the product's honesty
system, not a palette.

## Typography

System stack (Inter-compatible): the app's existing sans stack, no
webfont dependency. Weights: 700 for the wordmark and headings, 600 for
UI emphasis, 400 body. The wordmark tracks tight (`-0.02em`).

## Wordmark rules

- Two-tone split, always: **Deed** in ink `#1F2B37`, **Pro** in brand
  `#7C4DFF`. On dark surfaces the lockup is one-color white
  (`LogoLockupDark`).
- Never italic, never letter-spaced wide, never re-colored beyond the
  two sanctioned treatments.
- Clearspace: at least half the mark's height on all sides of the
  lockup.
- The mark may stand alone (`LogoMark`) where space demands (collapsed
  sidebar, favicon); the wordmark never stands without the mark on
  first-impression surfaces (headers, auth pages).

## Voice — five rules (distilled from the HM2 truth pass)

1. **Specific over vague.** "Measured to LA County recorder margins"
   beats "industry-leading compliance." If a number or statute exists,
   use it.
2. **Suggests / decides / records.** The system *suggests*, the officer
   *decides*, DeedPro *records* the decision. Copy never blurs these
   verbs — the software does not "handle" legal choices.
3. **No compliance theater.** No badge-walls, no "bank-grade security"
   without a fact behind it, no implied endorsements. Claims trace to
   something real or they don't ship.
4. **No legal-outcome claims.** DeedPro formats and records instruments;
   it does not promise legal effect, validity, or protection. Companion
   guidance links to official sources (the BOE, statutes) rather than
   restating law as ours.
5. **Plain officer-facing language.** Written for the escrow desk:
   short sentences, the trade's own terms (APN, vesting, DTT), no
   invented jargon and no dumbing-down.
