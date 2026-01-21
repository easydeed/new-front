# DeedPro Codebase Reference
> **Single Source of Truth** — Last Updated: January 2026

---

## 📁 Project Structure

```
new-front/
├── frontend/                 # Next.js 15 frontend (React 19)
│   ├── src/
│   │   ├── app/             # App Router pages & API routes
│   │   ├── components/      # React components
│   │   │   ├── builder/     # Deed builder components
│   │   │   │   └── sections/  # PropertySection, VestingSection, etc.
│   │   │   └── ui/          # Reusable UI components
│   │   ├── contexts/        # React contexts (AIAssist, Auth, Sidebar)
│   │   ├── features/        # Feature modules
│   │   │   ├── builder/     # DeedBuilder main component
│   │   │   ├── wizard/      # Wizard 2.0 (3-step flow)
│   │   │   └── partners/    # Industry Partners CRUD
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utilities & API helpers
│   │   ├── services/        # Frontend services (AI assistant)
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utility functions
│   ├── next.config.js
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                  # Python FastAPI backend
│   ├── api/                 # API route modules
│   ├── models/              # Pydantic models & deed templates
│   ├── routers/             # FastAPI routers
│   ├── services/            # External integrations
│   │   ├── sitex_service.py     # SiteX property lookup
│   │   ├── titlepoint_service.py # TitlePoint backup
│   │   └── pdfshift_service.py  # PDFShift (available but not primary)
│   ├── templates/           # Jinja2 PDF templates
│   ├── main.py              # FastAPI app entry point (~3000 lines)
│   ├── auth.py              # JWT authentication
│   ├── database.py          # PostgreSQL with psycopg2
│   ├── pdf_engine.py        # PDF rendering engine
│   └── requirements.txt
│
├── templates/                # Deed document templates (Jinja2)
│   ├── _partials/           # Reusable template partials
│   │   └── notary_acknowledgment.jinja2  # Full-page notary (Page 2)
│   ├── grant_deed_ca/       # Grant Deed template
│   ├── quitclaim_deed_ca/   # Quitclaim Deed template
│   ├── interspousal_transfer_ca/  # Interspousal Transfer
│   ├── tax_deed_ca/         # Tax Deed template
│   └── warranty_deed_ca/    # Warranty Deed template
│
├── AiTools/                  # AI enhancement components (source files)
├── docs/                     # Project documentation
└── render.yaml               # Render deployment config
```

---

## 🛠 Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 15.4.8 | React framework with App Router |
| **React** | 19.1.0 | UI library |
| **TypeScript** | 5.8.3 | Type safety |
| **Tailwind CSS** | 3.4.18 | Styling |
| **Zustand** | 4.5.5 | Global state management |
| **Framer Motion** | 12.26.2 | Animations (optional) |
| **Zod** | 3.25.76 | Schema validation |
| **Sonner** | 2.0.7 | Toast notifications |
| **Lucide React** | 0.546.0 | Icons |
| **@types/google.maps** | Latest | Google Maps TypeScript types |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **FastAPI** | Latest | Python API framework |
| **Uvicorn** | Latest | ASGI server |
| **PostgreSQL** | Latest | Database (via Render) |
| **psycopg2** | Latest | PostgreSQL adapter |
| **Jinja2** | Latest | PDF template rendering |
| **WeasyPrint** | Latest | HTML to PDF (primary) |
| **Jose** | Latest | JWT handling |
| **Passlib/bcrypt** | Latest | Password hashing |
| **httpx** | Latest | Async HTTP client (SiteX) |
| **Stripe** | Latest | Payment processing |

---

## 🎨 Design System

### Brand Colors
| Name | Value | Usage |
|------|-------|-------|
| **Primary Brand** | `#7C4DFF` | Main buttons, active states |
| **Brand Hover** | `#6a3de8` | Button hover |
| **Brand Active** | `#5b32d1` | Button pressed |
| **Accent** | `#F57C00` | Subtle highlights (user preference) |
| **Violet AI** | `#8B5CF6` | AI features, suggestions |
| **Success** | `#10B981` | Completed states |
| **Warning** | `#F59E0B` | Warnings |
| **Error** | `#EF4444` | Errors |

### Tailwind Config
```js
// tailwind.config.js
colors: {
  brand: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    500: '#7C4DFF',  // Primary
    600: '#6a3de8',  // Hover
    700: '#5b32d1',  // Active
  }
}
```

