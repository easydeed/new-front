# 🔍 Step 1: Address Search - Complete Logic Breakdown
**Date**: October 1, 2025  
**Component**: PropertySearchWithTitlePoint  
**Purpose**: Understand frontend vs backend responsibilities

---

## 🎯 **HIGH-LEVEL FLOW**

```
User Types Address
    ↓
[FRONTEND] Google Places Autocomplete (suggestions)
    ↓
User Selects Address
    ↓
[FRONTEND] Extract Address Components (street, city, state, zip)
    ↓
[FRONTEND] Call Backend: POST /api/property/search
    ↓
[BACKEND] TitlePoint Lookup (APN, legal description, owner)
    ↓
[FRONTEND] Display Results or Manual Entry Fallback
    ↓
User Confirms & Continues to Step 2
```

---

## 💻 **FRONTEND RESPONSIBILITIES**

### **Component**: `frontend/src/components/PropertySearchWithTitlePoint.tsx`

### **1. Google Places Integration** (Client-Side)

**What Happens**:
```typescript
// Lines 139-194: Initialize Google Maps API
const initializeGoogle = async () => {
  // Check feature flag
  const googlePlacesEnabled = process.env.NEXT_PUBLIC_GOOGLE_PLACES_ENABLED === 'true';
  if (!googlePlacesEnabled) {
    return; // Skip if disabled
  }
  
  // Load Google Maps script
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
  document.head.appendChild(script);
  
  // Initialize autocomplete and places services
  autocompleteService.current = new google.maps.places.AutocompleteService();
  placesService.current = new google.maps.places.PlacesService(mapDiv);
}
```

**Why Frontend**:
- ✅ Real-time autocomplete suggestions as user types
- ✅ Reduces API calls (Google suggests addresses client-side)
- ✅ Better UX with instant feedback

---

### **2. Address Autocomplete** (Client-Side)

**What Happens**:
```typescript
// Lines 221-267: Handle user input
const handleInputChange = (e) => {
  const value = e.target.value;
  setInputValue(value);
  
  if (value.length > 2) {
    // Debounce - wait 300ms after user stops typing
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      searchPlaces(value);  // Get suggestions from Google
    }, 300);
  }
}

// Get place predictions from Google Places API
const searchPlaces = (input: string) => {
  autocompleteService.current?.getPlacePredictions(
    {
      input: input,
      componentRestrictions: { country: 'us' },
      types: ['address']  // Only show addresses, not businesses
    },
    (predictions, status) => {
      if (status === 'OK' && predictions) {
        setSuggestions(predictions);  // Show dropdown
      }
    }
  );
};
```

**Example**:
```
User types: "123 Main"
Google returns:
  - 123 Main St, Los Angeles, CA 90012
  - 123 Main Ave, San Francisco, CA 94102
  - 123 Main Blvd, San Diego, CA 92101
```

**Why Frontend**:
- ✅ Instant suggestions (no backend round-trip)
- ✅ Google's autocomplete is optimized for client-side
- ✅ Works offline-first (suggestions cached by browser)

---

### **3. Extract Address Components** (Client-Side)

**What Happens**:
```typescript
// Lines 269-301: User selects address from dropdown
const handleSuggestionSelect = (suggestion) => {
  // Get detailed place information using Place ID
  placesService.current?.getDetails(
    {
      placeId: suggestion.place_id,
      fields: ['address_components', 'formatted_address', 'name', 'place_id']
    },
    (place, status) => {
      // Extract structured address components
      const extractedData = {
        fullAddress: "123 Main St, Los Angeles, CA 90012",
        street: "123 Main St",           // From street_number + route
        city: "Los Angeles",              // From locality
        state: "CA",                      // From administrative_area_level_1
        zip: "90012",                     // From postal_code
        county: "Los Angeles County",     // From administrative_area_level_2
        placeId: "ChIJ...",              // Google's unique ID
      };
      
      setSelectedAddress(extractedData);
      // Now ready to call backend
    }
  );
};
```

**Why Frontend**:
- ✅ Google Places provides structured data directly
- ✅ No need to parse addresses on backend
- ✅ Guaranteed format consistency

---

### **4. Call Backend for Property Enrichment** (Frontend → Backend)

