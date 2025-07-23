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