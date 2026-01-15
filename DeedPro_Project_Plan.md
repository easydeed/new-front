# DeedPro Project Plan
## "The Deed Tool Escrow Officers Can't Live Without"

**Version:** 1.0  
**Created:** January 15, 2026  
**Target Completion:** Q1 2026  
**Execution Environment:** Cursor AI

---

## Executive Vision

### The Goal
Transform DeedPro from a functional deed generator into an **indispensable daily tool** for escrow officers. The experience should be:

- **Zero learning curve** — If you can type an address, you can generate a deed
- **Faster than manual** — What takes 15-30 minutes should take 90 seconds
- **Confidence-building** — Every field validated, every output professional
- **Habit-forming** — Once they use it, going back to manual feels painful

### Success Metrics
| Metric | Current | Target |
|--------|---------|--------|
| Time to generate deed | ~5 minutes | < 90 seconds |
| Fields requiring manual entry | 8-10 | 2-3 |
| User errors/validation failures | ~15% | < 2% |
| PDF professional appearance | 6/10 | 10/10 |
| Mobile usability | Poor | Full support |

---

## Project Phases Overview

| Phase | Name | Duration | Focus |
|-------|------|----------|-------|
| **1** | Foundation | 3 days | PDFShift, SiteX robustness, core UX fixes |
| **2** | Escrow Officer UX | 4 days | Workflow optimization, smart defaults, validation |
| **3** | Professional Polish | 3 days | PDF templates, branding, print perfection |
| **4** | Delight & Retention | 2 days | Speed optimizations, shortcuts, memorable touches |
| **5** | Production Hardening | 2 days | Error handling, monitoring, documentation |

**Total Estimated Duration:** 14 working days

---

## Phase 1: Foundation (Days 1-3)

### Objective
Replace fragile infrastructure with production-grade components. Nothing user-facing changes yet, but everything becomes more reliable.

---

### Task 1.1: PDFShift Integration
**Priority:** P0 — Critical  
**Effort:** 4 hours  
**Files to modify:**
- `backend/pdf_engine.py`
- `backend/routers/deeds.py`
- `backend/routers/deeds_extra.py`
- `.env`

**Implementation:**

```python
# backend/services/pdfshift_service.py (NEW FILE)

import httpx
import os
from typing import Optional

class PDFShiftService:
    """
    PDFShift API integration for professional PDF generation.
    Uses Chrome headless for pixel-perfect CSS rendering.
    """
    
    def __init__(self):
        self.api_key = os.getenv("PDFSHIFT_API_KEY")
        self.base_url = "https://api.pdfshift.io/v3/convert/pdf"
        
    def is_configured(self) -> bool:
        return bool(self.api_key)
    
    async def render_pdf(
        self,
        html: str,
        options: Optional[dict] = None
    ) -> bytes:
        """
        Convert HTML to PDF via PDFShift API.
        
        Args:
            html: Complete HTML document string
            options: Override default PDF options
            
        Returns:
            PDF bytes
        """
        default_options = {
            "source": html,
            "format": "Letter",
            "margin": {
                "top": "1in",
                "right": "0.625in", 
                "bottom": "0.625in",
                "left": "0.625in"
            },
            "printBackground": True,
            "preferCSSPageSize": False,
        }
        
        if options:
            default_options.update(options)
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.base_url,
                auth=(self.api_key, ""),
                json=default_options
            )
            response.raise_for_status()
            return response.content


# Singleton instance
pdfshift_service = PDFShiftService()
```

```python
# backend/pdf_engine.py (MODIFY)

from services.pdfshift_service import pdfshift_service

async def render_pdf(
    html: str,
    engine: str = "auto",
    **kwargs
) -> bytes:
    """
    Unified PDF rendering with automatic engine selection.
    
    Args:
        html: HTML content to render
        engine: "pdfshift", "weasyprint", or "auto"
        
    Returns:
        PDF bytes
    """
    # Default to PDFShift if configured, fall back to WeasyPrint
    if engine == "auto":
        engine = "pdfshift" if pdfshift_service.is_configured() else "weasyprint"
    
    if engine == "pdfshift":
        return await pdfshift_service.render_pdf(html, kwargs.get("options"))
    else:
        return render_pdf_with_weasyprint(html, kwargs.get("base_url"))
```

**Environment variables to add:**
```bash
PDFSHIFT_API_KEY=your_api_key_here
PDF_ENGINE=pdfshift  # or "weasyprint" or "auto"
```

**Acceptance criteria:**
- [ ] PDFShift generates identical output to WeasyPrint for Grant Deed
- [ ] Fallback to WeasyPrint works when API key missing
- [ ] Error handling for API failures (timeout, auth, rate limit)
- [ ] PDF renders in < 5 seconds

---

### Task 1.2: SiteX Service Rewrite
**Priority:** P0 — Critical  
**Effort:** 6 hours  
**Files to create/modify:**
- `backend/services/sitex_service.py` (REWRITE)
- `backend/models/property_data.py` (NEW)
- `backend/api/property_endpoints.py` (MODIFY)

**Implementation:**

```python
# backend/models/property_data.py (NEW FILE)

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class PropertyOwner(BaseModel):
    """Structured owner information from SiteX"""
    full_name: str = ""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    mailing_address: Optional[str] = None
    
class PropertyData(BaseModel):
    """
    Normalized property data from SiteX.
    All fields have sensible defaults for partial data scenarios.
    """
    # Core identifiers
    apn: str = Field(default="", description="Assessor Parcel Number")
    fips: str = Field(default="", description="FIPS county code")
    
    # Location
    address: str = ""
    city: str = ""
    state: str = "CA"
    zip_code: str = ""
    county: str = ""
    
    # Legal
    legal_description: str = ""
    legal_description_full: Optional[str] = None
    
    # Ownership
    primary_owner: PropertyOwner = Field(default_factory=PropertyOwner)
    secondary_owner: Optional[PropertyOwner] = None
    vesting_type: Optional[str] = None
    
    # Property details
    property_type: Optional[str] = None
    use_code: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    square_feet: Optional[int] = None
    lot_size_sqft: Optional[int] = None
    year_built: Optional[int] = None
    
    # Valuation
    assessed_value: Optional[int] = None
    market_value: Optional[int] = None
    last_sale_price: Optional[int] = None
    last_sale_date: Optional[datetime] = None
    
    # Metadata
    enrichment_source: str = "sitex"
    enrichment_timestamp: datetime = Field(default_factory=datetime.utcnow)
    confidence_score: float = 1.0
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }
```