**What Happens**:
```typescript
// Lines 366-451: Call backend to get property details
const lookupPropertyDetails = async (addressData) => {
  // Check feature flag
  const titlePointEnabled = process.env.NEXT_PUBLIC_TITLEPOINT_ENABLED === 'true';
  if (!titlePointEnabled) {
    // Skip enrichment, allow manual entry
    return;
  }
  
  setIsTitlePointLoading(true);  // Show loading spinner
  
  // Get auth token
  const token = localStorage.getItem('access_token');
  
  // Call backend
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';
  const response = await fetch(`${apiUrl}/api/property/search`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      address: addressData.fullAddress  // "123 Main St, Los Angeles, CA 90012"
    })
  });
  
  if (response.ok) {
    const result = await response.json();
    
    if (result.success) {
      // Backend returned enriched data!
      setPropertyDetails({
        ...addressData,
        apn: result.apn,                          // From TitlePoint
        legalDescription: result.legalDescription, // From TitlePoint
        grantorName: result.grantorName,          // From TitlePoint
        county: result.county                      // From TitlePoint
      });
      
      setShowPropertyDetails(true);  // Show details card
    } else {
      // TitlePoint failed - show manual entry option
      setErrorMessage(result.message);
    }
  }
  
  setIsTitlePointLoading(false);
};
```

**Payload Sent to Backend**:
```json
{
  "address": "123 Main St, Los Angeles, CA 90012"
}
```

**Why Backend Call**:
- 🔒 TitlePoint API keys must stay secret (server-side only)
- 🔒 Authentication required (user must be logged in)
- 📊 Caching (backend can cache TitlePoint responses)
- 💰 Cost control (backend can rate limit)

---

### **5. Display Results & Manual Fallback** (Client-Side)

**What Happens**:
```typescript
// Lines 631-764: Show property details card
if (showPropertyDetails && propertyDetails) {
  return (
    <div className="property-details-card">
      <h3>Property Found!</h3>
      
      <div className="detail-row">
        <label>Address:</label>
        <span>{propertyDetails.fullAddress}</span>
      </div>
      
      <div className="detail-row">
        <label>APN:</label>
        <span>{propertyDetails.apn || 'Not found'}</span>
      </div>
      
      <div className="detail-row">
        <label>County:</label>
        <span>{propertyDetails.county || 'Not found'}</span>
      </div>
      
      <div className="detail-row">
        <label>Legal Description:</label>
        <span>{propertyDetails.legalDescription || 'Not found'}</span>
      </div>
      
      <div className="detail-row">
        <label>Current Owner:</label>
        <span>{propertyDetails.grantorName || 'Not found'}</span>
      </div>
      
      {/* Manual Override Option */}
      <button onClick={handleManualEntry}>
        Enter Details Manually
      </button>
      
      <button onClick={handleConfirm}>
        Confirm & Continue
      </button>
    </div>
  );
}

// If TitlePoint fails, show manual entry banner
if (errorMessage) {
  return (
    <div className="manual-entry-banner">
      <p>{errorMessage}</p>
      <button onClick={allowManualEntry}>
        Continue with Manual Entry
      </button>
    </div>
  );
}
```

**Why Frontend**:
- ✅ User can override AI results (legal requirement)
- ✅ Always allow manual entry (resilience)
- ✅ Transparent about data source

---

## 🖥️ **BACKEND RESPONSIBILITIES**

### **Component**: `backend/api/property_endpoints.py`

### **⚠️ IMPORTANT: Route Collision Issue**

**Current Problem**: Two routers handle `/api/property/search`:

```python
# Router 1 (Lines 300-353) - RICHER, but gets overridden
@router.post("/search")
async def titlepoint_property_search(request, user_id):
    # Has caching
    # Has comprehensive error handling
    # Logs API usage
    
# Router 2 (backend/api/property_search.py:32) - SIMPLER, wins
@router.post("/search")  
async def search_property(request, current_user):
    # Direct TitlePoint call
    # No caching
    # Less error handling
```

**Which One Actually Runs**: Router 2 (property_search.py) - last mounted wins

---

### **1. TitlePoint Property Search** (Server-Side)

**Current Endpoint**: `POST /api/property/search` (from `property_search.py`)

