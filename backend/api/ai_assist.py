"""
AI Assistant API for dynamic prompt handling
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional
import httpx
from database import get_current_user
from title_point_integration import TitlePointService
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class PromptRequest(BaseModel):
    type: Optional[str] = None  # 'vesting', 'grant_deed', 'tax_roll', 'all'
    prompt: Optional[str] = None  # Custom prompt
    docType: str
    verifiedData: Dict[str, Any] = {}
    currentData: Dict[str, Any] = {}

class PromptResponse(BaseModel):
    success: bool = True
    data: Dict[str, Any] = {}
    error: Optional[str] = None

@router.post("/assist", response_model=PromptResponse)
async def handle_prompt(request: PromptRequest, current_user: dict = Depends(get_current_user)):
    """
    Handle dynamic prompts for data pulling
    """
    try:
        if request.type:
            # Handle button prompts
            return await handle_button_prompt(request, current_user)
        elif request.prompt:
            # Handle custom prompts
            return await handle_custom_prompt(request, current_user)
        else:
            return PromptResponse(success=False, error="No prompt type or custom prompt provided")
            
    except Exception as e:
        logger.error(f"Prompt handling error: {str(e)}")
        return PromptResponse(success=False, error="Internal server error")

async def handle_button_prompt(request: PromptRequest, current_user: dict) -> PromptResponse:
    """Handle predefined button prompts"""
    try:
        title_service = TitlePointService()
        result_data = {}
        
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
        logger.error(f"Button prompt error: {str(e)}")
        return PromptResponse(success=False, error=f"Failed to fetch {request.type} data")

async def handle_custom_prompt(request: PromptRequest, current_user: dict) -> PromptResponse:
    """Handle custom AI prompts"""
    try:
        # Use OpenAI to parse the custom prompt and determine what data to fetch
        prompt_analysis = await analyze_custom_prompt(request.prompt, request.docType)
        
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
        logger.error(f"Custom prompt error: {str(e)}")
        return PromptResponse(success=False, error="Failed to process custom prompt")

async def analyze_custom_prompt(prompt: str, doc_type: str) -> Dict[str, Any]:
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
        logger.error(f"Prompt analysis error: {str(e)}")
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