```python
# backend/services/sitex_service.py (REWRITE)

import os
import asyncio
import hashlib
import httpx
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from models.property_data import PropertyData, PropertyOwner

class SiteXConfig:
    """Centralized SiteX configuration"""
    
    def __init__(self):
        self.base_url = os.getenv("SITEX_BASE_URL", "https://api.bkiconnect.com")
        self.client_id = os.getenv("SITEX_CLIENT_ID")
        self.client_secret = os.getenv("SITEX_CLIENT_SECRET")
        self.feed_id = os.getenv("SITEX_FEED_ID")
        
    @property
    def token_url(self) -> str:
        return f"{self.base_url}/api/Account/Token"
    
    @property
    def search_url(self) -> str:
        return f"{self.base_url}/api/PropertySearch/Feed/{self.feed_id}"
    
    def is_configured(self) -> bool:
        return all([self.client_id, self.client_secret, self.feed_id])


class SiteXTokenManager:
    """Thread-safe OAuth token management with proactive refresh"""
    
    def __init__(self, config: SiteXConfig):
        self.config = config
        self._token: Optional[str] = None
        self._expiry: datetime = datetime.min
        self._lock = asyncio.Lock()
        self._refresh_buffer = timedelta(minutes=2)
    
    async def get_token(self) -> str:
        """Get valid token, refreshing if needed"""
        async with self._lock:
            if self._is_token_valid():
                return self._token
            return await self._refresh_token()
    
    def _is_token_valid(self) -> bool:
        return (
            self._token is not None 
            and datetime.utcnow() < (self._expiry - self._refresh_buffer)
        )
    
    async def _refresh_token(self) -> str:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.config.token_url,
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.config.client_id,
                    "client_secret": self.config.client_secret,
                }
            )
            response.raise_for_status()
            data = response.json()
            
            self._token = data["access_token"]
            expires_in = data.get("expires_in", 600)
            self._expiry = datetime.utcnow() + timedelta(seconds=expires_in)
            
            return self._token


class SiteXMultiMatchError(Exception):
    """Raised when address matches multiple properties"""
    
    def __init__(self, message: str, matches: List[Dict[str, Any]]):
        super().__init__(message)
        self.matches = matches


class SiteXService:
    """
    Production-grade SiteX integration.
    
    Features:
    - Thread-safe token management
    - Multi-path field extraction with fallbacks
    - In-memory caching with TTL
    - Structured PropertyData output
    - Multi-match handling
    """
    
    def __init__(self):
        self.config = SiteXConfig()
        self.token_manager = SiteXTokenManager(self.config)
        self._cache: Dict[str, tuple[PropertyData, datetime]] = {}
        self._cache_ttl = timedelta(hours=1)
    
    def is_configured(self) -> bool:
        return self.config.is_configured()
    
    async def search_property(
        self,
        address: str,
        city: Optional[str] = None,
        state: str = "CA",
        zip_code: Optional[str] = None,
        use_cache: bool = True
    ) -> PropertyData:
        """
        Search for property by address and return normalized data.
        
        Args:
            address: Street address
            city: City name (recommended)
            state: State code (default: CA)
            zip_code: ZIP code (recommended)
            use_cache: Whether to use cached results
            
        Returns:
            PropertyData with all available fields populated
            
        Raises:
            SiteXMultiMatchError: If multiple properties match
            httpx.HTTPError: On API failures
        """
        # Check cache
        cache_key = self._make_cache_key(address, city, state, zip_code)
        if use_cache and cache_key in self._cache:
            data, cached_at = self._cache[cache_key]
            if datetime.utcnow() - cached_at < self._cache_ttl:
                return data
        
        # Make API request
        token = await self.token_manager.get_token()
        
        params = {
            "Address": address,
            "State": state,
        }
        if city:
            params["City"] = city
        if zip_code:
            params["Zip"] = zip_code
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.config.search_url,
                params=params,
                headers={"Authorization": f"Bearer {token}"},
                timeout=15.0
            )
            response.raise_for_status()
            raw_data = response.json()
        
        # Check for multi-match
        if self._is_multi_match(raw_data):
            matches = self._extract_matches(raw_data)
            raise SiteXMultiMatchError(
                f"Multiple properties found for '{address}'",
                matches
            )
        
        # Parse and cache
        property_data = self._parse_response(raw_data, address)
        self._cache[cache_key] = (property_data, datetime.utcnow())
        
        return property_data
    
    def _make_cache_key(self, *args) -> str:
        """Generate cache key from search parameters"""
        key_string = "|".join(str(a).lower().strip() for a in args if a)
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def _is_multi_match(self, data: Dict) -> bool:
        """Check if response contains multiple matches"""
        feed = data.get("Feed", {})
        return feed.get("MatchCode") == "M" or feed.get("ResultCount", 1) > 1
    
    def _extract_matches(self, data: Dict) -> List[Dict[str, Any]]:
        """Extract match candidates for user selection"""
        feed = data.get("Feed", {})
        matches = feed.get("Matches", []) or feed.get("PropertyList", [])
        
        return [
            {
                "address": m.get("SiteAddress", m.get("Address", "")),
                "city": m.get("SiteCity", m.get("City", "")),
                "apn": m.get("APN", ""),
                "owner": m.get("PrimaryOwnerName", ""),
            }
            for m in matches[:10]  # Limit to 10 matches
        ]
    
    def _parse_response(self, data: Dict, original_address: str) -> PropertyData:
        """
        Parse SiteX response into normalized PropertyData.
        Uses multi-path fallbacks for each field.
        """
        feed = data.get("Feed", {})
        profile = feed.get("PropertyProfile", {})
        owner_info = profile.get("OwnerInformation", {}) or {}
        legal_info = profile.get("LegalDescriptionInfo", {}) or {}
        sale_info = profile.get("SaleInformation", {}) or {}
        
        return PropertyData(
            # Core identifiers
            apn=self._extract_apn(profile),
            fips=profile.get("FIPS", ""),
            
            # Location
            address=self._extract_address(profile, original_address),
            city=self._extract_city(profile),
            state=profile.get("SiteState", "CA"),
            zip_code=self._extract_zip(profile),
            county=self._extract_county(profile),
            
            # Legal
            legal_description=self._extract_legal_description(profile, legal_info),
            legal_description_full=legal_info.get("LegalDescription"),
            
            # Ownership
            primary_owner=self._extract_primary_owner(profile, owner_info),
            secondary_owner=self._extract_secondary_owner(profile, owner_info),
            vesting_type=owner_info.get("VestingType"),
            
            # Property details
            property_type=self._extract_property_type(profile),
            use_code=profile.get("UseCode"),
            bedrooms=self._safe_int(profile.get("Bedrooms")),
            bathrooms=self._safe_float(profile.get("Bathrooms")),
            square_feet=self._safe_int(profile.get("LivingSquareFeet")),
            lot_size_sqft=self._safe_int(profile.get("LotSizeSquareFeet")),
            year_built=self._safe_int(profile.get("YearBuilt")),
            
            # Valuation
            assessed_value=self._safe_int(profile.get("AssessedValue")),
            market_value=self._safe_int(profile.get("MarketValue")),
            last_sale_price=self._safe_int(sale_info.get("SalePrice")),
            last_sale_date=self._safe_date(sale_info.get("SaleDate")),
        )
    
    # --- Field extraction helpers with fallbacks ---
    
    def _extract_apn(self, profile: Dict) -> str:
        return (
            profile.get("APN", "")
            or profile.get("ParcelNumber", "")
            or profile.get("AssessorParcelNumber", "")
            or ""
        )
    
    def _extract_address(self, profile: Dict, fallback: str) -> str:
        return (
            profile.get("SiteAddress", "")
            or profile.get("PropertyAddress", "")
            or profile.get("Address", "")
            or fallback
        )
    
    def _extract_city(self, profile: Dict) -> str:
        return (
            profile.get("SiteCity", "")
            or profile.get("City", "")
            or profile.get("PropertyCity", "")
            or ""
        )
    
    def _extract_zip(self, profile: Dict) -> str:
        return (
            str(profile.get("SiteZip", ""))
            or str(profile.get("Zip", ""))
            or str(profile.get("ZipCode", ""))
            or ""
        )[:5]  # Normalize to 5-digit
    
    def _extract_county(self, profile: Dict) -> str:
        return (
            profile.get("CountyName", "")
            or profile.get("SiteCountyName", "")
            or profile.get("County", "")
            or ""
        )
    
    def _extract_legal_description(self, profile: Dict, legal_info: Dict) -> str:
        return (
            legal_info.get("LegalBriefDescription", "")
            or legal_info.get("LegalDescription", "")
            or profile.get("BriefLegal", "")
            or profile.get("LegalDescription", "")
            or ""
        )
    
    def _extract_primary_owner(self, profile: Dict, owner_info: Dict) -> PropertyOwner:
        full_name = (
            profile.get("PrimaryOwnerName", "")
            or owner_info.get("OwnerFullName", "")
            or owner_info.get("Owner1FullName", "")
            or owner_info.get("OwnerName", "")
            or ""
        )
        return PropertyOwner(
            full_name=full_name,
            first_name=owner_info.get("Owner1FirstName"),
            last_name=owner_info.get("Owner1LastName"),
            mailing_address=owner_info.get("MailingAddress"),
        )
    
    def _extract_secondary_owner(self, profile: Dict, owner_info: Dict) -> Optional[PropertyOwner]:
        full_name = (
            profile.get("SecondaryOwnerName", "")
            or owner_info.get("Owner2FullName", "")
            or ""
        )
        if not full_name:
            return None
        return PropertyOwner(
            full_name=full_name,
            first_name=owner_info.get("Owner2FirstName"),
            last_name=owner_info.get("Owner2LastName"),
        )
    
    def _extract_property_type(self, profile: Dict) -> Optional[str]:
        return (
            profile.get("PropertyType")
            or profile.get("UseCodeDescription")
            or profile.get("PropertyUseType")
        )
    
    # --- Safe type conversion helpers ---
    
    @staticmethod
    def _safe_int(value: Any) -> Optional[int]:
        if value is None:
            return None
        try:
            return int(str(value).replace(",", "").replace("$", ""))
        except (ValueError, TypeError):
            return None
    
    @staticmethod
    def _safe_float(value: Any) -> Optional[float]:
        if value is None:
            return None
        try:
            return float(str(value).replace(",", ""))
        except (ValueError, TypeError):
            return None
    
    @staticmethod
    def _safe_date(value: Any) -> Optional[datetime]:
        if value is None:
            return None
        try:
            if isinstance(value, datetime):
                return value
            return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except (ValueError, TypeError):
            return None


# Singleton instance
sitex_service = SiteXService()
```