**What Happens**:
```python
# backend/api/property_search.py lines 32-76
@router.post("/search")
async def search_property(request: PropertySearchRequest, current_user: dict):
    """
    Search TitlePoint for property details using address
    """
    # Validate request
    if not request.address.strip():
        return {"success": False, "error": "Address is required"}
    
    # Initialize TitlePoint service
    title_service = TitlePointService()
    
    # Search using TitlePoint API
    property_data = await title_service.search_property(request.address)
    
    if not property_data.get('success'):
        return {
            "success": False,
            "error": "Property not found. Please enter details manually."
        }
    
    # Extract data from TitlePoint response
    data = property_data.get('data', {})
    
    # Return structured response
    return {
        "success": True,
        "propertySearch": request.address,
        "apn": data.get('apn', ''),                       # Assessor Parcel Number
        "county": data.get('county', ''),                 # County name
        "city": data.get('city', ''),
        "state": data.get('state', 'CA'),
        "zip": data.get('zip_code', ''),
        "legalDescription": data.get('legal_description', ''),  # Legal property description
        "grantorName": data.get('current_owner', ''),     # Current property owner
        "fullAddress": data.get('formatted_address', request.address),
        "confidence": data.get('confidence', 0.8)         # Data quality score
    }
```

**What TitlePoint Returns**:
```python
# From backend/services/titlepoint_service.py
{
  'success': True,
  'data': {
    'apn': '5123-456-789',                              # Unique parcel ID
    'county': 'Los Angeles',                            # County name
    'legal_description': 'LOT 5 BLK 2 TRACT 12345',   # Legal description
    'current_owner': 'JOHN DOE AND JANE DOE',         # Owner names
    'formatted_address': '123 MAIN ST LOS ANGELES CA 90012',
    'confidence': 0.95                                  # Match confidence
  }
}
```

**Why Backend**:
- 🔒 **Security**: TitlePoint credentials stay server-side
- 🔒 **Authentication**: User must be logged in to access property data
- 💰 **Cost Control**: Rate limiting and usage tracking
- 📊 **Caching**: Cache responses to reduce API costs
- 📝 **Audit Trail**: Log all property searches for compliance

---

### **2. Authentication & Authorization** (Server-Side)

**What Happens**:
```python
@router.post("/search")
async def search_property(
    request: PropertySearchRequest, 
    current_user: dict = Depends(get_current_user)  # ← Requires valid JWT token
):
    # FastAPI automatically:
    # 1. Checks for Authorization header
    # 2. Validates JWT token
    # 3. Retrieves user info from database
    # 4. Rejects if token invalid/expired
```

**If No Token or Invalid**:
```
HTTP 401 Unauthorized
{
  "detail": "Not authenticated"
}
```

**Why Backend**:
- 🔒 **Security**: Can't trust frontend to enforce auth
- 🔒 **Token Validation**: Server-side validation of JWT
- 📊 **User Tracking**: Know who searched what property
- 💰 **Billing**: Track API usage per user

---

### **3. TitlePoint API Integration** (Server-Side)

**Service**: `backend/services/titlepoint_service.py`

**What Happens**:
```python
class TitlePointService:
    async def search_property(self, address: str):
        """
        Call TitlePoint SOAP API to get property details
        """
        # Build SOAP request
        soap_body = f'''
        <soapenv:Envelope>
            <soapenv:Body>
                <GetPropertyDetails>
                    <Address>{address}</Address>
                    <Username>{self.username}</Username>
                    <Password>{self.password}</Password>
                </GetPropertyDetails>
            </soapenv:Body>
        </soapenv:Envelope>
        '''
        
        # Call TitlePoint API
        response = await self.client.post(
            self.wsdl_url,
            data=soap_body,
            headers={'Content-Type': 'text/xml'}
        )
        
        # Parse XML response
        data = self.parse_soap_response(response.text)
        
        return {
            'success': True,
            'data': {
                'apn': data.get('APN'),
                'county': data.get('CountyName'),
                'legal_description': data.get('LegalDescription'),
                'current_owner': data.get('OwnerName'),
                ...
            }
        }
```

**Why Backend**:
- 🔒 **Credentials Hidden**: TitlePoint username/password never exposed
- 🔒 **CORS Restrictions**: TitlePoint API blocks browser requests
- 🛡️ **Error Handling**: Server can retry, log, and gracefully fail
- 📝 **Audit Trail**: Log all TitlePoint requests

---

### **4. Caching Strategy** (Server-Side)

**NOTE**: Currently in `property_endpoints.py` (better router that gets overridden)

