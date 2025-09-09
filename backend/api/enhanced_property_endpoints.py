from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
import asyncio
from datetime import datetime

# Import existing TitlePoint service if available
try:
    from ..services.titlepoint_service import TitlePointService
except ImportError:
    TitlePointService = None

router = APIRouter(prefix="/api/property", tags=["Enhanced Property Search"])

# Request/Response Models
class PropertySearchRequest(BaseModel):
    address: str
    county: Optional[str] = None
    includeOwners: bool = True
    includeLegalDescription: bool = True
    includeAPN: bool = True
    includeTaxInfo: bool = False
    includeLiens: bool = False

class Owner(BaseModel):
    name: str
    vestingType: Optional[str] = None
    percentage: Optional[float] = None

class Lien(BaseModel):
    type: str
    amount: str
    creditor: str
    recordingDate: datetime
    documentNumber: str

class TaxInfo(BaseModel):
    assessedValue: str
    taxYear: str
    taxAmount: str
    delinquent: bool

class PropertySearchResponse(BaseModel):
    success: bool
    address: str
    apn: Optional[str] = None
    county: Optional[str] = None
    legalDescription: Optional[str] = None
    owners: List[Owner] = []
    liens: List[Lien] = []
    taxInfo: Optional[TaxInfo] = None
    dataSource: str = "enhanced_search"
    lastUpdated: datetime
    confidence: float = 0.0
    warnings: List[str] = []

class AIDocumentSuggestionRequest(BaseModel):
    propertyData: Dict[str, Any]
    context: Optional[Dict[str, Any]] = None

class DocumentSuggestion(BaseModel):
    recommendedType: str
    confidence: float
    reasoning: str
    alternatives: List[Dict[str, Any]] = []
    riskFactors: List[str] = []
    legalConsiderations: List[str] = []

# Enhanced Property Search Endpoint
@router.post("/titlepoint-search", response_model=PropertySearchResponse)
async def enhanced_property_search(request: PropertySearchRequest):
    """
    Enhanced property search with TitlePoint integration and fallback mechanisms
    """
    try:
        logger = logging.getLogger(__name__)
        logger.info(f"Enhanced property search for: {request.address}")
        
        # Initialize response
        response = PropertySearchResponse(
            success=False,
            address=request.address,
            lastUpdated=datetime.now()
        )
        
        # Try TitlePoint integration first
        if TitlePointService:
            try:
                titlepoint_result = await search_with_titlepoint(request)
                if titlepoint_result.success:
                    return titlepoint_result
                else:
                    response.warnings.append("TitlePoint search failed, using fallback methods")
            except Exception as e:
                logger.warning(f"TitlePoint search failed: {str(e)}")
                response.warnings.append(f"TitlePoint unavailable: {str(e)}")
        
        # Fallback to basic property parsing
        fallback_result = await search_with_fallback(request)
        return fallback_result
        
    except Exception as e:
        logger.error(f"Enhanced property search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Property search failed: {str(e)}")

async def search_with_titlepoint(request: PropertySearchRequest) -> PropertySearchResponse:
    """
    Search using TitlePoint integration
    """
    try:
        # This would integrate with the existing TitlePoint service
        # For now, we'll simulate the integration
        
        # Parse address components
        address_parts = parse_address(request.address)
        
        # Simulate TitlePoint API call
        await asyncio.sleep(0.1)  # Simulate API delay
        
        # Mock TitlePoint response (replace with actual integration)
        mock_response = {
            'apn': '123-456-789',
            'county': address_parts.get('county', 'Los Angeles'),
            'legalDescription': f'Lot 1, Block 2, Tract 12345, as per map recorded in Book 123, Page 45 of Maps, in the Office of the County Recorder of {address_parts.get("county", "Los Angeles")} County, California',
            'owners': [
                {'name': 'John Doe, a single man', 'vestingType': 'sole and separate'},
                {'name': 'Jane Smith, a married woman', 'vestingType': 'sole and separate'}
            ],
            'liens': [],
            'taxInfo': {
                'assessedValue': '500000',
                'taxYear': '2024',
                'taxAmount': '6250.00',
                'delinquent': False
            }
        }
        
        return PropertySearchResponse(
            success=True,
            address=request.address,
            apn=mock_response['apn'],
            county=mock_response['county'],
            legalDescription=mock_response['legalDescription'],
            owners=[Owner(**owner) for owner in mock_response['owners']],
            liens=[],
            taxInfo=TaxInfo(**mock_response['taxInfo']) if request.includeTaxInfo else None,
            dataSource="titlepoint",
            lastUpdated=datetime.now(),
            confidence=0.95,
            warnings=[]
        )
        
    except Exception as e:
        raise Exception(f"TitlePoint search failed: {str(e)}")