**Acceptance criteria:**
- [ ] All existing SiteX functionality preserved
- [ ] Secondary owner extracted when available
- [ ] Multi-match raises exception with match list
- [ ] Cache reduces redundant API calls
- [ ] Token refresh is thread-safe
- [ ] All fields have fallback extraction paths

---

### Task 1.3: Property Endpoint Update
**Priority:** P0 — Critical  
**Effort:** 2 hours  
**Files to modify:**
- `backend/api/property_endpoints.py`

**Implementation:**

```python
# backend/api/property_endpoints.py (MODIFY)

from services.sitex_service import sitex_service, SiteXMultiMatchError
from models.property_data import PropertyData

@router.post("/search")
async def search_property(request: PropertySearchRequest):
    """
    Search property by address and return enriched data.
    
    Returns:
        - success: PropertyData as JSON
        - multi_match: List of candidates for user selection
        - error: Error message
    """
    try:
        property_data = await sitex_service.search_property(
            address=request.address,
            city=request.city,
            state=request.state or "CA",
            zip_code=request.zip_code,
        )
        
        return {
            "status": "success",
            "data": property_data.model_dump(),
            "message": "Property found"
        }
        
    except SiteXMultiMatchError as e:
        return {
            "status": "multi_match",
            "matches": e.matches,
            "message": f"Multiple properties found. Please select one.",
        }
        
    except httpx.HTTPError as e:
        return {
            "status": "error",
            "message": f"Property search failed: {str(e)}",
        }
```

