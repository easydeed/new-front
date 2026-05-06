# SiteX Integration Skill

## 1. When to load this skill

Load before touching any SiteX call construction, response parsing, or property search endpoint.

## 2. Environment configuration

| Environment | Base URL |
|---|---|
| Production | `https://api.bkiconnect.com` |
| UAT / Sandbox | `https://api.uat.bkitest.com` |

Required backend env vars:

| Variable | Purpose |
|---|---|
| `SITEX_BASE_URL` | SiteX API gateway base URL. |
| `SITEX_CLIENT_ID` | OAuth2 client ID from BKI/SiteX. |
| `SITEX_CLIENT_SECRET` | OAuth2 client secret from BKI/SiteX. |
| `SITEX_FEED_ID` | Property feed identifier. |

DeedPro shipped 4 hours of debugging in April 2026 because SITEX_BASE_URL was set to UAT. Production is api.bkiconnect.com.

Do not rely on code defaults in production. Set `SITEX_BASE_URL=https://api.bkiconnect.com` explicitly.

Token endpoint is `{SITEX_BASE_URL}/ls/apigwy/oauth2/v1/token`; search endpoint is `{SITEX_BASE_URL}/realestatedata/search`. SiteX credentials are backend-only. Never expose them in browser code.

## 3. The working call shape

Known-good address search:

```text
GET {SITEX_BASE_URL}/realestatedata/search
Authorization: Bearer <token>

addr=<street address>
lastLine=<city/state/zip line>
feedId=<SITEX_FEED_ID>
options=search_exclude_nonres=Y
clientReference=<stable caller reference>
```

Example:

```text
addr=123 Main St
lastLine=Irvine, CA 92618
feedId=100001
options=search_exclude_nonres=Y
clientReference=deed_wizard
```

`addr` is street only. Do not send the full Google formatted address as `addr`.

`lastLine` formats observed in working docs/code:

| Source | Format | Example |
|---|---|---|
| BKI official docs | `City, ST, ZIP` | `Irvine, CA, 92618` |
| TrendyReports production code | `City, ST ZIP` | `Irvine, CA 92618` |

Both appear to work. Default to TrendyReports' single-comma format since it is verified in production:

```text
lastLine=City, ST ZIP
```

DeedPro currently builds `lastLine` in `backend/services/sitex_service.py` as `f"{city}, {state} {zip_code}"`.

For selected multi-match resolution, search by FIPS/APN:

```text
fips=<county fips>
apn=<assessor parcel number>
feedId=<SITEX_FEED_ID>
options=search_exclude_nonres=Y
clientReference=<stable caller reference>
```

## 4. What NOT to send

Do not include `search_strict=Y`.

`search_strict=Y` rejects valid matches. It appears in older proposal docs, but it is not part of the working production shape.

`options` should be exactly:

```text
search_exclude_nonres=Y
```

Do not send:

```text
search_exclude_nonres=Y|search_strict=Y
```

Do not rename SiteX query params:

| Wrong | Right |
|---|---|
| `address1` | `addr` |
| `address2` | `lastLine` |
| feed ID in URL path | `feedId` query parameter |

## 5. Response shapes

Support three response variants.

### Full single match

Single matches include `Feed.PropertyProfile`:

```json
{
  "MatchCode": "S",
  "Feed": { "PropertyProfile": { "SiteAddress": "123 Main St", "APN": "123-456-78" } }
}
```

Normalize from `Feed.PropertyProfile`. Important paths:

