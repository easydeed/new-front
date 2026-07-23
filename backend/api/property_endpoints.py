"""
Property integration API endpoints for Google Places, SiteX Data, and TitlePoint
"""
import json
import logging
from datetime import datetime
from typing import Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
import psycopg2
from psycopg2.extras import RealDictCursor

from auth import get_current_user_id

logger = logging.getLogger(__name__)

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


# T7: legacy Google-era endpoints (/validate, /search-history,
# /cached-properties, /search-legacy) and their property_cache_enhanced /
# property_search_history helpers were removed — zero frontend consumers.
# Live surface: /search-v2 and /resolve-match (SiteX).

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


class PropertySearchRequestV2(BaseModel):
    """Enhanced request model for property search v2"""
    address: str = Field(..., description="Street address")
    city: Optional[str] = Field(None, description="City name (recommended)")
    state: str = Field("CA", description="State abbreviation")
    zip_code: Optional[str] = Field(None, alias="zip", description="ZIP code")
    use_cache: bool = Field(True, description="Whether to use cached results")

    class Config:
        populate_by_name = True


class PropertyResolveMatchRequest(BaseModel):
    """Resolve a SiteX multi-match candidate by FIPS + APN"""
    fips: str = Field(..., min_length=1)
    apn: str = Field(..., min_length=1)


@router.post("/search-v2")
async def property_search_v2(
    request: PropertySearchRequestV2,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id)
):
    """
    PHASE 1.3: Enhanced property search with multi-match handling
    
    Returns structured PropertySearchResult with:
    - status: 'success', 'multi_match', 'not_found', or 'error'
    - data: Full PropertyData when status='success'
    - matches: List of PropertyMatch when status='multi_match'
    
    Frontend should show PropertyMatchPicker when status='multi_match'
    """
    import time
    start_time = time.time()
    
    try:
        # Get the enhanced SiteX service
        from services.sitex_service import sitex_service
        
        if not sitex_service.is_configured():
            return {
                'status': 'error',
                'message': 'Property enrichment not configured. Please enter details manually.',
                'data': None,
                'matches': None
            }
        
        # Search using enhanced service
        result = await sitex_service.search_property(
            address=request.address,
            city=request.city,
            state=request.state,
            zip_code=request.zip_code,
            client_ref=f"user:{user_id}",
            use_cache=request.use_cache
        )
        
        elapsed = time.time() - start_time
        print(f"⏱️  Property search v2 took {elapsed:.2f}s - status: {result.status}")

        if result.status == "multi_match":
            match_count = len(result.matches or [])
            response_payload = {
                "status": "multi_match",
                "message": "Multiple properties found. Please select one.",
                "data": None,
                "matches": [match.dict() for match in (result.matches or [])],
                "match_count": match_count,
            }
            logger.info(f"SiteX search-v2 multi_match returned {match_count} matches")

            background_tasks.add_task(
                log_api_usage,
                user_id,
                "sitex_v2",
                "property_search",
                request.dict(),
                response_payload
            )

            return response_payload
        
        # Non-blocking logging
        background_tasks.add_task(
            log_api_usage, 
            user_id, 
            "sitex_v2", 
            "property_search", 
            request.dict(),
            result.dict() if result else None
        )
        
        # Return the structured result
        return result.dict()
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        background_tasks.add_task(
            log_api_usage, 
            user_id, 
            "sitex_v2", 
            "property_search", 
            request.dict(),
            None, 
            str(e)
        )
        return {
            'status': 'error',
            'message': f'Property search failed: {str(e)}',
            'data': None,
            'matches': None
        }


@router.post("/resolve-match")
async def resolve_property_match(
    request: PropertyResolveMatchRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id)
):
    """
    PHASE 1.3: Resolve a multi-match selection by FIPS + APN
    
    Called after user selects from PropertyMatchPicker
    """
    try:
        from services.sitex_service import sitex_service
        
        result = await sitex_service.search_by_fips_apn(
            fips=request.fips,
            apn=request.apn,
            client_ref=f"user:{user_id}"
        )
        
        # Non-blocking logging
        background_tasks.add_task(
            log_api_usage, 
            user_id, 
            "sitex_v2", 
            "resolve_match", 
            request.dict(),
            result.dict() if result else None
        )
        
        return result.dict()
        
    except Exception as e:
        return {
            'status': 'error',
            'message': f'Failed to resolve property: {str(e)}',
            'data': None,
            'matches': None
        }


