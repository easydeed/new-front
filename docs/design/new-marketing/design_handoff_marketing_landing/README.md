# Handoff: DeedPro marketing landing pages

## Overview
The single marketing homepage is replaced by two audience pages that share one header, one visual system and one engine story:

- **Platforms** (`Platforms.dc.html`) — for software companies integrating the deed API. Sells the API first.
- **Escrow Desks** (`Escrow-Desks.dc.html`) — for escrow and title officers using the app. Sells the desk workflow.
- **Sample grant deed** (`Sample-Grant-Deed.dc.html`) — a two-page sample deed, embedded in both pages and openable on its own.

**Platforms is the default.** It is the homepage at `/` (also reachable at `/platforms`); Escrow Desks lives at `/escrow`. The header logo links to the Platforms page from both. Each page keeps its own address so ads, emails and search can link to one audience.

## About the design files
The files in this folder are **design references built in HTML**. They are prototypes showing the intended look, copy and behaviour, not production code to ship. The task is to **recreate them in the existing Next.js app** (`frontend/src/app`) using its components, routing and conventions. `support.js` is only the prototype runtime; do not port it.

To view a file, serve this folder over HTTP and open the `.dc.html` file. Markup sits between `<x-dc>` tags with inline styles; behaviour is the `class Component` in the script tag at the bottom of each file. `{{ name }}` holes in the markup are values returned by that class's `renderVals()`.

## Fidelity
**High fidelity.** Colours, type, spacing, copy and interactions are final unless listed under "Open items". Recreate them exactly.

## Design tokens

**Colour**
- Ink `#12141A` · dark band `#0B0D11` · dark border `#262A33`
- Body text `#374151` · muted `#4B5563` · on-dark muted `#B4B9C4` / `#D1D5DB`
- Hairline `#E5E7EB` · strong hairline `#D1D5DB` · soft surface `#F8F8FB` / `#F3F4F6`
- Accent purple `#7C4DFF` · hover `#6a3de8` · text-on-light `#6D3BF0` / `#5B32D1` · on-dark `#A78BFA` / `#C4B5FD` · tints `#F5F3FF`, `#DDD6FE`
- "From records, unconfirmed" amber: bg `#FFFBEB`, border `#FDE68A`, text `#B45309` / `#92400E`, flash `#FDE68A`
- Confirmed green: bg `#ECFDF5` / `#F0FDF4`, border `#A7F3D0` / `#BBF7D0`, text `#047857` / `#166534`, button `#059669` hover `#047857`
- Error (on dark): text `#FCA5A5`, bg `rgba(239,68,68,.15)`, border `rgba(239,68,68,.3)`

**Type**
- Headlines: `Source Serif 4`, weight 500, letter-spacing −0.015 to −0.03em, line-height 1.03–1.2. Hero `clamp(38px,5.4vw,68px)`; section `clamp(32px,4vw,48px)`; sub `26–30px`.
- Body and UI: `IBM Plex Sans` 400/500/600/700. Body 15–18px, line-height 1.55–1.65.
- Code, labels, logo: `IBM Plex Mono` 500/600. Eyebrow labels 12px/600, uppercase, letter-spacing .1em.
- The sample deed itself uses `Times New Roman`.

**Shape**
- Radius: buttons 6–8px, cards 12–14px, chips 4px, toggle pill 999px.
- Shadows: document `0 20px 40px rgba(2,6,23,.12–.14)`; toggle thumb `0 2px 8px rgba(18,20,26,.35)`.
- Page container: `max-width:1200px`, side padding `clamp(20px,4vw,48px)`, section padding `clamp(56px,7vw,88px)` vertical.

## Shared header
Sticky, white at 95% with a 12px backdrop blur and a `#E5E7EB` bottom border. Padding 14px top, 6px bottom.

