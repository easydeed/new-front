"""
Property integration API endpoints for Google Places, SiteX Data, and TitlePoint
"""
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
import psycopg2
from psycopg2.extras import RealDictCursor

from auth import get_current_user_id
try:
    from services.google_places_service import GooglePlacesService
    from services.sitex_service import SiteXService
    from services.titlepoint_service import TitlePointService
    SERVICES_AVAILABLE = True
except ImportError as e:
    print(f"Property services not available: {e}")
    GooglePlacesService = None
    SiteXService = None
    TitlePointService = None
    SERVICES_AVAILABLE = False


# Request/Response Models
class PropertySearchRequest(BaseModel):
    """Request model for property search"""
    fullAddress: str = Field(..., description="Complete property address")
    street: Optional[str] = Field(None, description="Street address")
    city: Optional[str] = Field(None, description="City name")
    state: Optional[str] = Field("CA", description="State abbreviation")
    zip: Optional[str] = Field(None, description="ZIP code")
    neighborhood: Optional[str] = Field(None, description="Neighborhood")
    placeId: Optional[str] = Field(None, description="Google Place ID")


class PropertyValidationResponse(BaseModel):
    """Response model for property validation"""
    success: bool
    data: Dict
    source: str  # 'google', 'sitex', 'titlepoint', 'cache'
    cached: bool
    confidence: Optional[float] = None


class PropertyEnrichmentRequest(BaseModel):
    """Request model for property enrichment"""
    address: str
    city: str
    state: str = "CA"
    county: Optional[str] = None
    apn: Optional[str] = None
    fips: Optional[str] = None


# Initialize router
router = APIRouter(prefix="/api/property", tags=["Property Integration"])

# Database connection helper
def get_db_connection():
    """Get database connection for property caching"""
    import os
    db_url = os.getenv("DATABASE_URL") or os.getenv("DB_URL")
    return psycopg2.connect(db_url, cursor_factory=RealDictCursor)


# Service instances
google_service = None
sitex_service = None
titlepoint_service = None

def get_services():
    """Initialize services lazily - returns None if services not available"""
    global google_service, sitex_service, titlepoint_service
    
    if not SERVICES_AVAILABLE:
        return None, None, None
    
    try:
        if not google_service and GooglePlacesService:
            google_service = GooglePlacesService()
    except Exception as e:
        print(f"Google Places service unavailable: {e}")
        google_service = None
    
    try:
        if not sitex_service and SiteXService:
            sitex_service = SiteXService()
    except Exception as e:
        print(f"SiteX service unavailable: {e}")
        sitex_service = None
    
    try:
        if not titlepoint_service and TitlePointService:
            titlepoint_service = TitlePointService()
    except Exception as e:
        print(f"TitlePoint service unavailable: {e}")
        titlepoint_service = None
    
    return google_service, sitex_service, titlepoint_service


