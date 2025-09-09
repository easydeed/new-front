"""
Chain of Title API Endpoints
Integrates with TitlePoint service following established patterns for comprehensive title analysis
"""
import os
import asyncio
from typing import Dict, Optional, List, Any
from datetime import datetime, timedelta
import json

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
import httpx

from services.titlepoint_service import TitlePointService
from lib.auth import get_current_user
from lib.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/titlepoint", tags=["chain-of-title"])

# Request/Response Models
class ChainOfTitleRequest(BaseModel):
    serviceType: str = Field(..., description="TitlePoint service type")
    propertyData: Dict[str, Any] = Field(..., description="Property information")
    searchDepth: str = Field(default="comprehensive", description="Analysis depth")
    parameters: str = Field(..., description="TitlePoint service parameters")
    customerRef: str = Field(..., description="Customer reference")
    orderComment: str = Field(..., description="Order comment")

class ServiceCreationResponse(BaseModel):
    requestId: str
    serviceType: str
    status: str
    createdAt: datetime
    message: str

class ServiceStatusResponse(BaseModel):
    requestId: str
    status: str  # pending, processing, complete, failed
    progress: Optional[str] = None
    resultIds: List[str] = []
    errorMessage: Optional[str] = None
    estimatedCompletion: Optional[datetime] = None

class ChainOfTitleResult(BaseModel):
    requestId: str
    propertyInfo: Dict[str, Any]
    transfers: List[Dict[str, Any]]
    currentOwner: Dict[str, Any]
    titleIssues: List[Dict[str, Any]]
    riskAssessment: Dict[str, Any]
    dataSource: str
    confidence: float
    completedAt: datetime
    processingTime: int

class RiskAnalysisRequest(BaseModel):
    chainOfTitle: Dict[str, Any]
    analysisType: str = Field(default="comprehensive")
    includeMarketRisk: bool = Field(default=False)
    includeLegalRisk: bool = Field(default=True)
    includeFinancialRisk: bool = Field(default=True)

# Global service instance
titlepoint_service = TitlePointService()

# In-memory storage for request tracking (in production, use Redis or database)
request_cache: Dict[str, Dict[str, Any]] = {}
result_cache: Dict[str, Dict[str, Any]] = {}

