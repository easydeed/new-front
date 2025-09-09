"""
AI Service Endpoints for Advanced Document Intelligence
Provides RESTful API endpoints for OpenAI-powered natural language processing,
legal validation, document analysis, and intelligent assistance
Following the WIZARD_ARCHITECTURE_OVERHAUL_PLAN Phase 2.4 specifications
"""
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
import asyncio

from services.openai_service import openai_service, PromptType, AIRequest, AIResponse
from lib.auth import get_current_user
from lib.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/ai", tags=["AI Services"])

# Request/Response Models
class NaturalLanguageRequest(BaseModel):
    prompt: str = Field(..., description="User's natural language prompt")
    context: Dict[str, Any] = Field(..., description="Document and wizard context")
    document_type: Optional[str] = Field(None, description="Current document type")
    conversation_id: Optional[str] = Field(None, description="Conversation identifier")

class DocumentAnalysisRequest(BaseModel):
    document_data: Dict[str, Any] = Field(..., description="Complete document data")
    analysis_type: str = Field(default="comprehensive", description="Type of analysis to perform")
    include_suggestions: bool = Field(default=True, description="Include improvement suggestions")

class LegalValidationRequest(BaseModel):
    document_type: str = Field(..., description="Type of document to validate")
    document_data: Dict[str, Any] = Field(..., description="Document data to validate")
    jurisdiction: str = Field(default="California", description="Legal jurisdiction")
    validation_level: str = Field(default="comprehensive", description="Level of validation")

class FieldSuggestionRequest(BaseModel):
    field_name: str = Field(..., description="Name of the field to suggest values for")
    document_type: str = Field(..., description="Type of document")
    context: Dict[str, Any] = Field(..., description="Current wizard context")
    property_data: Optional[Dict[str, Any]] = Field(None, description="Property information")
    user_preferences: Optional[Dict[str, Any]] = Field(None, description="User preferences")

class RiskAssessmentRequest(BaseModel):
    chain_of_title: Dict[str, Any] = Field(..., description="Chain of title data")
    property_data: Dict[str, Any] = Field(..., description="Property information")
    assessment_type: str = Field(default="comprehensive", description="Type of risk assessment")

class ChainOfTitleRequest(BaseModel):
    transfers: List[Dict[str, Any]] = Field(..., description="List of property transfers")
    property_data: Dict[str, Any] = Field(..., description="Property information")
    analysis_depth: str = Field(default="comprehensive", description="Depth of analysis")

class DocumentComparisonRequest(BaseModel):
    documents: List[Dict[str, Any]] = Field(..., description="Documents to compare", min_items=2)
    comparison_type: str = Field(default="legal_significance", description="Type of comparison")
    highlight_differences: bool = Field(default=True, description="Highlight differences")

class AIServiceResponse(BaseModel):
    success: bool
    content: str
    confidence: float
    reasoning: str
    suggestions: List[Dict[str, Any]]
    actions: List[Dict[str, Any]]
    legal_implications: Optional[str] = None
    follow_up_questions: List[str] = []
    processing_time: float
    tokens_used: int
    cost_estimate: float

class UsageMetricsResponse(BaseModel):
    total_requests: int
    total_tokens: int
    total_cost: float
    requests_today: int
    tokens_today: int
    cost_today: float
    daily_limit_remaining: float

# Natural Language Processing Endpoints