@router.post("/validate", response_model=PropertyValidationResponse)
async def validate_property(
    request: PropertySearchRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Validate property address using Google Places and cache results
    """
    try:
        # Check cache first
        cached_data = await get_cached_property(user_id, request.fullAddress)
        if cached_data:
            return PropertyValidationResponse(
                success=True,
                data=cached_data,
                source="cache",
                cached=True,
                confidence=1.0
            )
        
        # Get services
        google_service, _, _ = get_services()
        
        if not google_service:
            raise HTTPException(
                status_code=503,
                detail="Google Places service not available"
            )
        
        # Validate with Google Places
        validated_data = await google_service.validate_address(request.dict())
        
        # Cache the result
        await cache_property_data(user_id, request.fullAddress, validated_data, "google")
        
        # Log API usage
        await log_api_usage(user_id, "google_places", "validate_address", request.dict(), validated_data)
        
        return PropertyValidationResponse(
            success=True,
            data=validated_data,
            source="google",
            cached=False,
            confidence=0.9
        )
        
    except Exception as e:
        await log_api_usage(user_id, "google_places", "validate_address", request.dict(), None, str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Property validation failed: {str(e)}"
        )


@router.post("/enrich", response_model=PropertyValidationResponse)
async def enrich_property(
    request: PropertyEnrichmentRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Enrich property data using SiteX Data and TitlePoint APIs
    """
    try:
        # Get services
        _, sitex_service, titlepoint_service = get_services()
        
        enriched_data = {}
        
        # Step 1: SiteX Data validation (APN/FIPS lookup)
        if sitex_service:
            try:
                locale = f"{request.city}, {request.state}"
                sitex_data = await sitex_service.validate_address(
                    request.address, 
                    locale
                )
                enriched_data.update(sitex_data)
                
                # Log SiteX usage
                await log_api_usage(user_id, "sitex", "validate_address", request.dict(), sitex_data)
                
            except Exception as e:
                print(f"SiteX enrichment failed: {e}")
                await log_api_usage(user_id, "sitex", "validate_address", request.dict(), None, str(e))
        
        # Step 2: TitlePoint enrichment (Tax via APN, else LV via address/FIPS)
        if titlepoint_service:
            try:
                # consolidate payload for service as dict per fail‑proof guide
                payload = {
                    "fullAddress": request.address,
                    "city": request.city,
                    "state": request.state,
                    "county": enriched_data.get('county') or request.county or '',
                    "zip": enriched_data.get('zip') or '',
                    "apn": enriched_data.get('apn') or request.apn or '',
                    "fips": enriched_data.get('fips') or request.fips or ''
                }
                # Only proceed if we have county (required) and either APN or address
                if payload["county"] and (payload["apn"] or payload["fullAddress"]):
                    titlepoint_data = await titlepoint_service.enrich_property(payload)
                    enriched_data.update(titlepoint_data)
                    await log_api_usage(user_id, "titlepoint", "enrich_property", payload, titlepoint_data)
            except Exception as e:
                print(f"TitlePoint enrichment failed: {e}")
                await log_api_usage(user_id, "titlepoint", "enrich_property", request.dict(), None, str(e))
        
        # Cache enriched data
        cache_key = f"{request.address}, {request.city}, {request.state}"
        await cache_property_data(user_id, cache_key, enriched_data, "enriched")
        
        return PropertyValidationResponse(
            success=True,
            data=enriched_data,
            source="enriched",
            cached=False,
            confidence=enriched_data.get('validation_confidence', 0.8)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Property enrichment failed: {str(e)}"
        )


@router.get("/search-history")
async def get_search_history(
    limit: int = 10,
    user_id: str = Depends(get_current_user_id)
):
    """
    Get user's property search history
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT search_query, selected_address, created_at
            FROM property_search_history 
            WHERE user_id = %s 
            ORDER BY created_at DESC 
            LIMIT %s
        """, (user_id, limit))
        
        history = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return {"history": [dict(row) for row in history]}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get search history: {str(e)}"
        )


@router.get("/cached-properties")
async def get_cached_properties(
    limit: int = 20,
    user_id: str = Depends(get_current_user_id)
):
    """
    Get user's cached property data for suggestions
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT formatted_address, street_address, city, state, 
                   apn, county_name, created_at
            FROM property_cache_enhanced 
            WHERE user_id = %s 
              AND expires_at > NOW()
            ORDER BY created_at DESC 
            LIMIT %s
        """, (user_id, limit))
        
        properties = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return {"properties": [dict(row) for row in properties]}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get cached properties: {str(e)}"
        )


@router.post("/search")
async def titlepoint_property_search(
    request: PropertySearchRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    TitlePoint property search endpoint for Google Places integration
    Searches TitlePoint for APN, brief legal description, and current owners
    """
    try:
        # Check cache first
        cache_key = request.fullAddress
        cached_data = await get_cached_titlepoint_data(user_id, cache_key)
        if cached_data:
            return cached_data
        
        # Get TitlePoint service
        _, _, titlepoint_service = get_services()
        
        if not titlepoint_service:
            return {
                'success': False,
                'message': 'TitlePoint service not available. Please enter details manually.',
                'fullAddress': request.fullAddress,
                'county': request.city or '',
                'city': request.city or '',
                'state': request.state or 'CA',
                'zip': request.zip or ''
            }
        
        # Call TitlePoint service with the address data
        result = await titlepoint_service.enrich_property(request.dict())
        
        # Cache the result
        if result.get('success'):
            await cache_titlepoint_data(user_id, cache_key, result)
        
        # Log API usage
        await log_api_usage(user_id, "titlepoint", "property_search", request.dict(), result)
        
        return result
        
    except Exception as e:
        # Log error and return graceful fallback
        await log_api_usage(user_id, "titlepoint", "property_search", request.dict(), None, str(e))
        return {
            'success': False,
            'message': f'Property search failed: {str(e)}. Please enter details manually.',
            'fullAddress': request.fullAddress,
            'county': request.city or '',
            'city': request.city or '',
            'state': request.state or 'CA',
            'zip': request.zip or ''
        }


@router.get("/search-legacy")
async def search_properties_legacy(
    query: str,
    user_id: str = Depends(get_current_user_id)
):
    """
    Search for properties with both cached and live results (legacy endpoint)
    """
    try:
        results = {
            "cached": [],
            "live": [],
            "query": query
        }
        
        # Search cached properties first
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT formatted_address, street_address, city, state, zip_code,
                   apn, county_name, google_place_id
            FROM property_cache_enhanced 
            WHERE user_id = %s 
              AND expires_at > NOW()
              AND (
                  LOWER(formatted_address) LIKE LOWER(%s) OR
                  LOWER(street_address) LIKE LOWER(%s) OR
                  LOWER(city) LIKE LOWER(%s)
              )
            ORDER BY created_at DESC 
            LIMIT 5
        """, (user_id, f"%{query}%", f"%{query}%", f"%{query}%"))
        
        cached_results = cursor.fetchall()
        results["cached"] = [dict(row) for row in cached_results]
        
        cursor.close()
        conn.close()
        
        # Search live results if Google Places is available
        google_service, _, _ = get_services()
        if google_service and len(results["cached"]) < 3:
            try:
                live_results = await google_service.search_places(query)
                results["live"] = live_results[:5]
            except Exception as e:
                print(f"Live search failed: {e}")
        
        # Log search
        await log_search_history(user_id, query, results)
        
        return results
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Property search failed: {str(e)}"
        )


