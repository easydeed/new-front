# Handoff: DeedPro Developers (docs) and Trust pages

## Overview
Two existing pages are redesigned to match the new marketing landing pages:

- **Developers** (`Developers.dc.html`) replaces `frontend/src/app/developers/page.tsx` at `/developers`.
- **Trust** (`Trust.dc.html`) replaces `frontend/src/app/trust/page.tsx` at `/trust`. The live page has no header or footer; this adds both.

Both use the shared marketing header and footer already built for `/` and `/escrow`. Reuse those components; do not rebuild them.

## About the design files
The files in this folder are **design references built in HTML**. They are prototypes showing the intended look, copy and behaviour, not production code to ship. The task is to **recreate them in the existing Next.js app** using its components, the marketing stylesheet and fonts already in `frontend/src/components/marketing`. `support.js` and `image-slot.js` are only the prototype runtime; do not port them.

To view a file, serve this folder over HTTP and open the `.dc.html` file. Markup sits between `<x-dc>` tags with inline styles; behaviour is the `class Component` in the script tag at the bottom. `{{ name }}` holes are values returned by that class's `renderVals()`.

## Fidelity
**High fidelity.** Colours, type, spacing and interactions are final. Recreate them exactly.

## Copy
The text is the live pages' copy. Keep the existing sources of truth:

- Deed-type table: keep rendering from `API_DEED_TYPES` in `frontend/src/lib/apiDocs.ts`. The prototype hard-codes the seven currently available types.
- Held instruments: keep rendering from `HELD_INSTRUMENTS`. The prototype shows one amber note naming `interspousal_transfer` and `tax_deed`.
- Trust: keep the `GAPS` and `HAVE` arrays and their `banned-claims: allow` comments. The prototype splits each gap into a bold first statement and a muted remainder; a few words changed in the split (for example "No penetration test." / "None scheduled."). Use the live wording and split at the first sentence.

Written new for the design, and needing sign-off: the Developers hero headline, the ten section headings, the one-line route descriptions in the hero card ("List the deeds under your key" is inferred from the route name), and the Trust section headings.

## Design tokens
**Colour**
- Ink `#12141A` · dark band `#0B0D11` · dark border `#262A33` / `#1B1E26` / `#3A3F4B`
- Body text `#374151` · muted `#4B5563` · on-dark muted `#B4B9C4` / `#D1D5DB` / `#E5E7EB`
- Hairline `#E5E7EB` · strong hairline `#D1D5DB` · soft surface `#F8F8FB` / `#F3F4F6`
- Accent purple `#7C4DFF` · text-on-light `#6D3BF0` / `#5B32D1` · on-dark `#A78BFA` / `#C4B5FD` · tints `#F5F3FF`, `#DDD6FE`
- Amber note: bg `#FFFBEB`, border `#FDE68A`, text `#92400E`
- Green label `#166534` · GET on dark `#86EFAC` · POST on dark `#C4B5FD`
- 500 chip: text `#991B1B`, bg `#FEF2F2`, border `#FECACA`

**Type**
- Headlines: `Source Serif 4`, weight 500. Page H1 `clamp(38px,5vw,60px)` (Trust: up to 68px), letter-spacing −0.03em, line-height 1.03. Section H2 `clamp(26px,3vw,34px)` (Trust bands: `clamp(30px,3.8vw,44px)`), letter-spacing −0.02em.
- Body: `IBM Plex Sans`. Paragraphs 16px / 1.7, max-width 720px. Card body 15–15.5px / 1.65.
- Mono: `IBM Plex Mono`. Eyebrows and section numbers 12px/600, uppercase, letter-spacing .1em. Code 13px / 1.65. Inline code 13px on `#F3F4F6` with a 1px `#E5E7EB` border, 4px radius.

**Shape**
- Radius: buttons 8px, code blocks and cards 12px, hero route card 14px, chips 4px.
- Container: `max-width:1200px`, side padding `clamp(20px,4vw,48px)`.

## Shared header on these pages
Same component as the landing pages, with these settings:
- Toggle: Platforms side active. No slide-in animation on these pages.
- Menu: Sample deed, API, Hard questions, Pricing link back to the Platforms page sections; **Docs** is highlighted on `/developers` and **Trust** on `/trust`.
- Primary button "Request a sandbox key": jumps to `#start` on `/developers`; links to the Platforms page `#start` on `/trust`.
- The header's measured height is exposed as `--navh`; sticky and anchored elements below use it.

## Page: Developers
1. **Hero** (`#F8F8FB`, bottom hairline). Two columns that wrap (`repeat(auto-fit,minmax(320px,1fr))`, gap 40px 56px).
   - Left: eyebrow "API reference · v1", H1, 18px intro, a dark base-URL bar (label "BASE", the URL in mono, Copy button; the URL wraps, never scrolls), then two buttons: "Request a sandbox key" (purple, to `#start`) and "Run it live" (outlined, to `/try`).
   - Right: dark card "The whole surface · 7 routes". Each row: method (POST purple, GET green), path in white mono, and a one-line purpose in muted text.
