# SiteX (BKI Connect) — Data Point Retrieval & Field Mapping

> **API Base:** `https://api.bkiconnect.com` · **Auth:** OAuth 2.0 Client Credentials · **Service File:** `backend/services/sitex_service.py` · **Data Model:** `backend/models/property_data.py`

---

## How Data Is Retrieved

1. **Authentication** — `POST /ls/apigwy/oauth2/v1/token` with Base64-encoded `client_id:client_secret`. Returns a Bearer token (cached until 60s before expiry).
2. **Property Search** — `GET /realestatedata/search` with params: `addr`, `lastLine` (city, state, zip), `feedId`, `clientReference`, `options` (`search_exclude_nonres=Y|search_strict=Y`). Alt: search by `fips` + `apn`.
3. **Response Handling** — Match code determines flow: single match → parse, multi-match (`Locations[]`) → return candidates, no match → return not_found.
4. **Caching** — In-memory with 1-hour TTL keyed by MD5 of search params.

---

## Field Mapping: SiteX API → PropertyData Model

| Category | PropertyData Field | Type | SiteX API Field(s) *(tried in order)* | Notes |
|---|---|---|---|---|
| **Identifiers** | `apn` | `str` | `APN` → `ParcelNumber` → `AssessorParcelNumber` | Multi-path fallback |
| | `apn_formatted` | `str` | `APNFormatted` → `APN_Formatted` | With dashes |
| | `fips` | `str` | `FIPS` → `FipsCode` | County FIPS code |
| **Location** | `address` | `str` | `SiteAddress` → `PropertyAddress` → `Address` | Falls back to user input |
| | `street_number` | `str?` | `SiteHouseNumber` → `HouseNumber` | |
| | `street_name` | `str?` | `SiteStreetName` → `StreetName` | |
| | `city` | `str` | `SiteCity` → `City` → `PropertyCity` | |
| | `state` | `str` | `SiteState` → `State` | Default: `CA` |
| | `zip_code` | `str` | `SiteZip` → `Zip` → `ZipCode` | Normalized to 5 digits |
| | `county` | `str` | `CountyName` → `SiteCountyName` → `County` | Uppercased; ⚠️ use `CountyName` not `County` |
| **Legal** | `legal_description` | `str` | `LegalDescriptionInfo.LegalBriefDescription` → `.LegalDescription` → `BriefLegal` → `LegalDescription` | ⚠️ Use `LegalBriefDescription` first |
| | `legal_description_full` | `str?` | `LegalDescriptionInfo.LegalDescription` | Full text |
| | `subdivision_name` | `str?` | `LegalDescriptionInfo.SubdivisionName` | |
| | `tract_number` | `str?` | `LegalDescriptionInfo.TractNumber` | |
| | `lot_number` | `str?` | `LegalDescriptionInfo.LotNumber` | |
| | `block_number` | `str?` | `LegalDescriptionInfo.BlockNumber` | |
| **Ownership** | `primary_owner.full_name` | `str` | `PrimaryOwnerName` → `OwnerName` → `OwnerInformation.OwnerFullName` → `.Owner1FullName` → `.OwnerName` | |
| | `primary_owner.first_name` | `str?` | `OwnerInformation.Owner1FirstName` | |
| | `primary_owner.last_name` | `str?` | `OwnerInformation.Owner1LastName` | |
| | `primary_owner.mailing_*` | `str?` | `OwnerInformation.MailingAddress`, `.MailingCity`, `.MailingState`, `.MailingZip` | |
| | `secondary_owner.full_name` | `str?` | `SecondaryOwnerName` → `OwnerInformation.Owner2FullName` | `None` if empty |
| | `secondary_owner.first_name` | `str?` | `OwnerInformation.Owner2FirstName` | |
| | `secondary_owner.last_name` | `str?` | `OwnerInformation.Owner2LastName` | |
| | `ownership_type` | `str?` | `OwnerInformation.OwnershipType` | Corporation, Trust, Individual |
| | `vesting_type` | `str?` | `OwnerInformation.VestingType` | Joint Tenants, Community Property |
| **Property** | `property_type` | `str?` | `PropertyType` → `UseCodeDescription` → `PropertyUseType` | SFR, Condo, etc. |
| | `use_code` | `str?` | `UseCode` | Raw code |
| | `use_code_description` | `str?` | `UseCodeDescription` | Human-readable |
| | `bedrooms` | `int?` | `Bedrooms` | |
| | `bathrooms` | `float?` | `Bathrooms` | |
| | `square_feet` | `int?` | `LivingSquareFeet` → `SquareFeet` → `BuildingArea` | Multi-path fallback |
| | `lot_size_sqft` | `int?` | `LotSizeSquareFeet` → `LotSquareFeet` | |
| | `lot_size_acres` | `float?` | `LotSizeAcres` | |
| | `year_built` | `int?` | `YearBuilt` | |
| | `stories` | `int?` | `Stories` | |
| **Valuation** | `assessed_value` | `int?` | `AssessedValue` | |
| | `assessed_land_value` | `int?` | `AssessedLandValue` | |
| | `assessed_improvement_value` | `int?` | `AssessedImprovementValue` | |
| | `market_value` | `int?` | `MarketValue` | |
| | `tax_amount` | `float?` | `TaxAmount` | |
| **Sale History** | `last_sale_price` | `int?` | `SaleInformation.SalePrice` | |
| | `last_sale_date` | `str?` | `SaleInformation.SaleDate` | |
| | `last_sale_doc_number` | `str?` | `SaleInformation.DocumentNumber` | |
| **Metadata** | `enrichment_source` | `str` | *(hardcoded)* `"sitex"` | Always "sitex" |
| | `enrichment_timestamp` | `datetime` | *(generated)* `datetime.utcnow()` | Set at parse time |
| | `confidence_score` | `float` | *(hardcoded)* `1.0` | |
| | `raw_response` | `dict?` | Full API JSON | Only when `SITEX_DEBUG` env var is set |

---

## Response Structure Traversal

```
API JSON
├── MatchCode          → "S" (single) / "M" (multi) / "N" (none)
├── Locations[]        → Multi-match candidates (address, APN, FIPS per entry)
└── Feed
    └── PropertyProfile
        ├── APN, SiteAddress, SiteCity, SiteState, SiteZip, CountyName ...
        ├── OwnerInformation { OwnerFullName, Owner1FirstName, MailingAddress ... }
        ├── LegalDescriptionInfo { LegalBriefDescription, SubdivisionName, TractNumber ... }
        └── SaleInformation { SalePrice, SaleDate, DocumentNumber }
```

## Key Design Decisions

- **Multi-path fallback** (`_get_nested`): Every field tries 2–4 alternate API keys in priority order — accounts for SiteX response variations across counties.
- **Type safety**: `_safe_int()` / `_safe_float()` strip `$`, `,` and handle `None` gracefully.
- **ZIP normalization**: Always truncated to 5 digits.
- **County normalization**: Always uppercased.
- **⚠️ Known Pitfalls**: Use `CountyName` (not `County`), `LegalBriefDescription` (not `LegalDescription`) as primary paths — wrong keys return incorrect or empty data in many CA counties.