**What Happens**:
```python
@router.post("/search")
async def titlepoint_property_search(request, user_id):
    # Check cache first (PostgreSQL)
    cache_key = request.fullAddress
    cached_data = await get_cached_titlepoint_data(user_id, cache_key)
    
    if cached_data:
        # Return cached result instantly
        return cached_data  # ← 0ms response time!
    
    # Cache miss - call TitlePoint
    result = await titlepoint_service.enrich_property(request.dict())
    
    # Store in cache for next time
    if result.get('success'):
        await cache_titlepoint_data(user_id, cache_key, result)
    
    return result
```

**Why Backend**:
- 💰 **Cost Savings**: TitlePoint charges per API call
- ⚡ **Performance**: Cached responses are instant
- 📊 **Shared Cache**: Multiple users benefit from same lookup
- 🕒 **TTL Control**: Server controls how long to cache

---

### **5. Error Handling & Fallback** (Server-Side)

**What Happens**:
```python
try:
    # Call TitlePoint
    result = await titlepoint_service.search_property(address)
    return result
    
except TitlePointAPIError as e:
    # TitlePoint is down or returned error
    logger.error(f"TitlePoint API error: {e}")
    await log_api_usage(user_id, "titlepoint", "search", request, None, str(e))
    
    return {
        'success': False,
        'message': 'Property search failed. Please enter details manually.',
        'fullAddress': request.fullAddress,
        'county': request.city or '',  # Best guess from Google data
        'city': request.city or '',
        'state': request.state or 'CA',
        'zip': request.zip or '',
        # No APN, legal description, or owner data
    }

except Exception as e:
    # Unexpected error
    logger.error(f"Unexpected error: {e}")
    return {
        'success': False,
        'message': 'Service temporarily unavailable. Please try again.',
        ...
    }
```

**Why Backend**:
- 🛡️ **Resilience**: Graceful degradation when services fail
- 📝 **Logging**: Track all failures for debugging
- 🔄 **Retry Logic**: Can retry failed requests
- 📊 **Monitoring**: Alert team if TitlePoint is down

---

## 🔄 **COMPLETE SEQUENCE DIAGRAM**

```
┌──────────┐                     ┌──────────────┐                 ┌─────────────┐
│  User    │                     │   Frontend   │                 │   Backend   │
│ Browser  │                     │   Next.js    │                 │   FastAPI   │
└────┬─────┘                     └──────┬───────┘                 └──────┬──────┘
     │                                  │                                │
     │ 1. Types "123 Main"             │                                │
     ├─────────────────────────────────>│                                │
     │                                  │                                │
     │                                  │ 2. Google Places API (client)  │
     │                                  ├────────────────────┐           │
     │                                  │ Autocomplete       │           │
     │                                  │<───────────────────┘           │
     │                                  │                                │
     │ 3. Shows suggestions             │                                │
     │<─────────────────────────────────┤                                │
     │                                  │                                │
     │ 4. Selects address               │                                │
     ├─────────────────────────────────>│                                │
     │                                  │                                │
     │                                  │ 5. Google Place Details (client)│
     │                                  ├────────────────────┐           │
     │                                  │ Get full address   │           │
     │                                  │<───────────────────┘           │
     │                                  │                                │
     │ 6. Shows "Looking up property..." │                               │
     │<─────────────────────────────────┤                                │
     │                                  │                                │
     │                                  │ 7. POST /api/property/search   │
     │                                  ├───────────────────────────────>│
     │                                  │    + JWT token                 │
     │                                  │    + address                   │
     │                                  │                                │
     │                                  │                   8. Validate JWT │
     │                                  │                   ├────────────┐│
     │                                  │                   │ Check user ││
     │                                  │                   │<───────────┘│
     │                                  │                                │
     │                                  │                   9. Check cache│
     │                                  │                   ├────────────┐│
     │                                  │                   │ PostgreSQL ││
     │                                  │                   │<───────────┘│
     │                                  │                                │
     │                                  │              10. Call TitlePoint│
     │                                  │                   ├────────────┐│
     │                                  │                   │ SOAP API   ││
     │                                  │                   │<───────────┘│
     │                                  │                                │
     │                                  │              11. Cache response│
     │                                  │                   ├────────────┐│
     │                                  │                   │ Store data ││
     │                                  │                   │<───────────┘│
     │                                  │                                │
     │                                  │ 12. Return property details    │
     │                                  │<───────────────────────────────┤
     │                                  │    {apn, county, legal, owner} │
     │                                  │                                │
     │ 13. Shows property details card  │                                │
     │<─────────────────────────────────┤                                │
     │     + APN                        │                                │
     │     + County                     │                                │
     │     + Legal Description          │                                │
     │     + Current Owner              │                                │
     │     + [Confirm] [Manual Entry]   │                                │
     │                                  │                                │
     │ 14. Clicks "Confirm"             │                                │
     ├─────────────────────────────────>│                                │
     │                                  │                                │
     │ 15. Proceed to Step 2            │                                │
     │<─────────────────────────────────┤                                │
     │                                  │                                │
```

