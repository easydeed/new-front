"""
Enhanced property search API with TitlePoint integration
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional
from database import get_current_user
from title_point_integration import TitlePointService
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class PropertySearchRequest(BaseModel):
    address: str

class PropertySearchResponse(BaseModel):
    success: bool = True
    propertySearch: str = ""
    apn: str = ""
    county: str = ""
    city: str = ""
    state: str = ""
    zip: str = ""
    legalDescription: str = ""
    grantorName: str = ""
    fullAddress: str = ""
    confidence: float = 0.0
    error: Optional[str] = None

@router.post("/search", response_model=PropertySearchResponse)
async def search_property(request: PropertySearchRequest, current_user: dict = Depends(get_current_user)):
    """
    Enhanced property search with TitlePoint integration
    """
    try:
        if not request.address.strip():
            return PropertySearchResponse(
                success=False,
                error="Address is required"
            )
        
        title_service = TitlePointService()
        
        # Search using TitlePoint
        property_data = await title_service.search_property(request.address)
        
        if not property_data.get('success'):
            return PropertySearchResponse(
                success=False,
                error=property_data.get('message', 'Property not found')
            )
        
        data = property_data.get('data', {})
        
        return PropertySearchResponse(
            success=True,
            propertySearch=request.address,
            apn=data.get('apn', ''),
            county=data.get('county', ''),
            city=data.get('city', ''),
            state=data.get('state', 'CA'),
            zip=data.get('zip_code', ''),
            legalDescription=data.get('legal_description', ''),
            grantorName=data.get('current_owner', ''),
            fullAddress=data.get('formatted_address', request.address),
            confidence=data.get('confidence', 0.8)
        )
        
    except Exception as e:
        logger.error(f"Property search error: {str(e)}")
        return PropertySearchResponse(
            success=False,
            error="Property search failed. Please try again."
        )

@router.get("/suggestions")
async def get_property_suggestions(address: str, current_user: dict = Depends(get_current_user)):
    """
    Get property suggestions based on partial address
    """
    try:
        if len(address) < 3:
            return {"suggestions": []}
        
        title_service = TitlePointService()
        suggestions = await title_service.get_address_suggestions(address)
        
        return {"suggestions": suggestions}
        
    except Exception as e:
        logger.error(f"Property suggestions error: {str(e)}")
        return {"suggestions": []}
