# SiteX proposal
_DeedPro migration plan: replace TitlePoint with SiteX Pro (ICE)_

**Date:** 2025-10-01  
**Owner:** DeedPro Engineering  
**Scope:** Backend-only swap (keep existing frontend UX) + optional deed-image retrieval

---

## 1) Why switch (in one paragraph)
SiteX gives us a modern REST surface for property search + deed image retrieval, avoids our brittle SOAP integration, and ships a per‑feed OpenAPI schema so we can generate models and mappings. Tokens are short‑lived (10 minutes) and environments are cleanly split (UAT vs Prod). fileciteturn2file3

**What stays the same for users:** Step‑1 address entry, Google Autocomplete, and the `/api/property/search` contract. We only replace the backend service behind that route. fileciteturn2file10

---

## 2) Endpoints we will use

### 2.1 OAuth2 token (server side)
- **URL:** `{{api_gateway_baseUrl}}/ls/apigwy/oauth2/v1/token`  
- **Token TTL:** 10 minutes — cache & refresh server‑side.  
- **Auth methods:** 
  - Basic header (`Basic base64(client_key:client_secret)`) **or** 
  - Form body with `client_id`, `client_secret`, `grant_type=client_credentials`. fileciteturn2file3 fileciteturn2file0

### 2.2 Property search
- **URL:** `{{api_gateway_baseUrl}}/realestatedata/search`  
- **Primary address search params:** `addr` (street line), `lastLine` (“City, ST ZIP”).  
- **Alternate narrowing:** `owner` (tie‑breaker), or use `fips` + `apn` after a multi‑match.  
- **Behavior:** Single match ⇒ full **feed** is returned; multi‑match ⇒ list of **Locations[]** (with FIPS/APN) for a follow‑up query.  
- **Auth:** `Authorization: Bearer <access_token>`. fileciteturn2file3 fileciteturn2file4

**Query string summary (most relevant):**
- `addr` (required for address search), `lastLine` (required for address search), `owner` (optional), `fips` (required for APN search), `apn` (required for APN search), `zip` (optional), `feedId` (optional — if provided and single match, returns feed now), `clientReference` (optional), `options` (optional). fileciteturn2file4 fileciteturn3file8

### 2.3 Document (deed image) search — **optional but recommended**
- **URL:** `{{api_gateway_baseUrl}}/realestatedata/search/doc`  
- **Params:** `fips` (required), `recDate` (yyyyMMdd, required), `docNum` (optional), `book` (optional), `page` (optional), `format` (default TIF; can request **PDF**), `feedId` (required), `clientReference` (optional), `options` (supports `document_provider=cascade` to include third‑party provider). fileciteturn2file1 fileciteturn2file2

### 2.4 Helpful service endpoints
- **OpenAPI (per feed)** — generate models/mappers:  
  `{{api_gateway_baseUrl}}/realestatedata/search/schema/{{feedId}}` fileciteturn2file3  
- **Options for a feed:**  
  `{{api_gateway_baseUrl}}/realestatedata/search/options/{{feedId}}` fileciteturn2file8  
- **County info (includes `APNFormats`):**  
  `{{api_gateway_baseUrl}}/realestatedata/search/countyinfo?fips={{fips}}` fileciteturn2file7

**Environment base URLs:** UAT `https://api.uat.bkitest.com`, Prod `https://api.bkiconnect.com`. fileciteturn2file3

---

## 3) Request patterns (what we’ll actually send)

### 3.1 Address → feed (the happy path)
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.bkiconnect.com/realestatedata/search?\
addr=123 Main St&lastLine=Anaheim, CA 92805&\
clientReference=DEEDPRO_UI_00123&\
options=search_exclude_nonres=Y|search_strict=Y&\
feedId=100002"
```
- `search_exclude_nonres=Y` — reduces false multi‑matches when a non‑res parcel shares the same address. fileciteturn3file2  
- `search_strict=Y` — disables “fallback” similar/nearby searches so we don’t wander off the parcel. Default is `N`. fileciteturn3file0

### 3.2 Multi‑match follow‑up (user picks a candidate)
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.bkiconnect.com/realestatedata/search?\
fips=06059&apn=035-202-10&\
clientReference=DEEDPRO_UI_00123&\
options=search_exclude_nonres=Y|search_strict=Y&\
feedId=100002"
```
- First call returns `Locations[]` (each with FIPS/APN). Second call with those values returns the property feed. fileciteturn3file10