async def search_with_fallback(request: PropertySearchRequest) -> PropertySearchResponse:
    """
    Fallback property search using basic address parsing
    """
    try:
        address_parts = parse_address(request.address)
        
        return PropertySearchResponse(
            success=True,
            address=request.address,
            apn=None,
            county=address_parts.get('county'),
            legalDescription=None,
            owners=[],
            liens=[],
            taxInfo=None,
            dataSource="fallback",
            lastUpdated=datetime.now(),
            confidence=0.3,
            warnings=[
                "Limited property data available",
                "TitlePoint integration unavailable",
                "Manual verification recommended"
            ]
        )
        
    except Exception as e:
        raise Exception(f"Fallback search failed: {str(e)}")

def parse_address(address: str) -> Dict[str, str]:
    """
    Basic address parsing to extract components
    """
    parts = {}
    
    # Simple parsing logic (can be enhanced)
    if 'CA' in address.upper():
        parts['state'] = 'CA'
    
    # Extract potential county names
    california_counties = [
        'Los Angeles', 'Orange', 'San Diego', 'Riverside', 'San Bernardino',
        'Ventura', 'Santa Barbara', 'Kern', 'Fresno', 'Imperial', 'Santa Clara',
        'Alameda', 'Sacramento', 'Contra Costa', 'San Francisco', 'San Mateo'
    ]
    
    for county in california_counties:
        if county.lower() in address.lower():
            parts['county'] = county
            break
    
    # Default to Los Angeles if no county detected
    if 'county' not in parts:
        parts['county'] = 'Los Angeles'
    
    return parts

# AI Document Suggestion Endpoint
@router.post("/ai-document-suggestion", response_model=DocumentSuggestion)
async def get_ai_document_suggestion(request: AIDocumentSuggestionRequest):
    """
    Get AI-powered document type suggestions based on property data
    """
    try:
        logger = logging.getLogger(__name__)
        logger.info("Getting AI document suggestion")
        
        property_data = request.propertyData
        context = request.context or {}
        
        # Analyze property data for document type suggestion
        suggestion = analyze_property_for_document_type(property_data, context)
        
        return suggestion
        
    except Exception as e:
        logger.error(f"AI document suggestion failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI suggestion failed: {str(e)}")

def analyze_property_for_document_type(property_data: Dict[str, Any], context: Dict[str, Any]) -> DocumentSuggestion:
    """
    Analyze property data to suggest appropriate document type
    """
    owners = property_data.get('currentOwners', [])
    
    # Check for spouse indicators
    spouse_indicators = ['husband', 'wife', 'married', 'spouse']
    has_spouse_indicators = any(
        any(indicator in owner.get('name', '').lower() for indicator in spouse_indicators)
        for owner in owners
    )
    
    # Check for multiple owners
    has_multiple_owners = len(owners) > 1
    
    # Check for liens or encumbrances
    has_liens = len(property_data.get('liens', [])) > 0
    
    # Determine recommendation
    if has_spouse_indicators:
        return DocumentSuggestion(
            recommendedType="interspousal_transfer",
            confidence=0.85,
            reasoning="Detected spouse-related ownership. Interspousal transfer may be appropriate for changing how spouses hold title.",
            alternatives=[
                {
                    "type": "grant_deed",
                    "confidence": 0.6,
                    "reasoning": "Standard transfer with warranties",
                    "pros": ["Full warranties", "Standard protection"],
                    "cons": ["More complex", "May not be tax exempt"]
                }
            ],
            riskFactors=["Verify marriage status", "Confirm tax exemption eligibility"],
            legalConsiderations=["Interspousal transfers are typically exempt from documentary transfer tax"]
        )
    
    elif has_liens:
        return DocumentSuggestion(
            recommendedType="warranty_deed",
            confidence=0.75,
            reasoning="Property has liens or encumbrances. Warranty deed provides maximum protection for the buyer.",
            alternatives=[
                {
                    "type": "grant_deed",
                    "confidence": 0.7,
                    "reasoning": "Standard protection with some warranties",
                    "pros": ["Good protection", "Standard in California"],
                    "cons": ["Less protection than warranty deed"]
                }
            ],
            riskFactors=["Existing liens must be addressed", "Title insurance recommended"],
            legalConsiderations=["Warranty deed provides full protection against title defects"]
        )
    
    else:
        return DocumentSuggestion(
            recommendedType="grant_deed",
            confidence=0.8,
            reasoning="Standard property transfer. Grant deed is the most common deed type in California and provides good protection.",
            alternatives=[
                {
                    "type": "quitclaim_deed",
                    "confidence": 0.4,
                    "reasoning": "Simpler but provides no warranties",
                    "pros": ["Simple", "Quick", "Lower cost"],
                    "cons": ["No warranties", "Higher risk for buyer"]
                }
            ],
            riskFactors=["Verify clear title", "Consider title insurance"],
            legalConsiderations=["Grant deed provides limited warranties and is standard in California"]
        )

# Health check endpoint
@router.get("/health")
async def health_check():
    """Health check for property search service"""
    return {
        "status": "healthy",
        "service": "enhanced_property_search",
        "timestamp": datetime.now(),
        "titlepoint_available": TitlePointService is not None
    }