# Helper functions for database operations
async def get_cached_property(user_id: str, address: str) -> Optional[Dict]:
    """Get cached property data"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT google_response, sitex_response, titlepoint_response,
                   formatted_address, street_address, city, state, zip_code,
                   apn, fips, county_name, legal_description,
                   primary_owner, secondary_owner, vesting_details
            FROM property_cache_enhanced 
            WHERE user_id = %s 
              AND formatted_address = %s 
              AND expires_at > NOW()
            ORDER BY updated_at DESC 
            LIMIT 1
        """, (user_id, address))
        
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if result:
            cached_data = dict(result)
            # Merge JSON responses
            for response_key in ['google_response', 'sitex_response', 'titlepoint_response']:
                if cached_data.get(response_key):
                    cached_data.update(cached_data[response_key])
            return cached_data
        
        return None
        
    except Exception as e:
        print(f"Cache lookup failed: {e}")
        return None


async def cache_property_data(user_id: str, address: str, data: Dict, source: str):
    """Cache property data for future use"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Prepare data for insertion
        cache_data = {
            'user_id': user_id,
            'formatted_address': address,
            'street_address': data.get('street_address', ''),
            'city': data.get('city', ''),
            'state': data.get('state', ''),
            'zip_code': data.get('zip_code', ''),
            'neighborhood': data.get('neighborhood', ''),
            'apn': data.get('apn', ''),
            'fips': data.get('fips', ''),
            'county_name': data.get('county', '') or data.get('county_name', ''),
            'legal_description': data.get('legal_description', ''),
            'primary_owner': data.get('primary_owner', ''),
            'secondary_owner': data.get('secondary_owner', ''),
            'vesting_details': data.get('vesting_details', ''),
            'google_place_id': data.get('google_place_id', ''),
        }
        
        # Store raw response data based on source
        if source == 'google':
            cache_data['google_response'] = json.dumps(data)
        elif source == 'sitex':
            cache_data['sitex_response'] = json.dumps(data)
            cache_data['sitex_validated'] = True
        elif source == 'titlepoint':
            cache_data['titlepoint_response'] = json.dumps(data)
            cache_data['titlepoint_enriched'] = True
        elif source == 'enriched':
            cache_data['sitex_response'] = json.dumps(data.get('sitex_data', {}))
            cache_data['titlepoint_response'] = json.dumps(data.get('titlepoint_data', {}))
            cache_data['sitex_validated'] = True
            cache_data['titlepoint_enriched'] = True
        
        # Insert or update cache
        cursor.execute("""
            INSERT INTO property_cache_enhanced (
                user_id, formatted_address, street_address, city, state, zip_code,
                neighborhood, apn, fips, county_name, legal_description,
                primary_owner, secondary_owner, vesting_details, google_place_id,
                google_response, sitex_response, titlepoint_response,
                sitex_validated, titlepoint_enriched
            ) VALUES (
                %(user_id)s, %(formatted_address)s, %(street_address)s, %(city)s, %(state)s, %(zip_code)s,
                %(neighborhood)s, %(apn)s, %(fips)s, %(county_name)s, %(legal_description)s,
                %(primary_owner)s, %(secondary_owner)s, %(vesting_details)s, %(google_place_id)s,
                %(google_response)s, %(sitex_response)s, %(titlepoint_response)s,
                %(sitex_validated)s, %(titlepoint_enriched)s
            )
            ON CONFLICT (user_id, formatted_address) 
            DO UPDATE SET
                street_address = EXCLUDED.street_address,
                city = EXCLUDED.city,
                state = EXCLUDED.state,
                zip_code = EXCLUDED.zip_code,
                neighborhood = EXCLUDED.neighborhood,
                apn = COALESCE(EXCLUDED.apn, property_cache_enhanced.apn),
                fips = COALESCE(EXCLUDED.fips, property_cache_enhanced.fips),
                county_name = COALESCE(EXCLUDED.county_name, property_cache_enhanced.county_name),
                legal_description = COALESCE(EXCLUDED.legal_description, property_cache_enhanced.legal_description),
                primary_owner = COALESCE(EXCLUDED.primary_owner, property_cache_enhanced.primary_owner),
                secondary_owner = COALESCE(EXCLUDED.secondary_owner, property_cache_enhanced.secondary_owner),
                vesting_details = COALESCE(EXCLUDED.vesting_details, property_cache_enhanced.vesting_details),
                google_place_id = COALESCE(EXCLUDED.google_place_id, property_cache_enhanced.google_place_id),
                google_response = COALESCE(EXCLUDED.google_response, property_cache_enhanced.google_response),
                sitex_response = COALESCE(EXCLUDED.sitex_response, property_cache_enhanced.sitex_response),
                titlepoint_response = COALESCE(EXCLUDED.titlepoint_response, property_cache_enhanced.titlepoint_response),
                sitex_validated = EXCLUDED.sitex_validated OR property_cache_enhanced.sitex_validated,
                titlepoint_enriched = EXCLUDED.titlepoint_enriched OR property_cache_enhanced.titlepoint_enriched,
                updated_at = CURRENT_TIMESTAMP,
                expires_at = CURRENT_TIMESTAMP + INTERVAL '24 hours'
        """, cache_data)
        
        conn.commit()
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Cache storage failed: {e}")


async def log_api_usage(user_id: str, service: str, method: str, request_data: Dict, response_data: Dict = None, error: str = None):
    """Log API usage for monitoring and debugging"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO api_integration_logs (
                user_id, service_name, method_name, request_data, 
                response_data, error_message, success, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id, service, method, json.dumps(request_data),
            json.dumps(response_data) if response_data else None,
            error, error is None, datetime.now()
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"API logging failed: {e}")