---

### Task 1.4: Frontend Loading State
**Priority:** P1 — High  
**Effort:** 2 hours  
**Files to modify:**
- `frontend/src/components/PropertySearchWithTitlePoint.tsx`
- `frontend/src/features/wizard/mode/steps/PropertyStepBridge.tsx`

**Implementation concept:**

```tsx
// Add loading state to property search
const [enrichmentStatus, setEnrichmentStatus] = useState<{
  loading: boolean;
  stage: 'idle' | 'searching' | 'enriching' | 'complete' | 'error';
  message: string;
}>({
  loading: false,
  stage: 'idle',
  message: ''
});

// Show progress during SiteX call
{enrichmentStatus.loading && (
  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
    <Spinner className="w-5 h-5 text-blue-600" />
    <span className="text-blue-800">{enrichmentStatus.message}</span>
  </div>
)}

// Show enrichment results
{enrichmentStatus.stage === 'complete' && (
  <div className="grid grid-cols-2 gap-2 p-4 bg-green-50 rounded-lg">
    <CheckItem label="Address verified" checked={true} />
    <CheckItem label="APN found" checked={!!data.apn} />
    <CheckItem label="Owner found" checked={!!data.primary_owner?.full_name} />
    <CheckItem label="Legal description" checked={!!data.legal_description} />
  </div>
)}
```

**Acceptance criteria:**
- [ ] User sees "Verifying property..." during SiteX call
- [ ] Checkmarks show what data was found
- [ ] Error state is clear and actionable
- [ ] Loading state prevents double-submission

---

## Phase 2: Escrow Officer UX (Days 4-7)

### Objective
Optimize every interaction for the escrow officer workflow. They process 10-50 deeds per day — every second saved compounds.

---

### Task 2.1: Multi-Match Property Picker
**Priority:** P0 — Critical  
**Effort:** 6 hours  
**Files to create/modify:**
- `frontend/src/components/PropertyMatchPicker.tsx` (NEW)
- `frontend/src/components/PropertySearchWithTitlePoint.tsx` (MODIFY)

**Design requirements:**
- Modal appears when multiple matches found
- Show: Address, City, APN, Owner Name for each match
- Single click to select
- Keyboard navigation (arrow keys + Enter)
- "None of these" option to refine search

```tsx
// frontend/src/components/PropertyMatchPicker.tsx (NEW FILE)

interface PropertyMatch {
  address: string;
  city: string;
  apn: string;
  owner: string;
}

interface PropertyMatchPickerProps {
  matches: PropertyMatch[];
  onSelect: (match: PropertyMatch) => void;
  onCancel: () => void;
  searchAddress: string;
}

export function PropertyMatchPicker({
  matches,
  onSelect,
  onCancel,
  searchAddress
}: PropertyMatchPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        setSelectedIndex(i => Math.min(i + 1, matches.length - 1));
      } else if (e.key === 'ArrowUp') {
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        onSelect(matches[selectedIndex]);
      } else if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, matches, onSelect, onCancel]);
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Multiple Properties Found
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Your search for "{searchAddress}" matched {matches.length} properties.
            Select the correct one:
          </p>
        </div>
        
        {/* Match list */}
        <div className="max-h-96 overflow-y-auto">
          {matches.map((match, index) => (
            <button
              key={match.apn || index}
              onClick={() => onSelect(match)}
              className={`
                w-full px-6 py-4 text-left border-b transition-colors
                ${index === selectedIndex 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'hover:bg-gray-50'
                }
              `}
            >
              <div className="font-medium text-gray-900">{match.address}</div>
              <div className="text-sm text-gray-600 mt-1">
                {match.city} • APN: {match.apn || 'N/A'}
              </div>
              {match.owner && (
                <div className="text-sm text-gray-500 mt-1">
                  Owner: {match.owner}
                </div>
              )}
            </button>
          ))}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            ← Refine Search
          </button>
          <div className="text-sm text-gray-500">
            Use ↑↓ arrows and Enter to select
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Acceptance criteria:**
- [ ] Modal displays all match candidates clearly
- [ ] Keyboard navigation works (↑↓ Enter Escape)
- [ ] Selection triggers property enrichment with specific APN
- [ ] "Refine Search" clears and refocuses address input

---

### Task 2.2: Smart Defaults & Auto-Population
**Priority:** P1 — High  
**Effort:** 4 hours  
**Files to modify:**
- `frontend/src/features/wizard/services/propertyPrefill.ts`
- `frontend/src/features/wizard/mode/flows/promptFlows.ts`

**Escrow officer workflow insights:**
1. **Requestor** is almost always the title company or escrow company
2. **Grantors** are the current owners (from SiteX)
3. **Legal description** comes from SiteX 95% of the time
4. **County** is determined by property location
5. **DTT area** can be inferred from city/county

**Implementation:**

```typescript
// frontend/src/features/wizard/services/propertyPrefill.ts (ENHANCE)

