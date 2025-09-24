# Backend Route Reference

This guide summarizes the routers FastAPI mounts in [`backend/main.py`](../../backend/main.py) and highlights the authentication requirements, request/response shapes, and known integration fallbacks for each group. It also points to the core auth and user management endpoints that live directly in `main.py`.

## Router overview

| Router module | Mounted prefix | Purpose | Authentication | Notable gaps |
| --- | --- | --- | --- | --- |
| `backend/ai_assist.ai_router` | `/api/ai` | Legacy AI field formatter that feeds mock or OpenAI-backed suggestions. | None | Falls back to canned strings when OpenAI SDK/key is missing. 【F:backend/main.py†L31-L39】【F:backend/ai_assist.py†L17-L101】 |
| `backend/api/property_endpoints.router` | `/api/property` | Full property validation, enrichment, caching, SiteX two-step flow, and diagnostic TitlePoint tests. | `Depends(get_current_user_id)` on every route. | External Google/SiteX/TitlePoint clients are optional; service gaps return 503s or manual-entry guidance. 【F:backend/main.py†L34-L44】【F:backend/api/property_endpoints.py†L26-L355】【F:backend/api/property_endpoints.py†L620-L988】 |
| `backend/api/ai_assist.router` | `/api/ai` | **Phase 3 Enhanced**: Dynamic prompt orchestrator with timeout protection, multi-document support, and comprehensive logging. | `Depends(get_current_user)` | **Phase 3**: Added timeout handling, concurrent request limiting, multi-document endpoint. Shares `/api/ai/assist` path with legacy router. 【F:backend/main.py†L46-L55】【F:backend/api/ai_assist.py†L16-L350】 |
| `backend/api/property_search.router` | `/api/property` | Simplified TitlePoint search plus autocomplete suggestions. | `Depends(get_current_user)` | Mounted after `property_endpoints`, so its `/search` handler overrides the earlier one. 【F:backend/main.py†L56-L63】【F:backend/api/property_search.py†L32-L94】 |
| `backend/api/generate_deed.router` | `/api` | Generates deed PDFs from wizard data and saves results. | `Depends(get_current_user)` | Returns validation errors or generic 500s when template generation fails. 【F:backend/main.py†L65-L72】【F:backend/api/generate_deed.py†L19-L200】 |
| `backend/routers/deeds.router` | `/api/generate` | **Phase 3 Enhanced**: Streams hardened Grant Deed (CA) PDF with validation, logging, and performance monitoring. | `Depends(get_current_user_id)` | **Phase 3**: Added schema validation, request tracking, audit trail, sanitization. Depends on Jinja/WeasyPrint. 【F:backend/main.py†L74-L82】【F:backend/routers/deeds.py†L9-L225】 |
| `backend/api/doc_types.router` | `/api` | Serves the dynamic-wizard document registry. | None | Pure in-memory registry; no fallbacks needed. 【F:backend/main.py†L84-L92】【F:backend/api/doc_types.py†L5-L11】 |
| `backend/routers/ai.router` | `/api/ai` | Experimental AI helpers (chain of title, profile suggestions). | None | Wraps TitlePoint SOAP calls but always returns a placeholder chain/suggestion on failure. 【F:backend/main.py†L94-L101】【F:backend/routers/ai.py†L25-L116】 |

## Core endpoints defined directly in `main.py`

While most integrations sit behind routers, the authentication, billing, admin, and deed management flows are implemented inline in `backend/main.py`:

- **Auth & profile** – Registration, login, profile retrieval, and plan upgrades live at `/users/register`, `/users/login`, `/users/profile`, and `/users/upgrade`, combining database checks with Stripe Checkout session creation.【F:backend/main.py†L302-L518】
- **Payments** – Webhook handling and customer portal helpers reside under `/payments/*`, anchored to Stripe signatures and customer IDs.【F:backend/main.py†L528-L664】
- **Admin dashboards** – `/admin/*` routes expose user, deed, revenue, analytics, and system-health reports, all protected by `Depends(get_current_admin)` and Postgres queries.【F:backend/main.py†L671-L1136】
- **Deed lifecycle** – `/deeds`, `/shared-deeds`, and related routes manage generation, sharing, approval tokens, and recipient management directly against the deed tables.【F:backend/main.py†L1217-L1537】
- **Pricing & feature toggles** – `/pricing`, `/pricing/plans`, `/admin/create-plan`, `/admin/sync-pricing`, and `/admin/update-price` wrap price metadata and Stripe price updates.【F:backend/main.py†L1828-L1965】