### Layout Preferences
- Wide layout using full space (not boxed)
- Subtle use of accent color
- Consistent styling across reports

### UI Components (`frontend/src/components/ui/`)
- `button.tsx` — Button variants (primary, secondary, ghost, danger)
- `card.tsx` — Card component
- `input.tsx` — Form inputs
- `badge.tsx` — Status badges
- `Skeleton.tsx` — Loading state skeletons
- `ConfirmDialog.tsx` — Replacement for browser `confirm()`

---

## 🔐 Authentication

### Flow
1. User submits credentials to `/api/auth/login`
2. Backend validates and returns JWT token
3. Frontend stores token in `localStorage` + cookie
4. All API requests include `Authorization: Bearer <token>`

### Frontend Auth (`frontend/src/utils/auth.ts`)
```typescript
import { AuthManager } from '@/utils/auth';

AuthManager.setAuth(token, user);
const token = AuthManager.getToken();
if (AuthManager.isAuthenticated()) { ... }
AuthManager.logout();
if (AuthManager.isAdmin()) { ... }
```

### Token Storage Locations
- `localStorage.getItem('access_token')` — Primary
- `localStorage.getItem('token')` — Fallback

### Backend Auth (`backend/auth.py`)
```python
from auth import get_current_user_id, get_current_admin

@app.get("/protected")
async def protected_route(user_id: int = Depends(get_current_user_id)):
    ...
```

---

## 🏗 Deed Builder Architecture

### Two-Panel Layout
```
┌─────────────────────────────────────────────────────────────────────┐
│  [←] Exit    Grant Deed              [AI Assist toggle]  [? Help]  │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌───────────────────────────────────────┐ │
│  │   INPUT PANEL       │  │       LIVE DEED PREVIEW               │ │
│  │   (420px fixed)     │  │       (Flexible width)                │ │
│  │                     │  │                                       │ │
│  │  • Property         │  │  • Actual deed document               │ │
│  │  • Grantor          │  │  • Updates in real-time               │ │
│  │  • Grantee          │  │  • Highlights active section          │ │
│  │  • Vesting          │  │                                       │ │
│  │  • Transfer Tax     │  │                                       │ │
│  │  • Recording Info   │  │                                       │ │
│  │                     │  │                                       │ │
│  │  [Generate Button]  │  │                                       │ │
│  └─────────────────────┘  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Components
| Component | Location | Purpose |
|-----------|----------|---------|
| `DeedBuilder` | `features/builder/DeedBuilder.tsx` | Main wrapper with AIAssistProvider |
| `BuilderHeader` | `components/builder/BuilderHeader.tsx` | Header with AI toggle |
| `InputPanel` | `components/builder/InputPanel.tsx` | Left panel with sections |
| `PreviewPanel` | `components/builder/PreviewPanel.tsx` | Live deed preview |
| `InputSection` | `components/builder/InputSection.tsx` | Accordion section wrapper |

### Section Components (`components/builder/sections/`)
| Section | Purpose | AI Features |
|---------|---------|-------------|
| `PropertySection` | Address search, SiteX lookup, Google autocomplete | Auto-fills APN, legal description |
| `GrantorSection` | Current owner name | Pre-filled from SiteX |
| `GranteeSection` | New owner name | Same-name warning |
| `VestingSection` | How title will be held | AI suggestions based on grantee count |
| `TransferTaxSection` | DTT calculation or exemption | Auto-exempt for interspousal |
| `RecordingSection` | Requested by, return to | Partners dropdown |

---

## 🧙 Wizard 2.0 (Alternative Flow)

### 3-Step Flow (vs old 5-step)
```
Step 1: Deed Type + Property    (~15 seconds)
    ↓
Step 2: Smart Confirm           (~30 seconds)
    ↓
Step 3: Generate + Success      (~10 seconds)

TOTAL: ~55 seconds
```

### Components
| Component | Purpose |
|-----------|---------|
| `DeedTypePropertyStep` | Combined deed type + property search |
| `SmartConfirmScreen` | One screen with all fields |
| `SuccessScreen` | Post-generation actions |

---

## 🧠 AI Assistance

### Context Provider (`frontend/src/contexts/AIAssistContext.tsx`)
```typescript
import { useAIAssist, AIAssistProvider } from '@/contexts/AIAssistContext';

const { enabled, toggle } = useAIAssist();

// Wrap in DeedBuilder
<AIAssistProvider>
  <DeedBuilder />