| SiteX path | Normalized field |
|---|---|
| `Feed.PropertyProfile.SiteAddress` | street |
| `Feed.PropertyProfile.PropertyAddress.StreetAddress` | street fallback |
| `Feed.PropertyProfile.SiteCity` | city |
| `Feed.PropertyProfile.PropertyAddress.City` | city fallback |
| `Feed.PropertyProfile.SiteState` | state |
| `Feed.PropertyProfile.PropertyAddress.State` | state fallback |
| `Feed.PropertyProfile.SiteZip` | ZIP |
| `Feed.PropertyProfile.PropertyAddress.ZIP` | ZIP fallback |
| `Feed.PropertyProfile.SiteAddressCityState` | full address |
| `Feed.PropertyProfile.PropertyAddress.FullAddress` | full address fallback |
| `Feed.PropertyProfile.CountyName` | county |
| `Feed.PropertyProfile.SiteCountyName` | county fallback |
| `Feed.PropertyProfile.APN` | APN |
| `Feed.PropertyProfile.PropertyAddress.APNFormatted` | APN fallback |
| `Feed.PropertyProfile.FIPS` | FIPS |
| `Feed.PropertyProfile.PrimaryOwnerName` | owner |
| `Feed.PropertyProfile.OwnerInformation.OwnerFullName` | owner fallback |
| `Feed.PropertyProfile.OwnerInformation.Owner1FullName` | owner fallback |
| `Feed.PropertyProfile.OwnerInformation.Owner2FullName` | secondary owner |
| `Feed.PropertyProfile.LegalDescriptionInfo.LegalBriefDescription` | legal description |
| `Feed.PropertyProfile.PropertyCharacteristics.Bedrooms` | bedrooms |
| `Feed.PropertyProfile.PropertyCharacteristics.Baths` | bathrooms |
| `Feed.PropertyProfile.PropertyCharacteristics.Bathrooms` | bathrooms fallback |
| `Feed.PropertyProfile.PropertyCharacteristics.BuildingArea` | square feet |
| `Feed.PropertyProfile.PropertyCharacteristics.LivingArea` | square feet fallback |
| `Feed.PropertyProfile.PropertyCharacteristics.LotSize` | lot size |
| `Feed.PropertyProfile.PropertyCharacteristics.LotSizeSqFt` | lot size fallback |
| `Feed.PropertyProfile.PropertyCharacteristics.YearBuilt` | year built |
| `Feed.PropertyProfile.PropertyCharacteristics.UseCode` | property type |
| `Feed.PropertyProfile.PropertyCharacteristics.PropertyType` | property type fallback |
| `Feed.PropertyProfile.AssessmentTaxInfo.AssessedValue` | assessed value |
| `Feed.PropertyProfile.AssessmentTaxInfo.TaxAmount` | tax amount |
| `Feed.PropertyProfile.AssessmentTaxInfo.LandValue` | land value |
| `Feed.PropertyProfile.AssessmentTaxInfo.ImprovementValue` | improvement value |
| `Feed.PropertyProfile.AssessmentTaxInfo.TaxYear` | tax year |
| `Feed.PropertyProfile.Latitude` | latitude |
| `Feed.PropertyProfile.PropertyAddress.Latitude` | latitude fallback |
| `Feed.PropertyProfile.Longitude` | longitude |
| `Feed.PropertyProfile.PropertyAddress.Longitude` | longitude fallback |

DeedPro also accepts flat profile fields such as `Bedrooms`, `Bathrooms`, `LivingSquareFeet`, `SquareFeet`, `LotSizeSquareFeet`, `YearBuilt`, `AssessedValue`, `TaxAmount`, `PropertyType`, and `UseCodeDescription`.

Always truncate ZIP to five digits: `91750-2401` -> `91750`.

### Multi-match

Multi-match can arrive as HTTP `300` with `Locations[]` and `Feed: null`, or with `MatchCode` values like `M` / `MULTI`.

```json
{
  "MatchCode": "M",
  "Feed": null,
  "Locations": [{ "SiteAddress": "123 Main St #1", "APN": "123-456-78", "FIPS": "06059" }]
}
```

Extract location candidates into a picker shape:

| Location path | Picker field |
|---|---|
| `SiteAddress`, `Address`, `addr` | `address` |
| `SiteCity`, `City`, `city` | `city` |
| `SiteState`, `State` | `state` |
| `SiteZip`, `Zip`, `zipCode` | `zip_code` |
| `APN`, `apn`, `ParcelNumber` | `apn` |
| `FIPS`, `fips`, `FipsCode` | `fips` |
| `OwnerName`, `PrimaryOwnerName` | `owner_name` |
| `UseCodeDescription`, `PropertyType` | `property_type` |
| `UnitType`, `unitType` | `unit_type` |
| `UnitNumber`, `unitNumber`, `Unit`, `unit` | `unit_number` |

### No match

No-match can be `MatchCode` values `N`, `NOMATCH`, or `0`, or an empty response with no `Feed` and no `Locations`.

Return structured `not_found` and let the user edit or enter data manually. Do not throw an unhandled backend exception.

## 6. The Google Places gotcha

`prediction.description` does NOT include ZIP.

Use `PlacesService.getDetails(place_id, fields: [...])` and parse `address_components`.

Use these fields:

```ts
["address_components", "formatted_address", "geometry", "name"]
```

Working component-to-field mapping:

| Google address component | App field | Notes |
|---|---|---|
| `street_number` | street number | Join with `route`. |
| `route` | street name | Join with `street_number`. |
| `street_number + route` | `address` / `street` | Send as SiteX `addr`. |
| `locality` | `city` | Primary city source. |
| `sublocality_level_1` | `city` fallback | Use when `locality` is missing. |
| `administrative_area_level_1.short_name` | `state` | Example: `CA`. |
| `postal_code` | `zip` | Required for precise `lastLine`. |
| `administrative_area_level_2` | `county` | Strip trailing ` County`. |
| `formatted_address` | `fullAddress` | Display only. |
| `geometry.location.lat()` | `lat` | Google fallback only. |
| `geometry.location.lng()` | `lng` | Google fallback only. |

