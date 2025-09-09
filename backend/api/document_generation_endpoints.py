"""
Enhanced API Endpoints for Document Generation
Provides RESTful API endpoints for universal document generation with intelligent validation
Following the WIZARD_ARCHITECTURE_OVERHAUL_PLAN Phase 3.2 specifications
"""
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import io
import json

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, UploadFile, File
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field

from services.document_generation_service import (
    DocumentGenerationService, 
    ValidationError, 
    GenerationResult
)
from lib.auth import get_current_user
from lib.performance_monitor import performance_monitor, track_performance
from lib.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/generate", tags=["Document Generation"])

# Request/Response Models
class DocumentGenerationRequest(BaseModel):
    """Request model for document generation"""
    document_type: str = Field(..., description="Type of document to generate")
    data: Dict[str, Any] = Field(..., description="Document data from wizard")
    options: Optional[Dict[str, Any]] = Field(default={}, description="Generation options")
    metadata: Optional[Dict[str, Any]] = Field(default={}, description="Additional metadata")

class ValidationRequest(BaseModel):
    """Request model for document validation"""
    document_type: str = Field(..., description="Type of document to validate")
    data: Dict[str, Any] = Field(..., description="Document data to validate")
    validation_level: str = Field(default="comprehensive", description="Level of validation")

class BatchGenerationRequest(BaseModel):
    """Request model for batch document generation"""
    documents: List[DocumentGenerationRequest] = Field(..., description="List of documents to generate", max_items=10)
    batch_options: Optional[Dict[str, Any]] = Field(default={}, description="Batch processing options")

class DocumentGenerationResponse(BaseModel):
    """Response model for document generation"""
    success: bool
    filename: str
    metadata: Dict[str, Any]
    warnings: List[str]
    generation_time: float
    download_url: Optional[str] = None

class ValidationResponse(BaseModel):
    """Response model for document validation"""
    valid: bool
    errors: List[str] = []
    field_errors: Dict[str, str] = {}
    warnings: List[str] = []
    validation_timestamp: str
    suggestions: List[Dict[str, Any]] = []

class SupportedDocumentsResponse(BaseModel):
    """Response model for supported documents"""
    supported_documents: List[str]
    configurations: Dict[str, Any]
    total_count: int

class BatchGenerationResponse(BaseModel):
    """Response model for batch generation"""
    success: bool
    total_documents: int
    successful_generations: int
    failed_generations: int
    results: List[Dict[str, Any]]
    errors: List[Dict[str, Any]]
    batch_id: str

# Document Generation Endpoints

