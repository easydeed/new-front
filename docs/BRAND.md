# DeedPro Brand — canonical identity

_BRAND1 established the mark; BRAND2 refined it against the Figma
export. **Design source of record: the `figma/` folder** (reference-only
— app code never imports from it, CI-pinned).
`frontend/src/components/brand/Logo.tsx` is the production geometry;
`frontend/tailwind.config.js` `brand.*` is the color tokens' single
source._

## The mark: the Stamped Page (refined)

A recorded instrument, reduced to its essence — a purple page with three
rounded corners and a folded top-right corner, a **header ruling line**
over two lighter **data-entry lines** (the line hierarchy reads as a
real instrument: declaration, then fields), and a **two-ring recorder's
seal with a center hash-stamp dot** in the lower half — the county
embosser convention, not a generic badge.

The seal is the story. DeedPro's product is not "documents" — it is
*recordable* paper: measured to the recorder's conventions (Gov C
§27361.6), free of chrome (§27361.7), immutable once generated, and
hash-stamped (`deed_pdfs.sha256`). The center dot IS the hash stamp.

Small-size optics (≤20px, favicons; the Figma scale-floor sheet):
two text lines and a single heavier seal ring — two rings merge into
noise at favicon scale, so the bullseye carries the identity. The 16px
favicon cut biases the ring slightly larger for the same reason. This is
the normal small-size variant, not a second logo.

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

**Wordmark: Plus Jakarta Sans 800**, tracked `-0.025em` — a geometric-
humanist face whose rounded terminals match the mark's rounded page
corners; the 800 weight gives the wordmark the same stamped authority as
the seal. **Self-hosted** via `next/font/local` (latin-subset woff2
committed beside the component, SIL OFL) — no runtime requests to
third-party font hosts, and the face loads only where the Logo module is
imported: app and marketing surfaces, never the PDF path.

Lockup proportions (Figma spec): wordmark size = 0.95 × mark width;
mark-to-wordmark gap = 0.45 × mark width.

UI text stays on the app's system sans stack: 700 headings, 600
emphasis, 400 body.

## Wordmark rules

- Two-tone split, always: **Deed** in ink `#1F2B37`, **Pro** in brand
  `#7C4DFF`. On dark surfaces (refined rule): the mark stays FULL
  COLOR, **Deed** flips to white, **Pro** keeps brand purple
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
