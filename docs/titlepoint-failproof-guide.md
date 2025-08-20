# TitlePoint Integration: Fail‑Proof Implementation Guide

Audience: Partner engineering teams integrating with TitlePoint the same way Transaction Desk does. This is a step‑by‑step, copy‑exactly guide with tested endpoints, parameters, and expected responses for retrieving tax data, legal/vesting data, instrument/grant deed PDFs, and thumbnails.

Note: Replace all environment variables with your own values. Do not hardcode credentials in source code.

Reference: See the official TitlePoint developer documentation at [https://www.titlepoint.com/titlepointdocs/](https://www.titlepoint.com/titlepointdocs/).

## 1) Prerequisites
- Active TitlePoint account with API access
- Network access to TitlePoint service hosts
- Environment variables set (see below)
- Ability to make HTTPS requests and parse XML

## 2) Environment variables (required)
Add these to your `.env` or secrets manager. Values shown for endpoints are the commonly used ones in our integration.

```env
# Credentials
TP_USERNAME=your_titlepoint_username
TP_PASSWORD=your_titlepoint_password

# Core service endpoints
TP_TAX_INSTRUMENT_CREATE_SERVICE_ENDPOINT=https://www.titlepoint.com/TitlePointServices/TpsService.asmx/CreateService3
TP_CREATE_SERVICE_ENDPOINT=https://www.titlepoint.com/TitlePointServices/TpsService.asmx/CreateService3
TP_REQUEST_SUMMARY_ENDPOINT=https://www.titlepoint.com/TitlePointServices/TpsService.asmx/GetRequestSummaries?
TP_GET_RESULT_BY_ID=https://www.titlepoint.com/TitlePointServices/TpsService.asmx/GetResultByID?
TP_GET_RESULT_BY_ID_3=https://www.titlepoint.com/TitlePointServices/TpsService.asmx/GetResultByID3?

# Image pipeline (service → request → file)
TP_IMAGE_ENDPOINT=https://www.titlepoint.com/titlepointservices/tpsgenerateimage.asmx/CreateRequest3?
TP_IMAGE_REQUEST_STATUS=https://www.titlepoint.com/titlepointservices/TpsGenerateImage.asmx/GetRequestStatus?
TP_GENERATE_IMAGE=https://www.titlepoint.com/titlepointservices/TpsGenerateImage.asmx/GetGeneratedImage?

# Documents
GRANT_DEED_ENDPOINT=https://www.titlepoint.com/titlepointservices/DocumentService.asmx/GetDocuments?

# Service types
TAX_SEARCH_SERVICE_TYPE=TitlePoint.Geo.Tax
SERVICE_TYPE=TitlePoint.Geo.LegalVesting
INSTRUMENT_SEARCH_SERVICE_TYPE=TitlePoint.Geo.Address
```

Implementation note: TitlePoint exposes multiple CreateService variants. Our integration standardizes on CreateService3 with a `serviceType` switch. If your account requires `CreateService4` for legal/vesting in your environment, set `TP_CREATE_SERVICE_ENDPOINT` accordingly; the rest of this guide remains the same.

## 3) End‑to‑end flows

### A. Tax information (MethodId 3)
Inputs: APN, State (2‑letter), County

1. Create Service (Tax)
   - Endpoint: `TP_TAX_INSTRUMENT_CREATE_SERVICE_ENDPOINT`
   - Query params:
     - userID=`TP_USERNAME`
     - password=`TP_PASSWORD`
     - orderNo, customerRef, company, department, titleOfficer, orderComment, starterRemarks: empty/optional
     - serviceType=`TAX_SEARCH_SERVICE_TYPE` (TitlePoint.Geo.Tax)
     - parameters=`Tax.APN={APN};General.AutoSearchTaxes=true;General.AutoSearchProperty=false`
     - state=`{STATE}`
     - county=`{COUNTY}`
   - Expected XML: `<ReturnStatus>Success</ReturnStatus>` and `<RequestID>...</RequestID>`

2. Poll Request Summaries (Tax)
   - Endpoint: `TP_REQUEST_SUMMARY_ENDPOINT`
   - Query params: userID, password, requestId=`{RequestID}`, maxWaitSeconds=20
   - Parse: `<RequestSummaries><RequestSummary><Status>Complete</Status> ... <ThumbNails><ResultThumbNail><ID>...</ID></ResultThumbNail> ...`
   - Capture: `ResultThumbNail/ID` (Result ID) and `Services/Service/ID` (Service ID). If `Status` ≠ Complete, wait 2‑3s and poll again.

3. Get Result By ID (Tax)
   - Endpoint: `TP_GET_RESULT_BY_ID_3` (for Method 3)
   - Query params: userID, password, resultID=`{Result ID}`, requestingTPXML=true
   - Parse tax payload:
     - `Result/TaxReport/Installments/Item[0..1]`
     - `TaxReport/TaxRateArea`, `UseCode`, `RegionCode`, `FloodZone`, `ZoningCode`, `TaxabilityCode`, `TaxRate`, `IssueDate`
   - Persist relevant values and the raw XML for audit.

4. Generate Tax PDF (optional)
   - Step 4a: Create image request
     - Endpoint: `TP_IMAGE_ENDPOINT`
     - Query params: username, password, serviceId1=`{Service ID}`, fileType=pdf
     - Response: `<ReturnStatus>Success</ReturnStatus><RequestID>...</RequestID>`
   - Step 4b: Get image request status
     - Endpoint: `TP_IMAGE_REQUEST_STATUS`
     - Query params: username, password, requestId=`{Image RequestID}`
     - Poll until ready; response includes `<ReturnStatus>Success</ReturnStatus>`
   - Step 4c: Get generated image (PDF)
     - Endpoint: `TP_GENERATE_IMAGE`
     - Query params: username, password, requestId=`{Image RequestID}`
     - Parse: `<Data>` (base64). Decode and save as `Tax.pdf`.

### B. Legal & Vesting (MethodId 4)
Inputs: FIPS, Address, City, optional APN and property characteristics (Bedrooms, Baths, LotSize, Zoning, BuildingArea)

1. Create Service (Legal/Vesting)
   - Endpoint: `TP_CREATE_SERVICE_ENDPOINT`
   - Query params:
     - userID, password
     - serviceType=`SERVICE_TYPE` (TitlePoint.Geo.LegalVesting)
     - parameters typical:
       - `Address1={Address};City={City};Pin={APN};LvLookup=Address;LvLookupValue={Address}, {City};LvReportFormat=LV;IncludeTaxAssessor=true`
     - fipsCode=`{FIPS}`
   - Expected XML: `ReturnStatus=Success`, `RequestID`

2. Poll Request Summaries (LV)
   - Same as tax; capture `ResultThumbNail/ID` and `Service/ID`

3. Get Result By ID (LV)
   - Endpoint: `TP_GET_RESULT_BY_ID`
   - Query params: userID, password, resultID
   - Parse:
     - `Result/BriefLegal` (legal description)
     - `Result/Vesting` (vesting names)
     - `Result/Fips` (FIPS confirmation)
     - `Result/LvDeeds/LegalAndVesting2DeedInfo` list
       - Filter by `DocType` if needed (grant deed, quit claim deed, etc.)
       - Capture `InstrumentNumber` and `RecordedDate`

4. Generate LV PDF (optional) via image pipeline (same 4a/4b/4c process as Tax)

### C. Instrument search and Grant Deed PDF

1. Instrument search (Create Service for instrument)
   - Endpoint: `TP_TAX_INSTRUMENT_CREATE_SERVICE_ENDPOINT`
   - serviceType=`INSTRUMENT_SEARCH_SERVICE_TYPE` (TitlePoint.Geo.Address)
   - parameters: `Document.SearchType=Instrument;Document.RecordDate={YYYY};Document.InstrumentNumber={NNN}`
   - Follow Request Summary → Image pipeline to retrieve the PDF

2. Grant deed by FIPS + year + instrument number (direct document API)
   - Endpoint: `GRANT_DEED_ENDPOINT`
   - Query params:
     - username, password
     - parameters=`FIPS={FIPS},TYPE=REC,SUBTYPE=ALL,YEAR={YYYY},INST={InstrumentNumber}`
     - fileType=PDF
   - Parse: `Status/Msg` and `Documents/DocumentResponse/DocStatus/Msg` must be `OK`
   - Decode `Documents/DocumentResponse/Document/Body/Body` (base64) and save

## 4) Reference request/response examples

Below are minimal examples using curl. Replace placeholders with real values.

1. Create Service (Tax)
```bash
curl -s "${TP_TAX_INSTRUMENT_CREATE_SERVICE_ENDPOINT}?userID=${TP_USERNAME}&password=${TP_PASSWORD}&serviceType=${TAX_SEARCH_SERVICE_TYPE}&parameters=Tax.APN=${APN};General.AutoSearchTaxes=true;General.AutoSearchProperty=false&state=${STATE}&county=${COUNTY}"
```

2. Request Summaries
```bash
curl -s "${TP_REQUEST_SUMMARY_ENDPOINT}userID=${TP_USERNAME}&password=${TP_PASSWORD}&requestId=${REQUEST_ID}&maxWaitSeconds=20"
```

3. Get Result By ID (Tax)
```bash
curl -s "${TP_GET_RESULT_BY_ID_3}userID=${TP_USERNAME}&password=${TP_PASSWORD}&resultID=${RESULT_ID}&requestingTPXML=true"
```

4. Image pipeline (Tax/LV PDFs)
```bash
# Create image request
curl -s "${TP_IMAGE_ENDPOINT}username=${TP_USERNAME}&password=${TP_PASSWORD}&serviceId1=${SERVICE_ID}&fileType=pdf"

# Request status
curl -s "${TP_IMAGE_REQUEST_STATUS}username=${TP_USERNAME}&password=${TP_PASSWORD}&requestId=${IMAGE_REQUEST_ID}"

# Get generated image
curl -s "${TP_GENERATE_IMAGE}username=${TP_USERNAME}&password=${TP_PASSWORD}&requestId=${IMAGE_REQUEST_ID}"
```

5. Grant deed document
```bash
curl -s "${GRANT_DEED_ENDPOINT}username=${TP_USERNAME}&password=${TP_PASSWORD}&parameters=FIPS=${FIPS},TYPE=REC,SUBTYPE=ALL,YEAR=${YEAR},INST=${INSTRUMENT}&fileType=PDF"
```

## 5) Implementation details and guardrails

- Authentication: Always pass `userID/password` (or `username/password` for image/document endpoints). Store creds in env.
- Timeouts: TitlePoint operations can take 10–30s. We use `maxWaitSeconds=20` and client‑side polling with 2–3s backoff.
- XML handling: Responses are XML. Convert to JSON or parse XML DOM; handle empty or malformed XML gracefully.
- Status handling:
  - `ReturnStatus=Success|Failed` at envelope
  - For documents: `DocStatus/Msg` must be `OK`
  - For summaries: `RequestSummary/Status=Complete` before pulling a `ResultThumbNail/ID`
- Error reporting: Read `ReturnErrors/ReturnError/ErrorDescription` when present. Log request URL and a sanitized copy of parameters, plus the raw response for audit.
- Data persistence: Store IDs per session/order:
  - `cs3_request_id`, `cs3_result_id`, `cs3_service_id`
  - `cs4_request_id`, `cs4_result_id`, `cs4_service_id`
  - First/second installment objects for tax
  - Legal description, vesting names, FIPS, instrument number, recorded date
- PDFs: Base64 decode `<Data>` or `Document/Body/Body`, write files, then upload to your storage (we use S3) and clean up local temp files.

## 6) End‑to‑end test checklist

1. Tax flow
   - [ ] CreateService (Tax) returns `RequestID`
   - [ ] RequestSummary reaches `Complete` and yields a `ResultThumbNail/ID`
   - [ ] GetResultByID3 returns `TaxReport` with installments and metadata
   - [ ] Image pipeline returns a valid `Tax.pdf`

2. Legal/Vesting flow
   - [ ] CreateService (LV) returns `RequestID`
   - [ ] RequestSummary reaches `Complete` and yields a `ResultThumbNail/ID` and `Service/ID`
   - [ ] GetResultByID returns `BriefLegal`, `Vesting`, and deed list
   - [ ] Image pipeline returns a valid LV PDF

3. Instrument / Grant deed
   - [ ] Instrument search CreateService returns `RequestID`
   - [ ] Image pipeline returns a PDF
   - [ ] Grant deed endpoint returns `OK` and a valid PDF body

## 7) Troubleshooting

- Empty response
  - Verify network to TitlePoint hosts
  - Ensure you’re hitting the correct endpoint (`...asmx/...` paths matter)
  - Confirm credentials in env are present and unquoted

- `ReturnStatus=Failed`
  - Inspect `ReturnErrors/ReturnError/ErrorDescription`
  - Re‑validate inputs (APN format, county/state codes, FIPS, address)

- `Status != Complete` in summaries
  - Poll again with 2–3s delay, up to 10 attempts

- PDFs won’t open
  - Ensure you base64‑decode `<Data>` (image pipeline) or `Document/Body/Body` (document service) before writing bytes

## 8) Security & compliance

- Never commit credentials; use environment variables or a secret manager
- Restrict outbound egress to TitlePoint hosts only if possible
- Log request/response metadata, but do not log raw credentials
- Rotate credentials per your compliance policy

## 9) Where this lives in our codebase (for reference)

- Controller: `application/modules/frontend/controllers/order/TitlePoint.php`
  - `createService` (tax/LV), `getRequestSummaries`, `getResultById`, `imageCreateRequest`, `getRequestStatus`, `generateImage`, `instrumentService`, `generateGrantDeed`
- Frontend JS: `assets/frontend/js/order.js`
  - Orchestrates calling the above endpoints and handles UI updates
- Config: `.env` variables listed above

This guide mirrors the flows we run in production. Follow it exactly and you’ll reliably retrieve tax, owner/vesting, and document data from TitlePoint.

## References

- Official TitlePoint Developer Documentation: [https://www.titlepoint.com/titlepointdocs/](https://www.titlepoint.com/titlepointdocs/)