export function prefillFromEnrichment(
  propertyData: PropertyData,
  wizardState: WizardState
): WizardState {
  return {
    ...wizardState,
    
    // Auto-fill grantor from owner
    step1: {
      ...wizardState.step1,
      grantorName: propertyData.primary_owner?.full_name || '',
      // If secondary owner exists, format as "John Smith and Jane Smith"
      ...(propertyData.secondary_owner?.full_name && {
        grantorName: `${propertyData.primary_owner?.full_name} and ${propertyData.secondary_owner.full_name}`
      }),
    },
    
    // Property details
    propertyAddress: propertyData.address,
    city: propertyData.city,
    county: propertyData.county,
    state: propertyData.state,
    zip: propertyData.zip_code,
    apn: propertyData.apn,
    legalDescription: propertyData.legal_description,
    
    // Smart DTT defaults based on location
    dtt: {
      ...wizardState.dtt,
      area_type: inferDTTAreaType(propertyData.city, propertyData.county),
      city_name: propertyData.city,
    },
    
    // Vesting hint if available
    ...(propertyData.vesting_type && {
      vesting: propertyData.vesting_type
    }),
    
    // Mark as enriched for UI feedback
    _enriched: true,
    _enrichedAt: new Date().toISOString(),
  };
}

function inferDTTAreaType(city: string, county: string): 'city' | 'county' {
  // Cities with their own DTT (common in CA)
  const citiesWithOwnDTT = [
    'los angeles', 'san francisco', 'oakland', 'berkeley', 
    'san jose', 'sacramento', 'riverside', 'pomona',
    'culver city', 'santa monica', 'redondo beach'
  ];
  
  if (citiesWithOwnDTT.includes(city.toLowerCase())) {
    return 'city';
  }
  return 'county';
}
```

**Acceptance criteria:**
- [ ] Grantor auto-fills from SiteX owner data
- [ ] Secondary owner combined with primary when present
- [ ] DTT area type intelligently defaulted
- [ ] User can override any auto-filled field
- [ ] Visual indicator shows which fields were auto-filled

---

### Task 2.3: Keyboard Shortcuts & Power User Features
**Priority:** P2 — Medium  
**Effort:** 3 hours  
**Files to modify:**
- `frontend/src/features/wizard/mode/engines/ModernEngine.tsx`
- `frontend/src/components/KeyboardShortcutsHelp.tsx` (NEW)

**Shortcuts to implement:**

| Shortcut | Action |
|----------|--------|
| `Enter` | Next step (when input complete) |
| `Shift+Enter` | Previous step |
| `Cmd/Ctrl+Enter` | Skip to review |
| `Escape` | Clear current input |
| `Cmd/Ctrl+S` | Save draft |
| `?` | Show shortcuts help |

```tsx
// frontend/src/features/wizard/mode/engines/ModernEngine.tsx (ADD)

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Don't capture when typing in inputs
    if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
      if (e.key === 'Enter' && !e.shiftKey && canProceed) {
        e.preventDefault();
        handleNext();
      }
      return;
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      handleNext();
    } else if (e.key === 'Enter' && e.shiftKey) {
      handleBack();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      skipToReview();
    } else if (e.key === 'Escape') {
      clearCurrentInput();
    } else if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      saveDraft();
    } else if (e.key === '?') {
      setShowShortcutsHelp(true);
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [canProceed, handleNext, handleBack]);
```

**Acceptance criteria:**
- [ ] All shortcuts work globally except when in text input
- [ ] Enter in text input advances to next step
- [ ] Help modal shows all available shortcuts
- [ ] Shortcuts discoverable via `?` key

---

### Task 2.4: Streamlined Grant Deed Flow
**Priority:** P1 — High  
**Effort:** 4 hours  
**Files to modify:**
- `frontend/src/features/wizard/mode/flows/promptFlows.ts`
- `frontend/src/features/wizard/mode/components/ConsolidatedPartiesSection.tsx`

**Current flow (too many steps):**
1. Who is requesting? → Requestor
2. DTT Calculator → Transfer value, exemptions
3. Parties → Grantor, Grantee, Vesting, Legal

**Optimized flow for escrow officers:**

```
Step 0: Property Search (implicit - happens in sidebar/header)
        ↓ SiteX enriches: Owner, APN, Legal Desc, County
        
Step 1: Quick Confirm
        "We found this property. Confirm or edit:"
        [Address] [APN] [County] [Legal Desc preview]
        [Current Owner: John Smith] → [Grantor: John Smith] (pre-filled)
        
Step 2: Transfer Details
        "Who is receiving the property?"
        [Grantee Name] ← Focus here, this is the ONE thing they must type
        [Vesting dropdown] ← Common options: Joint Tenants, Community Property, etc.
        
Step 3: DTT (conditional)
        IF property in city with DTT OR transfer value > $0:
          Show DTT calculator
        ELSE:
          Skip (most refinances, family transfers are exempt)
          
Step 4: Review & Generate
        One-page summary with all fields editable inline