- **Left: logo.** A rubber-stamp wordmark, no icon: `deed/pro` in IBM Plex Mono 600 (letter-spacing −.04em), purple `#7C4DFF`, inside a rounded box with a .06em border plus a 1px outline offset .07em, rotated −3deg. Header size is 34px with the name alone. The footer uses a 48px version in `#A78BFA` with a rule and a second line, `DEED ENGINE · CALIFORNIA` (wording unapproved, see Open items). Explorations are in `Logo Options.dc.html` (chosen: 2f).
- **Centre: audience toggle.** A 330px pill (`#F3F4F6`, 1px `#E5E7EB`) with two equal links, "</> Platforms" and "§ Escrow desks", 14px/700. The active side has a dark `#12141A` thumb that slides in from the other side on page load (.55s, `cubic-bezier(.3,1.25,.5,1)`), so switching pages feels like one control.
- **Under the toggle (10px gap): section menu.** 13.5px/500 links that jump to sections. The link for the section currently in view is highlighted (scroll-spy). Platforms: Sample deed, API, Hard questions, Pricing, Docs, Trust. Escrow desks: Sample deed, How a file runs, Documents, Time saved, Questions, Pricing.
- **Right: Login and the primary button.** Platforms: "Request a sandbox key" (purple). Escrow desks: "Start free" (ink).
- **Responsive.** Below 1100px the toggle and menu drop to their own centred row. Below 720px the section menu and Login are hidden, leaving logo, button and toggle.
- The header's measured height is written to a CSS variable (`--navh`); anchored sections use `scroll-margin-top: calc(var(--navh) + 12px)` and pinned elements use `top: calc(var(--navh) + 8px)`.
- Favicon: purple rounded square with a white slash (inline SVG in each file's head).

## Page: Platforms
Sections in order:
1. **Hero with live API demo.** Left: headline, copy, buttons. Right: a three-step dark console. Step 01 is a request builder (pick one of seven instrument slugs, toggle whether `grantee.vesting` or the entity state is sent). Step 02 is the officer's confirm screen ("Confirm this deed", "Approve", "This is not the deed", expires in 7 days). Step 03 is the result. Invalid combinations return a 422 with the field path, message and a plain-language gloss; the rules are in `TYPES` and `renderVals()`.
2. **For the buyer.** Three plain-language cards for the non-technical signer: what you get, what it takes, what it risks.
3. **The output** (`#output`). The sample deed with margin rulers, four proof points and "Open the sample deed".
4. **API** (`#api`). "The whole API is seven routes." Code samples with curl / Python / Node tabs.
5. **Cross-link band** to the Escrow Desks page.
6. **Hard questions** (`#answers`). Straight answers: no SOC 2, no penetration test, no SLA or status page, no webhooks, DPA drafted, unconfirmed drafts deleted after seven days, eight named outside services.
7. **Pricing** (`#pricing`), including an optional founding-partner offer.
8. **Start** (`#start`). Three-field request form (name, work email, what you're building) beside "What happens next".
9. **Footer** and an optional sticky bottom call-to-action bar.

## Page: Escrow Desks
1. **Hero with confirm demo.** Field cards on the left, a full grant deed preview on the right. Each card is amber ("From county records", Confirm) or purple ("Proposed, your decision", Accept); confirmed cards turn green. Print is enabled once every field is confirmed.
2. **The output** (`#output`). Same sample deed block as Platforms.
3. **How a file runs** (`#file`). Four steps of text on the left scroll past one pinned grant deed on the right. Below 820px this becomes four stacked step cards with no pinning.
4. **Documents** (`#documents`). "All 19 documents, by name."
5. **Time saved** (`#app`). A deeds-per-month slider with an hours range.
6. **Questions** (`#answers`), **Pricing** (`#pricing`), **Start** (`#start`), footer, sticky bar.

## Sample grant deed
`Sample-Grant-Deed.dc.html` is a two-page letter-size document built in container-relative units so it scales to any width: page 1 is the grant deed (return-address block in the top-left 3½ × 2½ in, recorder's space, order/escrow/APN line, transfer tax declaration, granting clause, legal description, date and signature lines); page 2 is a blank California notary acknowledgment. Parties, property and numbers are fictitious. Opened directly it shows a "Save as PDF" button that prints the two pages. Embedded, only page 1 shows inside an 8.5:11 frame (max 420px wide).

**Replace this with a PDF generated by the real engine before launch**, and point "Open the sample deed" at that file.

## Interactions and motion
All motion is disabled under `prefers-reduced-motion: reduce`.

- **Self-playing hero (Platforms).** On load: at 3.2s the vesting field is removed, at 6.4s the officer approves, at 9.5s autoplay ends. Any click cancels it. A pulsing dot and "A demo is playing. Click anything to take over." show while it runs.
- **422 shake.** The error badge shakes for .45s each time the error changes.
- **Seal stamp.** On approve, a three-ring recorder seal (green `#166534`) scales from 2.6× to 1× with a −8deg tilt over .7s, `cubic-bezier(.2,1.3,.4,1)`. The SHA-256 text cycles random hex 16 times at 55ms, then settles.
- **Ink into the deed (Escrow Desks hero).** A confirmed value appears in the preview rising 6px with an amber flash that fades over 1s.
- **Packet fan.** On print, four sheets (Grant Deed, Acknowledgment, PCOR, BOE form) fan out with rotations −9, −3, 3, 9deg, .6s each, staggered 90ms.
- **Scroll-driven deed (Escrow Desks, How a file runs).** The step whose centre is nearest the viewport centre is active. Step 01: APN, owner and legal description highlight amber. Step 02: transfer tax fills in, its boxes tick, vesting appears in purple. Step 03: dashed margin guides and a "return block checked" outline appear. Step 04: the notary line turns green and the packet fans over the lower part of the deed. Highlights fade over .7s. The pinned deed is scaled (zoom, min 0.5) to fit between the header and the bottom bar.
- **Margin rulers (sample deed).** When the block is 30% in view, purple lines draw over 1s: one at 22.7% from the top (2½ in recorder space) and two at 5.9% from each side (½ in margins), then labels fade in.
- **Keyboard.** Every clickable control has `role="button"` and `tabIndex=0`; Enter and Space activate it. Focus ring: 2px `#7C4DFF`, 2px offset.

## State
**Platforms:** selected instrument, vesting sent (bool), entity state sent (bool), officer decision (none / approved / rejected), autoplay active, code-sample language, form fields, form submitted, form attempted, active menu section, header height.
**Escrow Desks:** confirmed fields (map), printed (bool), deeds per month, active scroll step (0–3), narrow layout (bool), active menu section, header height.

**Form validation (Platforms):** name required; email needs an `@`, a dot after it and no spaces. On failure show "Add your name and a valid work email so we can reply." On success swap the form for a thank-you using the first name.

## Still to wire up
- The request form posts nowhere.
- The hero demos are simulated in the browser from the published rules; they do not call the sandbox.
- "Create my free account" on Escrow Desks has no destination.
- Links that assume routes: `/login`, `/terms`, `/privacy` (unconfirmed); `/developers`, `/trust`, `/try` (exist in the app).

## Open items for the business
- Real sample deed PDF from the engine.
- Team names, roles and photos (two empty photo frames on each page).
- Support hours and response time (pages say only info@deedpro.io).
- What happens when the 14-day trial ends.
- Production API pricing, and whether the founding-partner offer is real.
- Claims to verify: "free forever", the hours-saved maths (35–85 minutes per deed), the Government Code citations (§27361.6, §27361.7), "DEED ENGINE · CALIFORNIA" in the footer logo, and the ½ in / 2½ in ruler labels.
- Neither page has been checked on a real phone.

## Assets
- Fonts from Google Fonts: Source Serif 4, IBM Plex Sans, IBM Plex Mono.
- No image files. The logo, seal, favicon and sample deed are type and simple shapes.
- `image-slot.js` is a prototype-only drop target for the team photos.

## Files
- `Platforms.dc.html` — platforms page
- `Escrow-Desks.dc.html` — escrow desks page
- `Sample-Grant-Deed.dc.html` — sample deed (embedded by both pages)
- `Logo Options.dc.html` — logo explorations; 2f was chosen
- `support.js`, `image-slot.js` — prototype runtime only