@router.post("/process-prompt", response_model=AIServiceResponse)
async def process_natural_language_prompt(
    request: NaturalLanguageRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Process natural language prompts with document context awareness
    Supports conversational AI, field suggestions, and intelligent assistance
    """
    try:
        logger.info(f"Processing NLP prompt for user {current_user.get('id')}: {request.prompt[:100]}...")
        
        # Add user context to the request
        enhanced_context = {
            **request.context,
            "user_id": current_user.get('id'),
            "user_role": current_user.get('role', 'user'),
            "timestamp": datetime.now().isoformat()
        }
        
        # Process the prompt
        ai_response = await openai_service.process_natural_language_prompt(
            user_input=request.prompt,
            context=enhanced_context,
            document_type=request.document_type
        )
        
        return _convert_ai_response(ai_response)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Natural language processing failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Natural language processing failed: {str(e)}"
        )

@router.post("/analyze-document", response_model=AIServiceResponse)
async def analyze_document_intelligence(
    request: DocumentAnalysisRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Perform intelligent document analysis with legal expertise
    Analyzes completeness, compliance, and potential issues
    """
    try:
        logger.info(f"Analyzing document for user {current_user.get('id')}")
        
        # Enhance document data with user context
        enhanced_document_data = {
            **request.document_data,
            "analyzed_by": current_user.get('id'),
            "analysis_timestamp": datetime.now().isoformat()
        }
        
        ai_response = await openai_service.analyze_document_intelligence(
            document_data=enhanced_document_data,
            analysis_type=request.analysis_type
        )
        
        return _convert_ai_response(ai_response)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document analysis failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Document analysis failed: {str(e)}"
        )

@router.post("/validate-legal", response_model=AIServiceResponse)
async def validate_legal_compliance(
    request: LegalValidationRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Validate legal compliance with California real estate law
    Provides detailed compliance analysis with code references
    """
    try:
        logger.info(f"Validating legal compliance for {request.document_type}")
        
        ai_response = await openai_service.validate_legal_compliance(
            document_type=request.document_type,
            document_data=request.document_data,
            jurisdiction=request.jurisdiction
        )
        
        return _convert_ai_response(ai_response)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Legal validation failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Legal validation failed: {str(e)}"
        )

@router.post("/suggest-field", response_model=AIServiceResponse)
async def suggest_field_values(
    request: FieldSuggestionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Suggest intelligent field values based on context
    Uses property data, user preferences, and legal requirements
    """
    try:
        logger.info(f"Suggesting values for field: {request.field_name}")
        
        # Build comprehensive context
        context = {
            **request.context,
            "propertyData": request.property_data,
            "userPreferences": request.user_preferences,
            "user_id": current_user.get('id')
        }
        
        ai_response = await openai_service.suggest_field_values(
            field_name=request.field_name,
            context=context,
            document_type=request.document_type
        )
        
        return _convert_ai_response(ai_response)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Field suggestion failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Field suggestion failed: {str(e)}"
        )

# Title and Risk Analysis Endpoints

@router.post("/assess-risks", response_model=AIServiceResponse)
async def assess_title_risks(
    request: RiskAssessmentRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Perform AI-powered title risk assessment
    Analyzes chain of title for potential issues and risks
    """
    try:
        logger.info(f"Assessing title risks for user {current_user.get('id')}")
        
        ai_response = await openai_service.assess_title_risks(
            chain_of_title=request.chain_of_title,
            property_data=request.property_data
        )
        
        return _convert_ai_response(ai_response)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Risk assessment failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Risk assessment failed: {str(e)}"
        )

@router.post("/analyze-chain-of-title", response_model=AIServiceResponse)
async def analyze_chain_of_title(
    request: ChainOfTitleRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Analyze chain of title for issues and recommendations
    Identifies gaps, inconsistencies, and legal concerns
    """
    try:
        logger.info(f"Analyzing chain of title with {len(request.transfers)} transfers")
        
        ai_response = await openai_service.analyze_chain_of_title(
            transfers=request.transfers,
            property_data=request.property_data
        )
        
        return _convert_ai_response(ai_response)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chain of title analysis failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Chain of title analysis failed: {str(e)}"
        )