SiteX coordinates become canonical after lookup. Google coordinates are fallback only.

## 7. Multi-match handling

Frontend should render a picker of `Locations[]`, send selected `{fips, apn}` to a resolve endpoint, and let the backend call `search_by_fips_apn`.

Reference DeedPro's working pattern:

| File | Pattern |
|---|---|
| `backend/api/property_endpoints.py` | `/api/property/search-v2` returns `status: "multi_match"` with normalized `matches`. |
| `frontend/src/components/builder/sections/PropertySection.tsx` | Renders the match picker and posts selected `{fips, apn}`. |
| `backend/api/property_endpoints.py` | `/api/property/resolve-match` calls `sitex_service.search_by_fips_apn`. |
| `backend/services/sitex_service.py` | `search_by_fips_apn` searches SiteX by FIPS and APN. |

Recommended statuses:

| Status | Meaning | Frontend behavior |
|---|---|---|
| `success` | One full profile found. | Auto-fill normalized data. |
| `multi_match` | SiteX returned `Locations[]`. | Show picker. |
| `not_found` | No match. | Let user edit or enter manually. |
| `error` | Config, auth, timeout, or API failure. | Show non-blocking error. |

## 8. Timeouts and retries

Use:

```python
httpx.AsyncClient(timeout=30.0)
```

Do not use the `httpx` default timeout or a 5s timeout for SiteX.

Retry only on `401 Unauthorized`: refresh the OAuth token once and replay once.

No retry on `ReadTimeout`. Return a controlled `error` / `504` and let the user retry explicitly.

## 9. Common mistakes table

| Wrong | Right | Why |
|---|---|---|
| `SITEX_BASE_URL=https://api.uat.bkitest.com` in production | `SITEX_BASE_URL=https://api.bkiconnect.com` | UAT caused the April 2026 DeedPro debugging loop. |
| `/oauth/token` | `/ls/apigwy/oauth2/v1/token` | SiteX uses BKI's OAuth gateway path. |
| `/publicsearch` | `/realestatedata/search` | Property search is served from the real estate data endpoint. |
| `address1` | `addr` | SiteX expects `addr` for street address. |
| `address2` | `lastLine` | City/state/ZIP belongs in `lastLine`. |
| `Los Angeles CA 90001` | `Los Angeles, CA 90001` | A comma after city is required by working code; official docs also allow `Los Angeles, CA, 90001`. |
| Putting `feedId` in the URL path | Sending `feedId` as a query parameter | The endpoint reads `feedId` from query params. |
| `response.property` | `Feed.PropertyProfile` | Full property data is nested under `Feed.PropertyProfile`. |
| `LegalDescription` as primary legal field | `LegalDescriptionInfo.LegalBriefDescription` | The brief legal description is the working autofill field. |
| Keeping `91750-2401` | Truncating to `91750` | DeedPro normalizes ZIP to five digits. |
| `options=search_exclude_nonres=Y|search_strict=Y` | `options=search_exclude_nonres=Y` | `search_strict=Y` rejects valid matches. |
| Parsing ZIP from `prediction.description` | Calling `PlacesService.getDetails` and reading `postal_code` | Autocomplete predictions often omit ZIP. |
| Sending Google `formatted_address` as `addr` | Sending street only as `addr` | SiteX expects street in `addr` and city/state/ZIP in `lastLine`. |
| Treating Google coordinates as canonical | Replacing them with SiteX coordinates after lookup | SiteX is the property data source of truth. |
| Returning multi-match as generic not found | Returning `status: "multi_match"` with normalized `matches` | The frontend can resolve by FIPS/APN. |
| Retrying every timeout | No automatic retry on `ReadTimeout` | Blind retries can stack slow SiteX calls. |
| Exposing SiteX credentials in browser code | Calling SiteX only from backend services | SiteX credentials are secrets. |

## 10. Source files in DeedPro

| File | Why it matters |
|---|---|
| `backend/services/sitex_service.py` | SiteX config, OAuth token handling, address search, FIPS/APN resolution, response parsing, and multi-match extraction. |
| `backend/api/property_endpoints.py` | `/api/property/search-v2` and `/api/property/resolve-match` handlers. |
| `frontend/src/components/builder/sections/PropertySection.tsx` | Google Places parsing, property search request, multi-match picker, and resolve-match call. |

The TitlePoint section is superseded. Do not use it as implementation truth when working on SiteX.
