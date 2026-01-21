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
│   │   ├── contexts/        # React contexts (AIAssist, Auth)
│   │   ├── features/        # Feature modules (builder, wizard, partners)
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utilities & API helpers
│   │   ├── services/        # Frontend services
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
│   ├── services/            # External integrations (SiteX, TitlePoint)
│   ├── templates/           # Jinja2 PDF templates
│   ├── main.py              # FastAPI app entry point
│   ├── auth.py              # JWT authentication
│   ├── database.py          # PostgreSQL with psycopg2
│   └── requirements.txt
│
├── templates/                # Deed document templates (Jinja2)
│   ├── grant_deed_ca/
│   ├── quitclaim_deed_ca/
│   ├── interspousal_transfer_ca/
│   ├── tax_deed_ca/
│   └── warranty_deed_ca/
│
├── docs/                     # Project documentation
├── AiTools/                  # AI enhancement components (integrated)
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
| **Framer Motion** | 12.26.2 | Animations |
| **Zod** | 3.25.76 | Schema validation |
| **Sonner** | 2.0.7 | Toast notifications |
| **Lucide React** | 0.546.0 | Icons |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **FastAPI** | Latest | Python API framework |
| **Uvicorn** | Latest | ASGI server |
| **PostgreSQL** | Latest | Database (via Render) |
| **psycopg2** | Latest | PostgreSQL adapter |
| **Jinja2** | Latest | PDF template rendering |
| **WeasyPrint** | Latest | HTML to PDF conversion |
| **Jose** | Latest | JWT handling |
| **Passlib/bcrypt** | Latest | Password hashing |
| **httpx** | Latest | Async HTTP client (SiteX) |
| **Stripe** | Latest | Payment processing |

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

// Store auth
AuthManager.setAuth(token, user);

// Get token
const token = AuthManager.getToken();

// Check auth
if (AuthManager.isAuthenticated()) { ... }

// Logout
AuthManager.logout();

// Check admin
if (AuthManager.isAdmin()) { ... }
```

### Backend Auth (`backend/auth.py`)
```python
from auth import get_current_user_id, get_current_admin, verify_token

# Protect routes
@app.get("/protected")
async def protected_route(user_id: int = Depends(get_current_user_id)):
    ...

# Admin-only routes
@app.get("/admin")
async def admin_route(admin: str = Depends(get_current_admin)):
    ...
```

### Environment Variables
- `JWT_SECRET_KEY` — Backend JWT signing key (REQUIRED)

---

## 🗄 Database

### Connection
- **Type**: PostgreSQL (hosted on Render)
- **ORM**: None — uses raw `psycopg2` with `RealDictCursor`
- **Connection String**: `DATABASE_URL` environment variable

### Core Tables
```sql
-- Users
users (id, email, first_name, last_name, username, city, country, created_at)

-- Deeds
deeds (id, user_id, deed_type, property_address, apn, county, 
       legal_description, grantor_name, grantee_name, vesting, 
       requested_by, status, created_at)

-- User Profiles (AI defaults)
user_profiles (user_id, company_name, business_address, license_number, 
               role, default_county, preferred_deed_type)

-- Property Cache (SiteX/TitlePoint data)
property_cache (id, user_id, property_address, legal_description, apn, county)
property_cache_tp (id, user_id, address, data JSONB, created_at)
```

### Database Access Pattern
```python
from database import get_db_connection, create_deed, get_user_deeds

