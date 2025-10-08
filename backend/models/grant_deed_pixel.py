"""
Grant Deed Pixel-Perfect Context Model
Identical to original GrantDeedRenderContext for API compatibility
"""
from typing import Optional, Dict, Any
from pydantic import BaseModel
from .page_setup import PageSetup


class GrantDeedPixelContext(BaseModel):
    """
    Request context for pixel-perfect Grant Deed PDF generation
    Compatible with existing Grant Deed API
    """
    # Recording information
    requested_by: Optional[str] = None
    title_company: Optional[str] = None
    escrow_no: Optional[str] = None
    title_order_no: Optional[str] = None
    return_to: Optional[Dict[str, Optional[str]]] = None
    apn: Optional[str] = None

    # Document Transfer Tax
    dtt: Optional[Dict[str, Optional[str]]] = None
    
    # Required legal fields
    grantors_text: Optional[str] = None
    grantees_text: Optional[str] = None
    county: Optional[str] = None
    legal_description: Optional[str] = None
    execution_date: Optional[str] = None

    # Configuration
    exhibit_threshold: int = 600  # Characters before moving to Exhibit A
    recorder_profile: Optional[Dict[str, Any]] = None  # County-specific margins
    page: PageSetup = PageSetup()

    class Config:
        json_schema_extra = {
            "example": {
                "requested_by": "John Smith, Escrow Officer",
                "title_company": "First American Title",
                "escrow_no": "ESC-2025-001",
                "title_order_no": "ORD-2025-001",
                "return_to": {
                    "name": "Jane Doe",
                    "company": "XYZ Escrow",
                    "address1": "123 Main St",
                    "city": "Los Angeles",
                    "state": "CA",
                    "zip": "90012"
                },
                "apn": "5123-456-789",
                "dtt": {
                    "amount": "1250.00",
                    "basis": "full_value",
                    "area_type": "city",
                    "city_name": "Los Angeles"
                },
                "grantors_text": "JOHN DOE; JANE DOE",
                "grantees_text": "ALICE SMITH",
                "county": "Los Angeles",
                "legal_description": "LOT 5, BLOCK 2, TRACT NO. 12345...",
                "execution_date": "2025-10-08"
            }
        }