```

**Key insight:** Escrow officers already have all the information. We should confirm, not collect.

---

### Task 2.5: Common Vesting Suggestions
**Priority:** P2 — Medium  
**Effort:** 2 hours  
**Files to modify:**
- `frontend/src/features/wizard/mode/components/VestingInput.tsx` (NEW)
- `frontend/src/features/wizard/mode/components/ConsolidatedPartiesSection.tsx`

**Most common vesting types in California:**

```tsx
const COMMON_VESTING_OPTIONS = [
  {
    value: 'joint_tenants',
    label: 'Joint Tenants with Right of Survivorship',
    description: 'Equal ownership, automatically transfers to survivor',
    shortLabel: 'Joint Tenants'
  },
  {
    value: 'community_property',
    label: 'Community Property',
    description: 'Married couples, equal ownership',
    shortLabel: 'Community Property'
  },
  {
    value: 'community_property_survivorship',
    label: 'Community Property with Right of Survivorship',
    description: 'Married couples, avoids probate',
    shortLabel: 'Community Property w/ Survivorship'
  },
  {
    value: 'tenants_in_common',
    label: 'Tenants in Common',
    description: 'Separate ownership shares, no survivorship',
    shortLabel: 'Tenants in Common'
  },
  {
    value: 'sole_and_separate',
    label: 'Sole and Separate Property',
    description: 'Single owner, not community property',
    shortLabel: 'Sole and Separate'
  },
  {
    value: 'trust',
    label: 'As Trustee of [Trust Name]',
    description: 'Property held in trust',
    shortLabel: 'Trust',
    requiresInput: true, // Shows text field for trust name
  },
  {
    value: 'custom',
    label: 'Custom vesting language',
    description: 'Enter specific vesting language',
    shortLabel: 'Custom',
    requiresInput: true,
  }
];
```

**Acceptance criteria:**
- [ ] Dropdown with common options
- [ ] "Custom" option reveals text input
- [ ] Trust option has placeholder for trust name
- [ ] Selection auto-formats proper legal language

---

### Task 2.6: DTT Exemption Quick-Select
**Priority:** P2 — Medium  
**Effort:** 2 hours  
**Files to modify:**
- `frontend/src/features/wizard/mode/components/DocumentTransferTaxCalculator.tsx`

**Common exemption reasons (should be one-click):**

```tsx
const DTT_EXEMPTION_REASONS = [
  {
    code: 'R&T 11911',
    label: 'Gift / No Consideration',
    description: 'Transfer without monetary exchange'
  },
  {
    code: 'R&T 11927',
    label: 'Interspousal Transfer',
    description: 'Transfer between spouses'
  },
  {
    code: 'R&T 11930',
    label: 'Transfer to/from Trust',
    description: 'Same beneficiaries, no ownership change'
  },
  {
    code: 'R&T 11923',
    label: 'Court Order / Judgment',
    description: 'Transfer pursuant to court order'
  },
  {
    code: 'R&T 11925',
    label: 'Foreclosure / Deed in Lieu',
    description: 'Transfer to lender'
  },
  {
    code: 'Other',
    label: 'Other Exemption',
    description: 'Specify exemption reason',
    requiresInput: true
  }
];
```

---

## Phase 3: Professional Polish (Days 8-10)

### Objective
Make every PDF look like it came from a top-tier title company. First impressions matter — these documents get recorded at the county recorder's office.

---

### Task 3.1: Grant Deed Template Modernization
**Priority:** P0 — Critical  
**Effort:** 4 hours  
**Files to modify:**
- `templates/grant_deed_ca/index.jinja2`

**Design principles for recorded documents:**

1. **Recording header** — Clear space for recorder's stamp (top right)
2. **Typography** — Readable, professional (12pt minimum for body)
3. **Structure** — Familiar to county recorders and title examiners
4. **Margins** — Adequate for binding (left margin slightly larger)
5. **Page breaks** — Legal description never orphaned

**CSS approach for PDFShift:**

```css
/* templates/grant_deed_ca/styles.css */

@page {
  size: letter;
  margin: 1in 0.75in 0.75in 1in; /* Extra left margin for binding */
}

@media print {
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    line-height: 1.5;
    color: #000;
  }
}

/* Recording header block */
.recording-header {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 20px;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #000;
}

.recording-stamp-area {
  border: 1px dashed #999;
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 10pt;
}

/* Document title */
.document-title {
  text-align: center;
  font-size: 18pt;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin: 30px 0;
}

/* Legal sections */
.legal-section {
  margin: 20px 0;
  text-align: justify;
}

.legal-section-title {
  font-weight: bold;
  text-transform: uppercase;
  margin-bottom: 10px;
}

/* Parties formatting */
.party-block {
  margin: 15px 0;
  padding-left: 20px;
}

.party-label {
  font-weight: bold;
  display: inline;
}

/* Legal description */
.legal-description {
  margin: 20px 0;
  padding: 15px;
  background: #f9f9f9;
  border-left: 3px solid #333;
  page-break-inside: avoid;
}

/* Signature block */
.signature-block {
  margin-top: 50px;
  page-break-inside: avoid;
}

.signature-line {
  border-bottom: 1px solid #000;
  width: 300px;
  margin: 40px 0 5px 0;
}

.signature-label {
  font-size: 10pt;
  color: #666;
}

/* Notary section */
.notary-section {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #ccc;
  page-break-inside: avoid;
}

/* APN and reference numbers */
.apn-display {
  font-family: 'Courier New', monospace;
  font-size: 11pt;
  letter-spacing: 1px;
}

/* DTT box */
.dtt-box {
  border: 2px solid #000;
  padding: 15px;
  margin: 20px 0;
  page-break-inside: avoid;
}

.dtt-amount {
  font-size: 14pt;
  font-weight: bold;
}
```

---

### Task 3.2: Remaining Template Updates
**Priority:** P1 — High  
**Effort:** 3 hours (1 hour each)  
**Files to modify:**
- `templates/quitclaim_deed_ca/index.jinja2`
- `templates/interspousal_transfer_ca/index.jinja2`
- `templates/warranty_deed_ca/index.jinja2`
- `templates/tax_deed_ca/index.jinja2`

**Approach:** Apply same CSS framework, adjust content sections per deed type.

---

### Task 3.3: PDF Preview Before Download
**Priority:** P2 — Medium  
**Effort:** 3 hours  
**Files to create:**
- `frontend/src/components/PDFPreview.tsx` (NEW)

**Implementation:**

```tsx
// Show PDF in modal before download
export function PDFPreview({ 
  pdfBlob, 
  onConfirm, 
  onEdit,
  deedType 
}: PDFPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  
  useEffect(() => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [pdfBlob]);
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full h-[90vh] mx-4 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Preview: {deedType}</h2>
          <div className="flex gap-3">
            <button
              onClick={onEdit}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              ← Edit
            </button>
            <button
              onClick={onConfirm}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Download PDF
            </button>
          </div>
        </div>
        
        {/* PDF Viewer */}
        <div className="flex-1 overflow-hidden">
          {pdfUrl && (
            <iframe
              src={pdfUrl}
              className="w-full h-full"
              title="PDF Preview"
            />
          )}
        </div>
      </div>
    </div>
  );
}
```

**Acceptance criteria:**
- [ ] PDF renders in modal before download
- [ ] User can go back to edit
- [ ] Download button prominent
- [ ] Works on desktop and tablet

---

## Phase 4: Delight & Retention (Days 11-12)

### Objective
Add the small touches that make users smile and keep coming back. These are the "delighters" that differentiate DeedPro from competitors.

---

### Task 4.1: Recent Properties Quick-Select
**Priority:** P2 — Medium  
**Effort:** 3 hours  
**Files to create/modify:**
- `frontend/src/features/wizard/services/recentProperties.ts` (NEW)
- `frontend/src/components/PropertySearchWithTitlePoint.tsx` (MODIFY)

**Concept:** Escrow officers often work on the same properties multiple times (refinances, amendments). Show recent searches.

```typescript
// Store recent properties in localStorage
const RECENT_PROPERTIES_KEY = 'deedpro_recent_properties';
const MAX_RECENT_PROPERTIES = 10;

