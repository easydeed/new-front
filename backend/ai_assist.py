from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv

# For OpenAI integration (install with: pip install openai)
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("Warning: OpenAI package not installed. AI assistance will use mock responses.")

load_dotenv()

# Router for AI assistance endpoints
ai_router = APIRouter(prefix="/api/ai", tags=["AI Assistance"])

# Configure OpenAI
if OPENAI_AVAILABLE:
    openai.api_key = os.getenv("OPENAI_API_KEY")

class AIAssistRequest(BaseModel):
    deed_type: str
    field: str
    input: str

class AIAssistResponse(BaseModel):
    suggestion: str
    confidence: Optional[float] = None

# Field-specific prompts for better AI assistance
FIELD_PROMPTS = {
    "property_address": "Format this property address for legal document use. Ensure proper capitalization, abbreviations (St., Ave., etc.), and complete address format with city, state, and ZIP:",
    "legal_description": "Create a properly formatted legal description for this property. Use standard real estate legal terminology and format:",
    "grantee_name": "Format this name(s) for legal document use. Ensure proper capitalization and handle multiple parties correctly:",
    "vesting": "Suggest appropriate vesting language for this ownership type. Use standard California real estate terminology:",
    "grantor_name": "Format this grantor name(s) for legal document use, ensuring proper legal formatting:"
}

DEED_TYPE_CONTEXT = {
    "Quitclaim Deed": "This is a quitclaim deed which transfers whatever interest the grantor has without warranties.",
    "Grant Deed": "This is a grant deed which provides basic warranties that the grantor owns the property and hasn't transferred it previously.",
    "Warranty Deed": "This is a warranty deed which provides full warranties against all title defects.",
    "Trust Transfer Deed": "This is a trust transfer deed for estate planning purposes."
}

@ai_router.post("/assist", response_model=AIAssistResponse)
async def get_ai_assistance(request: AIAssistRequest):
    """
    Get AI assistance for deed form fields
    
    Provides intelligent suggestions for property addresses, legal descriptions,
    party names, and other deed-related fields using OpenAI.
    """
    try:
        if not request.input.strip():
            raise HTTPException(status_code=400, detail="Input cannot be empty")
        
        # Get field-specific prompt
        field_prompt = FIELD_PROMPTS.get(request.field, "Improve and format this text for legal document use:")
        deed_context = DEED_TYPE_CONTEXT.get(request.deed_type, "")
        
        # Construct the full prompt
        full_prompt = f"""
{deed_context}

{field_prompt}

User input: "{request.input}"

Provide a professionally formatted suggestion that would be appropriate for a legal real estate document. Keep it concise and accurate.
"""

        if OPENAI_AVAILABLE and openai.api_key:
            # Use OpenAI for real suggestions
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a legal document assistant specializing in real estate deeds. Provide accurate, professional formatting suggestions."},
                    {"role": "user", "content": full_prompt}
                ],
                max_tokens=200,
                temperature=0.3
            )
            
            suggestion = response.choices[0].message.content.strip()
            confidence = 0.85  # High confidence for OpenAI responses
            
        else:
            # Mock responses for development/demo
            suggestion = get_mock_suggestion(request.field, request.input, request.deed_type)
            confidence = 0.75  # Lower confidence for mock responses
        
        return AIAssistResponse(suggestion=suggestion, confidence=confidence)
        
    except Exception as e:
        # Log the error in production
        print(f"AI assistance error: {str(e)}")
        raise HTTPException(status_code=500, detail="AI assistance temporarily unavailable")

def get_mock_suggestion(field: str, input_text: str, deed_type: str) -> str:
    """
    Provide mock suggestions for development when OpenAI is not available
    """
    if field == "property_address":
        # Format address suggestion
        formatted = input_text.title().replace("  ", " ")
        if "," not in formatted:
            formatted += ", City, CA 90210"
        return f"Suggested format: {formatted}"
    
    elif field == "legal_description":
        if input_text.strip():
            return f"Legal Description: The real property situated in the County of [County], State of California, described as: {input_text}"
        else:
            return "Legal Description: Lot [X], Block [Y], Tract No. [XXXX], per map recorded in Book [X], Page [X] of Maps, in the office of the County Recorder of [County] County, California."
    
    elif field == "grantee_name":
        names = input_text.split(" and ")
        formatted_names = [name.strip().title() for name in names]
        return " AND ".join(formatted_names)
    
    elif field == "vesting":
        if "joint" in input_text.lower():
            return "as joint tenants with right of survivorship"
        elif "community" in input_text.lower():
            return "as community property"
        elif "common" in input_text.lower():
            return "as tenants in common"
        else:
            return "as joint tenants with right of survivorship"
    
    elif field == "grantor_name":
        return input_text.title().replace("  ", " ")
    
    else:
        return f"Formatted: {input_text.strip()}"