@router.post("/compare-documents", response_model=AIServiceResponse)
async def compare_documents(
    request: DocumentComparisonRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Compare multiple documents and identify differences
    Highlights legally significant differences and provides recommendations
    """
    try:
        logger.info(f"Comparing {len(request.documents)} documents")
        
        ai_response = await openai_service.compare_documents(
            documents=request.documents,
            comparison_type=request.comparison_type
        )
        
        return _convert_ai_response(ai_response)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document comparison failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Document comparison failed: {str(e)}"
        )

# Batch Processing Endpoints

@router.post("/batch-analyze")
async def batch_analyze_documents(
    documents: List[Dict[str, Any]],
    analysis_type: str = "comprehensive",
    background_tasks: BackgroundTasks = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Batch analyze multiple documents
    Processes documents in parallel for efficiency
    """
    try:
        logger.info(f"Batch analyzing {len(documents)} documents")
        
        if len(documents) > 10:
            raise HTTPException(
                status_code=400,
                detail="Maximum 10 documents allowed per batch request"
            )
        
        # Process documents in parallel
        tasks = []
        for doc in documents:
            task = openai_service.analyze_document_intelligence(
                document_data=doc,
                analysis_type=analysis_type
            )
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        successful_results = []
        failed_results = []
        
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                failed_results.append({
                    "document_index": i,
                    "error": str(result)
                })
            else:
                successful_results.append({
                    "document_index": i,
                    "analysis": _convert_ai_response(result)
                })
        
        return {
            "success": len(failed_results) == 0,
            "total_documents": len(documents),
            "successful_analyses": len(successful_results),
            "failed_analyses": len(failed_results),
            "results": successful_results,
            "errors": failed_results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch analysis failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Batch analysis failed: {str(e)}"
        )

# Service Management Endpoints

@router.get("/usage-metrics", response_model=UsageMetricsResponse)
async def get_usage_metrics(
    current_user: dict = Depends(get_current_user)
):
    """
    Get current AI service usage metrics and costs
    """
    try:
        # Check if user has admin privileges for detailed metrics
        if current_user.get('role') != 'admin':
            raise HTTPException(
                status_code=403,
                detail="Admin privileges required to view usage metrics"
            )
        
        metrics = openai_service.get_usage_metrics()
        daily_limit = 50.0  # $50 daily limit
        
        return UsageMetricsResponse(
            total_requests=metrics['total_requests'],
            total_tokens=metrics['total_tokens'],
            total_cost=metrics['total_cost'],
            requests_today=metrics['requests_today'],
            tokens_today=metrics['tokens_today'],
            cost_today=metrics['cost_today'],
            daily_limit_remaining=max(0, daily_limit - metrics['cost_today'])
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get usage metrics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get usage metrics: {str(e)}"
        )

@router.get("/health")
async def health_check():
    """
    Check AI service health and connectivity
    """
    try:
        health_status = await openai_service.health_check()
        
        if health_status["status"] == "healthy":
            return {
                "status": "healthy",
                "message": "AI service is operational",
                "details": health_status
            }
        else:
            return {
                "status": "unhealthy",
                "message": "AI service has issues",
                "details": health_status
            }
            
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "message": f"Health check failed: {str(e)}",
            "details": {}
        }

@router.post("/reset-limits")
async def reset_daily_limits(
    current_user: dict = Depends(get_current_user)
):
    """
    Reset daily usage limits (admin only)
    """
    try:
        if current_user.get('role') != 'admin':
            raise HTTPException(
                status_code=403,
                detail="Admin privileges required to reset limits"
            )
        
        openai_service.reset_daily_limits()
        
        return {
            "success": True,
            "message": "Daily limits reset successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to reset limits: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reset limits: {str(e)}"
        )

# Specialized Endpoints for Frontend Integration