</AIAssistProvider>
```

### AI Toggle Behavior
- **ON (default)**: Violet button, shows suggestions
- **OFF**: Gray button, hides all AI features
- Persisted to `localStorage` (`deedpro_ai_assist_enabled`)

### AI Helpers (`frontend/src/lib/ai-helpers.ts`)
```typescript
import { 
  getVestingSuggestion, 
  getTransferTaxSuggestion, 
  validateDeedData,
  analyzePropertyContext,
} from '@/lib/ai-helpers';

// Get vesting suggestion based on grantee patterns
const suggestion = getVestingSuggestion(grantee, deedType, currentVesting);

// Validate before generate
const issues = validateDeedData(state);
// Returns: { level: 'error'|'warning'|'info', message, field, section }
```

### AI Components
| Component | Purpose |
|-----------|---------|
| `AIToggle` | Toggle button in header |
| `AISuggestion` | Dismissible suggestion card |
| `AIApplied` | "AI applied this" indicator |
| `AIHint` | Subtle inline hint |
| `ValidationPanel` | Pre-generate validation display |

### Backend AI Service
```python
# Environment variable required
OPENAI_API_KEY=<key>

# Endpoint
POST /api/ai/suggest-defaults
```

---

## 🏠 Property Search (SiteX Integration)

### Frontend Flow (`PropertySection.tsx`)
1. User types address → Google Places autocomplete
2. User selects suggestion → fills input + shows "Search" button
3. User clicks Search → calls `/api/property/search-v2`
4. Backend returns property data or multi-match options

### Backend Service (`backend/services/sitex_service.py`)
```python
from services.sitex_service import sitex_service

result = await sitex_service.search_property(
    address="123 Main St",
    city="Los Angeles",
    state="CA",
    zip_code="90001"
)

if result.status == "success":
    property_data = result.data
elif result.status == "multi_match":
    matches = result.matches
```

### Environment Variables
```bash
SITEX_BASE_URL=<url>
SITEX_CLIENT_ID=<id>
SITEX_CLIENT_SECRET=<secret>
SITEX_FEED_ID=<feed>
```

### Google Maps Setup
```typescript
// In layout.tsx
<Script
  src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
  strategy="afterInteractive"
/>
```

---

## 📄 PDF Generation

### Current Engine: WeasyPrint (Primary)
```python
from weasyprint import HTML

template = env.get_template(f'{deed_type}_ca/index.jinja2')
html = template.render(deed_data)
pdf = HTML(string=html).write_pdf()
```

### PDFShift (Available but Not Primary)
- Service exists at `backend/services/pdfshift_service.py`
- `pdf_engine.py` supports it with fallback to WeasyPrint
- **NOT configured in `render.yaml`** (no `PDFSHIFT_API_KEY` env var)
- Most routes still use direct WeasyPrint calls

### Template Variables (All Deed Types)
```python
{
    'requested_by': str,
    'title_company': str,
    'return_to': {'name', 'company', 'address1', 'city', 'state', 'zip'},
    'apn': str,
    'title_order_no': str,
    'escrow_no': str,
    'county': str,
    'grantors_text': str,  # Semicolon-separated for multiple
    'grantees_text': str,
    'legal_description': str,
    'execution_date': str,
    'now': datetime.now,  # Function for default date
}
```

### DTT Variables (Grant, Quitclaim, Warranty)
```python
'dtt': {
    'amount': str,          # "550.00"
    'basis': str,           # "full" or "less_liens"
    'area_type': str,       # "unincorporated" or "city"
    'city_name': str,       # City name if applicable
}
```

### Template Location
```
templates/
├── _partials/
│   └── notary_acknowledgment.jinja2  # Full-page notary (Page 2)
├── grant_deed_ca/
│   └── index.jinja2
├── quitclaim_deed_ca/
│   └── index.jinja2
├── interspousal_transfer_ca/
│   └── index.jinja2
├── warranty_deed_ca/
│   └── index.jinja2
└── tax_deed_ca/
    └── index.jinja2
