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
        
        # Step 2: TitlePoint enrichment (if we have APN or address)
        if titlepoint_service:
            try:
                apn = enriched_data.get('apn') or request.apn
                county = enriched_data.get('county') or request.county
                
                if county:  # TitlePoint requires county
                    titlepoint_data = await titlepoint_service.enrich_property(
                        state=request.state,
                        county=county,
                        apn=apn,
                        address=request.address if not apn else None
                    )
                    enriched_data.update(titlepoint_data)
                    
                    # Log TitlePoint usage
                    await log_api_usage(user_id, "titlepoint", "enrich_property", request.dict(), titlepoint_data)
                    
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
async def search_properties(
    query: str,
    user_id: str = Depends(get_current_user_id)
):
    """
    Search for properties with both cached and live results
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
