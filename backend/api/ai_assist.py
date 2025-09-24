"""
AI Assistant API for dynamic prompt handling
Phase 3 Enhancements: Multi-document support, timeout handling, orchestration improvements
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import httpx
import asyncio
import time
import os
from auth import get_current_user_id
from title_point_integration import TitlePointService
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Configuration from environment
AI_ASSIST_TIMEOUT = int(os.getenv("AI_ASSIST_TIMEOUT", "15"))
TITLEPOINT_TIMEOUT = int(os.getenv("TITLEPOINT_TIMEOUT", "10"))
MAX_CONCURRENT_REQUESTS = int(os.getenv("MAX_CONCURRENT_REQUESTS", "5"))

# Semaphore to limit concurrent TitlePoint requests
titlepoint_semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)

class PromptRequest(BaseModel):
    type: Optional[str] = None  # 'vesting', 'grant_deed', 'tax_roll', 'all', 'chain_of_title'
    prompt: Optional[str] = None  # Custom prompt
    docType: str
    verifiedData: Dict[str, Any] = {}
    currentData: Dict[str, Any] = {}
    timeout: Optional[int] = None  # Override default timeout

class PromptResponse(BaseModel):
    success: bool = True
    data: Dict[str, Any] = {}
    error: Optional[str] = None
    duration: Optional[float] = None
    cached: bool = False
    request_id: Optional[str] = None

class MultiDocumentRequest(BaseModel):
    """Request for multi-document generation support"""
    documents: List[Dict[str, Any]]  # List of document configurations
    shared_data: Dict[str, Any] = {}  # Data shared across all documents
    user_preferences: Dict[str, Any] = {}

class MultiDocumentResponse(BaseModel):
    success: bool = True
    results: List[Dict[str, Any]] = []
    errors: List[str] = []
    total_duration: Optional[float] = None

@router.post("/assist", response_model=PromptResponse)
async def handle_prompt(request: PromptRequest, user_id: str = Depends(get_current_user_id)):
    """
    Handle dynamic prompts for data pulling with timeout protection and orchestration
    """
    start_time = time.time()
    request_id = f"ai_assist_{user_id}_{int(start_time)}"
    timeout = request.timeout or AI_ASSIST_TIMEOUT
    
    logger.info(f"[{request_id}] AI assist request started: type={request.type}, docType={request.docType}, timeout={timeout}s")
    
    try:
        # Use asyncio.wait_for for timeout protection
        if request.type:
            # Handle button prompts
            result = await asyncio.wait_for(
                handle_button_prompt(request, user_id, request_id),
                timeout=timeout
            )
        elif request.prompt:
            # Handle custom prompts
            result = await asyncio.wait_for(
                handle_custom_prompt(request, user_id, request_id),
                timeout=timeout
            )
        else:
            result = PromptResponse(
                success=False, 
                error="No prompt type or custom prompt provided",
                request_id=request_id
            )
        
        # Add timing and request ID to response
        result.duration = time.time() - start_time
        result.request_id = request_id
        
        logger.info(f"[{request_id}] AI assist completed in {result.duration:.2f}s, success={result.success}")
        return result
            
    except asyncio.TimeoutError:
        duration = time.time() - start_time
        logger.error(f"[{request_id}] AI assist timeout after {duration:.2f}s")
        return PromptResponse(
            success=False, 
            error=f"Request timed out after {timeout} seconds",
            duration=duration,
            request_id=request_id
        )
    except Exception as e:
        duration = time.time() - start_time
        logger.error(f"[{request_id}] AI assist error after {duration:.2f}s: {str(e)}")
        return PromptResponse(
            success=False, 
            error="Internal server error",
            duration=duration,
            request_id=request_id
        )

async def handle_button_prompt(request: PromptRequest, user_id: str, request_id: str) -> PromptResponse:
    """Handle predefined button prompts with timeout protection"""
    try:
        async with titlepoint_semaphore:  # Limit concurrent TitlePoint requests
            title_service = TitlePointService()
            result_data = {}
            
            logger.debug(f"[{request_id}] Processing button prompt: {request.type}")
        
        if request.type == "vesting":
            # Pull vesting information
            vesting_data = await title_service.get_vesting_info(
                address=request.verifiedData.get('address'),
                apn=request.verifiedData.get('apn')
            )
            result_data.update({
                'vesting': vesting_data.get('vesting_description', ''),
                'grantorName': vesting_data.get('current_owner', ''),
                'ownershipType': vesting_data.get('ownership_type', '')
            })
            
        elif request.type == "grant_deed":
            # Pull grant deed history
            grant_data = await title_service.get_grant_history(
                address=request.verifiedData.get('address'),
                apn=request.verifiedData.get('apn')
            )
            result_data.update({
                'grantHistory': grant_data.get('recent_grants', []),
                'lastSalePrice': grant_data.get('last_sale_price', ''),
                'lastSaleDate': grant_data.get('last_sale_date', '')
            })
            
        elif request.type == "tax_roll":
            # Pull tax roll information
            tax_data = await title_service.get_tax_info(
                address=request.verifiedData.get('address'),
                apn=request.verifiedData.get('apn')
            )
            result_data.update({
                'assessedValue': tax_data.get('assessed_value', ''),
                'taxAmount': tax_data.get('annual_tax', ''),
                'taxYear': tax_data.get('tax_year', ''),
                'exemptions': tax_data.get('exemptions', [])
            })
            
        elif request.type == "chain_of_title":
            # Pull chain of title (ownership history)
            chain_data = await title_service.get_chain_of_title(
                address=request.verifiedData.get('address'),
                apn=request.verifiedData.get('apn')
            )
            result_data.update({
                'chainOfTitle': chain_data.get('chain_of_title', []),
                'ownershipDuration': chain_data.get('ownership_duration', []),
                'titleIssues': chain_data.get('title_issues', []),
                'totalTransfers': chain_data.get('total_transfers', 0),
                'currentOwner': chain_data.get('chain_of_title', [{}])[-1].get('grantee', '') if chain_data.get('chain_of_title') else '',
                'lastTransferDate': chain_data.get('chain_of_title', [{}])[-1].get('date', '') if chain_data.get('chain_of_title') else ''
            })
            
        elif request.type == "all":
            # Pull all available data
            all_data = await title_service.get_comprehensive_report(
                address=request.verifiedData.get('address'),
                apn=request.verifiedData.get('apn')
            )
            result_data.update(all_data)
            
        # Check if fast-forward is possible
        result_data['fastForward'] = check_fast_forward(request.docType, result_data)
        
            return PromptResponse(success=True, data=result_data)
        
    except Exception as e:
        logger.error(f"[{request_id}] Button prompt error: {str(e)}")
        return PromptResponse(success=False, error=f"Failed to fetch {request.type} data")

async def handle_custom_prompt(request: PromptRequest, user_id: str, request_id: str) -> PromptResponse:
    """Handle custom AI prompts with enhanced orchestration"""
    try:
        logger.debug(f"[{request_id}] Processing custom prompt: {request.prompt[:100]}...")
        
        # Use OpenAI to parse the custom prompt and determine what data to fetch
        prompt_analysis = await analyze_custom_prompt(request.prompt, request.docType, request_id)
        
        # Based on analysis, fetch appropriate data
        title_service = TitlePointService()
        result_data = {}
        
        if 'vesting' in prompt_analysis['actions']:
            vesting_data = await title_service.get_vesting_info(
                address=request.verifiedData.get('address'),
                apn=request.verifiedData.get('apn')
            )
            result_data.update(vesting_data)
            
        if 'chain_of_title' in prompt_analysis['actions']:
            chain_data = await title_service.get_chain_of_title(
                address=request.verifiedData.get('address'),
                apn=request.verifiedData.get('apn')
            )
            result_data.update({
                'chainOfTitle': chain_data.get('chain_of_title', []),
                'ownershipDuration': chain_data.get('ownership_duration', []),
                'titleIssues': chain_data.get('title_issues', [])
            })
            
        if 'ownership' in prompt_analysis['actions']:
            ownership_data = await title_service.get_ownership_chain(
                address=request.verifiedData.get('address'),
                apn=request.verifiedData.get('apn')
            )
            result_data.update(ownership_data)
            
        if 'liens' in prompt_analysis['actions']:
            lien_data = await title_service.get_lien_info(
                address=request.verifiedData.get('address'),
                apn=request.verifiedData.get('apn')
            )
            result_data.update(lien_data)
            
        # Use AI to format the response appropriately
        formatted_data = await format_ai_response(result_data, request.prompt, request.docType)
        
        return PromptResponse(success=True, data=formatted_data)
        
    except Exception as e:
        logger.error(f"[{request_id}] Custom prompt error: {str(e)}")
        return PromptResponse(success=False, error="Failed to process custom prompt")


@router.post("/multi-document", response_model=MultiDocumentResponse)
async def handle_multi_document_generation(
    request: MultiDocumentRequest, 
    user_id: str = Depends(get_current_user_id)
):
    """
    Handle multi-document generation with shared data orchestration
    Phase 3 Enhancement: Support for generating multiple document types in a single request
    """
    start_time = time.time()
    request_id = f"multi_doc_{user_id}_{int(start_time)}"
    
    logger.info(f"[{request_id}] Multi-document generation started: {len(request.documents)} documents")
    
    try:
        results = []
        errors = []
        
        # Process each document configuration
        for i, doc_config in enumerate(request.documents):
            doc_start = time.time()
            doc_id = f"{request_id}_doc_{i}"
            
            try:
                # Merge shared data with document-specific data
                merged_data = {**request.shared_data, **doc_config.get('data', {})}
                
                # Create a prompt request for this document
                doc_request = PromptRequest(
                    type=doc_config.get('prompt_type'),
                    prompt=doc_config.get('custom_prompt'),
                    docType=doc_config.get('doc_type', 'grant_deed'),
                    verifiedData=merged_data,
                    currentData=doc_config.get('current_data', {}),
                    timeout=doc_config.get('timeout')
                )
                
                # Process the document request
                if doc_request.type:
                    result = await handle_button_prompt(doc_request, user_id, doc_id)
                elif doc_request.prompt:
                    result = await handle_custom_prompt(doc_request, user_id, doc_id)
                else:
                    result = PromptResponse(
                        success=False,
                        error="No prompt type or custom prompt provided for document",
                        request_id=doc_id
                    )
                
                doc_duration = time.time() - doc_start
                
                results.append({
                    'document_index': i,
                    'document_type': doc_config.get('doc_type'),
                    'success': result.success,
                    'data': result.data,
                    'error': result.error,
                    'duration': doc_duration,
                    'request_id': doc_id
                })
                
                if not result.success:
                    errors.append(f"Document {i} ({doc_config.get('doc_type')}): {result.error}")
                
                logger.debug(f"[{doc_id}] Document processed in {doc_duration:.2f}s, success={result.success}")
                
            except Exception as e:
                doc_duration = time.time() - doc_start
                error_msg = f"Document {i} failed: {str(e)}"
                errors.append(error_msg)
                
                results.append({
                    'document_index': i,
                    'document_type': doc_config.get('doc_type'),
                    'success': False,
                    'data': {},
                    'error': str(e),
                    'duration': doc_duration,
                    'request_id': doc_id
                })
                
                logger.error(f"[{doc_id}] Document processing error: {e}")
        
        total_duration = time.time() - start_time
        success_count = sum(1 for r in results if r['success'])
        
        logger.info(f"[{request_id}] Multi-document generation completed in {total_duration:.2f}s: {success_count}/{len(request.documents)} successful")
        
        return MultiDocumentResponse(
            success=len(errors) == 0,
            results=results,
            errors=errors,
            total_duration=total_duration
        )
        
    except Exception as e:
        total_duration = time.time() - start_time
        logger.error(f"[{request_id}] Multi-document generation error after {total_duration:.2f}s: {str(e)}")
        return MultiDocumentResponse(
            success=False,
            results=[],
            errors=[f"Multi-document generation failed: {str(e)}"],
            total_duration=total_duration
        )

async def analyze_custom_prompt(prompt: str, doc_type: str, request_id: str = None) -> Dict[str, Any]:
    """Use AI to analyze what the custom prompt is asking for"""
    try:
        # This would integrate with OpenAI to parse natural language prompts
        # For now, using keyword matching
        actions = []
        
        prompt_lower = prompt.lower()
        
        if any(word in prompt_lower for word in ['vesting', 'title', 'ownership']):
            actions.append('vesting')
        if any(word in prompt_lower for word in ['chain of title', 'ownership history', 'deed history', 'transfer history']):
            actions.append('chain_of_title')
        if any(word in prompt_lower for word in ['owner', 'chain', 'history']):
            actions.append('ownership')
        if any(word in prompt_lower for word in ['lien', 'encumbrance', 'debt']):
            actions.append('liens')
        if any(word in prompt_lower for word in ['tax', 'assessment', 'value']):
            actions.append('tax')
            
        return {
            'actions': actions,
            'confidence': 0.8,
            'interpretation': f"Detected request for: {', '.join(actions)}"
        }
        
    except Exception as e:
        logger.error(f"[{request_id}] Prompt analysis error: {str(e)}")
        return {'actions': [], 'confidence': 0.0, 'interpretation': 'Could not parse prompt'}

async def format_ai_response(data: Dict[str, Any], original_prompt: str, doc_type: str) -> Dict[str, Any]:
    """Format the response data appropriately for the document type"""
    try:
        # Document-specific formatting logic
        if doc_type == 'grant_deed':
            return {
                'grantorName': data.get('current_owner', ''),
                'consideration': data.get('last_sale_price', ''),
                'vesting': data.get('vesting_description', ''),
                'priorDeed': data.get('prior_deed_info', {})
            }
        elif doc_type == 'quit_claim':
            return {
                'grantorName': data.get('current_owner', ''),
                'vesting': data.get('vesting_description', '')
            }
        elif doc_type == 'interspousal_transfer':
            return {
                'spouse': data.get('spouse_name', ''),
                'vesting': data.get('vesting_description', ''),
                'communityProperty': data.get('is_community_property', False)
            }
        else:
            return data
            
    except Exception as e:
        logger.error(f"Response formatting error: {str(e)}")
        return data

def check_fast_forward(doc_type: str, data: Dict[str, Any]) -> bool:
    """Check if we have enough data to fast-forward to review step"""
    try:
        required_fields = {
            'grant_deed': ['grantorName', 'consideration'],
            'quit_claim': ['grantorName'],
            'interspousal_transfer': ['spouse'],
            'warranty_deed': ['grantorName', 'covenants'],
            'tax_deed': ['buyer'],
            'property_profile': []  # No requirements for profiles
        }
        
        if doc_type not in required_fields:
            return False
            
        required = required_fields[doc_type]
        return all(data.get(field) for field in required)
        
    except Exception:
        return False
