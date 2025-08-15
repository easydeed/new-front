"""
Enhanced deed generation API for dynamic wizard
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional
from database import get_current_user, create_deed
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML
import base64
import tempfile
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class GenerateDeedRequest(BaseModel):
    deedType: str
    propertySearch: str = ""
    apn: str = ""
    county: str = ""
    city: str = ""
    state: str = ""
    zip: str = ""
    legalDescription: str = ""
    grantorName: str = ""
    granteeName: str = ""
    vesting: str = ""
    consideration: str = ""
    spouse: str = ""
    covenants: str = ""
    buyer: str = ""
    # Additional fields from original system
    salesPrice: str = ""
    documentaryTax: str = ""
    recordingRequestedBy: str = ""
    mailTo: str = ""
    orderNo: str = ""
    escrowNo: str = ""
    deedDate: str = ""

class GenerateDeedResponse(BaseModel):
    success: bool = True
    pdf_base64: Optional[str] = None
    deed_id: Optional[str] = None
    error: Optional[str] = None

@router.post("/generate-deed", response_model=GenerateDeedResponse)
async def generate_deed(request: GenerateDeedRequest, current_user: dict = Depends(get_current_user)):
    """
    Generate final deed document based on dynamic wizard data
    """
    try:
        # Map document types to templates
        template_mapping = {
            'grant_deed': 'grant_deed_template.html',
            'quit_claim': 'quitclaim_deed_template.html',
            'interspousal_transfer': 'interspousal_transfer_template.html',
            'warranty_deed': 'warranty_deed_template.html',
            'tax_deed': 'tax_deed_template.html',
            'property_profile': 'property_profile_template.html'
        }
        
        template_file = template_mapping.get(request.deedType)
        if not template_file:
            return GenerateDeedResponse(
                success=False,
                error=f"Template not found for document type: {request.deedType}"
            )
        
        # Prepare template data
        template_data = prepare_template_data(request)
        
        # Validate required fields based on document type
        validation_error = validate_document_data(request.deedType, template_data)
        if validation_error:
            return GenerateDeedResponse(
                success=False,
                error=validation_error
            )
        
        # Generate PDF
        pdf_base64 = await generate_pdf_document(template_file, template_data)
        
        if not pdf_base64:
            return GenerateDeedResponse(
                success=False,
                error="Failed to generate PDF document"
            )
        
        # Save to database
        deed_id = await save_deed_to_database(current_user['user_id'], request, template_data)
        
        return GenerateDeedResponse(
            success=True,
            pdf_base64=pdf_base64,
            deed_id=deed_id
        )
        
    except Exception as e:
        logger.error(f"Deed generation error: {str(e)}")
        return GenerateDeedResponse(
            success=False,
            error="Internal server error during document generation"
        )

def prepare_template_data(request: GenerateDeedRequest) -> Dict[str, Any]:
    """Prepare data for template rendering"""
    
    # Convert request to dictionary
    data = request.dict()
    
    # Add computed fields
    data['formatted_date'] = data.get('deedDate') or 'TBD'
    data['formatted_consideration'] = format_currency(data.get('consideration') or data.get('salesPrice'))
    data['formatted_tax'] = format_currency(data.get('documentaryTax'))
    
    # Handle property description
    if data.get('legalDescription'):
        data['property_description'] = data['legalDescription']
    else:
        data['property_description'] = f"Property located at {data.get('propertySearch', 'TBD')}"
    
    # Handle vesting
    if not data.get('vesting') and data.get('granteeName'):
        data['vesting'] = f"{data['granteeName']} as sole and separate property"
    
    # Document type specific formatting
    if request.deedType == 'interspousal_transfer':
        data['transfer_type'] = 'Interspousal Transfer'
        data['community_property_statement'] = "This transfer is between spouses and qualifies for documentary transfer tax exemption."
    
    return data

def validate_document_data(doc_type: str, data: Dict[str, Any]) -> Optional[str]:
    """Validate required fields for document type"""
    
    required_fields = {
        'grant_deed': ['grantorName', 'granteeName', 'propertySearch'],
        'quit_claim': ['grantorName', 'granteeName', 'propertySearch'],
        'interspousal_transfer': ['grantorName', 'propertySearch'],
        'warranty_deed': ['grantorName', 'granteeName', 'propertySearch'],
        'tax_deed': ['buyer', 'propertySearch'],
        'property_profile': ['propertySearch']
    }
    
    required = required_fields.get(doc_type, [])
    missing = [field for field in required if not data.get(field)]
    
    if missing:
        return f"Missing required fields: {', '.join(missing)}"
    
    return None

async def generate_pdf_document(template_file: str, data: Dict[str, Any]) -> Optional[str]:
    """Generate PDF from template and data"""
    try:
        # Setup Jinja2 environment
        template_dir = os.path.join(os.path.dirname(__file__), '..', 'templates')
        env = Environment(loader=FileSystemLoader(template_dir))
        
        # Load and render template
        template = env.get_template(template_file)
        html_content = template.render(**data)
        
        # Generate PDF
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
            HTML(string=html_content).write_pdf(tmp_file.name)
            
            # Read PDF and encode as base64
            with open(tmp_file.name, 'rb') as pdf_file:
                pdf_content = pdf_file.read()
                pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')
            
            # Clean up temp file
            os.unlink(tmp_file.name)
            
            return pdf_base64
            
    except Exception as e:
        logger.error(f"PDF generation error: {str(e)}")
        return None

async def save_deed_to_database(user_id: str, request: GenerateDeedRequest, template_data: Dict[str, Any]) -> Optional[str]:
    """Save deed record to database"""
    try:
        deed_data = {
            'user_id': user_id,
            'deed_type': request.deedType,
            'property_address': request.propertySearch,
            'grantor': request.grantorName,
            'grantee': request.granteeName or request.spouse or request.buyer,
            'apn': request.apn,
            'county': request.county,
            'status': 'completed',
            'template_data': template_data
        }
        
        deed_id = await create_deed(deed_data)
        return deed_id
        
    except Exception as e:
        logger.error(f"Database save error: {str(e)}")
        return None

def format_currency(value: str) -> str:
    """Format currency values"""
    if not value:
        return "$0.00"
    
    try:
        # Remove any existing formatting
        clean_value = value.replace('$', '').replace(',', '').strip()
        if clean_value.lower() in ['0', 'gift', 'nominal', 'love and affection']:
            return "$0.00"
        
        amount = float(clean_value)
        return f"${amount:,.2f}"
    except (ValueError, TypeError):
        return value