```

---

## 📝 Notary Acknowledgment (Page 2)

### Overview
All deed templates include a **California All-Purpose Acknowledgment** as a separate page (CC § 1189).

### Structure
```
Page 1: Deed content + inline notary section
Page 2 (optional): Exhibit A (legal description > 600 chars)
Final Page: Full Notary Acknowledgment (notary_acknowledgment.jinja2)
```

### Template Location
```
templates/_partials/notary_acknowledgment.jinja2
```

### Integration in Deed Templates
```jinja2
{# At end of deed template, before </body> #}
{% set document_title = 'Grant Deed' %}
{% include '_partials/notary_acknowledgment.jinja2' %}
```

### Required Variables
| Variable | Required | Example | Purpose |
|----------|----------|---------|---------|
| `county` | Yes | `"Los Angeles"` | Pre-fills venue |
| `grantors_text` | Yes | `"JOHN SMITH"` | Pre-fills signer names |
| `document_title` | No | `"Grant Deed"` | Optional section |
| `execution_date` | No | `"January 21, 2026"` | Optional section |
| `page_count` | No | `2` | Optional section |
| `document_id` | No | `"DOC-2026-A7X9K"` | QR verification (Phase 4) |
| `qr_code_data` | No | `"data:image/png;base64,..."` | QR code image (Phase 4) |

### Notary Page Sections
1. **Disclaimer Box** — Required legal text per CC § 1189
2. **Title** — "California All-Purpose Acknowledgment"
3. **Venue** — State of California / County of [county]
4. **Acknowledgment Body** — With signer names
5. **Certification** — Under penalty of perjury
6. **Signature/Seal** — Signature line + 2.25" × 2.25" seal area
7. **Optional Section** — Document title, date, page count
8. **QR Verification** — Future Phase 4 feature

### CSS Notes
- `page-break-before: always` forces new page
- Works with both WeasyPrint and PDFShift
- Explicit widths in inches (not percentages)
- 2.25" × 2.25" notary seal area

### Template-Specific Document Titles
| Deed Type | Document Title |
|-----------|---------------|
| Grant Deed | `'Grant Deed'` |
| Quitclaim Deed | `'Quitclaim Deed'` |
| Interspousal Transfer | `'Interspousal Transfer Deed'` |
| Warranty Deed | `'Warranty Deed'` |
| Tax Deed | `'Tax Deed'` |

---

## 👥 Industry Partners

### Context (`frontend/src/features/partners/PartnersContext.tsx`)
```typescript
import { usePartners, PartnersProvider } from '@/features/partners/PartnersContext';

const { partners, loading, reload, create } = usePartners();
// partners: PartnerOption[] with { id, label, category }
```

### Interface
```typescript
interface PartnerOption {
  id: string;
  label: string;        // Display name
  category: string;     // 'title_company', 'escrow_company', etc.
  company_name?: string;
  contact_name?: string;
}
```

### Usage in RecordingSection
```typescript
<select value={requestedBy} onChange={handleChange}>
  {partners.map((partner) => (
    <option key={partner.id} value={partner.label}>
      {partner.label}
    </option>
  ))}
</select>
```

### Backend Endpoints
- `GET /api/partners/selectlist/` — List for dropdown
- `POST /api/partners` — Create new partner
- `PUT /api/partners/{id}` — Update partner
- `DELETE /api/partners/{id}` — Delete partner

---

## 🔗 Sharing & Approval Workflow

### Share Flow
1. EO shares deed via email
2. Recipient gets link: `/approve/{token}`
3. Recipient can view PDF, approve, or request changes
4. EO receives notification

### Share Statuses
- `sent` — Initial state
- `viewed` — Recipient opened the link
- `approved` — Recipient approved
- `rejected` — Recipient requested changes
- `revoked` — EO cancelled share
- `expired` — Link expired

### Configurable Expiration
```typescript
// Default: 7 days (was 24 hours)
expires_in_hours: 24 | 72 | 168 | 336 | 720
```

### Structured Feedback (Rejection)
```json
{
  "issues": ["grantor_name", "vesting", "other"],
  "comments": "The grantor name is misspelled",
  "timestamp": "2026-01-21T10:00:00Z"
}
```

---

## 🗄 Database

### Core Tables
```sql
-- Users
users (id, email, first_name, last_name, username, city, country, created_at)

-- Deeds
deeds (id, user_id, deed_type, property_address, apn, county, 
       legal_description, grantor_name, grantee_name, vesting, 
       requested_by, status, pdf_data, created_at)

-- Deed Shares
deed_shares (id, deed_id, owner_user_id, recipient_email, recipient_name,
             token, status, viewed_at, expires_at, created_at)

-- Partners
partners (id, organization_id, category, company_name, contact_name,
          email, phone, address_line1, city, state, postal_code, is_active)

-- User Profiles
user_profiles (user_id, company_name, business_address, license_number, 
               role, default_county, preferred_deed_type)

-- Property Cache
property_cache (id, user_id, property_address, legal_description, apn, county)
```

### Connection
```python
from database import get_db_connection

conn = get_db_connection()
cursor = conn.cursor()  # Returns RealDictCursor
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
user = cursor.fetchone()  # Returns dict
```

---

## 🌐 API Architecture

### Frontend Proxy Pattern
Frontend API routes proxy to Python backend:

```typescript
// frontend/src/app/api/property/search-v2/route.ts
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

export async function POST(req: NextRequest) {
  const resp = await fetch(`${BACKEND_URL}/api/property/search-v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': req.headers.get('authorization') || '',
    },
    body: JSON.stringify(await req.json()),
  });
  return NextResponse.json(await resp.json());
}
```

### Key Backend Routes (`main.py`)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/login` | POST | User login |
| `/api/auth/register` | POST | User registration |
| `/deeds` | POST | Create deed |
| `/deeds/{id}` | GET | Get deed by ID |
| `/api/property/search-v2` | POST | SiteX property lookup |
| `/api/generate/grant-deed-ca` | POST | Generate Grant Deed PDF |
| `/api/ai/suggest-defaults` | POST | AI field suggestions |
| `/api/partners` | CRUD | Partner management |
| `/approve/{token}` | GET/POST | Sharing approval |
| `/shared-deeds/{id}/resend` | POST | Resend reminder |

---

## 🚀 Deployment

### Hosting
| Service | Platform | URL |
|---------|----------|-----|
| **Frontend** | Vercel | `deedpro-frontend-new.vercel.app` |
| **Main API** | Render | `deedpro-main-api.onrender.com` |
| **External API** | Render | `deedpro-external-api.onrender.com` |
| **Database** | Render PostgreSQL | (internal) |

### Environment Variables

#### Frontend (Vercel)
```bash
NEXT_PUBLIC_API_URL=https://deedpro-main-api.onrender.com
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<key>
NEXT_PUBLIC_GOOGLE_API_KEY=<key>  # Fallback
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<key>
```

#### Backend (Render)
```bash
DATABASE_URL=<postgres_url>
JWT_SECRET_KEY=<secret>
SITEX_CLIENT_ID=<id>
SITEX_CLIENT_SECRET=<secret>
SITEX_FEED_ID=<feed>
STRIPE_SECRET_KEY=<key>
OPENAI_API_KEY=<key>
PDFSHIFT_API_KEY=<key>  # Available but not primary
ALLOWED_ORIGINS=https://deedpro-frontend-new.vercel.app
```

### Deployment Workflow
1. Push to `main` branch
2. Vercel auto-deploys frontend
3. Render auto-deploys backend
4. **Test on production only** (no local testing)

---

## 📦 State Management

### Zustand Store (`frontend/src/store.ts`)
```typescript
import { useWizardStore } from '@/store';

const { docType, setDocType, data, setData, reset } = useWizardStore();
```

### Builder State Types (`frontend/src/types/builder.ts`)
```typescript
export interface DeedBuilderState {
  deedType: string;
  property: PropertyData | null;
  grantor: string;
  grantee: string;
  vesting: string;
  dtt: DTTData | null;
  requestedBy: string;
  returnTo: string;
}

export interface PropertyData {
  address: string;
  city: string;
  county: string;
  state: string;
  zip: string;
  apn: string;
  legalDescription: string;
  owner?: string;
}

export interface DTTData {
  isExempt: boolean;
  exemptReason: string;
  transferValue: string;
  calculatedAmount: string;
  basis: 'full_value' | 'less_liens';
  areaType: 'city' | 'unincorporated';
  cityName?: string;
}
```

---

## 📋 Feature Flags (`frontend/src/config/featureFlags.ts`)
```typescript
export const FEATURE_FLAGS = {
  REVENUE_TAB: true,        // Admin revenue dashboard
  SYSTEM_TAB: false,        // Admin system metrics
  EXPORTS: true,            // CSV exports
  NEW_LANDING_PAGE: false,  // V0 landing page
  NEW_AUTH_PAGES: false,    // V0 auth flow
  NEW_DASHBOARD: false,     // V0 dashboard
};
```

---

## 📁 Key Files Reference

### Frontend
| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout with Google Maps script |
| `app/deed-builder/[type]/page.tsx` | Deed builder route |
| `features/builder/DeedBuilder.tsx` | Main builder with AIAssistProvider |
| `components/builder/InputPanel.tsx` | Left panel with form sections |
| `components/builder/PreviewPanel.tsx` | Right panel with deed preview |
| `components/builder/sections/*.tsx` | Individual form sections |
| `components/builder/AIToggle.tsx` | AI toggle button |
| `components/builder/AISuggestion.tsx` | AI suggestion cards |
| `components/builder/ValidationPanel.tsx` | Pre-generate validation |
| `components/Sidebar.tsx` | Main navigation |
| `contexts/AIAssistContext.tsx` | AI toggle state |
| `lib/api.ts` | API client helper |
| `lib/ai-helpers.ts` | AI suggestion logic |
| `utils/auth.ts` | AuthManager class |
| `types/builder.ts` | TypeScript interfaces |

### Backend
| File | Purpose |
|------|---------|
| `main.py` | FastAPI app with all routes (~3000 lines) |
| `auth.py` | JWT authentication |
| `database.py` | PostgreSQL functions |
| `pdf_engine.py` | PDF rendering (WeasyPrint + PDFShift support) |
| `services/sitex_service.py` | SiteX property lookup |
| `services/titlepoint_service.py` | TitlePoint integration |
| `services/pdfshift_service.py` | PDFShift service (available) |
| `models/property_data.py` | Property data models |
| `api/property_endpoints.py` | Property search routes |
| `api/generate_deed.py` | PDF generation routes |

---

## 🔗 External Integrations

### Google Maps (Places API)
- Loaded via `<Script>` in `layout.tsx`
- Used for address autocomplete in PropertySection
- Keys: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` or `NEXT_PUBLIC_GOOGLE_API_KEY`

### Stripe
- Payment processing for subscriptions
- Keys: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### SiteX (Property Data)
- Primary property search and enrichment
- OAuth2 authentication
- Keys: `SITEX_CLIENT_ID`, `SITEX_CLIENT_SECRET`, `SITEX_FEED_ID`

### TitlePoint
- Alternative property data source
- SOAP API integration
- Used as fallback for SiteX

### OpenAI
- AI suggestions and validation
- Key: `OPENAI_API_KEY`

### PDFShift
- Chrome headless PDF rendering (available)
- Key: `PDFSHIFT_API_KEY` (needs to be configured)

---

## 🧪 Testing

### Production Testing Only
- Always test on production Render/Vercel
- No local development server testing
- Use browser tools to verify deployment

### Frontend Testing (if needed)
```bash
cd frontend
npm run test              # Jest unit tests
npm run cypress:open      # E2E tests
```

### Backend Testing (if needed)
```bash
cd backend
pytest
python test_sitex_direct.py
```

---

## 📞 Quick Commands

### Git Workflow
```bash
git add .
git commit -m "Description"
git push origin main
# Deploys automatically to Vercel + Render
```

### Check Deployments
- Vercel: Use MCP tools (`list_deployments`, `get_deployment`)
- Render: Use MCP tools or dashboard

---

## 📚 Additional Documentation

| Document | Purpose |
|----------|---------|
| `docs/wizard/ARCHITECTURE.md` | Wizard architecture |
| `docs/wizard/SITEX_FIELD_MAPPING.md` | SiteX field mappings |
| `docs/backend/PDF_GENERATION_SYSTEM.md` | PDF generation |
| `docs/backend/ROUTES.md` | API routes reference |
| `docs/ONBOARDING_NEW_AGENTS.md` | For new AI agents |
| `GOOGLE_MAPS_SETUP.md` | Google Maps configuration |
| `PROPERTY_SECTION_FLOW.md` | Property search flow |

---

## 🔄 Migration Notes

### Template Migration
- New templates in `templates/new_templates/` designed for PDFShift
- Current templates in `templates/{deed_type}_ca/` use WeasyPrint
- CSS Grid layouts fall back to block display in WeasyPrint

### PDF Engine Status
| Engine | Status | Used In |
|--------|--------|---------|
| WeasyPrint | **Primary** | `main.py` (line 2799+), `api/generate_deed.py` |
| PDFShift | **Available** | `pdf_engine.py`, `services/pdfshift_service.py` |

---

*This document serves as the single source of truth for the DeedPro codebase. Update as the project evolves.*