def suggest_defaults(user_data, deed_data, recent_properties=None):
    """
    Generate intelligent defaults based on user profile and cached data
    This is the core AI function for the "walking on a cloud" experience
    """
    suggestions = {}
    
    if not user_data:
        return suggestions
    
    profile = user_data.get('profile', {})
    cached_property = user_data.get('cached_property')
    
    # Auto-populate company/business information
    if profile.get('auto_populate_company_info', True):
        if not deed_data.get('recordingRequestedBy') and profile.get('company_name'):
            suggestions['recordingRequestedBy'] = f"{profile['company_name']} - {profile.get('role', 'Escrow Officer').title()}"
        
        if not deed_data.get('mailTo') and profile.get('business_address'):
            suggestions['mailTo'] = profile['business_address']
    
    # Suggest deed type based on user role and preferences
    if not deed_data.get('deedType'):
        if profile.get('role') == 'escrow_officer':
            suggestions['deedType'] = profile.get('preferred_deed_type', 'grant_deed')
        elif profile.get('role') == 'title_officer':
            suggestions['deedType'] = 'grant_deed'  # Most common for title companies
        else:
            suggestions['deedType'] = 'grant_deed'  # Safe default
    
    # Auto-populate geographic defaults
    if not deed_data.get('county') and profile.get('default_county'):
        suggestions['county'] = profile['default_county']
    
    # Use cached property data for similar addresses
    if cached_property and deed_data.get('propertySearch'):
        search_address = deed_data['propertySearch'].lower()
        cached_address = cached_property.get('property_address', '').lower()
        
        # If addresses are similar, suggest cached data
        if search_address in cached_address or cached_address in search_address:
            if not deed_data.get('legalDescription') and cached_property.get('legal_description'):
                suggestions['legalDescription'] = cached_property['legal_description']
            if not deed_data.get('apn') and cached_property.get('apn'):
                suggestions['apn'] = cached_property['apn']
            if not deed_data.get('county') and cached_property.get('county'):
                suggestions['county'] = cached_property['county']
            if not deed_data.get('city') and cached_property.get('city'):
                suggestions['city'] = cached_property['city']
    
    # Smart defaults for notary information
    if profile.get('role') == 'notary' or profile.get('notary_commission_exp'):
        if not deed_data.get('notaryCounty') and profile.get('default_county'):
            suggestions['notaryCounty'] = profile['default_county']
    
    # Generate helpful AI tips based on context
    ai_tips = []
    
    if not deed_data.get('propertySearch'):
        ai_tips.append("💡 Start by searching for the property address - I'll auto-populate other fields!")
    
    if deed_data.get('propertySearch') and not cached_property:
        ai_tips.append("🔍 This looks like a new property - I'll cache the details for next time!")
    
    if profile.get('role') == 'escrow_officer' and not deed_data.get('orderNo'):
        ai_tips.append("📋 Don't forget to add your order number for proper tracking!")
    
    if deed_data.get('salesPrice') and not deed_data.get('documentaryTax'):
        ai_tips.append("💰 I can calculate documentary tax for you - just ask!")
    
    suggestions['ai_tips'] = ai_tips
    
    return suggestions

def validate_deed_data(deed_data, deed_type):
    """
    Provide real-time validation and suggestions for deed data
    Returns validation results and improvement suggestions
    """
    validation = {
        'is_valid': True,
        'warnings': [],
        'suggestions': [],
        'missing_required': []
    }
    
    # Required fields based on deed type
    required_fields = {
        'grant_deed': ['grantorName', 'granteeName', 'propertySearch', 'county'],
        'quitclaim_deed': ['grantorName', 'granteeName', 'propertySearch', 'county'],
        'warranty_deed': ['grantorName', 'granteeName', 'propertySearch', 'county', 'salesPrice'],
        'trust_transfer': ['grantorName', 'granteeName', 'propertySearch', 'county']
    }
    
    # Check required fields
    required = required_fields.get(deed_type, required_fields['grant_deed'])
    for field in required:
        if not deed_data.get(field):
            validation['missing_required'].append(field)
            validation['is_valid'] = False
    
    # Validate specific field formats
    if deed_data.get('salesPrice'):
        try:
            price = float(deed_data['salesPrice'].replace('$', '').replace(',', ''))
            if price <= 0:
                validation['warnings'].append("Sales price should be greater than $0")
        except ValueError:
            validation['warnings'].append("Sales price format is invalid")
    
    if deed_data.get('apn'):
        apn = deed_data['apn'].replace('-', '').replace(' ', '')
        if not apn.isdigit() or len(apn) < 8:
            validation['warnings'].append("APN format may be incorrect (should be 8+ digits)")
    
    # Provide helpful suggestions
    if deed_data.get('grantorName') and deed_data.get('granteeName'):
        if deed_data['grantorName'].lower() == deed_data['granteeName'].lower():
            validation['warnings'].append("Grantor and Grantee appear to be the same - please verify")
    
    if deed_data.get('propertySearch') and not deed_data.get('legalDescription'):
        validation['suggestions'].append("Consider adding a legal description for better document accuracy")
    
    if deed_data.get('vesting') and 'joint tenant' in deed_data['vesting'].lower():
        validation['suggestions'].append("Verify right of survivorship language for joint tenancy")
    
    return validation 