### 3.3 Prior/last deed image (attach to our deed package)
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.bkiconnect.com/realestatedata/search/doc?\
fips=06059&recDate=20211014&docNum=2021-123456&\
format=PDF&feedId=100002&\
options=document_provider=cascade"
```
- `format=PDF` is supported (default is TIF).  
- Provider cascade via `options=document_provider=cascade`. fileciteturn2file1 fileciteturn3file3

---

## 4) Response expectations (what we’ll parse)
At **search time**, if there’s more than one match we’ll receive a list of **Locations** with keys we can display to the user and re‑query with (`FIPS`, `APN`, `Address`, `City`, `State`, `ZIP`, `ZIP4`, `UnitType`, `UnitNumber`). The payload also carries `Status`, `MatchStatus`, and `StatusCode`. fileciteturn2file7

On a **single match** with a `feedId`, the **feed content** for that parcel is returned immediately (ownership, assessments, deeds, etc., per our feed). fileciteturn2file4

---

## 5) Backend changes (keep the frontend contract)

**Unchanged:** Frontend continues to call `POST /api/property/search` with `{ address: "123 Main St, City, ST 12345" }`. We map the SiteX feed into the exact response shape the UI expects (APN, county, owner, legal, etc.). fileciteturn2file10

**Replace TitlePoint service with SiteX service:**
- Obtain/refresh token (10‑min TTL). fileciteturn2file3
- Call **address search** with `addr` + `lastLine`, plus `feedId`, `options` recommended above. fileciteturn2file3
- If multi‑match, return `candidates[]` to the UI (FIPS/APN, address). User pick triggers follow‑up search with `fips` + `apn`. fileciteturn3file10
- (Optional) Fetch deed image via **Document search** and attach the PDF to our package. fileciteturn2file1

**Router note:** Ensure only one `/api/property/search` route is mounted so the SiteX implementation wins (we previously had a route collision). fileciteturn2file10

---

## 6) Security, config, and ops
- **Env:**  
  - `SITEX_BASE_URL` = `https://api.uat.bkitest.com` (UAT) → `https://api.bkiconnect.com` (Prod)  
  - `SITEX_CLIENT_ID`, `SITEX_CLIENT_SECRET` (per env)  
  - `SITEX_FEED_ID` (assigned) fileciteturn2file3
- **Auth:** Bearer token from the OAuth endpoint; refresh when <30s to expiry. fileciteturn2file3
- **Cost control:** Use `search_exclude_nonres=Y` to reduce multi‑match churn; cache successful feed lookups on our side by `(fips, apn)` for 24h. fileciteturn3file2
- **Strictness:** `search_strict=Y` in options to prevent “nearby” matches. fileciteturn3file0
- **Observability:** Log `clientReference`, `Status/MatchStatus`, response time, and whether the call returned a feed or a candidate list. fileciteturn2file4

---

## 7) Field mapping plan
1. Pull the feed’s **OpenAPI** (`/realestatedata/search/schema/{feedId}`) and generate DTOs. fileciteturn2file3  
2. Implement `map_sitex_feed_to_ui()` to populate our existing response shape:  
   `apn`, `county`, `city`, `state`, `zip`, `legalDescription`, `grantorName`, `fullAddress`, `confidence`.  