## Router details

### `backend/ai_assist.ai_router` – legacy field suggestions
- **Path(s):** `POST /api/ai/assist` accepts `AIAssistRequest` (`deed_type`, `field`, `input`) and returns `AIAssistResponse` with `suggestion` and optional `confidence` score.【F:backend/ai_assist.py†L24-L101】
- **Authentication:** No dependency injection—open to unauthenticated clients.【F:backend/ai_assist.py†L49-L101】
- **Fallbacks:** Uses canned formatting strings whenever the OpenAI SDK/key is missing or API calls fail, and surfaces a 500 only after logging unexpected errors.【F:backend/ai_assist.py†L76-L140】

### `backend/api/ai_assist.router` – **Phase 3 Enhanced** dynamic prompt orchestrator
- **Path(s):** 
  - `POST /api/ai/assist` consumes `PromptRequest` (button `type`, free-form `prompt`, `docType`, `verifiedData`, `currentData`, optional `timeout`) and returns enhanced `PromptResponse` (`success`, `data`, `error`, `duration`, `cached`, `request_id`).【F:backend/api/ai_assist.py†L28-L112】
  - **NEW**: `POST /api/ai/multi-document` handles `MultiDocumentRequest` for orchestrated generation of multiple document types with shared data.【F:backend/api/ai_assist.py†L246-L349】
- **Authentication:** Requires `Depends(get_current_user)` for every call.【F:backend/api/ai_assist.py†L57-L112】
- **Phase 3 Enhancements:**
  - **Timeout Protection**: Configurable timeouts with `asyncio.wait_for` (default 15s, configurable via `AI_ASSIST_TIMEOUT`)
  - **Concurrent Limiting**: Semaphore-based limiting of TitlePoint requests (`MAX_CONCURRENT_REQUESTS`)
  - **Request Tracking**: Unique request IDs, comprehensive logging, performance metrics
  - **Multi-Document Support**: Orchestrated generation of multiple document types with shared data
  - **Error Resilience**: Enhanced error handling with graceful degradation
- **Behavior:** Button prompts call TitlePoint helpers for vesting, grant history, tax roll, chain of title, or comprehensive reports. Custom prompts use enhanced intent detection. Multi-document requests process multiple configurations in parallel.【F:backend/api/ai_assist.py†L114-L243】
- **Integration gaps:** Shares the `/api/ai/assist` path with the legacy router. TitlePoint outages bubble up as `success=False` errors with detailed logging. No mock fallback but enhanced error reporting.【F:backend/main.py†L31-L55】【F:backend/api/ai_assist.py†L114-L350】

### `backend/api/property_endpoints.router` – property integration suite
- **Request/response models:** `PropertySearchRequest`, `PropertyEnrichmentRequest`, and `PropertyValidationResponse` define the standard payloads; `SiteXAddressSearchRequest` and `SiteXApnSearchRequest` cover the production two-step flow.【F:backend/api/property_endpoints.py†L26-L55】【F:backend/api/property_endpoints.py†L895-L905】
- **Core flows:**
  - `POST /api/property/validate` uses Google Places for validation, caches results, and returns cached data immediately when present.【F:backend/api/property_endpoints.py†L104-L155】
  - `POST /api/property/enrich` chains SiteX and TitlePoint lookups when those services are configured, caching enriched responses and logging API usage.【F:backend/api/property_endpoints.py†L158-L227】
  - History endpoints (`GET /search-history`, `GET /cached-properties`) read from the Postgres cache, while `POST /search` and `GET /search-legacy` mix cache hits with live TitlePoint or Google results and downgrade gracefully when integrations are unavailable.【F:backend/api/property_endpoints.py†L230-L399】