@router.post("/{document_type}", response_model=DocumentGenerationResponse)
@track_performance("api_document_generation")
async def generate_document(
    document_type: str,
    request: DocumentGenerationRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Universal document generation endpoint
    
    Supports all document types with intelligent validation and generation
    """
    try:
        logger.info(f"Generating {document_type} document for user {current_user.get('id')}")
        
        # Validate document type
        if document_type != request.document_type:
            raise HTTPException(
                status_code=400, 
                detail="Document type in URL must match document type in request body"
            )
        
        # Add user context to data
        enhanced_data = {
            **request.data,
            'generated_by': current_user.get('id'),
            'generation_timestamp': datetime.now().isoformat(),
            'generation_options': request.options
        }
        
        # Generate document
        result = await DocumentGenerationService.generate_document(document_type, enhanced_data)
        
        # Create streaming response for PDF
        pdf_stream = io.BytesIO(result.pdf_bytes)
        
        # Log successful generation
        logger.info(
            f"Successfully generated {document_type} for user {current_user.get('id')}: "
            f"{len(result.pdf_bytes)} bytes in {result.generation_time:.2f}s"
        )
        
        return StreamingResponse(
            pdf_stream,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{result.filename}"',
                "X-Generation-Time": str(result.generation_time),
                "X-Document-Type": document_type,
                "X-PDF-Size": str(len(result.pdf_bytes)),
                "X-Warnings": json.dumps(result.warnings) if result.warnings else "[]"
            }
        )
        
    except ValidationError as e:
        logger.warning(f"Validation error for {document_type}: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Validation error: {str(e)}")
    except ValueError as e:
        logger.warning(f"Invalid document type: {document_type}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Document generation failed for {document_type}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Document generation failed: {str(e)}")

@router.post("/preview/{document_type}")
@track_performance("api_document_preview")
async def generate_document_preview(
    document_type: str,
    request: DocumentGenerationRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate document preview (HTML) without PDF conversion
    Useful for real-time preview in the wizard
    """
    try:
        logger.info(f"Generating preview for {document_type} document")
        
        # Validate document type
        supported_docs = DocumentGenerationService.get_supported_documents()
        if document_type not in supported_docs:
            raise HTTPException(status_code=400, detail=f"Unsupported document type: {document_type}")
        
        # Get generator and validate data
        generator = DocumentGenerationService.GENERATORS[document_type]()
        validated_data = generator.validate_data(request.data)
        
        # Generate context and render template
        context = generator.generate_context(validated_data)
        context = generator.post_process_context(context)
        
        # Load template
        template = DocumentGenerationService._load_template(generator.get_template_path())
        html_content = template.render(**context)
        
        # Get CSS for styling
        css_overrides = generator.get_css_overrides()
        
        # Validate content
        warnings = generator.validate_generated_content(html_content)
        
        return {
            "success": True,
            "html_content": html_content,
            "css_overrides": css_overrides,
            "warnings": warnings,
            "context_keys": list(context.keys()),
            "template_path": generator.get_template_path()
        }
        
    except ValidationError as e:
        logger.warning(f"Preview validation error for {document_type}: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Validation error: {str(e)}")
    except Exception as e:
        logger.error(f"Preview generation failed for {document_type}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Preview generation failed: {str(e)}")

@router.get("/supported-documents", response_model=SupportedDocumentsResponse)
async def get_supported_documents():
    """Get list of supported document types with their configurations"""
    try:
        supported = DocumentGenerationService.get_supported_documents()
        
        # Get additional configuration from legal knowledge base
        from data.legal_knowledge import legal_knowledge_base
        
        configurations = {}
        for doc_type in supported.keys():
            requirements = legal_knowledge_base.get_document_requirements(doc_type)
            configurations[doc_type] = {
                **supported[doc_type],
                "requirements": requirements,
                "legal_codes": [
                    code.section for code in legal_knowledge_base.get_applicable_codes(doc_type)
                ]
            }
        
        return SupportedDocumentsResponse(
            supported_documents=list(supported.keys()),
            configurations=configurations,
            total_count=len(supported)
        )
        
    except Exception as e:
        logger.error(f"Failed to get supported documents: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get supported documents: {str(e)}")

@router.post("/validate/{document_type}", response_model=ValidationResponse)
@track_performance("api_document_validation")
async def validate_document_data(
    document_type: str,
    request: ValidationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Validate document data without generating PDF"""
    try:
        logger.info(f"Validating {document_type} data for user {current_user.get('id')}")
        
        # Validate document type
        if document_type != request.document_type:
            raise HTTPException(
                status_code=400, 
                detail="Document type in URL must match document type in request body"
            )
        
        # Perform validation
        validation_result = DocumentGenerationService.validate_document_data(document_type, request.data)
        
        # Get AI suggestions for improvements if validation failed
        suggestions = []
        if not validation_result["valid"]:
            suggestions = await _get_validation_suggestions(document_type, request.data, validation_result)
        
        return ValidationResponse(
            valid=validation_result["valid"],
            errors=validation_result.get("errors", []),
            field_errors=validation_result.get("field_errors", {}),
            warnings=validation_result.get("warnings", []),
            validation_timestamp=validation_result["validation_timestamp"],
            suggestions=suggestions
        )
        
    except ValueError as e:
        logger.warning(f"Invalid document type for validation: {document_type}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Validation failed for {document_type}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")

@router.post("/batch", response_model=BatchGenerationResponse)
@track_performance("api_batch_generation")
async def batch_generate_documents(
    request: BatchGenerationRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Batch generate multiple documents
    Processes documents in parallel for efficiency
    """
    try:
        logger.info(f"Batch generating {len(request.documents)} documents for user {current_user.get('id')}")
        
        if len(request.documents) > 10:
            raise HTTPException(
                status_code=400,
                detail="Maximum 10 documents allowed per batch request"
            )
        
        batch_id = f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{current_user.get('id', 'unknown')}"
        
        # Process documents
        results = []
        errors = []
        successful_count = 0
        
        for i, doc_request in enumerate(request.documents):
            try:
                # Add batch context
                enhanced_data = {
                    **doc_request.data,
                    'batch_id': batch_id,
                    'batch_index': i,
                    'generated_by': current_user.get('id')
                }
                
                # Generate document
                result = await DocumentGenerationService.generate_document(
                    doc_request.document_type, 
                    enhanced_data
                )
                
                results.append({
                    "document_index": i,
                    "document_type": doc_request.document_type,
                    "success": True,
                    "filename": result.filename,
                    "pdf_size": len(result.pdf_bytes),
                    "generation_time": result.generation_time,
                    "warnings": result.warnings
                })
                
                successful_count += 1
                
            except Exception as e:
                error_info = {
                    "document_index": i,
                    "document_type": doc_request.document_type,
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                }
                errors.append(error_info)
                logger.error(f"Batch generation failed for document {i}: {str(e)}")
        
        return BatchGenerationResponse(
            success=len(errors) == 0,
            total_documents=len(request.documents),
            successful_generations=successful_count,
            failed_generations=len(errors),
            results=results,
            errors=errors,
            batch_id=batch_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Batch generation failed: {str(e)}")

# Advanced Generation Endpoints

@router.post("/compare/{document_type}")
@track_performance("api_document_comparison")
async def compare_document_versions(
    document_type: str,
    version_a: Dict[str, Any],
    version_b: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """
    Compare two versions of the same document type
    Highlights differences and provides recommendations
    """
    try:
        logger.info(f"Comparing {document_type} document versions")
        
        # Validate both versions
        validation_a = DocumentGenerationService.validate_document_data(document_type, version_a)
        validation_b = DocumentGenerationService.validate_document_data(document_type, version_b)
        
        # Generate contexts for comparison
        generator = DocumentGenerationService.GENERATORS[document_type]()
        
        if validation_a["valid"]:
            context_a = generator.generate_context(validation_a["validated_data"])
        else:
            context_a = {}
        
        if validation_b["valid"]:
            context_b = generator.generate_context(validation_b["validated_data"])
        else:
            context_b = {}
        
        # Compare contexts
        differences = _compare_contexts(context_a, context_b)
        
        # Use AI service for legal impact analysis
        from services.openai_service import openai_service
        
        ai_analysis = await openai_service.compare_documents([
            {"type": document_type, "data": version_a, "context": context_a},
            {"type": document_type, "data": version_b, "context": context_b}
        ])
        
        return {
            "success": True,
            "document_type": document_type,
            "version_a_valid": validation_a["valid"],
            "version_b_valid": validation_b["valid"],
            "differences": differences,
            "ai_analysis": {
                "legal_implications": ai_analysis.legal_implications,
                "recommendations": ai_analysis.suggestions,
                "confidence": ai_analysis.confidence
            },
            "comparison_timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Document comparison failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Document comparison failed: {str(e)}")

@router.post("/smart-complete/{document_type}")
@track_performance("api_smart_completion")
async def smart_complete_document(
    document_type: str,
    partial_data: Dict[str, Any],
    completion_level: str = "partial",
    current_user: dict = Depends(get_current_user)
):
    """
    Intelligently complete partially filled documents
    Uses AI to suggest missing fields and validate existing data
    """
    try:
        logger.info(f"Smart completing {document_type} document")
        
        # Use AI service for smart completion
        from services.openai_service import openai_service
        
        # Analyze document for completion opportunities
        analysis = await openai_service.analyze_document_intelligence(
            document_data={
                "documentType": document_type,
                "partialData": partial_data,
                "completionLevel": completion_level
            }
        )
        
        # Get field suggestions for missing/incomplete fields
        suggestions = []
        missing_fields = analysis.suggestions
        
        for suggestion in missing_fields[:5]:  # Limit to 5 suggestions
            if suggestion.get('type') == 'missing_field':
                field_suggestion = await openai_service.suggest_field_values(
                    field_name=suggestion['field'],
                    context={"documentData": partial_data, "documentType": document_type},
                    document_type=document_type
                )
                suggestions.append({
                    "field": suggestion['field'],
                    "suggestions": field_suggestion.suggestions,
                    "confidence": field_suggestion.confidence,
                    "reasoning": field_suggestion.reasoning
                })
        
        # Calculate completion percentage
        completion_percentage = _calculate_completion_percentage(document_type, partial_data)
        
        # Get next recommended steps
        next_steps = _get_completion_steps(document_type, partial_data, analysis)
        
        return {
            "success": True,
            "document_type": document_type,
            "completion_percentage": completion_percentage,
            "analysis": {
                "content": analysis.content,
                "confidence": analysis.confidence,
                "suggestions": analysis.suggestions
            },
            "field_suggestions": suggestions,
            "next_steps": next_steps,
            "completion_timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Smart completion failed for {document_type}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Smart completion failed: {str(e)}")

# Service Management Endpoints

@router.get("/health")
async def health_check():
    """Check document generation service health"""
    try:
        # Test basic functionality
        supported = DocumentGenerationService.get_supported_documents()
        
        # Test template loading
        test_generator = DocumentGenerationService.GENERATORS['grant_deed']()
        template_path = test_generator.get_template_path()
        
        # Check if template directory exists
        import os
        template_root = os.path.join(os.path.dirname(__file__), "..", "templates")
        template_exists = os.path.exists(os.path.join(template_root, template_path))
        
        return {
            "status": "healthy",
            "supported_documents": len(supported),
            "template_directory_exists": os.path.exists(template_root),
            "sample_template_exists": template_exists,
            "generators_loaded": len(DocumentGenerationService.GENERATORS),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@router.get("/metrics")
async def get_generation_metrics(
    current_user: dict = Depends(get_current_user)
):
    """Get document generation metrics (admin only)"""
    try:
        if current_user.get('role') != 'admin':
            raise HTTPException(
                status_code=403,
                detail="Admin privileges required to view generation metrics"
            )
        
        # Get performance metrics
        metrics = performance_monitor.get_performance_summary("document_generation")
        
        return {
            "success": True,
            "metrics": metrics,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get generation metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get metrics: {str(e)}")

# Helper Functions

async def _get_validation_suggestions(
    document_type: str, 
    data: Dict[str, Any], 
    validation_result: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """Get AI-powered suggestions for validation errors"""
    try:
        from services.openai_service import openai_service
        
        # Create context for AI suggestions
        context = {
            "documentType": document_type,
            "validationErrors": validation_result.get("errors", []),
            "fieldErrors": validation_result.get("field_errors", {}),
            "partialData": data
        }
        
        # Get AI suggestions
        ai_response = await openai_service.process_natural_language_prompt(
            user_input="Provide suggestions to fix the validation errors in this document",
            context=context,
            document_type=document_type
        )
        
        return ai_response.suggestions
        
    except Exception as e:
        logger.warning(f"Failed to get AI validation suggestions: {str(e)}")
        return []

def _compare_contexts(context_a: Dict[str, Any], context_b: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Compare two document contexts and identify differences"""
    differences = []
    
    # Get all keys from both contexts
    all_keys = set(context_a.keys()) | set(context_b.keys())
    
    for key in all_keys:
        value_a = context_a.get(key)
        value_b = context_b.get(key)
        
        if value_a != value_b:
            differences.append({
                "field": key,
                "version_a": str(value_a) if value_a is not None else None,
                "version_b": str(value_b) if value_b is not None else None,
                "difference_type": _classify_difference(value_a, value_b)
            })
    
    return differences

def _classify_difference(value_a: Any, value_b: Any) -> str:
    """Classify the type of difference between two values"""
    if value_a is None and value_b is not None:
        return "added"
    elif value_a is not None and value_b is None:
        return "removed"
    elif value_a != value_b:
        return "modified"
    else:
        return "unchanged"

def _calculate_completion_percentage(document_type: str, data: Dict[str, Any]) -> float:
    """Calculate document completion percentage"""
    from data.legal_knowledge import legal_knowledge_base
    
    requirements = legal_knowledge_base.get_document_requirements(document_type)
    required_fields = requirements.get("required_fields", [])
    
    if not required_fields:
        return 0.0
    
    # Count filled required fields
    filled_count = 0
    for field in required_fields:
        # Handle nested field paths
        value = data
        for part in field.split('.'):
            if isinstance(value, dict) and part in value:
                value = value[part]
            else:
                value = None
                break
        
        if value and str(value).strip():
            filled_count += 1
    
    return (filled_count / len(required_fields)) * 100

def _get_completion_steps(
    document_type: str, 
    data: Dict[str, Any], 
    analysis: Any
) -> List[str]:
    """Get next steps for document completion"""
    steps = []
    
    # Add steps based on document type
    if document_type == 'grant_deed':
        if not data.get('grantors_text'):
            steps.append("Complete grantor information")
        if not data.get('grantees_text'):
            steps.append("Add grantee details with vesting")
        if not data.get('legal_description'):
            steps.append("Add complete legal description")
        if not data.get('dtt_amount'):
            steps.append("Calculate documentary transfer tax")
    
    elif document_type == 'quitclaim_deed':
        if not data.get('grantors_text'):
            steps.append("Complete grantor information")
        if not data.get('grantees_text'):
            steps.append("Add grantee details")
        if not data.get('risk_acknowledgment'):
            steps.append("Add risk acknowledgment")
    
    # Add AI-suggested steps
    if hasattr(analysis, 'actions'):
        for action in analysis.actions[:3]:  # Limit to 3 AI suggestions
            if action.get('type') == 'completion_step':
                steps.append(action.get('description', ''))
    
    return steps[:5]  # Limit to 5 steps total