async def get_cached_titlepoint_data(user_id: str, address: str) -> Optional[Dict]:
    """Get cached TitlePoint data for faster responses"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT data FROM property_cache_tp 
            WHERE user_id = %s 
              AND address = %s 
              AND created_at > NOW() - INTERVAL '24 hours'
            ORDER BY created_at DESC 
            LIMIT 1
        """, (user_id, address))
        
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if result:
            return result['data']
        return None
        
    except Exception as e:
        print(f"TitlePoint cache lookup failed: {e}")
        return None


async def cache_titlepoint_data(user_id: str, address: str, data: Dict):
    """Cache TitlePoint results for 24 hours"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO property_cache_tp (user_id, address, data, created_at)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (user_id, address) 
            DO UPDATE SET 
                data = EXCLUDED.data,
                created_at = EXCLUDED.created_at
        """, (user_id, address, json.dumps(data), datetime.now()))
        
        conn.commit()
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"TitlePoint cache storage failed: {e}")


# Diagnostic test endpoints for TitlePoint flows
class TitlePointTestRequest(BaseModel):
    """Test request for individual TitlePoint flows"""
    apn: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = "CA"
    county: Optional[str] = None
    fips: Optional[str] = None
    
@router.post("/test/titlepoint-tax")
async def test_titlepoint_tax_flow(
    request: TitlePointTestRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Test TitlePoint Tax flow (Method 3) with APN
    Endpoint: CreateService3 with TitlePoint.Geo.Tax
    """
    try:
        from services.titlepoint_service import TitlePointService
        
        if not request.apn:
            raise HTTPException(status_code=400, detail="APN is required for Tax flow test")
        if not request.county:
            raise HTTPException(status_code=400, detail="County is required for Tax flow test")
            
        service = TitlePointService()
        
        print(f"🧪 Testing TitlePoint Tax Flow")
        print(f"📋 APN: {request.apn}, County: {request.county}, State: {request.state}")
        
        # Test CreateService3 for Tax
        import os
        query = {
            "userID": service.user_id,
            "password": service.password,
            "serviceType": os.getenv("TAX_SEARCH_SERVICE_TYPE", "TitlePoint.Geo.Tax"),
            "parameters": f"Tax.APN={request.apn};General.AutoSearchTaxes=true;General.AutoSearchProperty=false",
            "state": request.state,
            "county": service._normalize_county(request.county),
        }
        
        request_id = await service._create_service_get(service.tax_create_service_endpoint, query)
        
        return {
            "success": True,
            "flow": "Tax (Method 3)",
            "request_id": request_id,
            "apn": request.apn,
            "county": request.county,
            "message": f"CreateService3 successful - RequestID: {request_id}"
        }
        
    except Exception as e:
        return {
            "success": False,
            "flow": "Tax (Method 3)",
            "error": str(e),
            "apn": request.apn,
            "county": request.county
        }

@router.post("/test/titlepoint-property")
async def test_titlepoint_property_flow(
    request: TitlePointTestRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Test TitlePoint Property flow (Method 4) with Address
    Endpoint: CreateService3 with TitlePoint.Geo.Property
    """
    try:
        from services.titlepoint_service import TitlePointService
        
        if not request.address:
            raise HTTPException(status_code=400, detail="Address is required for Property flow test")
        if not request.city:
            raise HTTPException(status_code=400, detail="City is required for Property flow test")
        if not request.county:
            raise HTTPException(status_code=400, detail="County is required for Property flow test")
            
        service = TitlePointService()
        
        print(f"🧪 Testing TitlePoint Property Flow")
        print(f"📋 Address: {request.address}, City: {request.city}, County: {request.county}")
        
        # Test CreateService3 for Property (corrected service type)
        import os
        parameters = (
            f"Address1={request.address};City={request.city};"
            f"PropertyAutoRun=True;IncludeTax=True;"
            f"LvLookup=Address"
        )
        
        query = {
            "userID": service.user_id,
            "password": service.password,
            "serviceType": os.getenv("SERVICE_TYPE", "TitlePoint.Geo.Property"),
            "parameters": parameters,
            "state": request.state,
            "county": service._normalize_county(request.county),
        }
        
        if request.fips:
            query["fipsCode"] = request.fips
        
        request_id = await service._create_service_get(service.create_service_endpoint, query)
        
        return {
            "success": True,
            "flow": "Property (Method 4)",
            "request_id": request_id,
            "address": request.address,
            "city": request.city,
            "county": request.county,
            "fips": request.fips,
            "message": f"CreateService3 successful - RequestID: {request_id}"
        }
        
    except Exception as e:
        return {
            "success": False,
            "flow": "Property (Method 4)",
            "error": str(e),
            "address": request.address,
            "city": request.city,
            "county": request.county
        }

@router.get("/test/sitex-address-search")
async def test_sitex_address_search():
    """
    Test SiteX AddressSearch (Step 1 - returns multiple matches)
    """
    try:
        _, sitex_service, _ = get_services()
        
        if not sitex_service:
            return {"success": False, "error": "SiteX service not available"}
        
        # Test with La Verne address (like working JS)
        matches = await sitex_service.search_addresses(
            "1358 5th St", 
            "La Verne, CA"
        )
        
        return {
            "success": True,
            "matches": matches,
            "count": len(matches),
            "message": f"SiteX AddressSearch successful - found {len(matches)} matches"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "SiteX AddressSearch test failed"
        }


@router.post("/test/sitex-apn-search")
async def test_sitex_apn_search(request: dict):
    """
    Test SiteX ApnSearch (Step 2 - gets detailed property data)
    Expects: {"apn": "123-456-789", "fips": "06037"}
    """
    try:
        _, sitex_service, _ = get_services()
        
        if not sitex_service:
            return {"success": False, "error": "SiteX service not available"}
        
        apn = request.get('apn')
        fips = request.get('fips')
        
        if not apn or not fips:
            return {
                "success": False,
                "error": "Missing required parameters: apn and fips"
            }
        
        # Test ApnSearch with provided APN/FIPS
        property_details = await sitex_service.apn_search(apn, fips)
        
        return {
            "success": True,
            "property_details": property_details,
            "message": "SiteX ApnSearch successful"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "SiteX ApnSearch test failed"
        }


@router.post("/test/titlepoint-credentials")
async def test_titlepoint_credentials(user_id: str = Depends(get_current_user_id)):
    """
    Test TitlePoint credentials and basic connectivity
    """
    try:
        from services.titlepoint_service import TitlePointService
        
        service = TitlePointService()
        
        print(f"🔐 Testing TitlePoint Credentials")
        print(f"👤 User ID: {service.user_id}")
        print(f"🔗 Endpoint: {service.create_service_endpoint}")
        
        # Simple test with minimal valid parameters  
        query = {
            "userID": service.user_id,
            "password": service.password,
            "serviceType": "TitlePoint.Geo.LegalVesting",
            "parameters": "Test=true",
            "state": "CA",
            "county": "Los Angeles",
        }
        
        # Just test the HTTP call without expecting valid data
        import httpx
        from urllib.parse import urlencode
        
        url = f"{service.create_service_endpoint}?{urlencode(query)}"
        async with httpx.AsyncClient(timeout=service.timeout) as client:
            response = await client.get(url, headers={"Accept": "text/xml, application/xml"})
        
        return {
            "success": True,
            "status_code": response.status_code,
            "credentials_valid": response.status_code != 401,
            "response_sample": response.text[:500],
            "endpoint": service.create_service_endpoint,
            "user_id": service.user_id
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to test TitlePoint credentials"
        }


async def log_search_history(user_id: str, query: str, results: Dict):
    """Log search history for analytics"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        selected_address = None
        if results.get('cached'):
            selected_address = results['cached'][0].get('formatted_address')
        elif results.get('live'):
            selected_address = results['live'][0].get('formatted_address')
        
        cursor.execute("""
            INSERT INTO property_search_history (
                user_id, search_query, selected_address, search_results, created_at
            ) VALUES (%s, %s, %s, %s, %s)
        """, (user_id, query, selected_address, json.dumps(results), datetime.now()))
        
        conn.commit()
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Search history logging failed: {e}")


# Production endpoints for exact SiteX two-step flow
class SiteXAddressSearchRequest(BaseModel):
    """Request for SiteX AddressSearch (Step 1)"""
    address: str
    city: str
    state: str = "CA"

class SiteXApnSearchRequest(BaseModel):
    """Request for SiteX ApnSearch (Step 2)"""
    apn: str
    fips: str

@router.post("/sitex/address-search")
async def sitex_address_search(
    request: SiteXAddressSearchRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Step 1: SiteX AddressSearch - Returns multiple property matches for user selection
    Exactly matches the working JavaScript multipleResults() function
    """
    try:
        _, sitex_service, _ = get_services()
        
        if not sitex_service:
            raise HTTPException(
                status_code=503,
                detail="SiteX service not available"
            )
        
        # Format locale like working JavaScript
        locale = f"{request.city}, {request.state}"
        
        # Call SiteX AddressSearch (Step 1)
        matches = await sitex_service.search_addresses(request.address, locale)
        
        # Log the API call
        await log_api_usage(user_id, "sitex", "address_search", request.dict(), {"matches": matches})
        
        return {
            "success": True,
            "matches": matches,
            "count": len(matches),
            "step": "address_search",
            "message": f"Found {len(matches)} property matches. Please select one to continue."
        }
        
    except Exception as e:
        await log_api_usage(user_id, "sitex", "address_search", request.dict(), None, str(e))
        raise HTTPException(
            status_code=500,
            detail=f"SiteX AddressSearch failed: {str(e)}"
        )


@router.post("/sitex/apn-search")
async def sitex_apn_search(
    request: SiteXApnSearchRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Step 2: SiteX ApnSearch - Gets detailed property data using selected APN/FIPS
    Exactly matches the working JavaScript apnData() and parse187() functions
    """
    try:
        _, sitex_service, _ = get_services()
        
        if not sitex_service:
            raise HTTPException(
                status_code=503,
                detail="SiteX service not available"
            )
        
        # Call SiteX ApnSearch (Step 2) with different ClientReference
        property_details = await sitex_service.apn_search(request.apn, request.fips)
        
        # Log the API call
        await log_api_usage(user_id, "sitex", "apn_search", request.dict(), property_details)
        
        return {
            "success": True,
            "property_details": property_details,
            "step": "apn_search",
            "apn": request.apn,
            "fips": request.fips,
            "message": "Property details retrieved successfully"
        }
        
    except Exception as e:
        await log_api_usage(user_id, "sitex", "apn_search", request.dict(), None, str(e))
        raise HTTPException(
            status_code=500,
            detail=f"SiteX ApnSearch failed: {str(e)}"
        )