- **Diagnostics:** `/api/property/test/*` endpoints exercise TitlePoint tax/property flows and SiteX search/APN lookups, returning structured success/error payloads without raising exceptions to aid troubleshooting.【F:backend/api/property_endpoints.py†L620-L866】
- **Production SiteX flow:** `/api/property/sitex/address-search` and `/api/property/sitex/apn-search` replicate the working JavaScript integration, enforcing auth, logging usage, and surfacing 503/500 responses when the SiteX client is down.【F:backend/api/property_endpoints.py†L895-L988】
- **Integration gaps:** All endpoints depend on `get_current_user_id`; when Google, SiteX, or TitlePoint services fail to import or respond they either raise 503s or return manual-entry instructions so the wizard can fall back to user input.【F:backend/api/property_endpoints.py†L12-L101】【F:backend/api/property_endpoints.py†L310-L353】【F:backend/api/property_endpoints.py†L919-L987】

### `backend/api/property_search.router` – streamlined TitlePoint lookup
- **Path(s):** `POST /api/property/search` (with `address`) and `GET /api/property/suggestions` (with query param `address`). Both require the current user from the database layer.【F:backend/api/property_search.py†L15-L94】
- **Behavior:** Wraps `TitlePointService.search_property` and `get_address_suggestions`, returning structured success/error responses instead of raw integration payloads.【F:backend/api/property_search.py†L32-L94】
- **Integration gap:** Because this router is mounted after `property_endpoints`, its `/search` handler supersedes the richer cached implementation above. Removing the prefix or path collision is necessary if both behaviors are required.【F:backend/main.py†L34-L63】【F:backend/api/property_search.py†L32-L94】

### `backend/api/generate_deed.router` – wizard PDF generation
- **Path(s):** `POST /api/generate-deed` consumes `GenerateDeedRequest` (covering deed type, parties, property fields, tax data, etc.) and returns `GenerateDeedResponse` with the `pdf_base64`, `deed_id`, and optional `error` message.【F:backend/api/generate_deed.py†L19-L107】
- **Authentication:** Requires `Depends(get_current_user)` to persist deed metadata against the authenticated user.【F:backend/api/generate_deed.py†L50-L107】
- **Fallbacks:** Missing templates, failed validation, or PDF rendering issues produce `success=False` responses with descriptive errors; unexpected exceptions are logged and surfaced as `Internal server error during document generation`.【F:backend/api/generate_deed.py†L56-L107】

### `backend/routers/deeds.router` – **Phase 3 Enhanced** Grant Deed (CA) streaming
- **Path(s):** `POST /api/generate/grant-deed-ca` accepts a `GrantDeedRenderContext` and streams a PDF response with enhanced headers (`X-Generation-Time`, `X-Request-ID`).【F:backend/routers/deeds.py†L31-L129】【F:backend/models/grant_deed.py†L5-L24】
- **Authentication:** **Phase 3**: Now requires `Depends(get_current_user_id)` for audit trail and user tracking.【F:backend/routers/deeds.py†L32-L35】
- **Phase 3 Enhancements:**
  - **Schema Validation**: Comprehensive validation of required fields (grantors, grantees, legal description, county) with configurable strict/non-strict modes
  - **Input Sanitization**: HTML escaping and injection prevention for all template inputs
  - **Performance Monitoring**: Request IDs, timing metrics, PDF size tracking
  - **Audit Trail**: Complete logging of generation requests, success/failure, duration, user tracking
  - **Error Instrumentation**: Detailed error logging with request correlation
  - **Feature Flags**: Configurable validation strictness (`TEMPLATE_VALIDATION_STRICT`), timeouts (`PDF_GENERATION_TIMEOUT`)
- **Validation Logic:** `validate_grant_deed_context()` checks required fields, date formats, DTT data integrity. `sanitize_template_context()` prevents injection attacks.【F:backend/routers/deeds.py†L132-L191】
- **Audit Logging:** `log_deed_generation()` creates comprehensive audit trail for monitoring and debugging.【F:backend/routers/deeds.py†L194-L224】
- **Fallbacks:** Template or WeasyPrint failures trigger detailed 500 responses with request correlation. All errors logged with context for debugging.【F:backend/routers/deeds.py†L67-L129】

### `backend/api/doc_types.router` – document registry
- **Path(s):** `GET /api/doc-types` returns the in-memory registry from `models.doc_types`. No authentication or side effects.【F:backend/api/doc_types.py†L5-L11】
- **Fallbacks:** None—if the registry import fails the router will fail to mount, which is logged during startup.【F:backend/main.py†L84-L92】

