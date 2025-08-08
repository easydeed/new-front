### Deed Wizard Flow (Address‑First)

This document describes the current end‑to‑end deed creation flow in the frontend wizard, how it maps to backend APIs and Jinja templates, and what users see at each step.

### Overview

- Purpose: guide users from deed selection to preview/PDF generation with minimal friction
- Structure: 5 steps, address‑first
- Autosave: draft persists in `localStorage` under `deedWizardDraft`
- Preview: uses HTML template via `/generate-deed-preview` (no plan usage)
- Final: PDF generation via `/generate-deed` (counts toward limits; gated by plan/add‑on)

### Access & Gating

- Access check: `GET /check-widget-access` (reads `users.widget_addon`)
- Current behavior: preview allowed for any logged‑in user; final PDF requires add‑on

### Step 1 — Deed Type

- UI: Card grid of deed types (Quitclaim, Grant, Warranty, Trust Transfer)
- State: `formData.deedType`

### Step 2 — Property Search (Address‑First)

- UI: Full‑width address input + “Search” action
- API: `GET /property/search?address=<query>` (backend normalizes and returns property metadata)
- State updates (best‑effort mapping):
  - `apn`, `county`, `city`, `state`, `zip`, `fullAddress`, `fips`, `propertyId`, `legalDescription`
- Additional fields:
  - APN and County side‑by‑side
  - Legal Description full‑width

### Step 3 — Parties & Recording Info

- Recording and routing
  - `recordingRequestedBy`
  - `mailTo`
  - `orderNo`, `escrowNo`
- Parties
  - `grantorName` (seller)
  - `granteeName` (buyer)
  - `vesting` (title holding)
  - Optional `ownerType`
- Deed date
  - `deedDate`

### Step 4 — Transfer Tax & Consideration

- Consideration
  - `salesPrice`
  - `documentaryTax`
- Tax computation toggles
  - `taxComputedFullValue`
  - `taxComputedLessLiens`
- Location
  - `isUnincorporated`
  - `taxCityName` (if incorporated)

### Step 5 — Notary & Review

- Notary details
  - `notaryCounty`, `notaryDate`, `notaryName`, `appearedBeforeNotary`, `grantorSignature`
- Review cards summarize all captured data
- Actions
  - Preview (HTML) → `/generate-deed-preview`
  - Generate (PDF) → `/generate-deed` (requires add‑on; counts toward plan limits)

### Template Mapping (Preview / Final)

Both `grant_deed.html` and `quitclaim_deed.html` accept the same keys. The wizard maps state to these:

- `recording_requested_by` ← `recordingRequestedBy`
- `mail_to` ← `mailTo || fullAddress || propertySearch`
- `order_no` ← `orderNo`
- `escrow_no` ← `escrowNo`
- `apn` ← `apn`
- `documentary_tax` ← `documentaryTax || salesPrice`
- `city` ← `taxCityName || city`
- `grantor` ← `grantorName`
- `grantee` ← `granteeName`
- `county` ← `county`
- `property_description` ← `legalDescription || fullAddress || propertySearch`
- `date` ← `deedDate || today`
- `grantor_signature` ← `grantorSignature || grantorName`
- `county_notary` ← `notaryCounty || county`
- `notary_date` ← `notaryDate`
- `notary_name` ← `notaryName`
- `appeared_before_notary` ← `appearedBeforeNotary || grantorName`
- `notary_signature` ← `notaryName`

### Preview Payload Example

```json
POST /generate-deed-preview
{
  "deed_type": "grant_deed",
  "data": {
    "recording_requested_by": "DeedPro User",
    "mail_to": "123 Main St, Los Angeles, CA 90001",
    "order_no": "ORD-1001",
    "escrow_no": "ESC-2002",
    "apn": "123-456-789",
    "documentary_tax": "0.00",
    "city": "Los Angeles",
    "grantor": "John Doe",
    "grantee": "Jane Smith",
    "county": "Los Angeles",
    "property_description": "Lot 10, Tract 12345...",
    "date": "2025-08-08",
    "grantor_signature": "John Doe",
    "county_notary": "Los Angeles",
    "notary_date": "2025-08-08",
    "notary_name": "Alex Notary",
    "appeared_before_notary": "John Doe",
    "notary_signature": "Alex Notary"
  }
}
```

### Endpoints Used

- `GET /check-widget-access` — access gating
- `GET /property/search?address=` — address normalization
- `POST /generate-deed-preview` — HTML preview (no usage impact)
- `POST /generate-deed` — final generation (usage tracked)

### Autosave & Resume

- Key: `deedWizardDraft`
- Structure: `{ formData, currentStep, showPreview }`
- Resume banner shown on dashboard when a draft exists

### UX Guidelines (implemented)

- Flat, minimal, brand‑consistent (sidebar gentle indigo; white canvas)
- Larger, centered progress markers; widened tooltips
- Two‑column forms on desktop; full‑width for primary inputs
- Clear step labeling; no artificial time estimate

### Validation & Edge Cases

- Address search is best‑effort; fields can be adjusted manually
- If preview fails, surface a retry with the current data snapshot
- If plan/add‑on not enabled, show banner and route to account when generating final PDF

### Future Enhancements

- Debounced address search with suggestions
- “Use this address” pill confirmation with normalized output
- Inline helper chips per field (first‑run only)
- Guided vs. Expert mode toggle


