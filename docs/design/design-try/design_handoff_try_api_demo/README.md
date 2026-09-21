# Handoff: `/try` — the live DeedPro API demonstration

## Overview

`/try` is a public, unauthenticated marketing page at `frontend/src/app/try/page.tsx` that lets a
technical buyer *operate* the DeedPro API rather than read about it. Three acts, about ninety
seconds:

1. **Act 1 — "Break it on purpose."** A console pre-loaded with a valid grant deed, plus five traps.
   Each trap rewrites the payload, sends a real `POST /api/v1/deeds`, and shows the real `422` with
   `detail.message` as the hero.
2. **Act 2 — "You confirm it."** The valid request returns a draft (`pending_confirmation`, no PDF).
   The prospect types their own name into `approver.name`, scans a QR, opens the existing
   `/confirm/[token]` surface on their phone, reads a watermarked deed and approves. The desktop is
   polling and flips to `completed`.
3. **Act 3 — "The receipt, and an attempt to make it lie."** `GET /confirm/{token}/artifact` renders
   the auditor artifact. Then a second draft is created and confirmed carrying the *first* draft's
   `draft_sha256` → `409 DRAFT_MISMATCH`.

It closes on the one honest next step: request API access (three fields, no account).

Audience: engineers and product leads deciding whether to integrate or build in-house. Must work
self-serve with nobody from DeedPro present, and in a presenter mode on a live sales call.

Linked from the homepage platform door and `/developers`. **Not** in the top nav.

## About the design files

The files in this bundle are **design references created in HTML** — prototypes of the intended look
and behaviour, not production code to copy. The task is to recreate them in `frontend/` using the
existing environment: Next.js 15 App Router, React 19, Tailwind with the `brand.*` token scale,
`lucide-react` icons, and the components already in `src/components/`. Reference tokens
(`brand-500`, `text-gray-600`) rather than the raw hex values quoted below — the hexes are here so
the intent is unambiguous, not so they get typed into class strings. `src/components/brand/Logo.tsx`
is the only file allowed to carry brand hex.

## Fidelity

**High-fidelity.** Final colours, type, spacing, copy and interaction. Recreate pixel-perfectly.
Every value below was taken from a file in `easydeed/new-front@main`; nothing was invented.

## Correction to the original brief

The brief specified `409 DRAFT_SUPERSEDED`. The shipped code returns **`409 DRAFT_MISMATCH`** —
"The bytes you hashed are not the bytes we hold for this draft. Re-fetch the preview and confirm
again." (`backend/routers/api_confirm.py`, `approve_confirmation`). The design uses the shipped code.
Renaming it would be an API change.

---

## Routes

| Route | Status | Notes |
|---|---|---|
| `/try` | **New** | The page. Public, unauthenticated, indexable. `'use client'` — the whole page is stateful. |
| `/try?presenter=1` | **New** | Same page, presenter affordances. Read with `useSearchParams()`. |
| `/confirm/[token]` | Exists | Act 2's phone surface. **Reuse as-is** except the preview iframe (see TRY-7). |
| `/developers#request-access` | Exists | Where the close CTA posts / links. |
| `/trust` | Exists | Linked from the close strip as "what we do not have". |

### API calls the page makes

| Call | Purpose | Status |
|---|---|---|
| `POST /api/v1/deeds` | Every trap, and the valid request | Exists |
| `GET /api/v1/deeds/{deed_id}` | Act 2 polling, every 3s | Exists |
| `GET /confirm/{token}/artifact` | Act 3 artifact | Exists |
| `POST /confirm/{token}/approve` | Act 3 tamper, with a mismatched `draft_sha256` | Exists |
| `POST /api-key-inquiries` | Close CTA | Exists |
| Readiness ping | Warming state | **Needs building (TRY-5)** |

---

## Page structure

