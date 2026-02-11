# SiteX (BKI Connect) — Data Retrieval & Field Mapping Reference

## API Overview

| | UAT *(current)* | Production |
|---|---|---|
| **Base URL** | `https://api.uat.bkitest.com` | `https://api.bkiconnect.com` |
| **Token Endpoint** | `/ls/apigwy/oauth2/v1/token` | `/ls/apigwy/oauth2/v1/token` |
| **Search Endpoint** | `/realestatedata/search` | `/realestatedata/search` |

**Auth:** OAuth 2.0 Client Credentials (Base64-encoded `client_id:client_secret` → Bearer token)

### Environment Variables

```
SITEX_BASE_URL=https://api.uat.bkitest.com   # UAT (current)
SITEX_CLIENT_ID=<your_client_id>
SITEX_CLIENT_SECRET=<your_client_secret>
SITEX_FEED_ID=<your_feed_id>
```

### Source Files

| File | Purpose |
|---|---|
| `backend/services/sitex_service.py` | API client, token management, field extraction, caching |
| `backend/models/property_data.py` | `PropertyData`, `PropertyOwner`, `PropertyMatch`, `PropertySearchResult` models |

---

## Request → Response Flow

```
1. AUTH        POST {BASE_URL}/ls/apigwy/oauth2/v1/token
               Headers: Authorization: Basic base64(client_id:client_secret)
               Body:    grant_type=client_credentials
               Returns: { access_token, expires_in }
               (Token cached in-memory, refreshed 60s before expiry)

2. SEARCH      GET {BASE_URL}/realestatedata/search
               Headers: Authorization: Bearer {token}
               Params:
                 addr            = "123 Main St"
                 lastLine        = "Los Angeles, CA, 90001"
                 feedId          = {SITEX_FEED_ID}
                 clientReference = "deed_wizard"
                 options         = "search_exclude_nonres=Y|search_strict=Y"

               Alt params (for multi-match resolution):
                 fips  = "06037"
                 apn   = "1234567890"

3. RESPONSE    MatchCode determines outcome:
                 "S" / single  → Parse Feed.PropertyProfile → PropertyData
                 "M" / "MULTI" → Extract Locations[] → List[PropertyMatch]
                 "N" / "0"     → Return status="not_found"

4. CACHE       In-memory, 1-hour TTL, keyed by MD5(address|city|state|zip)
```

---

## Response JSON Structure

```
{
  "MatchCode": "S",
  "Feed": {
    "PropertyProfile": {
      "APN": "1234567890",
      "SiteAddress": "123 MAIN ST",
      "SiteCity": "LOS ANGELES",
      "SiteState": "CA",
      "SiteZip": "90001",
      "CountyName": "LOS ANGELES",
      "Bedrooms": "3",
      "Bathrooms": "2.0",
      "LivingSquareFeet": "1850",
      "YearBuilt": "1965",
      ...
      "OwnerInformation": {
        "OwnerFullName": "SMITH JOHN A",
        "Owner1FirstName": "JOHN",
        "Owner1LastName": "SMITH",
        "Owner2FullName": "SMITH JANE B",
        "MailingAddress": "123 MAIN ST",
        "MailingCity": "LOS ANGELES",
        "OwnershipType": "Individual",
        "VestingType": "Community Property"
      },
      "LegalDescriptionInfo": {
        "LegalBriefDescription": "LOT 5 BLK 3 TRACT 12345",
        "SubdivisionName": "SUNSET HILLS",
        "TractNumber": "12345",
        "LotNumber": "5"
      },
      "SaleInformation": {
        "SalePrice": "650000",
        "SaleDate": "2021-03-15",
        "DocumentNumber": "20210315001234"
      }
    }
  }
}
```

---

## Field Mapping: SiteX API → PropertyData

> **Arrow notation** (→) = fallback order. If the first field is null/empty, the next is tried.

### Core Identifiers

| DeedPro Field | Type | SiteX API Field(s) | Notes |
|---|---|---|---|
| `apn` | `str` | `APN` → `ParcelNumber` → `AssessorParcelNumber` | Multi-path fallback |
| `apn_formatted` | `str` | `APNFormatted` → `APN_Formatted` | Dash-formatted APN |
| `fips` | `str` | `FIPS` → `FipsCode` | County FIPS code |

### Location

| DeedPro Field | Type | SiteX API Field(s) | Notes |
|---|---|---|---|
| `address` | `str` | `SiteAddress` → `PropertyAddress` → `Address` | Falls back to user's original input |
| `street_number` | `str?` | `SiteHouseNumber` → `HouseNumber` | |
| `street_name` | `str?` | `SiteStreetName` → `StreetName` | |
| `city` | `str` | `SiteCity` → `City` → `PropertyCity` | |
| `state` | `str` | `SiteState` → `State` | Default: `CA` |
| `zip_code` | `str` | `SiteZip` → `Zip` → `ZipCode` | Truncated to 5 digits |
| `county` | `str` | `CountyName` → `SiteCountyName` → `County` | ⚠️ Use `CountyName`, not `County` · Always uppercased |

### Legal Description

| DeedPro Field | Type | SiteX API Field(s) | Notes |
|---|---|---|---|
| `legal_description` | `str` | `LegalDescriptionInfo.LegalBriefDescription` → `.LegalDescription` → `BriefLegal` | ⚠️ Use `LegalBriefDescription` first |
| `legal_description_full` | `str?` | `LegalDescriptionInfo.LegalDescription` | Full text version |
| `subdivision_name` | `str?` | `LegalDescriptionInfo.SubdivisionName` | |
| `tract_number` | `str?` | `LegalDescriptionInfo.TractNumber` | |
| `lot_number` | `str?` | `LegalDescriptionInfo.LotNumber` | |
| `block_number` | `str?` | `LegalDescriptionInfo.BlockNumber` | |