---

## 📊 **DATA FLOW SUMMARY**

### **Frontend Handles**:
1. ✅ **User Input** - Text box, typing
2. ✅ **Google Autocomplete** - Suggestions as user types
3. ✅ **Address Parsing** - Extract street, city, state, zip from Google
4. ✅ **UI State** - Loading spinners, error messages, results display
5. ✅ **Manual Override** - Allow user to bypass AI and enter manually
6. ✅ **Confirmation** - User confirms data before proceeding

### **Backend Handles**:
1. 🔒 **Authentication** - Verify JWT token, validate user
2. 🔒 **TitlePoint API** - Call SOAP API with credentials
3. 💰 **Cost Control** - Rate limiting, usage tracking
4. 📊 **Caching** - Store responses to reduce API costs
5. 🛡️ **Error Handling** - Graceful fallback when TitlePoint fails
6. 📝 **Audit Trail** - Log all searches for compliance

---

## 🚨 **CRITICAL ISSUE: Route Collision**

**Problem**: Two `/api/property/search` endpoints exist:

1. **`backend/api/property_endpoints.py`** (Lines 300-353)
   - ✅ Has caching
   - ✅ Has comprehensive error handling
   - ✅ Logs API usage
   - ❌ Gets overridden by Router 2

2. **`backend/api/property_search.py`** (Lines 32-76)
   - ✅ Simpler implementation
   - ✅ Direct TitlePoint call
   - ❌ No caching
   - ❌ Less error handling
   - ✅ **This one actually runs** (last mounted)

**Impact**: Frontend thinks it's calling the cached version, but actually calls the simpler version.

**Fix Tomorrow** (Oct 2): Comment out `property_search` router in `backend/main.py` lines 64-71.

---

## 🎯 **KEY TAKEAWAYS**

### **Why Split Frontend/Backend This Way?**

**Frontend (Client-Side)**:
- ⚡ **Speed**: Google autocomplete is instant
- 💰 **Cost**: Google charges less for client-side calls
- 🎨 **UX**: Real-time feedback, better user experience
- 📱 **Caching**: Browser caches suggestions automatically

**Backend (Server-Side)**:
- 🔒 **Security**: API keys and credentials hidden
- 🔒 **Authentication**: Enforce user must be logged in
- 💰 **Cost Control**: Cache expensive TitlePoint calls
- 📝 **Compliance**: Audit trail for all property searches
- 🛡️ **Resilience**: Handle failures gracefully

### **Manual Entry Fallback**

**Always Available** - If TitlePoint fails or user wants to override:
- ✅ User can always enter details manually
- ✅ Transparent about data source (AI vs manual)
- ✅ Legal compliance (user must confirm AI suggestions)
- ✅ Resilience (works even when APIs are down)

---

## 📋 **RELATED FILES**

### **Frontend**:
- `frontend/src/components/PropertySearchWithTitlePoint.tsx` - Main component
- `frontend/src/app/create-deed/grant-deed/page.tsx` - Step 1 wrapper

### **Backend**:
- `backend/api/property_search.py` - Currently used endpoint (simpler)
- `backend/api/property_endpoints.py` - Better endpoint (gets overridden)
- `backend/services/titlepoint_service.py` - TitlePoint API integration
- `backend/services/sitex_service.py` - SiteX API integration (alternative)

### **Documentation**:
- `docs/wizard/ARCHITECTURE.md` - Architecture overview
- `docs/titlepoint-failproof-guide.md` - TitlePoint integration guide

---

**Last Updated**: October 1, 2025  
**Status**: Route collision to be fixed Oct 2, 2025

