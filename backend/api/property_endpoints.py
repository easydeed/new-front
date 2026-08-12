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
from db_rows import ROW_FACTORY

from auth import get_current_user_id
from services import address_match

logger = logging.getLogger(__name__)

try:
    from services.google_places_service import GooglePlacesService
    from services.sitex_service import SiteXService
    SERVICES_AVAILABLE = True
except ImportError as e:
    print(f"Property services not available: {e}")
    GooglePlacesService = None
    SiteXService = None
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

# Database connection: the ONE helper (db_rows.py explains why there is
# only one). This module used to define a third private get_db_connection
# with its own row factory — the same ambiguity that 401'd every partner
# API key for months, one copy further from where anyone would look.
from database import get_db_connection


# Service instances
google_service = None
sitex_service = None

def get_services():
    """Initialize services lazily - returns None if services not available"""
    global google_service, sitex_service
    
    if not SERVICES_AVAILABLE:
        return None, None

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
    
    return google_service, sitex_service


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
            # default=str: payloads carry datetimes; without it json.dumps
            # raised and the log entry was silently dropped (invariant #4:
            # a failing logger is a swallowed error).
            user_id, service, method, json.dumps(request_data, default=str),
            json.dumps(response_data, default=str) if response_data else None,
            error, error is None, datetime.now()
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"API logging failed: {e}")


# T6: the /test/titlepoint-* diagnostic endpoints were removed with the
# TitlePoint stack. See docs/skills/titlepoint-integration.md for the proven
# method when the integration is rebuilt.

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


SELECTED_EXACT = "exact_address_match"
SELECTED_ONLY_MATCH = "only_county_match"
SELECTED_OFFICER = "officer_choice"


def _decorate(matches):
    """Every candidate says why a field of it is blank.

    Invariant #4 in a data field: the screen used to print "Owner
    unavailable" for a parcel the county simply has no owner name for,
    which reads as a failure and is not one.
    """
    decorated = []
    for match in matches:
        row = dict(match)
        row["owner_status"] = address_match.owner_status(row)
        row["owner_reason"] = address_match.OWNER_REASONS.get(row["owner_status"], "")
        decorated.append(row)
    return decorated


async def _resolve_multi_match(request, result, user_id: str) -> Dict:
    """The county returned several parcels for one chosen address.

    ═══ WHY THIS RUNS ON THE SERVER ═══

    The officer chose a specific address from the autocomplete. Standing
    rule: move the judgement server-side and send the answer, rather than
    teaching a second surface how to compare addresses. The screen
    renders what it is told, and there is one implementation of "is this
    the same address" instead of one per client.

    ═══ WHY IT CAN DECLINE ═══

    Exactly one unambiguous match selects. Zero or several do not, and
    then all of them go to the officer, nearest first, with nothing
    chosen on their behalf. A multi-unit building is the common case of
    "several", and picking a unit for somebody is how a deed ends up
    describing the neighbour's home.
    """
    matches = _decorate([m.dict() for m in (result.matches or [])])
    wanted = address_match.Address(
        street=request.address, city=request.city, zip_code=request.zip_code)
    selected, ranked = address_match.select(wanted, matches)

    logger.info(
        f"SiteX search-v2 multi_match: {len(matches)} candidates, "
        f"exact selection={'yes' if selected else 'no'}")

    if selected:
        from services.sitex_service import sitex_service
        resolved = await sitex_service.search_by_fips_apn(
            fips=selected.get("fips", ""), apn=selected.get("apn", ""),
            client_ref=f"user:{user_id}")
        if resolved.status == "success" and resolved.data:
            alternatives = [m for m in ranked if m is not selected]
            payload = resolved.dict()
            payload["selection"] = {
                "basis": SELECTED_EXACT,
                "matched_address": selected.get("address", ""),
                "alternative_count": len(alternatives),
            }
            payload["alternatives"] = alternatives
            return payload

        # The exact parcel would not load. That is not a reason to pick a
        # different one, and it is not a reason to say nothing happened —
        # the officer gets the full list and the reason it is still a list.
        logger.warning(
            "SiteX resolve of the exact match failed (%s); falling back to "
            "the candidate list", resolved.status)

    return {
        "status": "multi_match",
        "message": "Multiple properties found. Please select one.",
        "data": None,
        "matches": ranked,
        "match_count": len(ranked),
        "selection": {"basis": SELECTED_OFFICER, "matched_address": "",
                      "alternative_count": len(ranked)},
    }


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
            response_payload = await _resolve_multi_match(request, result, user_id)
            background_tasks.add_task(
                log_api_usage,
                user_id,
                "sitex_v2",
                "property_search",
                request.dict(),
                response_payload
            )
            return response_payload

        if result.status == "success":
            payload = result.dict()
            # §13.2 — who asserted this answer. One county match is not a
            # choice anybody made; saying so is cheaper than leaving the
            # reader to work out that no selection happened.
            payload["selection"] = {
                "basis": SELECTED_ONLY_MATCH,
                "matched_address": (result.data.address if result.data else ""),
                "alternative_count": 0,
            }
            background_tasks.add_task(
                log_api_usage, user_id, "sitex_v2", "property_search",
                request.dict(), payload)
            return payload

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
        
        payload = result.dict()
        # §13.2 — who asserted the answer. This route exists BECAUSE a
        # human picked a row, and the record should be able to tell that
        # apart from a parcel the server matched.
        payload["selection"] = {
            "basis": SELECTED_OFFICER,
            "matched_address": (result.data.address if result.data else ""),
            "alternative_count": 0,
        }

        # Non-blocking logging
        background_tasks.add_task(
            log_api_usage,
            user_id,
            "sitex_v2",
            "resolve_match",
            request.dict(),
            payload
        )

        return payload
        
    except Exception as e:
        return {
            'status': 'error',
            'message': f'Failed to resolve property: {str(e)}',
            'data': None,
            'matches': None
        }