# Direct queries
conn = get_db_connection()
cursor = conn.cursor()
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
user = cursor.fetchone()  # Returns dict thanks to RealDictCursor
```

---

## 🌐 API Architecture

### Frontend Proxy Pattern
Frontend API routes (`/app/api/*`) proxy requests to the Python backend:

```typescript
// frontend/src/app/api/deeds/create/route.ts
const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const authHeader = req.headers.get('authorization');
  
  const resp = await fetch(`${BACKEND_BASE_URL}/deeds`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: JSON.stringify(payload),
  });
  
  return NextResponse.json(await resp.json());
}
```

### API Client Helper (`frontend/src/lib/api.ts`)
```typescript
import { apiGet, apiPost, API_URL } from '@/lib/api';

// GET request
const data = await apiGet('/users/me', token);

// POST request
const result = await apiPost('/deeds', payload, token);
```

### Backend Routes (main.py)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/login` | POST | User login |
| `/api/auth/register` | POST | User registration |
| `/deeds` | POST | Create deed |
| `/deeds/{id}` | GET | Get deed by ID |
| `/api/property/search-v2` | POST | SiteX property lookup |
| `/api/generate/grant-deed-ca` | POST | Generate Grant Deed PDF |
| `/api/ai/suggest-defaults` | POST | AI field suggestions |
| `/admin/*` | Various | Admin endpoints |

---

## 🏠 Property Search (SiteX Integration)

### Service (`backend/services/sitex_service.py`)
```python
from services.sitex_service import sitex_service

# Search by address
result = await sitex_service.search_property(
    address="123 Main St",
    city="Los Angeles",
    state="CA",
    zip_code="90001"
)

if result.status == "success":
    property_data = result.data  # PropertyData object
elif result.status == "multi_match":
    matches = result.matches  # List[PropertyMatch]
```

### Environment Variables
- `SITEX_BASE_URL` — API base URL
- `SITEX_CLIENT_ID` — OAuth client ID
- `SITEX_CLIENT_SECRET` — OAuth client secret
- `SITEX_FEED_ID` — Feed identifier

### Frontend Property Search (`frontend/src/components/builder/sections/PropertySection.tsx`)
- Uses Google Places for autocomplete
- Sends address to `/api/property/search-v2`
- Handles multi-match scenarios

---

## 📄 PDF Generation

### Flow
1. Frontend sends deed data to `/api/generate/{deed-type}-ca`
2. Backend loads Jinja2 template from `templates/{deed_type}_ca/index.jinja2`
3. Template rendered to HTML
4. WeasyPrint converts HTML → PDF
5. PDF returned as binary response

### Template Location
```
templates/
├── grant_deed_ca/
│   ├── index.jinja2           # Main template
│   ├── header_return_block.jinja2
│   ├── body_deed.jinja2
│   └── footer_execution_notary.jinja2
├── quitclaim_deed_ca/
│   └── index.jinja2
├── interspousal_transfer_ca/
│   └── index.jinja2
└── ...
```

### Backend Generation (`backend/pdf_engine.py` / `main.py`)
```python
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

env = Environment(loader=FileSystemLoader('templates'))
template = env.get_template(f'{deed_type}_ca/index.jinja2')
html = template.render(deed_data)
pdf = HTML(string=html).write_pdf()
```

---

## 🧠 AI Assistance

### Context (`frontend/src/contexts/AIAssistContext.tsx`)
```typescript
import { useAIAssist, AIAssistProvider } from '@/contexts/AIAssistContext';

// In component
const { enabled, toggle } = useAIAssist();

// Wrap app
<AIAssistProvider>
  <DeedBuilder />
</AIAssistProvider>
```

### Helpers (`frontend/src/lib/ai-helpers.ts`)
```typescript
import { 
  getVestingSuggestion, 
  getTransferTaxSuggestion, 
  validateDeedData 
} from '@/lib/ai-helpers';

// Get vesting suggestion
const suggestion = getVestingSuggestion(grantee, deedType, currentVesting);

// Get DTT suggestion
const dttSuggestion = getTransferTaxSuggestion(deedType, grantor, grantee);

// Validate deed data
const issues = validateDeedData(state);
```

### Backend AI (`backend/ai_assist.py`)
```python
from ai_assist import ai_router, suggest_defaults, validate_deed_data

# Router included in main.py
app.include_router(ai_router)
```

---

## 📦 State Management

### Zustand Store (`frontend/src/store.ts`)
```typescript
import { useWizardStore } from '@/store';

// In component
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
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<key>
NEXT_PUBLIC_AI_ASSISTANCE_ENABLED=true
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
ALLOWED_ORIGINS=https://deedpro-frontend-new.vercel.app
```

### Deployment Workflow
1. Push to `main` branch
2. Vercel auto-deploys frontend
3. Render auto-deploys backend
4. Test on production (no local testing)

---

## 📁 Key Files Reference

### Frontend
| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout with Google Maps script |
| `features/builder/DeedBuilder.tsx` | Main deed builder component |
| `components/builder/InputPanel.tsx` | Left panel with form sections |
| `components/builder/PreviewPanel.tsx` | Right panel with deed preview |
| `components/builder/sections/*.tsx` | Individual form sections |
| `components/Sidebar.tsx` | Main navigation sidebar |
| `lib/api.ts` | API client helper |
| `lib/ai-helpers.ts` | AI suggestion logic |
| `utils/auth.ts` | AuthManager class |
| `contexts/AIAssistContext.tsx` | AI toggle state |
| `types/builder.ts` | TypeScript interfaces |

### Backend
| File | Purpose |
|------|---------|
| `main.py` | FastAPI app with all routes |
| `auth.py` | JWT authentication |
| `database.py` | PostgreSQL functions |
| `services/sitex_service.py` | SiteX property lookup |
| `services/titlepoint_service.py` | TitlePoint integration |
| `models/property_data.py` | Property data models |
| `api/property_endpoints.py` | Property search routes |
| `api/generate_deed.py` | PDF generation routes |

---

## 🎨 Design System

### Colors
| Name | Value | Usage |
|------|-------|-------|
| Primary/Accent | `#F57C00` | Buttons, highlights (subtle) |
| Violet AI | `#8B5CF6` | AI features, suggestions |
| Success | `#10B981` | Completed states |
| Warning | `#F59E0B` | Warnings |
| Error | `#EF4444` | Errors |

### Layout Preferences
- Wide layout using full space (not boxed)
- Subtle use of accent color
- Consistent styling across reports

### UI Components (`frontend/src/components/ui/`)
- `button.tsx` — Button variants
- `card.tsx` — Card component
- `input.tsx` — Form inputs
- `badge.tsx` — Status badges
- `Skeleton.tsx` — Loading states

---

## 🧪 Testing

### Frontend
```bash
cd frontend
npm run test              # Jest unit tests
npm run cypress:open      # E2E tests (Cypress)
```

### Backend
```bash
cd backend
pytest                    # Run all tests
python test_sitex_direct.py  # Test SiteX integration
```

### Production Testing
- Always test on production Render/Vercel
- No local development server testing

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

## 🔗 External Integrations

### Google Maps (Places API)
- Loaded via `<Script>` in `layout.tsx`
- Used for address autocomplete in PropertySection
- Keys: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

### Stripe
- Payment processing for subscriptions
- Keys: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### SiteX (Property Data)
- Property search and enrichment
- OAuth2 authentication
- Keys: `SITEX_CLIENT_ID`, `SITEX_CLIENT_SECRET`, `SITEX_FEED_ID`

### TitlePoint
- Alternative property data source
- SOAP API integration
- Used as fallback for SiteX

---

## 📞 Quick Commands

### Development
```bash
# Frontend
cd frontend && npm run dev

# Backend
cd backend && uvicorn main:app --reload
```

### Git Workflow
```bash
git add .
git commit -m "Description"
git push origin main
# Deploys automatically to Vercel + Render
```

### Check Deployments
- Vercel: Check Vercel dashboard or use MCP tools
- Render: Check Render dashboard or use MCP tools

---

## 📚 Additional Documentation

- `docs/wizard/ARCHITECTURE.md` — Wizard architecture
- `docs/wizard/SITEX_FIELD_MAPPING.md` — SiteX field mappings
- `docs/backend/PDF_GENERATION_SYSTEM.md` — PDF generation
- `docs/backend/ROUTES.md` — API routes reference
- `docs/ONBOARDING_NEW_AGENTS.md` — For new AI agents

---

*This document serves as the single source of truth for the DeedPro codebase. Update as the project evolves.*