Root: `<main>`, white, `Inter` (already the root layout's font). Content columns are
`max-width: 1280px; margin: 0 auto; padding: 0 24px` throughout — same rhythm as the homepage's
`max-w-7xl mx-auto px-6 sm:px-8 lg:px-12`.

Sections top to bottom:

1. Sticky nav
2. Presenter strip (presenter mode only)
3. Hero + sandbox status
4. Act rail (3 columns)
5. Act 1
6. Act 2
7. Act 3
8. Close / request access
9. Annotation legend (design artefact — see "Annotations" below)
10. Footer disclaimer

### 1. Sticky nav

`position: sticky; top: 0; z-index: 50; height: 64px`, `rgba(255,255,255,0.95)` with
`backdrop-filter: blur(12px)`, `border-bottom: 1px solid #E5E7EB`.

Left: `<LogoLockup size={30} />` from `src/components/brand/Logo.tsx` — import it, do not redraw the
SVG. Right: a ghost link "Request access" (14px/500, `#374151`, 8px radius) and a filled
`bg-brand-500` button "Read the docs" → `/developers` (14px/700, white, 8px radius, hover
`#6a3ff0`).

### 2. Presenter strip — `?presenter=1` only

Full-bleed `#12141A`, `border-bottom: 1px solid #262A33`, `padding: 14px 24px`, flex, `gap: 20px`,
wraps.

- Chip "PRESENTER MODE": `border 1px solid rgba(167,139,250,0.3)`, `bg rgba(167,139,250,0.1)`,
  text `#C4B5FD`, 11px/700, `text-transform: uppercase`, `letter-spacing: 0.12em`, 6px radius,
  `padding: 5px 11px`.
- Timer: monospace, 26px/700, white, `letter-spacing: -0.02em`, `mm:ss`, zero-padded.
- Script line: `flex: 1; min-width: 280px`, 14px/1.5, `#9CA3AF`, prefixed by a white 600 "Say:".
  One line per act; it changes with state (copy in "Interactions" below).
- Buttons "Start/Pause" and "Reset demo": `#0B0D11`, `1px solid #374151`, `#E5E7EB`, 13px/600, 8px
  radius, `padding: 8px 14px`.

### 3. Hero

`padding: 56px 24px 40px`, `border-bottom: 1px solid #E5E7EB`.

- Eyebrow: "Live sandbox · /try" — 13px/700, uppercase, `letter-spacing: 0.14em`, `#7C4DFF`,
  `margin-bottom: 14px`.
- `<h1>`: **"Try to get a bad deed past us."** — 52px, `line-height: 1.05`,
  `letter-spacing: -0.03em`, 700, `#1F2B37`, `max-width: 900px`, `text-wrap: pretty`.
- Body: 19px/1.6, `#4B5563`, `max-width: 760px`, `margin-top: 20px`:
  > Every button on this page sends a real request to the DeedPro sandbox. You will break it on
  > purpose, then confirm a deed with your own name and phone, then try to make the receipt lie.
  > About ninety seconds.
- Status row, `margin-top: 28px`, flex, `gap: 12px`, wraps:
  - **Warming**: pill `bg #F3F4F6`, `border 1px solid #E5E7EB`, text `#4B5563`, 13px/600,
    `border-radius: 999px`, `padding: 6px 13px`; glyph `◔` + the word "Sandbox warming".
  - **Ready**: pill `bg #F0FDF4`, `border 1px solid #BBF7D0`, text `#166534`; glyph `✓` +
    "Sandbox ready".
  - Note text, 13.5px, `#6B7280`. Warming: `Cold containers take up to 30 seconds to wake. {n}s
    remaining — nothing is hidden behind a spinner.` Ready: `dp_test_ key · every request below is
    real`.
  - "Skip the wait" button while warming — `#fff`, `1px solid #E5E7EB`, `#4B5563`, 12.5px/600, 8px
    radius. This is the escape hatch; a frozen counter must never be able to lock the page.

### 4. Act rail

Full-bleed `#F8F8FB`, `border-bottom: 1px solid #E5E7EB`. Three equal columns
(`grid-template-columns: repeat(3, minmax(0,1fr))`), `padding: 16px 20px` per cell, `1px solid
#E5E7EB` between cells. The active act's cell gets `background: #fff` and
`box-shadow: inset 0 -3px 0 #7C4DFF`.

Per cell: `ACT 01` (monospace 11px/700, `letter-spacing: 0.1em`, `#9CA3AF`), title (15px/700,
`#14161A`), state line (13px, `#6B7280`).

State lines: Act 1 — "Waiting for you" → "Refused — as designed". Act 2 — "Locked until a trap
fires" → "Ready" → "Confirmed by {name}". Act 3 — "Locked until confirmation" → "Artifact issued" →
"409 — refused".

### 5. Act 1 — "Break it on purpose"

`padding: 56px 0`, white, `border-bottom: 1px solid #E5E7EB`.

Header block, `max-width: 780px`: eyebrow "Act one" (12.5px/700, uppercase, `0.14em`, `#7C4DFF`),
`<h2>` 34px/1.15, `-0.02em`, 700, `#14161A`, body 16.5px/1.65, `#4B5563`:
> The console is loaded with a valid grant deed. Pick a trap; it rewrites the request and sends it.
> These are the mistakes an integration makes in month one — the question is whether they fail in
> your tests or at the counter.

Two columns: `grid-template-columns: minmax(0,1.05fr) minmax(0,1fr); gap: 20px; align-items: start`.

**Left — the console.** `border-radius: 16px`, `background: #12141A`,
`box-shadow: 0 20px 40px -20px rgba(0,0,0,0.45)`.
- Header bar: `padding: 14px 20px`, `border-bottom: 1px solid #262A33`, space-between. Left
  `POST /api/v1/deeds` (mono 12px `#9CA3AF`), right `Authorization: Bearer dp_test_•••` (mono 11px
  `#6B7280`).
- Body: `padding: 18px 20px`, `max-height: 430px`, `overflow: auto`. One `<div>` per JSON line:
  mono 12.5px, `line-height: 1.75`, **`white-space: pre-wrap; word-break: break-word`** (do not use
  `pre` — the vesting value clips at the panel edge and it is the entire point of traps 1 and 2),
  colour `#D1D5DB`.
  - Removed line: colour `#FCA5A5`, `background: rgba(220,38,38,0.12)`, `text-decoration:
    line-through` with `text-decoration-color: rgba(252,165,165,0.6)`.
  - Added/changed line: colour `#C4B5FD`, `background: rgba(124,77,255,0.14)`.
  - Elided line: colour `#6B7280`.
- Footer: `padding: 14px 20px`, `border-top: 1px solid #262A33`. Primary button "Send this request"
  — `bg #7C4DFF`, white, 14px/700, `padding: 11px 18px`, 8px radius, hover `#6a3ff0`; disabled while
  warming (`#E5E7EB` / `#9CA3AF`, `cursor: not-allowed`). Hint 12.5px `#6B7280`: "Real POST against
  the sandbox — nothing is stubbed." / "Disabled until the sandbox is up."

**Right — traps and response.**
- Label "THE TRAPS": 12.5px/700, uppercase, `0.12em`, `#6B7280`.
- Trap grid: `repeat(2, minmax(0,1fr))`, `gap: 10px`. Each trap is a `<button>`, left-aligned,
  `border-radius: 12px`, `padding: 13px 15px`, `border: 1.5px solid #E5E7EB`, `background: #fff`;
  selected → `border-color: #7C4DFF`, `background: #F5F3FF`. Label 14px/700 `#14161A`; sub-label
  12.5px monospace `#6B7280`.
- Response panel below: `border-radius: 14px`, `padding: 20px`, `min-height: 150px`. Empty:
  `border 1px solid #E5E7EB`, `background: #FCFCFD`, placeholder 14.5px `#9CA3AF` — "Pick a trap,
  send the request, and the refusal lands here — the reason first, the envelope under it."
  Populated: `border 1px solid #FECACA`, `background: #FEF2F2`.
  - Status badge `422`: mono 12px/700, `#B91C1C`, `background rgba(220,38,38,0.1)`,
    `border 1px solid rgba(185,28,28,0.3)`, 6px radius, `padding: 3px 8px`.
  - Code `VALIDATION_ERROR`: mono 12.5px/600, `#6B7280`, `letter-spacing: 0.04em`.
  - **Hero message**: `detail.message` verbatim, 19px/1.5/600, `#14161A`, `text-wrap: pretty`,
    `margin-top: 14px`. Never truncate it.
  - Gloss: 14.5px/1.6, `#4B5563`. Ours, one paragraph, never restating the message.
  - `detail.details[]`: separated by `border-top: 1px solid #E5E7EB`, label "DETAIL.DETAILS[]"
    11.5px/700 uppercase `#9CA3AF`; each row mono 12.5px with `field` in `#7C4DFF` and `message` in
    `#4B5563`.
  - Unverified flag (trap 4 only): amber box, `border 1px solid #FDE68A`, `bg #FFFBEB`, 10px radius,
    glyph `◷` + "**Unverified against the running API.** Run this request against the sandbox and
    paste the exact strings in before the page ships."

**Below both columns** — the lesson strip. `border 1px solid #E5E7EB`, `bg #F8F8FB`, 12px radius,
`padding: 18px 20px`, diamond glyph `◆` in `#7C4DFF`, text 14.5px/1.65 `#4B5563`, `max-width: 900px`:
> **The first two traps are the same lesson from both sides.** A joint-tenancy deed states its
> vesting on its own face, so sending `grantee.vesting` is refused — choosing the instrument *is*
> the vesting decision. A plain grant deed refuses the opposite way: no vesting, no deed. Neither is
> a preference we hold; both are what the instrument decides.

The word "is" is `#6D3BF0`, 600, not italic.

#### The five traps

Base payload (fixed, fictional sample data — no lookup ever runs):

```json
{
  "deed_type": "grant_deed",
  "property": {
    "address": "1300 Nonesuch Avenue", "city": "Glendora", "state": "CA", "zip": "91750",
    "county": "Los Angeles", "apn": "8888-000-001",
    "legal_description": "LOT 7, BLOCK 2, TRACT NO. 99999…"
  },
  "grantor": { "name": "JOHN Q. SAMPLE AND MARY R. SAMPLE, HUSBAND AND WIFE" },
  "grantee": { "name": "AVERY K. SPECIMEN", "vesting": "an unmarried person" },
  "transfer_tax": { "exempt": false, "value": 750000, "computed_amount": "825.00", "basis": "full_value" },
  "recording": { "requested_by": "Pacific Coast Escrow", "return_to": { … } },
  "approver": { "name": "<typed by the prospect>", "role": "escrow officer" }
}
```

| # | Trap | Mutation | Expected | Source of the refusal |
|---|---|---|---|---|
| 1 | Vesting clause on a joint-tenancy deed | `deed_type → grant_deed_jt`, keep `grantee.vesting` | 422 `VALIDATION_ERROR` — "This instrument fixes its own vesting — Vesting is fixed by the instrument: joint tenancy. Choosing this form IS the vesting decision, so no vesting value is accepted. Remove grantee.vesting, or choose a deed type whose vesting you set." | `api_catalog.TYPE_REQUIREMENTS['grant_deed_jt']` via `CreateDeedRequest.check_type_rules` |
| 2 | Grant deed with no vesting at all | drop `grantee.vesting` | 422 — "grantee.vesting is required for this deed type" | same validator, `requires_vesting` |
| 3 | Corporate grantor, no organizing state | `deed_type → grant_deed_corp`, empty `grantor.entity` | 422 — "This instrument recites facts about the grantor entity that are missing: grantor.entity.entity_state. Corporate grantor. The deed recites the state under whose laws the corporation is organized." | same validator, `required_entity_facts` |
| 4 | Remove the transfer-tax declaration | drop `transfer_tax` | 422, `details: [{field: "body.transfer_tax", message: "Field required"}]` — **inferred, verify** | Pydantic required field + the router's 422 mapping |
| 5 | A parcel outside California | `property.state → "NV"` | 422 — "Currently only California (CA) deeds are supported" | `PropertyModel.state_must_be_ca` |

Traps 1, 2 and 3 currently report `field: "body.recording"`, because `check_type_rules` is a
validator on the last field of the model. Correct, and misleading to the exact audience that will
notice. See `?-2` in the build-requirements list.

**Do not hard-code the expected messages.** Derive the trap list from the catalog the way
`frontend/src/app/page.tsx` derives `FIXED_VESTING_SAMPLE` from `API_DEED_TYPES`, and render
whatever the API returns.

### 6. Act 2 — "You confirm it"

`padding: 56px 0`, `background: #F8F8FB`. Dimmed to `opacity: 0.55` until a trap has fired.

Header block as Act 1. Body copy:
> Send the valid request and no PDF exists yet — you get a draft, a status, and a confirmation URL.
> Put your own name on it, open the link on your phone, and read the deed as it will print.

Columns: `grid-template-columns: minmax(0,1fr) 360px; gap: 24px`.

**Left column**

*Approver card* — `border 1px solid #E5E7EB`, 14px radius, white, `padding: 20px`. Label "WHO IS
CONFIRMING". Two inputs side by side (`repeat(2, minmax(0,1fr))`, `gap: 12px`), labelled
`approver.name` and `approver.role` (13px/500 `#1F2B37`); inputs `border 1px solid #D1D5DB`, 8px
radius, `padding: 11px 14px`, 14.5px, placeholder "Your name", role defaulting to "escrow officer".
The typed name propagates live into the request JSON, the phone header, and the artifact.
Caption 13.5px `#6B7280`: "Both are required by the shipped contract. The token authenticates;
DeedPro does not verify the person. What gets recorded is who you said it was."
Button "Send the valid request" — `bg #7C4DFF`, white, 14px/700, `padding: 12px 18px`; disabled
(`#E5E7EB`/`#6B7280`) while Act 2 is locked or a draft already exists. Hint: locked → "Fire a trap
in Act 1 first — the sequence is the argument."; ready → "Same payload, no trap. Returns a draft,
not a document."; sent → "No PDF exists yet. urls.pdf is null."

*Draft response panel* (after send) — `#12141A`, 14px radius. Header `201 · response.data` (mono
11.5px `#9CA3AF`) and a status chip, right: pending → `bg rgba(245,158,11,0.12)`,
`border rgba(245,158,11,0.35)`, text `#FCD34D`, glyph `◷` + `pending_confirmation`; completed →
`rgba(22,163,74,0.12)` / `rgba(22,163,74,0.35)` / `#86EFAC`, glyph `✓` + `completed`. Body is the
JSON in the same line styles as Act 1, with `status` and `urls.pdf` recoloured on completion.
Footer strip: `↻ Polling GET /api/v1/deeds/{deed_id} every 3s · attempt {n}. No webhooks — this is a
poll, not a push.` → on completion `✓ Stopped polling after {n} attempt(s). No webhooks exist — this
is a poll, and the page says so.`

*Payoff panel* (after approval) — `border 1px solid #BBF7D0`, `bg #F0FDF4`, 14px radius,
`padding: 20px`, `✓` glyph at 20px `#16A34A`:
> **The PDF now exists — and it did not a moment ago.** Approval promoted the bytes you read on your
> phone. It did not re-render them: the document you saw and the document we store are the same
> object, which is why there is only ever one hash.

Two mono chips beneath: `urls.pdf · GET /api/v1/deeds/{id}/pdf` and `status: "completed"`.

**Right column**

*QR card* — white, `border 1px solid #E5E7EB`, 14px radius, `padding: 18px`. A 168×168 QR encoding
`urls.confirmation` from the response, on white with a 1px `#E5E7EB` border and 8px radius. Below
it the URL in mono 12.5px `#6B7280`, `word-break: break-all`, then "On a phone already? Open the
link instead." No QR library exists in the frontend today (TRY-6). The PDF must never carry a QR.

*Phone card* — `bg #F8F8FB`, `border 1px solid #E5E7EB`, 14px radius. Inside: a device frame,
`border: 10px solid #14161A`, `border-radius: 34px`, `box-shadow: 0 18px 40px -18px rgba(0,0,0,0.4)`,
with a 22px `#14161A` status bar.

Everything inside the frame is **`/confirm/[token]` as it ships** — same header (32px `#7C4DFF`
rounded square holding a white `FileText` lucide icon, "Confirm this deed" 14px/700 `#1E293B`, the
greeting `{approver.name}, {approver.role}` 12px `#64748B`), the same amber expiry pill
(`border #FDE68A`, `bg #FFFBEB`, `#92400E`, glyph `◷` + "Expires {date}"), the same intro paragraph,
the same approve/reject controls (`#16A34A` filled "✓ Approve"; outlined "This is not the deed"
→ the reject panel with the server's reason catalog and an amber `#D97706` "Send back"), and the
same two terminal states (approved: green box, "Deed approved", "The integrator can now download the
stored PDF. The record shows who approved and when."; rejected: amber box, "Returned for
correction").

The deed preview inside the frame is a representative render with the watermark on top:
`transform: rotate(-32deg)`, `border: 3px solid rgba(220,38,38,0.28)`,
`color: rgba(220,38,38,0.32)`, 13px/800, `letter-spacing: 0.14em`, two lines — **SAMPLE / NOT FOR
RECORDING**. In production the watermark must be in the rendered PDF bytes, not a CSS overlay
(TRY-2).

### 7. Act 3 — "The receipt, and an attempt to make it lie"

`padding: 56px 0`, white. Dimmed until the phone approves. Body copy:
> This is the artifact you hand a risk team. Then: a second draft is created, and we confirm it
> using the *first* draft's hash. Drafts are immutable — nothing is edited. The hash simply does not
> match the bytes we hold.

Two equal columns, `gap: 20px`.

**Left — the artifact.** White card, `border 1px solid #E5E7EB`, 14px radius. Header
`GET /confirm/{token}/artifact` (mono 12px `#6B7280`). Rows are
`grid-template-columns: 200px minmax(0,1fr); gap: 14px; padding: 9px 0`, separated by
`1px solid #F3F4F6`; key in mono 12.5px `#6D3BF0`, value 13.5px `#14161A`, `word-break: break-all`.

Exactly the nine shipped keys, no more (`ARTIFACT_KEYS` is enforced by
`assert_artifact_keys`): `document_id`, `deed_type`, `pdf_sha256`, `sha256_recorded_at_approval`,
`confirmed_by`, `role`, `license_claimed`, `confirmed_at`, `declarations`.

`sha256_recorded_at_approval` renders the same value as `pdf_sha256` with the inline note
"(same fact, recorded at approval)" — they cannot disagree, because approval promotes the preview
bytes. `license_claimed` renders "null — never verified by DeedPro". `declarations[]` prints
verbatim from `ARTIFACT_DECLARATIONS`, em-dash bulleted, 13.5px/1.6 `#4B5563`.

**Right — the tamper.** White card. Copy:
> We create a second draft — same parties, one different figure — and POST its approval carrying
> `draft_sha256` from the deed you already confirmed. A client that hashed one document cannot put a
> name on another.

A `#0B0D11` code block showing the POST with the mismatched hash highlighted in `#C4B5FD`, and a
dim comment line "// draft B hashes to 3ad07e51c982… — immutable, unedited". Button "Confirm draft
B with draft A's hash" — `#14161A` filled, white, 14px/700, 8px radius; after firing it greys to
`#F3F4F6`/`#6B7280` and reads "Refused — see below".

Result panel: `border 1px solid #FECACA`, `bg #FEF2F2`, 14px radius. Badge `409` + code
`DRAFT_MISMATCH`, hero message verbatim, then:
> The comparison happens before the promotion, so the second draft is still **pending_confirmation**
> — a mismatch never stores bytes nobody saw. Your receipt from Act 2 is untouched.

**Implementation note (TRY-4):** re-approving the deed just confirmed returns `NOT_PENDING`, because
the state check runs before the hash comparison. Reaching `DRAFT_MISMATCH` requires creating a
second pending draft and posting *its* approval with the first draft's hash — two extra calls in
Act 3. The copy must never say "edit the deed"; drafts are immutable.

### 8. Close — request access

Full-bleed `#12141A`, `padding: 64px 0`. Two columns
(`minmax(0,1fr) minmax(0,420px)`, `gap: 40px`, centred).

Left: `<h2>` 36px/1.15/700 white — "You just ran the whole integration." Body 16.5px/1.65 `#9CA3AF`:
> Four traps refused, one deed confirmed by name, one receipt that would not take a false hash. The
> next step is a key of your own — three fields, no account. We issue keys after a short
> conversation about what you are building.

Meta row 13.5px `#6B7280`, bullets `#374151`: "9 deed-family instruments" · "Test keys prefixed
dp_test_" · a `#C4B5FD` link "What we do not have" → `/trust`.

Right: `#0B0D11` card, `border 1px solid #262A33`, 14px radius, `padding: 24px`. The same three
fields as `ApiInquiryForm` (company, work email, what are you building), dark-styled:
`bg #12141A`, `border 1px solid #374151`, `#E5E7EB`, 8px radius, `padding: 11px 14px`, with the
existing placeholders. Submit `bg #7C4DFF`, white, 14px/700. Posts to `/api-key-inquiries`. Reuse
`ApiInquiryForm`'s logic; it already handles failure honestly and promises a conversation, not a key.

### 9. Footer

`border-top: 1px solid #E5E7EB`, `bg #F8F8FB`, `padding: 28px 0`, 13px/1.7 `#6B7280`:
> Sample data only. A fixed, fictional property and fictional parties; no property lookup runs on
> this page. Every PDF rendered here is watermarked SAMPLE — NOT FOR RECORDING.
>
> DeedPro is software, not a law firm. It prepares documents at the direction of the professional
> using it and does not provide legal advice or legal determinations.

---

## Interactions & behaviour

### Warming

On mount, start a readiness poll. Render the remaining seconds from a stored start timestamp
evaluated each tick — not a decrementing counter, which drifts and can freeze. Ceiling 45s; at the
ceiling, stop and show the give-up state (copy in "States" below) rather than restarting. "Skip the
wait" is always available. `?presenter=1` pre-warms on load.

### Act gating

Act 2 unlocks when any trap has returned. Act 3 unlocks when the phone approves. Locked sections
render at `opacity: 0.55` and their primary buttons are disabled — not hidden, because the shape of
the whole argument should be visible from the top of the page. In presenter mode the acts are
unlocked so a rep can jump if the room is short on time.

### Polling

`setInterval` at 3s against `GET /api/v1/deeds/{deed_id}`, started when the draft is created,
cleared on `completed` / `rejected` / unmount. Show the interval and the attempt count. After
4 minutes add "Still waiting. The link stays good for 7 days — you can close this and come back."
There are no webhooks; never imply a push channel.

### Transitions

None beyond a 150ms `border-color` transition on the trap buttons and the nav's
`background-color`. No confetti, no sound, no success animation — the moment in Act 2 is the status
word changing while the prospect is still holding the phone.

### Responsive

Below 1024px: the Act 1 and Act 3 grids collapse to one column; Act 2's right rail drops beneath the
left. Below 640px (the mobile design, TRY-1 of the frontend work):

- `<h1>` to 26px.
- The request panel collapses to only the lines the trap changes.
- The trap grid becomes a single column.
- The QR is replaced entirely by a full-width primary button "Open the confirmation link ↗" with the
  caption "No QR on a phone — you are already holding the second device. The link opens
  /confirm/[token] in a new tab; come back to this one for the receipt."

### Presenter script lines

- Before any trap: "Before I show you what it does, I want you to try to break it. Pick the one you
  think we would have got wrong."
- After a trap, before approval: "Now the part you cannot build in a weekend. Take your phone out —
  you are about to be the named person on this deed."
- After approval: "That is what your risk team gets. Watch what happens when I try to put your name
  on a document you never saw."

---

## States to build

| State | Trigger | Treatment |
|---|---|---|
| Warming | Page load, cold container | Grey pill, glyph `◔`, live countdown, Send disabled, "Skip the wait" |
| Warming exhausted | 45s with no readiness | Amber box: "The sandbox has not come up. This is our infrastructure, not your connection" + a link to a recorded walkthrough + a way to reach a human. **Never** restart the countdown |
| Ready | Readiness ping answers | Green pill, glyph `✓`, Send enabled |
| Trap refused | Any trap | Red panel, `detail.message` as hero at 19px |
| Trap 4 | Missing `transfer_tax` | Same, plus the amber "unverified" note until the real strings are pasted in |
| Draft created | Valid request | Dark panel, amber `◷ pending_confirmation`, `urls.pdf: null` |
| Waiting | Polling | Interval + attempt count, stated |
| Approved | Poll returns `completed` | Green chip, PDF link, Act 3 unlocks |
| Rejected | Poll returns `rejected` | Amber chip, the server's `reject_reason` string, next step: correct the facts and POST again with a **new** `Idempotency-Key` |
| Expired | 410 `GONE` | Amber, glyph + word, offer to create a fresh draft. Needs a permanently expired demo token (TRY-8) |
| Rate limited | 429 `RATE_LIMITED` | Amber, read `Retry-After` and count down against it; say that a shared demo key means one visitor can limit the next |
| Network failure | No response in 20s | "The request did not come back" + attempt, elapsed time, Retry. Where ambiguous: "we cannot tell whether this reached us". Never an indefinite spinner |

---

## State management

```ts
ready: boolean            // sandbox readiness
warmStart: number         // timestamp; remaining seconds derive from this
trap: TrapId              // selected trap, default the joint-tenancy one
response: ApiError | null // last 422
approverName: string
approverRole: string      // default "escrow officer"
draft: DeedDraft | null   // the Act 2 response
polls: number
phone: 'pending' | 'approved' | 'rejected'
rejectOpen: boolean
issues: string[]          // reject reason ids
tamper: ApiError | null   // the 409
presenter: boolean        // from useSearchParams
clock: number             // presenter timer, seconds
```

Transitions: `trap selected → response cleared`; `response !== null → Act 2 unlocked`;
`draft created → polling starts`; `phone approved → polling stops, Act 3 unlocked`;
`tamper fired → 409 panel`.

---

## Design tokens

Reference the Tailwind `brand.*` scale and the existing gray ramp; hexes given for intent only.

**Colour**

| Role | Value | Source |
|---|---|---|
| Brand / actions / focus | `#7C4DFF` (`brand-500`) | `docs/BRAND.md` |
| Brand hover / active | `#6a3ff0`, `#5b32d1` | same |
| Brand tint | `#F5F3FF` | `globals.css` |
| Violet on dark | `#A78BFA` border/bg, `#C4B5FD` text, `#6D3BF0` emphasis | `page.tsx` |
| Ink (headlines) | `#1F2B37` | `BRAND.md` |
| Near-black (section headings) | `#14161A` | `page.tsx` |
| Body / secondary / muted | `#4B5563` / `#6B7280` / `#9CA3AF` | Tailwind gray |
| Borders / hairlines | `#E5E7EB` / `#F3F4F6` | Tailwind gray |
| Section wash | `#F8F8FB`; card wash `#FCFCFD` | `page.tsx` |
| Dark card / code / border | `#12141A` / `#0B0D11` / `#262A33` | `page.tsx` |
| Success | `#16A34A`, `#F0FDF4`, `#BBF7D0`, `#166534` | Tailwind green |
| Amber (doctrinal) | `#F59E0B`, `#FFFBEB`, `#FDE68A`, `#92400E`, `#B45309` | `BRAND.md` warning family |
| Error | `#B91C1C`, `#FEF2F2`, `#FECACA` | Tailwind red |

**Doctrinal colour — not stylistic.** Amber means *unconfirmed external data awaiting a human*: the
pending draft, the expiry pill, the rate limit, the unverified-string flag. Violet means *a proposed
legal choice*: the vesting emphasis, the highlighted mutation in the payload. Neither is decoration,
and neither may be reassigned. **Status is never carried by colour alone** — every status in this
design is a glyph *plus* a word (`◔ Sandbox warming`, `◷ pending_confirmation`, `✓ completed`,
`↻` polling, `—` for neutral absence). Failure is red; absence is grey, never amber.

**Type.** Inter (self-hosted, already in the root layout), weights 400/500/600/700. Plus Jakarta
Sans 800 only inside the Logo component. Monospace for every payload, code, hash, field path and
status code. Scale: 52 / 34 / 26 / 19 / 16.5 / 14.5 / 13.5 / 12.5 / 11.5px. Tracking: `-0.03em` on
the h1, `-0.02em` on h2s, `0.12–0.14em` on uppercase eyebrows.

**Radius.** 6px badges · 8px buttons and inputs · 10–12px inner panels · 14px cards · 16px the
console · 34px the device frame · 999px pills.

**Spacing.** 56px section padding · 24px container gutter · 20–24px card padding · 20px column gaps ·
10–14px stack gaps.

**Shadow.** Console `0 20px 40px -20px rgba(0,0,0,0.45)`; device frame
`0 18px 40px -18px rgba(0,0,0,0.4)`. Nothing else has one.

---

## Assets

- `LogoLockup` / `LogoMark` — `frontend/src/components/brand/Logo.tsx`. Import it; the prototype
  inlines its geometry only because it cannot import React components.
- `FileText` — `lucide-react`, already a dependency. Inlined in the prototype for the same reason.
- No images. The deed preview is HTML type set in Georgia; in production it is the real rendered
  PDF.
- Glyphs are text characters (`✓ ✕ ◷ ◔ ↻ ◆ —`), not an icon font and not emoji.

---

## Annotations in the prototype

`Try Prototype.dc.html` carries twelve numbered pins and a legend at the bottom explaining each
decision and tagging it *Exists today* / *Needs building* / *Exists, with gaps*. Those pins are a
design artefact — **do not ship them**. Toggle them off with the `showAnnotations` prop to see the
page as a visitor would.

---

## Files in this bundle

| File | What it is |
|---|---|
| `Try Prototype.dc.html` | The happy path, clickable end to end. Props: `presenterMode`, `showAnnotations` |
| `Try Edge States.dc.html` | Every state that is not the happy path, plus the presenter/self-serve diff table |
| `Build Requirements.dc.html` | The 12 build requirements, 4 unverified claims, what already exists, and what is deliberately not built |
| `github.md` | Source association and the screen → repo-file map |

Open the `.dc.html` files in any browser.

## Read before implementing

`docs/BRAND.md` (colour doctrine and the five voice rules) · `docs/DOCTRINE_CONFORMANCE.md` ·
`backend/services/api_catalog.py` · `backend/schemas/api_v1/deeds.py` ·
`backend/routers/api_confirm.py` · `backend/services/api_confirm.py` ·
`backend/tests/test_api_v1_error_contract.py` · `frontend/src/app/confirm/[token]/page.tsx` ·
`frontend/src/app/developers/page.tsx` · `frontend/src/app/page.tsx` · `frontend/src/app/trust/page.tsx`

Every string, colour and behaviour above traces to one of those. Where something could not be
verified by reading, it is listed as unverified rather than asserted.