@router.post("/create-service", response_model=ServiceCreationResponse)
async def create_titlepoint_service(
    request: ChainOfTitleRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a TitlePoint service request following established patterns
    """
    try:
        logger.info(f"Creating TitlePoint service: {request.serviceType} for user {current_user.get('id')}")
        
        # Build service parameters based on service type
        service_params = build_service_parameters(request.serviceType, request.propertyData, request.searchDepth)
        
        # Create the service using existing TitlePoint patterns
        if request.serviceType == "TitlePoint.Geo.LegalVesting":
            result = await create_legal_vesting_service(request, service_params)
        elif request.serviceType == "TitlePoint.Geo.Address":
            result = await create_instrument_service(request, service_params)
        elif request.serviceType == "TitlePoint.Geo.Tax":
            result = await create_tax_service(request, service_params)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported service type: {request.serviceType}")
        
        # Store request info for tracking
        request_info = {
            "requestId": result["requestId"],
            "serviceType": request.serviceType,
            "status": "pending",
            "createdAt": datetime.now(),
            "propertyData": request.propertyData,
            "searchDepth": request.searchDepth,
            "userId": current_user.get('id'),
            "resultIds": [],
            "progress": "Service created, waiting for processing"
        }
        request_cache[result["requestId"]] = request_info
        
        return ServiceCreationResponse(
            requestId=result["requestId"],
            serviceType=request.serviceType,
            status="pending",
            createdAt=datetime.now(),
            message="TitlePoint service created successfully"
        )
        
    except Exception as e:
        logger.error(f"Failed to create TitlePoint service: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Service creation failed: {str(e)}")

@router.get("/request-status/{request_id}", response_model=ServiceStatusResponse)
async def get_request_status(
    request_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get the status of a TitlePoint service request
    """
    try:
        if request_id not in request_cache:
            raise HTTPException(status_code=404, detail="Request not found")
        
        request_info = request_cache[request_id]
        
        # Check if request belongs to current user
        if request_info.get("userId") != current_user.get('id'):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Poll TitlePoint for status update
        status_update = await poll_titlepoint_status(request_id)
        
        # Update cached info
        request_info.update(status_update)
        request_cache[request_id] = request_info
        
        return ServiceStatusResponse(
            requestId=request_id,
            status=request_info["status"],
            progress=request_info.get("progress"),
            resultIds=request_info.get("resultIds", []),
            errorMessage=request_info.get("errorMessage"),
            estimatedCompletion=request_info.get("estimatedCompletion")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get request status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")

@router.get("/get-results/{request_id}")
async def get_titlepoint_results(
    request_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get the results of a completed TitlePoint service request
    """
    try:
        if request_id not in request_cache:
            raise HTTPException(status_code=404, detail="Request not found")
        
        request_info = request_cache[request_id]
        
        # Check if request belongs to current user
        if request_info.get("userId") != current_user.get('id'):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check if results are cached
        if request_id in result_cache:
            return result_cache[request_id]
        
        # Check if request is complete
        if request_info["status"] != "complete":
            raise HTTPException(status_code=400, detail="Request not yet complete")
        
        # Retrieve results from TitlePoint
        results = await retrieve_titlepoint_results(request_id, request_info)
        
        # Cache results
        result_cache[request_id] = results
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get results: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Results retrieval failed: {str(e)}")

@router.post("/analyze-chain-of-title")
async def analyze_chain_of_title(
    property_data: Dict[str, Any],
    search_depth: str = "comprehensive",
    background_tasks: BackgroundTasks = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Perform comprehensive chain of title analysis
    """
    try:
        logger.info(f"Starting chain of title analysis for user {current_user.get('id')}")
        
        # Create multiple TitlePoint service requests
        requests = []
        
        # 1. Legal/Vesting Service
        lv_request = ChainOfTitleRequest(
            serviceType="TitlePoint.Geo.LegalVesting",
            propertyData=property_data,
            searchDepth=search_depth,
            parameters=build_service_parameters("TitlePoint.Geo.LegalVesting", property_data, search_depth),
            customerRef=f"COT_LV_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            orderComment=f"Chain of Title Legal/Vesting - {property_data.get('address', 'Unknown')}"
        )
        
        lv_response = await create_titlepoint_service(lv_request, current_user)
        requests.append(("legal_vesting", lv_response.requestId))
        
        # 2. Instrument Service (if comprehensive)
        if search_depth in ["comprehensive", "full_history"]:
            inst_request = ChainOfTitleRequest(
                serviceType="TitlePoint.Geo.Address",
                propertyData=property_data,
                searchDepth=search_depth,
                parameters=build_service_parameters("TitlePoint.Geo.Address", property_data, search_depth),
                customerRef=f"COT_INST_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                orderComment=f"Chain of Title Instruments - {property_data.get('address', 'Unknown')}"
            )
            
            inst_response = await create_titlepoint_service(inst_request, current_user)
            requests.append(("instruments", inst_response.requestId))
        
        # 3. Tax Service (if full history)
        if search_depth == "full_history":
            tax_request = ChainOfTitleRequest(
                serviceType="TitlePoint.Geo.Tax",
                propertyData=property_data,
                searchDepth=search_depth,
                parameters=build_service_parameters("TitlePoint.Geo.Tax", property_data, search_depth),
                customerRef=f"COT_TAX_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                orderComment=f"Chain of Title Tax - {property_data.get('address', 'Unknown')}"
            )
            
            tax_response = await create_titlepoint_service(tax_request, current_user)
            requests.append(("tax", tax_response.requestId))
        
        # Return the request IDs for client to poll
        return {
            "message": "Chain of title analysis initiated",
            "requests": requests,
            "estimatedCompletion": datetime.now() + timedelta(minutes=5),
            "pollInterval": 3000  # 3 seconds
        }
        
    except Exception as e:
        logger.error(f"Chain of title analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.post("/risk-analysis")
async def perform_risk_analysis(
    request: RiskAnalysisRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Perform AI-powered risk analysis on chain of title data
    """
    try:
        logger.info(f"Starting risk analysis for user {current_user.get('id')}")
        
        # Extract chain of title data
        chain_data = request.chainOfTitle
        
        # Perform risk analysis using AI service
        risk_assessment = await analyze_title_risks(
            chain_data,
            request.analysisType,
            request.includeMarketRisk,
            request.includeLegalRisk,
            request.includeFinancialRisk
        )
        
        return risk_assessment
        
    except Exception as e:
        logger.error(f"Risk analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Risk analysis failed: {str(e)}")

# Helper Functions

def build_service_parameters(service_type: str, property_data: Dict[str, Any], search_depth: str) -> str:
    """Build TitlePoint service parameters based on service type and requirements"""
    
    base_params = {
        "TitlePoint.Geo.LegalVesting": [
            "General.AutoSearchProperty=true",
            "General.AutoSearchTaxes=false",
            "LegalVesting.IncludeDeeds=true",
            "LegalVesting.IncludeVesting=true"
        ],
        "TitlePoint.Geo.Address": [
            "Document.SearchType=Instrument",
            "General.AutoSearchProperty=true",
            "General.AutoSearchTaxes=false"
        ],
        "TitlePoint.Geo.Tax": [
            f"Tax.APN={property_data.get('apn', '')}",
            "General.AutoSearchTaxes=true",
            "General.AutoSearchProperty=false"
        ]
    }
    
    # Add depth-specific parameters
    if search_depth == "comprehensive":
        if service_type == "TitlePoint.Geo.LegalVesting":
            base_params[service_type].extend([
                "LegalVesting.IncludeChainOfTitle=true",
                "LegalVesting.SearchYears=10"
            ])
    elif search_depth == "full_history":
        if service_type == "TitlePoint.Geo.LegalVesting":
            base_params[service_type].extend([
                "LegalVesting.IncludeChainOfTitle=true",
                "LegalVesting.SearchYears=30",
                "LegalVesting.IncludeHistoricalDeeds=true"
            ])
    
    return ";".join(base_params.get(service_type, []))

async def create_legal_vesting_service(request: ChainOfTitleRequest, parameters: str) -> Dict[str, Any]:
    """Create Legal/Vesting service using existing TitlePoint patterns"""
    
    query_params = {
        "userID": titlepoint_service.user_id,
        "password": titlepoint_service.password,
        "serviceType": request.serviceType,
        "parameters": parameters,
        "customerRef": request.customerRef,
        "orderComment": request.orderComment,
        "company": "",
        "department": "",
        "titleOfficer": "",
        "starterRemarks": ""
    }
    
    # Add property-specific parameters
    if request.propertyData.get("apn"):
        query_params["apn"] = request.propertyData["apn"]
    if request.propertyData.get("county"):
        query_params["county"] = request.propertyData["county"]
    if request.propertyData.get("state"):
        query_params["state"] = request.propertyData["state"]
    
    # Use existing TitlePoint service method
    request_id = await titlepoint_service._create_service_get(
        titlepoint_service.create_service_endpoint,
        query_params
    )
    
    return {"requestId": request_id}

async def create_instrument_service(request: ChainOfTitleRequest, parameters: str) -> Dict[str, Any]:
    """Create Instrument service using existing TitlePoint patterns"""
    
    query_params = {
        "userID": titlepoint_service.user_id,
        "password": titlepoint_service.password,
        "serviceType": request.serviceType,
        "parameters": parameters,
        "customerRef": request.customerRef,
        "orderComment": request.orderComment,
        "company": "",
        "department": "",
        "titleOfficer": "",
        "starterRemarks": ""
    }
    
    # Add address-based search parameters
    if request.propertyData.get("address"):
        query_params["address"] = request.propertyData["address"]
    if request.propertyData.get("county"):
        query_params["county"] = request.propertyData["county"]
    if request.propertyData.get("state"):
        query_params["state"] = request.propertyData["state"]
    
    request_id = await titlepoint_service._create_service_get(
        titlepoint_service.create_service_endpoint,
        query_params
    )
    
    return {"requestId": request_id}

async def create_tax_service(request: ChainOfTitleRequest, parameters: str) -> Dict[str, Any]:
    """Create Tax service using existing TitlePoint patterns"""
    
    query_params = {
        "userID": titlepoint_service.user_id,
        "password": titlepoint_service.password,
        "serviceType": request.serviceType,
        "parameters": parameters,
        "customerRef": request.customerRef,
        "orderComment": request.orderComment,
        "company": "",
        "department": "",
        "titleOfficer": "",
        "starterRemarks": ""
    }
    
    # Add tax-specific parameters
    if request.propertyData.get("apn"):
        query_params["apn"] = request.propertyData["apn"]
    if request.propertyData.get("county"):
        query_params["county"] = request.propertyData["county"]
    if request.propertyData.get("state"):
        query_params["state"] = request.propertyData["state"]
    
    request_id = await titlepoint_service._create_service_get(
        titlepoint_service.tax_create_service_endpoint,
        query_params
    )
    
    return {"requestId": request_id}

async def poll_titlepoint_status(request_id: str) -> Dict[str, Any]:
    """Poll TitlePoint for request status using existing patterns"""
    
    try:
        # Use existing TitlePoint service method
        status_xml, error_msg = await titlepoint_service._wait_for_http_completion(request_id)
        
        if error_msg:
            return {
                "status": "failed",
                "errorMessage": error_msg,
                "progress": "Request failed"
            }
        
        if status_xml and "Complete" in status_xml:
            # Parse result IDs from XML
            result_ids = parse_result_ids_from_xml(status_xml)
            return {
                "status": "complete",
                "resultIds": result_ids,
                "progress": "Request completed successfully"
            }
        else:
            return {
                "status": "processing",
                "progress": "Request in progress",
                "estimatedCompletion": datetime.now() + timedelta(minutes=2)
            }
            
    except Exception as e:
        logger.error(f"Status polling failed: {str(e)}")
        return {
            "status": "failed",
            "errorMessage": str(e),
            "progress": "Status check failed"
        }

async def retrieve_titlepoint_results(request_id: str, request_info: Dict[str, Any]) -> Dict[str, Any]:
    """Retrieve and parse TitlePoint results using existing patterns"""
    
    try:
        service_type = request_info["serviceType"]
        result_ids = request_info.get("resultIds", [])
        
        if not result_ids:
            raise Exception("No result IDs available")
        
        results = []
        for result_id in result_ids:
            if service_type == "TitlePoint.Geo.Tax":
                # Use GetResultByID3 for tax data
                result_xml = await titlepoint_service._fetch_result_by_id(
                    titlepoint_service.get_result_by_id_3,
                    result_id,
                    3
                )
            else:
                # Use GetResultByID for legal/vesting and instruments
                result_xml = await titlepoint_service._fetch_result_by_id(
                    titlepoint_service.get_result_by_id,
                    result_id,
                    4
                )
            
            # Parse the XML result
            parsed_result = await titlepoint_service._parse_pacific_coast_result(result_xml)
            results.append(parsed_result)
        
        # Combine and structure results
        combined_results = combine_titlepoint_results(results, service_type, request_info)
        
        return combined_results
        
    except Exception as e:
        logger.error(f"Results retrieval failed: {str(e)}")
        raise Exception(f"Failed to retrieve results: {str(e)}")

def parse_result_ids_from_xml(xml_content: str) -> List[str]:
    """Parse result IDs from TitlePoint XML response"""
    import xml.etree.ElementTree as ET
    
    try:
        root = ET.fromstring(xml_content)
        result_ids = []
        
        # Look for ResultThumbNail IDs
        for thumbnail in root.findall(".//ResultThumbNail"):
            id_elem = thumbnail.find("ID")
            if id_elem is not None and id_elem.text:
                result_ids.append(id_elem.text)
        
        return result_ids
        
    except Exception as e:
        logger.error(f"Failed to parse result IDs: {str(e)}")
        return []

def combine_titlepoint_results(results: List[Dict[str, Any]], service_type: str, request_info: Dict[str, Any]) -> Dict[str, Any]:
    """Combine and structure TitlePoint results for chain of title analysis"""
    
    combined = {
        "requestId": request_info["requestId"],
        "serviceType": service_type,
        "propertyData": request_info["propertyData"],
        "results": results,
        "retrievedAt": datetime.now().isoformat(),
        "processingTime": (datetime.now() - request_info["createdAt"]).total_seconds()
    }
    
    # Add service-specific structuring
    if service_type == "TitlePoint.Geo.LegalVesting":
        combined["legalVesting"] = extract_legal_vesting_data(results)
    elif service_type == "TitlePoint.Geo.Address":
        combined["instruments"] = extract_instrument_data(results)
    elif service_type == "TitlePoint.Geo.Tax":
        combined["taxData"] = extract_tax_data(results)
    
    return combined

def extract_legal_vesting_data(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Extract and structure legal/vesting data"""
    
    extracted = {
        "currentVesting": "",
        "legalDescription": "",
        "deeds": [],
        "fips": "",
        "confidence": 0.8
    }
    
    for result in results:
        if "Result" in result:
            result_data = result["Result"]
            
            # Extract vesting information
            if "Vesting" in result_data:
                extracted["currentVesting"] = result_data["Vesting"]
            
            # Extract legal description
            if "BriefLegal" in result_data:
                extracted["legalDescription"] = result_data["BriefLegal"]
            
            # Extract FIPS
            if "Fips" in result_data:
                extracted["fips"] = result_data["Fips"]
            
            # Extract deed information
            if "LvDeeds" in result_data and "LegalAndVesting2DeedInfo" in result_data["LvDeeds"]:
                deeds = result_data["LvDeeds"]["LegalAndVesting2DeedInfo"]
                if isinstance(deeds, list):
                    extracted["deeds"] = deeds
                else:
                    extracted["deeds"] = [deeds]
    
    return extracted

def extract_instrument_data(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Extract and structure instrument data"""
    
    extracted = {
        "instruments": [],
        "documentCount": 0,
        "confidence": 0.7
    }
    
    for result in results:
        # Process instrument results
        if "instruments" in result:
            extracted["instruments"].extend(result["instruments"])
    
    extracted["documentCount"] = len(extracted["instruments"])
    
    return extracted

def extract_tax_data(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Extract and structure tax data"""
    
    extracted = {
        "taxInfo": {},
        "assessedValue": 0,
        "taxAmount": 0,
        "confidence": 0.9
    }
    
    for result in results:
        if "tax_data" in result:
            extracted["taxInfo"] = result["tax_data"]
    
    return extracted

async def analyze_title_risks(
    chain_data: Dict[str, Any],
    analysis_type: str,
    include_market_risk: bool,
    include_legal_risk: bool,
    include_financial_risk: bool
) -> Dict[str, Any]:
    """Perform AI-powered risk analysis on chain of title data"""
    
    # This would integrate with AI service for risk analysis
    # For now, provide basic risk assessment
    
    risk_factors = []
    title_issues = chain_data.get("titleIssues", [])
    transfers = chain_data.get("transfers", [])
    
    # Basic risk assessment based on transfer patterns
    if len(transfers) > 5:
        risk_factors.append({
            "type": "Frequent Transfers",
            "severity": "medium",
            "description": "Property has changed hands frequently",
            "likelihood": 0.6,
            "mitigation": "Enhanced due diligence recommended"
        })
    
    # Calculate overall risk score
    risk_score = max(0, 100 - (len(title_issues) * 15) - (len(risk_factors) * 10))
    
    overall_risk = "low" if risk_score > 80 else "medium" if risk_score > 60 else "high"
    
    return {
        "overallRisk": overall_risk,
        "riskScore": risk_score,
        "riskFactors": risk_factors,
        "titleIssues": title_issues,
        "recommendations": [
            "Standard title insurance recommended",
            "Normal due diligence timeline appropriate"
        ],
        "insurabilityRating": "good",
        "requiredActions": [],
        "analysisType": analysis_type,
        "completedAt": datetime.now().isoformat()
    }