interface RecentProperty {
  address: string;
  city: string;
  county: string;
  apn: string;
  ownerName: string;
  lastUsed: string; // ISO date
}

export function addRecentProperty(property: RecentProperty): void {
  const recent = getRecentProperties();
  
  // Remove duplicate if exists
  const filtered = recent.filter(p => p.apn !== property.apn);
  
  // Add to front
  const updated = [
    { ...property, lastUsed: new Date().toISOString() },
    ...filtered
  ].slice(0, MAX_RECENT_PROPERTIES);
  
  localStorage.setItem(RECENT_PROPERTIES_KEY, JSON.stringify(updated));
}

export function getRecentProperties(): RecentProperty[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_PROPERTIES_KEY) || '[]');
  } catch {
    return [];
  }
}
```

**UI:** Show as chips below search input: "Recent: 123 Main St, 456 Oak Ave..."

---

### Task 4.2: Deed Generation Success Animation
**Priority:** P3 — Low  
**Effort:** 2 hours  
**Files to create:**
- `frontend/src/components/SuccessAnimation.tsx` (NEW)

**Simple celebration when deed generates successfully:**

```tsx
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

export function SuccessAnimation({ onComplete }: { onComplete: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center bg-white/90 z-50"
      onAnimationComplete={() => setTimeout(onComplete, 1500)}
    >
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 10, stiffness: 100 }}
        >
          <CheckCircle className="w-24 h-24 text-green-500 mx-auto" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-semibold text-gray-900 mt-6"
        >
          Deed Generated!
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-gray-600 mt-2"
        >
          Your download will begin automatically
        </motion.p>
      </div>
    </motion.div>
  );
}
```

---

### Task 4.3: Quick Actions Dashboard Widget
**Priority:** P2 — Medium  
**Effort:** 3 hours  
**Files to modify:**
- `frontend/src/app/dashboard/page.tsx`

**One-click access to most common actions:**

```tsx
const QUICK_ACTIONS = [
  {
    label: 'New Grant Deed',
    icon: FileText,
    href: '/create/grant-deed',
    color: 'blue',
    shortcut: '⌘1'
  },
  {
    label: 'New Quitclaim',
    icon: FileCheck,
    href: '/create/quitclaim-deed', 
    color: 'purple',
    shortcut: '⌘2'
  },
  {
    label: 'Interspousal',
    icon: Heart,
    href: '/create/interspousal-deed',
    color: 'pink',
    shortcut: '⌘3'
  },
  {
    label: 'Recent Deeds',
    icon: Clock,
    href: '/deeds',
    color: 'gray',
    shortcut: '⌘R'
  }
];
```

---

### Task 4.4: Session Persistence
**Priority:** P1 — High  
**Effort:** 2 hours  
**Files to modify:**
- `frontend/src/features/wizard/state.ts`

**Problem:** If browser crashes mid-deed, user loses all work.

**Solution:** Auto-save to localStorage every 5 seconds during wizard:

```typescript
// Auto-save draft during wizard
useEffect(() => {
  const interval = setInterval(() => {
    if (wizardState._isDirty) {
      saveDraftToLocalStorage(wizardState);
      setWizardState(s => ({ ...s, _isDirty: false, _lastSaved: new Date() }));
    }
  }, 5000);
  
  return () => clearInterval(interval);
}, [wizardState._isDirty]);

// On wizard load, check for existing draft
useEffect(() => {
  const draft = loadDraftFromLocalStorage();
  if (draft && draft._lastSaved) {
    const savedAt = new Date(draft._lastSaved);
    const minutesAgo = (Date.now() - savedAt.getTime()) / 1000 / 60;
    
    if (minutesAgo < 60) { // Only restore if < 1 hour old
      setShowRestorePrompt(true);
      setPendingDraft(draft);
    }
  }
}, []);
```

**UI prompt:** "You have an unsaved deed from 5 minutes ago. Restore it?"

---

## Phase 5: Production Hardening (Days 13-14)

### Objective
Ensure the system is bulletproof for daily professional use. Escrow officers can't afford downtime.

---

### Task 5.1: Error Boundaries & Recovery
**Priority:** P0 — Critical  
**Effort:** 3 hours  
**Files to create/modify:**
- `frontend/src/components/ErrorBoundary.tsx` (NEW/ENHANCE)
- `frontend/src/features/wizard/mode/engines/ModernEngine.tsx`

**Graceful error handling:**

```tsx
export function WizardErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ error, resetErrorBoundary }) => (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="max-w-md text-center">
            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto" />
            <h2 className="text-xl font-semibold mt-4">Something went wrong</h2>
            <p className="text-gray-600 mt-2">
              Don't worry — your work has been saved.
            </p>
            <div className="mt-6 space-y-3">
              <button
                onClick={resetErrorBoundary}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                Go to Dashboard
              </button>
            </div>
            <details className="mt-6 text-left text-sm text-gray-500">
              <summary className="cursor-pointer">Technical details</summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                {error.message}
              </pre>
            </details>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
```

---

### Task 5.2: API Error Handling
**Priority:** P0 — Critical  
**Effort:** 2 hours  
**Files to modify:**
- `backend/main.py`
- `backend/routers/deeds.py`

**Consistent error responses:**

```python
# backend/utils/errors.py (NEW)

from fastapi import HTTPException
from pydantic import BaseModel
from typing import Optional

class APIError(BaseModel):
    code: str
    message: str
    details: Optional[dict] = None
    
class DeedProException(HTTPException):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: dict = None
    ):
        super().__init__(
            status_code=status_code,
            detail=APIError(
                code=code,
                message=message,
                details=details
            ).model_dump()
        )