3. If we need county‑specific APN display rules, call **County info** to read `APNFormats`. fileciteturn2file7  
4. Add deed image fetch using **Document search** parameters surfaced in the “last sale/transfer” group of the feed (recording date, doc #, or book/page). fileciteturn2file1

---

## 8) Error handling & UX
- If SiteX returns **multi‑match**, show the candidate list (from `Locations[]`), let the user pick; then re‑query by FIPS/APN. fileciteturn3file10  
- If SiteX returns **no match or error**, preserve the current **manual entry fallback**. fileciteturn2file10  
- For document images, if default provider lacks the image, enable `options=document_provider=cascade`. fileciteturn3file3

---

## 9) Testing checklist
- **Happy path:** Unique address returns a feed in one call (verify APN/owner/legal). fileciteturn2file4  
- **Multi‑match:** Force an address that exists as both res/non‑res; confirm candidates list appears and second call returns feed. Validate that `search_exclude_nonres=Y` reduces multi‑matches. fileciteturn3file2  
- **Strictness:** With `search_strict=Y`, confirm no “nearby” fallback matches. fileciteturn3file0  
- **Deed image:** Use `recDate` + `docNum` from feed to fetch PDF; verify it opens. fileciteturn2file1  
- **Schema drift:** Regenerate DTOs from the feed schema and run type checks. fileciteturn2file3

---

## 10) Rollout plan (zero‑drama)
1. Ship the SiteX service behind a **feature flag** (`NEXT_PUBLIC_TITLEPOINT_ENABLED=false`, `SITE_X_ENABLED=true`) so frontend behavior stays identical. fileciteturn2file10  
2. Shadow test in UAT (`api.uat.bkitest.com`), then switch Prod base URL. fileciteturn2file3  
3. Remove the legacy TitlePoint code path after a week of clean telemetry.

---

## Appendix A — copy‑paste snippets

### Token (Basic header path)
```bash
curl -X POST "{{api_gateway_baseUrl}}/ls/apigwy/oauth2/v1/token" \
  -H "Authorization: Basic {{base64_client_key_colon_secret}}" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "grant_type=client_credentials"
```
(Body style with `client_id/client_secret` is also supported.) fileciteturn2file0

### Property search (address)
```bash
curl -H "Authorization: Bearer $TOKEN" \
"{{api_gateway_baseUrl}}/realestatedata/search?addr={{addr}}&lastLine={{lastLine}}&\
clientReference={{clientRef}}&options=search_exclude_nonres=Y|search_strict=Y&\
feedId={{feedId}}"
```
Key params and behavior per QuickStart. fileciteturn2file3

### Property search (FIPS/APN)
```bash
curl -H "Authorization: Bearer $TOKEN" \
"{{api_gateway_baseUrl}}/realestatedata/search?fips={{fips}}&apn={{apn}}&\
clientReference={{clientRef}}&options=search_exclude_nonres=Y|search_strict=Y&\
feedId={{feedId}}"
```
Two‑step flow on multi‑match. fileciteturn3file10

### Deed image (PDF)
```bash
curl -H "Authorization: Bearer $TOKEN" \
"{{api_gateway_baseUrl}}/realestatedata/search/doc?fips={{fips}}&recDate={{yyyyMMdd}}&\
docNum={{docNum}}&format=PDF&feedId={{feedId}}&options=document_provider=cascade"
```
Default format is TIF; PDF is supported; provider cascade optional. fileciteturn2file1

---

### Notes for implementers
- Always send a **`clientReference`** to simplify production troubleshooting. The service records it in usage logs. fileciteturn2file4  
- If you need to adjust to county APN rules for display/validation, call **County info** to read `APNFormats`. fileciteturn2file7

---

**References**  
- *SiteXPro – REST QuickStart Guide v1.06 (16 Jul 2025)* — ICE (Property search, token, document search, options, county info, sample calls). fileciteturn2file3 fileciteturn2file4 fileciteturn2file1 fileciteturn3file2 fileciteturn3file0  
- *DeedPro Step‑1 Address Search (current UX & route)* — Frontend submits address to `/api/property/search`; manual fallback remains. fileciteturn2file10