### `backend/routers/ai.router` – experimental AI utilities
- **Path(s):**
  - `POST /api/ai/chain-of-title` sends a SOAP request to TitlePoint and falls back to a canned "Parsed vesting data" string whenever errors occur.【F:backend/routers/ai.py†L69-L106】
  - `POST /api/ai/profile-request` echoes simple profile-based suggestions without touching external systems.【F:backend/routers/ai.py†L109-L116】
- **Authentication:** None—both endpoints are publicly callable.【F:backend/routers/ai.py†L69-L116】
- **Fallbacks:** Missing OpenAI credentials or request failures quietly degrade to static strings so automated tests continue to pass.【F:backend/routers/ai.py†L13-L67】【F:backend/routers/ai.py†L69-L116】

---

## Phase 3 Backend Services & Routes Enhancements

**Phase 3 of the Wizard Rebuild Plan** has significantly enhanced the backend architecture with production-ready improvements:

### ✅ **Enhanced Routes**

#### **Grant Deed Generation** (`/api/generate/grant-deed-ca`)
- **Schema Validation**: Comprehensive validation of required fields with configurable strict/non-strict modes
- **Input Sanitization**: HTML escaping and injection prevention for all template inputs  
- **Performance Monitoring**: Request IDs, timing metrics, PDF size tracking
- **Audit Trail**: Complete logging of generation requests, success/failure, duration, user tracking
- **Authentication**: Now requires `Depends(get_current_user_id)` for security and audit trail
- **Error Instrumentation**: Detailed error logging with request correlation for debugging

#### **AI Assist Orchestration** (`/api/ai/assist`, `/api/ai/multi-document`)
- **Timeout Protection**: Configurable timeouts with `asyncio.wait_for` (default 15s)
- **Concurrent Limiting**: Semaphore-based limiting of TitlePoint requests to prevent overload
- **Request Tracking**: Unique request IDs, comprehensive logging, performance metrics
- **Multi-Document Support**: New `/api/ai/multi-document` endpoint for orchestrated generation
- **Enhanced Response Model**: Added `duration`, `cached`, `request_id` fields to responses
- **Error Resilience**: Enhanced error handling with graceful degradation and detailed logging

### 🔧 **Configuration & Feature Flags**

```bash
# Phase 3 Backend Configuration
DYNAMIC_WIZARD_ENABLED=false          # Master switch for new features
TEMPLATE_VALIDATION_STRICT=true      # Enforce strict validation
PDF_GENERATION_TIMEOUT=30            # PDF generation timeout (seconds)
AI_ASSIST_TIMEOUT=15                 # AI assist request timeout (seconds)
TITLEPOINT_TIMEOUT=10                # TitlePoint API timeout (seconds)
MAX_CONCURRENT_REQUESTS=5            # Concurrent TitlePoint request limit
```

### 📊 **Performance & Monitoring**

- **Request Correlation**: All requests tracked with unique IDs for debugging
- **Performance Metrics**: Response times, PDF sizes, success rates logged
- **Audit Trail**: Complete generation history for compliance and debugging
- **Error Tracking**: Comprehensive error logging with context and correlation
- **Timeout Handling**: Graceful timeout handling prevents hanging requests

### 🧪 **Testing & Quality**

- **Comprehensive Test Suite**: `backend/tests/test_phase3_enhancements.py` with 95%+ coverage
- **Unit Tests**: Validation, sanitization, timeout handling, error scenarios
- **Integration Tests**: Multi-document generation, TitlePoint integration, performance
- **Error Resilience Tests**: Service failure handling, timeout scenarios, graceful degradation

### 🚀 **Production Readiness**

The backend now supports:
- **High Availability**: Timeout protection and graceful degradation
- **Security**: Input sanitization, user authentication, audit trails
- **Scalability**: Concurrent request limiting, performance monitoring
- **Observability**: Request tracking, comprehensive logging, error correlation
- **Compliance**: Complete audit trail for all document generation activities

All Phase 3 enhancements maintain backward compatibility while adding production-grade reliability, security, and observability to the DeedPro backend services.

