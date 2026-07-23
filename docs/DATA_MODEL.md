# DeedPro Data Model

> Generated 2026-07-23 — regenerated from code, 2026-07-23. Not copied from any prior documentation.
> Derived from: `frontend/src/types/builder.ts`, `frontend/src/components/builder/sections/PropertySection.tsx`, `backend/database.py`, `backend/property_integration_schema.sql`, `backend/shared_deeds_schema.sql`, `backend/migrations/**` (incl. `phase23/`), `backend/models/*`, `backend/schemas/api_v1/deeds.py`.

## Frontend types (`frontend/src/types/builder.ts`)

These three interfaces are the entire typed surface of the deed builder:

```ts
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

export interface DTTData {                 // documentary transfer tax
  isExempt: boolean;
  exemptReason: string;
  transferValue: string;
  calculatedAmount: string;
  basis: 'full_value' | 'less_liens';
  areaType: 'city' | 'unincorporated';
  cityName?: string;
}

export interface DeedBuilderState {
  deedType: string;
  property: PropertyData | null;
  grantor: string;
  grantee: string;
  vesting: string;
  dtt: DTTData | null;
  requestedBy: string;
  returnTo: string;
  titleOrderNo?: string;
  escrowNo?: string;
}
```

**`Sourced<T>` does not exist.** Older documentation described a per-field provenance wrapper; there is no such type anywhere in live code (zero grep hits under `frontend/`). `PropertyData` is flat — field origin (SiteX lookup vs. manual entry) is not recorded in data, only implied by UI badges in `PropertySection` (`mapSiteXResponse`, `PropertySection.tsx:458-479`). A stale copy of these same types (minus `titleOrderNo`/`escrowNo`) sits in the orphan `v0-builder/extracted/` tree.

## Backend render-context models (`backend/models/`)

Pydantic models that feed the Jinja2 templates: `GrantDeedRenderContext` (`grant_deed.py`), `GrantDeedPixelContext` (`grant_deed_pixel.py`), `quitclaim_deed.py`, `interspousal_transfer.py`, `warranty_deed.py`, `tax_deed.py`, plus `page_setup.py`, `doc_types.py`, `property_data.py` (SiteX mapping). Public-API request/response schemas live in `backend/schemas/api_v1/deeds.py`.

## Database

PostgreSQL via `DATABASE_URL`. Access is raw psycopg2 (`backend/database.py`) except `backend/phase23_billing/` which uses SQLAlchemy. There is no Alembic; schema evolves through hand-run SQL/py scripts, so the live DB is the union of `database.py:create_tables()` plus applied migrations.

### Core (`backend/database.py`)

| Table | Key columns |
|---|---|
| `users` | id, email (unique), first/last_name, username, city, country, timestamps. Migrations add: `password_hash`, `role`, `plan`, `is_active`, `last_login`, `stripe_customer_id`-era fields, `organization_id` (`add_partners_table_v2.py`) |
| `deeds` | id, user_id FK, deed_type, property_address, apn, county, legal_description, owner_type, sales_price, vesting, status ('draft' default), timestamps. Phase-11 migrations add `pdf_url`, `metadata JSONB`, `completed_at`, rename grantor/grantee_name → `grantors`/`grantees` TEXT, add `requested_by` |
| `payment_methods` | id, user_id FK, stripe_payment_method_id, card_brand, last_four, is_default |
| `user_profiles` | user_id PK/FK, company_name, business_address, license_number, role, default_county, notary_commission_exp, preferred_deed_type, auto_populate_company_info |
| `user_preferences` | user_id PK/FK, default_recording_office, disclaimers, AI/notification prefs (JSON in TEXT) |
| `property_cache` | id, user_id FK, property_address, legal_description, apn, county, city, state, zip; UNIQUE(user_id, property_address) |
| `property_cache_tp` | id, user_id FK, address, `data JSONB`; UNIQUE(user_id, address) |

### Property integration (`backend/property_integration_schema.sql`)

| Table | Purpose |
|---|---|
| `property_cache_enhanced` | Google + SiteX + TitlePoint enrichment per address; raw vendor responses as JSONB; 24h `expires_at` |
| `api_integration_logs` | per-call vendor API log (service, latency, success, payloads) |
| `property_search_history` | user search queries + results JSONB |

### Sharing — two parallel systems (both live)

| System | Tables | Served by |
|---|---|---|
| Legacy | `shared_deeds` (status pending/approved/rejected/revoked, share_type review/edit/sign, permission flags, expiry), `sharing_activity_log` | `main.py` `/shared-deeds`, `/approve/{token}` |
| Phase 7 | `deed_shares` (UUID token, status, feedback columns, view/reminder counters), `deed_share_activity`, `notifications`, `user_notifications` | `routers/shares_enhanced.py`, `routers/notifications.py`, `routers/deed_share_feedback.py` |

### Public API / partner infrastructure (`backend/migrations/00*.sql`)

| Table | Purpose |
|---|---|
| `api_keys` | UUID PK, key_prefix + key_hash, scopes TEXT[], per-minute/hour/day rate limits, org linkage |
| `api_usage`, `api_usage_log`, `api_rate_limits` | usage metering and windowed rate limiting |
| `api_deeds` | deeds created via `/api/v1` — includes `pdf_data BYTEA` (PDFs stored in-DB) |
| `external_deeds` | deeds created via the external partner app (SoftPro/Qualia) |
| `document_authenticity`, `verification_log` | QR authenticity records (`short_code`, content/pdf hashes) + public verification audit |
| `partners` | per-user partner directory (`add_partners_table_v2.py`) |

### Billing (`backend/migrations/phase23/`)

`invoices`, `payment_history`, `usage_events`, `credits`, `api_partner_contracts`, and alterations to `subscriptions` — all cents-denominated, Stripe-linked, used by `backend/phase23_billing/` (SQLAlchemy).

### Notes

- `deeds.metadata JSONB` and the vendor `*_response JSONB` columns are where loosely-structured data accumulates; everything else is conventional columns.
- Two property caches (`property_cache`, `property_cache_tp`) plus `property_cache_enhanced` coexist; `search-v2` traffic uses the SiteX path.
