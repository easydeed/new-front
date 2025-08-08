### Enhanced Deed Wizard Flow (100% Efficiency)

This document describes the **AI-enhanced, cloud-like deed creation flow** in the frontend wizard, delivering 100% efficiency through seamless create, edit, and preview functionality.

### Overview

- **Purpose**: Effortless deed creation with "walking on a cloud" user experience
- **Structure**: 5 intelligent steps with real-time validation and AI assistance
- **Intelligence**: Smart data mapping with automatic field population and validation
- **Efficiency**: Real-time preview updates, seamless editing, instant feedback
- **Autosave**: Continuous draft persistence with visual feedback
- **Preview**: Enhanced preview panel with zoom, print, and edit capabilities
- **Final**: One-click PDF generation with comprehensive validation

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

### Enhanced Template Mapping (AI-Powered)

Both templates use **intelligent data mapping** with AI suggestions, automatic calculations, and dynamic features:

#### Core Template Variables
- `recording_requested_by` ← AI suggestions + `recordingRequestedBy`
- `mail_to` ← AI suggestions + `mailTo || fullAddress || propertySearch`
- `order_no` ← `orderNo`
- `escrow_no` ← `escrowNo`
- `apn` ← AI suggestions + `apn`
- `documentary_tax` ← **Auto-calculated** from `salesPrice` (CA $0.55/$500 standard)
- `city` ← AI suggestions + `taxCityName || city`
- `grantor` ← `grantorName`
- `grantee` ← `granteeName`
- `county` ← AI suggestions + `county`
- `property_description` ← AI suggestions + `legalDescription || fullAddress || propertySearch`
- `date` ← **Auto-formatted** `deedDate || today` (MM/DD/YYYY)
- `grantor_signature` ← `grantorSignature || grantorName`

#### Enhanced Template Features
- `tax_computed_full_value` ← **Dynamic checkbox** from `taxComputedFullValue`
- `tax_computed_less_liens` ← **Dynamic checkbox** from `taxComputedLessLiens`
- `is_unincorporated` ← **Dynamic checkbox** from `isUnincorporated`
- `county_notary` ← AI suggestions + `notaryCounty || county`
- `notary_date` ← **Auto-formatted** `notaryDate`
- `notary_name` ← `notaryName`
- `appeared_before_notary` ← `appearedBeforeNotary || grantorName`
- `notary_signature` ← `notaryName`
- `vesting_description` ← **Enhanced** property description with vesting details

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

### 🚀 100% Efficiency Features (LATEST)

#### **Real-Time Intelligence**
- **Smart Validation**: Instant feedback on required fields and warnings
- **AI Data Mapping**: Comprehensive `deedDataMapper.ts` utility for perfect field mapping
- **Auto-Calculations**: Documentary tax, date formatting, field suggestions
- **Dynamic Templates**: Checkboxes respond to user selections with ✓ marks

#### **Enhanced User Experience**
- **WizardFlowManager**: Visual progress tracking with 64px circles and larger text
- **Brand Consistency**: Perfect `rgb(37, 99, 235)` color alignment throughout
- **Smart Step Navigation**: Intelligent step unlocking based on completion
- **Auto-Save**: Single saved indicator in bottom-right corner
- **Cancel Control**: Users can abandon deed creation with confirmation dialog

#### **Professional Preview System**
- **DeedPreviewPanel**: Professional preview with zoom, print, edit controls
- **Validation Integration**: Missing fields highlighted with clear instructions
- **Edit Mode**: Seamless switching between preview and edit
- **Quick Actions**: Floating action button for instant preview access

#### **Refined Interface Design**
- **Clean Deed Cards**: Borderless design with `rgb(247, 249, 252)` background
- **No Tooltips**: Simplified interaction without hover overlays
- **Consistent Branding**: All elements use exact brand colors from landing page
- **Improved Accessibility**: Larger circles (64px), enhanced text sizes

#### **Smart Dashboard Integration**
- **Dynamic Resume Banner**: Shows/hides based on actual draft existence
- **Real-Time Updates**: Monitors localStorage for instant UI changes
- **Enhanced Information**: Displays deed type, step progress, and save date
- **Cancel Responsiveness**: Disappears immediately when deed is cancelled

#### **Developer Tools**
- **PreviewDataDebugger**: Visual field mapping inspection
- **Validation Feedback**: Real-time missing field detection
- **Data Flow Visualization**: Complete wizard → template mapping display

#### **Cloud-Like Performance**
- **Instant Feedback**: Real-time validation without backend calls
- **Smooth Transitions**: Animated progress indicators with brand colors
- **Error Prevention**: Pre-submission validation prevents failed requests
- **Smart Defaults**: AI suggestions reduce manual data entry

### Future Enhancements

- Voice-activated field completion
- Document scanning for automatic field population  
- Multi-language template support
- Advanced analytics and usage insights