### Ownership

| DeedPro Field | Type | SiteX API Field(s) | Notes |
|---|---|---|---|
| `primary_owner.full_name` | `str` | `PrimaryOwnerName` → `OwnerName` → `OwnerInfo.OwnerFullName` → `.Owner1FullName` | |
| `primary_owner.first_name` | `str?` | `OwnerInformation.Owner1FirstName` | |
| `primary_owner.last_name` | `str?` | `OwnerInformation.Owner1LastName` | |
| `primary_owner.mailing_address` | `str?` | `OwnerInformation.MailingAddress` | |
| `primary_owner.mailing_city` | `str?` | `OwnerInformation.MailingCity` | |
| `primary_owner.mailing_state` | `str?` | `OwnerInformation.MailingState` | |
| `primary_owner.mailing_zip` | `str?` | `OwnerInformation.MailingZip` | |
| `secondary_owner.full_name` | `str?` | `SecondaryOwnerName` → `OwnerInformation.Owner2FullName` | `None` if no second owner |
| `secondary_owner.first_name` | `str?` | `OwnerInformation.Owner2FirstName` | |
| `secondary_owner.last_name` | `str?` | `OwnerInformation.Owner2LastName` | |
| `ownership_type` | `str?` | `OwnerInformation.OwnershipType` | Corporation, Trust, Individual |
| `vesting_type` | `str?` | `OwnerInformation.VestingType` | Joint Tenants, Community Property, etc. |

### Property Details

| DeedPro Field | Type | SiteX API Field(s) | Notes |
|---|---|---|---|
| `property_type` | `str?` | `PropertyType` → `UseCodeDescription` → `PropertyUseType` | SFR, Condo, Multi-Family |
| `use_code` | `str?` | `UseCode` | Raw assessor code |
| `use_code_description` | `str?` | `UseCodeDescription` | Human-readable label |
| `bedrooms` | `int?` | `Bedrooms` | |
| `bathrooms` | `float?` | `Bathrooms` | |
| `square_feet` | `int?` | `LivingSquareFeet` → `SquareFeet` → `BuildingArea` | Multi-path fallback |
| `lot_size_sqft` | `int?` | `LotSizeSquareFeet` → `LotSquareFeet` | |
| `lot_size_acres` | `float?` | `LotSizeAcres` | |
| `year_built` | `int?` | `YearBuilt` | |
| `stories` | `int?` | `Stories` | |

### Valuation & Tax

| DeedPro Field | Type | SiteX API Field(s) | Notes |
|---|---|---|---|
| `assessed_value` | `int?` | `AssessedValue` | Total assessed |
| `assessed_land_value` | `int?` | `AssessedLandValue` | Land only |
| `assessed_improvement_value` | `int?` | `AssessedImprovementValue` | Improvements only |
| `market_value` | `int?` | `MarketValue` | Estimated market value |
| `tax_amount` | `float?` | `TaxAmount` | Annual tax |

### Sale History

| DeedPro Field | Type | SiteX API Field(s) | Notes |
|---|---|---|---|
| `last_sale_price` | `int?` | `SaleInformation.SalePrice` | |
| `last_sale_date` | `str?` | `SaleInformation.SaleDate` | |
| `last_sale_doc_number` | `str?` | `SaleInformation.DocumentNumber` | County recording number |

### Metadata (Generated Internally)

| DeedPro Field | Type | Value | Notes |
|---|---|---|---|
| `enrichment_source` | `str` | `"sitex"` | Hardcoded |
| `enrichment_timestamp` | `datetime` | `datetime.utcnow()` | Set at parse time |
| `confidence_score` | `float` | `1.0` | Hardcoded |
| `raw_response` | `dict?` | Full API JSON | Only populated when `SITEX_DEBUG` env var is set |

---

## Multi-Match Response (Locations Array)

When multiple properties match, the `Locations[]` array is returned instead. Each entry maps to `PropertyMatch`:

| PropertyMatch Field | SiteX Locations Field(s) |
|---|---|
| `address` | `SiteAddress` → `Address` → `addr` |
| `city` | `SiteCity` → `City` → `city` |
| `state` | `SiteState` → `State` |
| `zip_code` | `SiteZip` → `Zip` → `zipCode` |
| `apn` | `APN` → `apn` → `ParcelNumber` |
| `fips` | `FIPS` → `fips` → `FipsCode` |
| `owner_name` | `OwnerName` → `PrimaryOwnerName` |
| `property_type` | `PropertyType` → `UseCodeDescription` |

The user selects one match, then a second search is made using `fips` + `apn` to retrieve the full `PropertyData`.

---

## ⚠️ Known Pitfalls

| Issue | Correct Key | Wrong Key | Impact |
|---|---|---|---|
| County name | `CountyName` | `County` | Returns FIPS code instead of name in some counties |
| Legal description | `LegalBriefDescription` | `LegalDescription` | Returns empty in many CA counties |
| ZIP code | Always truncate to 5 chars | Raw value may be ZIP+4 | Breaks county lookups if not normalized |
| Numeric fields | Strip `$` and `,` before parsing | Parse raw string | `ValueError` on currency-formatted amounts |

---

## Type Conversion Helpers

| Helper | Logic | Example |
|---|---|---|
| `_safe_int(value)` | Strip `$`, `,` → split on `.` → `int()` | `"$650,000.00"` → `650000` |
| `_safe_float(value)` | Strip `$`, `,` → `float()` | `"2.5"` → `2.5` |
| `_get_nested(obj, paths)` | Try each key path in order, return first non-null/non-empty | `_get_nested(p, ["SiteCity","City"])` |