2. **Body grid**: `220px minmax(0,1fr)`, gap 56px. Below 900px the sidebar is hidden and the content is full width.
   - **Sidebar** "On this page": sticky at `--navh + 16px`, `max-height: calc(100vh - var(--navh) - 32px)`, scrolls on its own. Eleven links (the ten sections plus "Request access"). Active link: bold ink, 2px purple left rule, `#F5F3FF` fill. Inactive: `#4B5563`, 2px `#E5E7EB` left rule, purple on hover.
   - **Sections**: each has a top hairline, 48px vertical padding, a mono number (01–10), a serif H2, then content with an 18px gap.
3. **Section contents**
   - 01 Quickstart: four step cards (`auto-fit, minmax(190px,1fr)`); step 03 has a purple border and `#F5F3FF` fill. One code block with cURL / Python / Node tabs. A second block labelled "Response · 201".
   - 02 Confirmation: two paragraphs, then four points in a two-column grid (each point: 2px ink top rule, bold title, muted body).
   - 03 Authentication: header code block, four points.
   - 04 Deed types: table (deed_type, Instrument, grantee.vesting, Also required). Vesting shows as a chip: "required" (white, grey border), "optional" (grey), "fixed by the instrument" (purple tint). Below it, the amber on-hold note linking to the changelog.
   - 05 What the API will not do: five points.
   - 06 Idempotency: paragraph, header code block, paragraph.
   - 07 Errors: error-shape code block, then a table (Status chip, Code, What it means). 4xx chips are amber; 500 is red.
   - 08 Public verification: two paragraphs.
   - 09 Transfer tax: paragraph, five points.
   - 10 Changelog: paragraph, then rows of `104px` date column (purple mono) plus title and body, each with a top hairline.
4. **Tables**: header cells are mono uppercase with a 1px ink bottom rule; rows have a `#E5E7EB` bottom rule. Identifiers break only at `_` and `.` (insert `<wbr>` after each); never mid-word. Tables must fit the content column without sideways scrolling from 900px up.
5. **Code blocks**: `#0B0D11`, 1px `#262A33` border, 12px radius. Header row holds a mono uppercase label (or the tabs) and a Copy button. Active tab: white text on `#262A33`. Body scrolls horizontally if a line is too long.
6. **Request access** (`#start`): the same dark three-field form section as the Platforms page. Reuse that component.

## Page: Trust
1. **Hero** (`#F8F8FB`): eyebrow "Trust", H1, one 19px paragraph, two jump buttons: "10 things we do not have" (ink, to `#gaps`) and "7 things we do" (outlined, to `#have`). The counts come from the array lengths.
2. **What we do not have** (`#gaps`, dark band): eyebrow, H2, then the gaps in a wrapping two-column grid (`auto-fit, minmax(300px,1fr)`, column gap 48px). Each row: top rule `#262A33`, a purple mono number, an 18px bold statement and an optional 15px muted line.
3. **What we do have** (`#have`, white): eyebrow in green, H2, then seven cards in a wrapping grid. Each card: 2px ink top rule, green mono number, 19px bold heading, body. The subprocessor card lists the eight services as mono chips.
4. **Questionnaire band** (`#F8F8FB`): serif line and one sentence on the left; "info@deedpro.io" (purple, mailto) and "Read the API docs" (outlined, to `/developers`) on the right.
5. Shared footer.

## Interactions
- **Scroll-spy (Developers)**: the active section is the last one whose top is at or above `--navh + 80px`. When it changes, the sidebar scrolls itself so the active link is visible. Measure the link against the sidebar's own box; the sidebar is sticky and is the link's offset parent. Do not use `scrollIntoView`.
- **Anchors**: sections use `scroll-margin-top: calc(var(--navh) + 20px)` on Developers and `var(--navh)` on Trust.
- **Code tabs**: one block, three languages; switching swaps the body.
- **Copy**: copies the block's text to the clipboard; the button reads "Copied" for 1.4s.
- **Request form**: name required; email needs an `@`, a dot after it and no spaces. On failure show "Add your name and a valid work email so we can reply." On success swap the form for the thank-you. The live page's `ApiInquiryForm` already posts somewhere; keep its submission and apply this styling.
- **Keyboard**: every clickable non-link control has `role="button"`, `tabIndex=0`, and responds to Enter and Space. Focus ring: 2px `#7C4DFF`, 2px offset.

## State
- Developers: active section id, code language, form fields, form attempted, form sent, header height.
- Trust: header height only.

## Not verified
- Trust was checked once and passed; Developers passed on tables, tabs, Copy, form error and section highlighting. The final sidebar-scroll fix and phone widths have not been confirmed on either page.
- In the prototype the header menu links point at sibling `.dc.html` files; map them to `/`, `/developers` and `/trust`.

## Files
- `Developers.dc.html` — API docs page
- `Trust.dc.html` — trust page
- `support.js`, `image-slot.js` — prototype runtime only
