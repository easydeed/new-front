"""Property cache + AI deed-suggestion endpoints (T8 split — moved verbatim from main.py).

NOTE on ``get_user_profile``: in the pre-split main.py the /users/profile
route handler shadowed the ``database.get_user_profile`` import, so these
endpoints called the route handler (a coroutine function) rather than the
database helper. That handler now lives in routers.users_auth and is
imported from there to preserve the exact pre-split behavior.
"""
from fastapi import APIRouter, Body, Depends, HTTPException, Query

import db  # noqa: F401  (kept for parity with the other split routers)
from ai_assist import suggest_defaults, validate_deed_data
from auth import get_current_user_id
from database import get_cached_property, cache_property_data, get_recent_properties
from routers.users_auth import get_user_profile

router = APIRouter()

# Property Caching Endpoints
@router.post("/property/cache")
async def cache_property(
    property_data: dict = Body(...),
    user_id: int = Depends(get_current_user_id)
):
    """Cache property data for future AI suggestions"""
    try:
        success = cache_property_data(user_id, property_data)
        if success:
            return {"status": "cached", "message": "Property data cached for future suggestions"}
        else:
            raise HTTPException(status_code=500, detail="Failed to cache property data")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Property caching failed: {str(e)}")

@router.get("/property/suggestions")
async def get_property_suggestions(
    address: str = Query(..., description="Partial address to search for"),
    user_id: int = Depends(get_current_user_id)
):
    """Get property suggestions based on cached data and address search"""
    try:
        # Look for cached properties matching the address
        cached_property = get_cached_property(user_id, address)
        recent_properties = get_recent_properties(user_id, limit=3)

        suggestions = []

        if cached_property:
            suggestions.append({
                "type": "cached_exact",
                "property": cached_property,
                "confidence": 0.95
            })

        # Add recent properties as suggestions
        for prop in recent_properties:
            if address.lower() in prop.get('property_address', '').lower():
                suggestions.append({
                    "type": "recent_match",
                    "property": prop,
                    "confidence": 0.8
                })

        return {
            "suggestions": suggestions,
            "total": len(suggestions)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Property suggestions failed: {str(e)}")

# AI Suggestions Endpoint (Real-time)
@router.post("/ai/deed-suggestions")
async def get_deed_suggestions(
    deed_data: dict = Body(...),
    user_id: int = Depends(get_current_user_id)
):
    """Get real-time AI suggestions for deed form fields"""
    try:
        # Get user profile and cached property data
        profile = get_user_profile(user_id)
        cached_property = None

        if deed_data.get('propertySearch'):
            cached_property = get_cached_property(user_id, deed_data['propertySearch'])

        user_data = {
            'profile': profile,
            'cached_property': cached_property
        }

        # Generate suggestions and validation
        suggestions = suggest_defaults(user_data, deed_data)
        validation = validate_deed_data(deed_data, deed_data.get('deedType', 'grant_deed'))

        return {
            "suggestions": suggestions,
            "validation": validation,
            "profile_available": bool(profile),
            "cached_data_available": bool(cached_property)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI suggestions failed: {str(e)}")