# Common errors
class PropertyNotFoundError(DeedProException):
    def __init__(self, address: str):
        super().__init__(
            status_code=404,
            code="PROPERTY_NOT_FOUND",
            message=f"No property found for address: {address}",
            details={"address": address}
        )

class PDFGenerationError(DeedProException):
    def __init__(self, reason: str):
        super().__init__(
            status_code=500,
            code="PDF_GENERATION_FAILED",
            message="Failed to generate PDF document",
            details={"reason": reason}
        )

class ValidationError(DeedProException):
    def __init__(self, errors: list[str]):
        super().__init__(
            status_code=422,
            code="VALIDATION_FAILED",
            message="Document validation failed",
            details={"errors": errors}
        )
```

---

### Task 5.3: Telemetry & Monitoring
**Priority:** P1 — High  
**Effort:** 3 hours  
**Files to modify:**
- `frontend/src/lib/telemetry.ts`
- `backend/utils/telemetry.py`

**Key events to track:**

| Event | Data | Purpose |
|-------|------|---------|
| `deed_started` | deed_type, user_id | Conversion funnel |
| `property_enriched` | success, duration_ms, fields_found | SiteX reliability |
| `deed_generated` | deed_type, duration_ms, pdf_size | Performance |
| `deed_error` | error_code, step, deed_type | Debugging |
| `wizard_abandoned` | step, deed_type, time_spent | UX optimization |

---

### Task 5.4: Documentation Update
**Priority:** P2 — Medium  
**Effort:** 2 hours  
**Files to modify:**
- `docs/wizard/ARCHITECTURE.md`
- `README.md`
- `docs/backend/ROUTES.md`

**Updates needed:**
- Remove references to "Classic Wizard" (deleted)
- Update API documentation for new endpoints
- Add PDFShift configuration docs
- Update SiteX field mapping documentation

---

## Appendix A: File Change Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `backend/services/pdfshift_service.py` | PDFShift API integration |
| `backend/models/property_data.py` | Structured property data model |
| `frontend/src/components/PropertyMatchPicker.tsx` | Multi-match selection UI |
| `frontend/src/components/VestingInput.tsx` | Vesting type selector |
| `frontend/src/components/PDFPreview.tsx` | PDF preview modal |
| `frontend/src/components/SuccessAnimation.tsx` | Generation success feedback |
| `frontend/src/components/KeyboardShortcutsHelp.tsx` | Shortcuts modal |
| `frontend/src/features/wizard/services/recentProperties.ts` | Recent properties storage |
| `backend/utils/errors.py` | Standardized error classes |

### Files to Modify

| File | Changes |
|------|---------|
| `backend/pdf_engine.py` | Add PDFShift support |
| `backend/services/sitex_service.py` | Complete rewrite |
| `backend/api/property_endpoints.py` | Multi-match handling |
| `backend/routers/deeds.py` | Error handling |
| `frontend/src/components/PropertySearchWithTitlePoint.tsx` | Loading states, recent properties |
| `frontend/src/features/wizard/mode/engines/ModernEngine.tsx` | Keyboard shortcuts |
| `frontend/src/features/wizard/services/propertyPrefill.ts` | Enhanced auto-fill |
| `frontend/src/features/wizard/mode/components/DocumentTransferTaxCalculator.tsx` | Exemption quick-select |
| `frontend/src/features/wizard/mode/components/ConsolidatedPartiesSection.tsx` | Vesting dropdown |
| `templates/grant_deed_ca/index.jinja2` | CSS modernization |
| All other templates | CSS framework |

---

## Appendix B: Environment Variables

### New Variables Required

```bash
# PDFShift
PDFSHIFT_API_KEY=your_api_key_here
PDF_ENGINE=pdfshift  # Options: pdfshift, weasyprint, auto

# Feature flags (optional)
FEATURE_MULTI_MATCH_PICKER=true
FEATURE_RECENT_PROPERTIES=true
FEATURE_PDF_PREVIEW=true
```

---

## Appendix C: Testing Checklist

### Critical User Flows

- [ ] New user can generate Grant Deed in < 2 minutes
- [ ] Property search returns enriched data
- [ ] Multi-match shows picker, selection works
- [ ] All 5 deed types generate valid PDFs
- [ ] PDF looks professional when printed
- [ ] Draft auto-saves and restores correctly
- [ ] Keyboard shortcuts work throughout wizard
- [ ] Error states are clear and recoverable
- [ ] Mobile wizard is usable (tablet minimum)

### Edge Cases

- [ ] Property with no legal description
- [ ] Property with multiple owners
- [ ] Very long legal description (> 600 chars)
- [ ] DTT exempt transaction
- [ ] City with its own DTT rate
- [ ] Trust as grantee
- [ ] Corporate entity as grantor
- [ ] Browser refresh mid-wizard
- [ ] Network failure during PDF generation
- [ ] SiteX API timeout

---

## Appendix D: Success Metrics Dashboard

Track these metrics weekly:

| Metric | Baseline | Week 1 | Week 2 | Target |
|--------|----------|--------|--------|--------|
| Avg time to generate deed | 5 min | - | - | < 90 sec |
| Wizard completion rate | 70% | - | - | > 95% |
| SiteX enrichment success | 80% | - | - | > 95% |
| PDF generation errors | 5% | - | - | < 1% |
| User-reported issues | 10/week | - | - | < 2/week |
| Daily active users | - | - | - | Growing |

---

*End of Project Plan*
