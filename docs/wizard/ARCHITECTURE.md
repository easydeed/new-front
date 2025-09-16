# Dynamic Wizard Architecture

## Purpose & Key References
This document explains how the dynamic deed wizard should operate end-to-end so frontend and backend teams stay aligned while we finish wiring the experience. It references the current implementation in [`frontend/src/app/create-deed/dynamic-wizard.tsx`](../../frontend/src/app/create-deed/dynamic-wizard.tsx) and global state helpers in [`frontend/src/store.ts`](../../frontend/src/store.ts), along with the FastAPI routes that deliver wizard metadata and automation.

## End-to-End Flow
### Step 1 – Property Verification with TitlePoint & Manual Override
1. **Address capture** happens inside `PropertySearchWithTitlePoint`, which runs Google Places lookups before calling the backend TitlePoint service.
2. **Primary API path**: `POST /api/property/search` → `TitlePointService.search_property()` validates the address, returns APN, county, legal description, and a confidence score.
3. **Manual fallback**: When TitlePoint or SiteX lookups fail, the component keeps the verified address and lets users continue with manual entry rather than blocking the wizard. The UI copy and `manual entry` banner set user expectations for compliance.
4. **State hand-off**: Verified data (address, APN, owner) should be written once into the central wizard store so every downstream step reads the same source of truth.

### Step 2 – Document Type Selection & AI-Assisted Prompts
1. **Document catalog**: Fetch `/api/doc-types` so the frontend renders the backend-managed registry instead of the hard-coded `DOC_TYPES` object. This ensures the 5-step Grant Deed and other legally required step plans stay synced with server definitions.
2. **Doc-type selection** updates `docType` in the shared store, which drives button prompt availability and downstream validation.
3. **Quick data pulls** invoke `POST /api/ai/assist` with `type` values such as `vesting`, `grant_deed`, `tax_roll`, or `all`. The endpoint fans out to TitlePoint helpers, merges results, and signals whether the wizard can fast-forward because required legal fields were satisfied.
4. **Custom prompt** usage still posts to `/api/ai/assist`, but with the natural-language `prompt` so the backend can interpret the intent and deliver curated data (chain of title, liens, etc.). The store should capture both raw AI responses and the user-confirmed fields they accept.

### Step 3 – Dynamic Step Rendering & Generation
1. **Metadata-driven screens**: The backend registry describes ordered steps plus the fields each step needs (see `backend/models/doc_types.py`). The frontend should hydrate this metadata once, then render sections dynamically instead of relying solely on the in-component `DOC_TYPES` shape.
2. **Data persistence**: Each field edit calls `setData(key, value)` from the Zustand store. The store becomes the single write path so exports to previews, validation, and the generate request stay consistent.
3. **Document generation**: When the user triggers completion, send the consolidated payload to `POST /api/generate-deed`. The endpoint selects the correct Jinja template, validates legally required fields per document type, renders the PDF, and stores an audit record.

## Centralized State Strategy
- `useWizardStore` already tracks `docType`, `currentStep`, and a `data` dictionary. Extend it to hold `verifiedProperty`, `aiResults`, validation flags, and submission status.
- The page container (future `/create-deed` client entry point) should initialize the store, hydrate metadata from `/api/doc-types`, and pass derived slices into `DynamicWizard` as props. This keeps the component presentational and avoids diverging local state.
- Shared selectors keep review screens, previews, and downstream forms in sync while enabling optimistic updates or offline persistence later.

## Backend Integration Map
```mermaid
flowchart TD
    A[Step 1: Address] -->|Address string| B[/api/property/search]
    B -->|TitlePoint data or manual flag| C[Central Wizard Store]
    C --> D[Step 2: Doc Type & Prompts]
    D -->|Fetch registry| E[/api/doc-types]
    D -->|Quick / Custom prompts| F[/api/ai/assist]
    C --> G[Step 3: Review & Generate]
    G -->|Final payload| H[/api/generate-deed]
    H --> I[PDF + audit record]
```

| Phase | Primary Purpose | Backend Routes | Notes & Current Gaps |
| --- | --- | --- | --- |
| Step 1 – Property Verification | Confirm address, pull APN/legal description, allow manual fallback | `/api/property/search` (plus SiteX/TitlePoint helpers) | Manual override works, but `PropertySearchWithTitlePoint` still calls legacy `/api/property/sitex/*` endpoints. Aligning on `/api/property/search` keeps logging and auth consistent. |
| Step 2 – Doc Type & Prompts | Choose deed type, invoke AI data pulls, mark fast-forward eligibility | `/api/doc-types`, `/api/ai/assist` | `DynamicWizard` hardcodes the doc catalog; hydrate from `/api/doc-types` instead so legal step plans stay centralized. Capture AI responses in the shared store for auditing. |
| Step 3 – Review & Generate | Collect remaining mandatory fields, generate PDF, persist audit trail | `/api/generate-deed` | Store wiring supports data capture, but `/create-deed` currently redirects to the old Grant Deed wizard (`page.tsx`), so the dynamic flow is not yet live. |

## Known Integration Gaps
- `/create-deed/page.tsx` redirects to `/create-deed/grant-deed`, so the new dynamic wizard never mounts in production. Swap the entry point to a dynamic container once state and metadata hydration are complete.
- `DynamicWizard` duplicates backend metadata. Replace in-component configuration with the `/api/doc-types` payload to avoid drift.
- Property verification should funnel through a backend controller that normalizes Google, SiteX, and manual paths while enforcing audit logging.

## Compliance Guardrails (from Catastrophe Summary)
### Legal Guardrails
- **Do not collapse legally required steps**: Grant Deeds need five discrete phases (request details, tax, parties/property, review, generate) to satisfy California Civil Code §1092 (complete property identification) and Revenue & Taxation Code §11911 declarations.
- **Notary & signature requirements remain explicit**: Civil Code §§1185 and 1189 mandate acknowledgment and signature handling; the review step must surface these obligations.
- **Maintain recorder formatting**: Government Code §§27361.7 and 27393 enforce margin, font, and PDF layout rules. Templates in `/api/generate-deed` must preserve US Letter sizing and margin standards.
- **Document transfer tax accuracy**: Keep dedicated transfer tax inputs; AI may assist, but the user must confirm amounts to avoid legal exposure.

### UX & Operational Guardrails
- **Transparent complexity**: The wizard must explain why each legal step exists instead of hiding it; users should understand that AI speeds data entry but cannot bypass compliance.
- **Robust fallbacks**: TitlePoint outages or AI failures must degrade gracefully to manual entry without data loss (manual override already exists—preserve it).
- **Single source of truth**: Prevent conflicting state stores; use the centralized store so audit logs reflect exactly what the user saw and submitted.
- **AI as assistant, not authority**: Always require user confirmation of AI-suggested values, and log the provenance for legal review.

Adhering to this architecture keeps the wizard honest about legal complexity while still delivering the assisted experience that marketing promises.