@router.post("/wizard-assistance")
async def provide_wizard_assistance(
    step: str,
    document_type: str,
    context: Dict[str, Any],
    user_question: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Provide intelligent assistance for wizard steps
    Contextual help based on current step and document type
    """
    try:
        # Build assistance prompt
        if user_question:
            prompt = f"User question about {step} step: {user_question}"
        else:
            prompt = f"Provide assistance for {step} step of {document_type} preparation"
        
        enhanced_context = {
            **context,
            "current_step": step,
            "assistance_type": "wizard_help",
            "user_id": current_user.get('id')
        }
        
        ai_response = await openai_service.process_natural_language_prompt(
            user_input=prompt,
            context=enhanced_context,
            document_type=document_type
        )
        
        return _convert_ai_response(ai_response)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Wizard assistance failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Wizard assistance failed: {str(e)}"
        )

@router.post("/smart-completion")
async def smart_document_completion(
    document_data: Dict[str, Any],
    completion_level: str = "partial",
    current_user: dict = Depends(get_current_user)
):
    """
    Intelligently complete partially filled documents
    Suggests missing fields and validates existing data
    """
    try:
        logger.info(f"Smart completion for {document_data.get('documentType', 'unknown')} document")
        
        # Analyze document for completion
        analysis_response = await openai_service.analyze_document_intelligence(
            document_data=document_data,
            analysis_type="completion_analysis"
        )
        
        # Generate field suggestions for missing fields
        suggestions_tasks = []
        missing_fields = analysis_response.suggestions
        
        for suggestion in missing_fields[:5]:  # Limit to 5 concurrent suggestions
            if suggestion.get('type') == 'missing_field':
                task = openai_service.suggest_field_values(
                    field_name=suggestion['field'],
                    context={"documentData": document_data},
                    document_type=document_data.get('documentType', 'unknown')
                )
                suggestions_tasks.append(task)
        
        # Wait for all suggestions
        if suggestions_tasks:
            field_suggestions = await asyncio.gather(*suggestions_tasks, return_exceptions=True)
        else:
            field_suggestions = []
        
        # Combine analysis and suggestions
        return {
            "success": True,
            "analysis": _convert_ai_response(analysis_response),
            "field_suggestions": [
                _convert_ai_response(sugg) if not isinstance(sugg, Exception) else {"error": str(sugg)}
                for sugg in field_suggestions
            ],
            "completion_percentage": _calculate_completion_percentage(document_data),
            "next_steps": _get_next_completion_steps(document_data)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Smart completion failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Smart completion failed: {str(e)}"
        )

# Helper Functions

def _convert_ai_response(ai_response: AIResponse) -> AIServiceResponse:
    """Convert internal AIResponse to API response format"""
    return AIServiceResponse(
        success=True,
        content=ai_response.content,
        confidence=ai_response.confidence,
        reasoning=ai_response.reasoning,
        suggestions=ai_response.suggestions,
        actions=ai_response.actions,
        legal_implications=ai_response.legal_implications,
        follow_up_questions=ai_response.follow_up_questions or [],
        processing_time=ai_response.processing_time,
        tokens_used=ai_response.tokens_used,
        cost_estimate=ai_response.cost_estimate
    )

def _calculate_completion_percentage(document_data: Dict[str, Any]) -> float:
    """Calculate document completion percentage"""
    # Simple completion calculation based on filled fields
    total_fields = 0
    filled_fields = 0
    
    def count_fields(obj, prefix=""):
        nonlocal total_fields, filled_fields
        
        if isinstance(obj, dict):
            for key, value in obj.items():
                if isinstance(value, (dict, list)):
                    count_fields(value, f"{prefix}.{key}" if prefix else key)
                else:
                    total_fields += 1
                    if value and str(value).strip():
                        filled_fields += 1
        elif isinstance(obj, list):
            for item in obj:
                count_fields(item, prefix)
    
    count_fields(document_data)
    
    if total_fields == 0:
        return 0.0
    
    return (filled_fields / total_fields) * 100

def _get_next_completion_steps(document_data: Dict[str, Any]) -> List[str]:
    """Get next steps for document completion"""
    document_type = document_data.get('documentType', 'unknown')
    
    steps = {
        'grant_deed': [
            'Complete property identification',
            'Verify grantor information',
            'Add grantee details',
            'Calculate transfer tax',
            'Add recording information'
        ],
        'quitclaim_deed': [
            'Verify grantor authority',
            'Complete grantee information',
            'Add property description',
            'Include risk disclosures'
        ],
        'interspousal_transfer': [
            'Confirm marital status',
            'Specify property characterization',
            'Add tax exemption details'
        ]
    }
    
    return steps.get(document_type, ['Complete required fields', 'Review document', 'Validate compliance'])


