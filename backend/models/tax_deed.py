
from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any
from datetime import date

class BaseDeedContext(BaseModel):
    requested_by: Optional[str] = None
    title_company: Optional[str] = None
    escrow_no: Optional[str] = None
    title_order_no: Optional[str] = None
    return_to: Optional[Dict[str, Optional[str]]] = None

    apn: Optional[str] = None
    county: Optional[str] = None
    legal_description: Optional[str] = None
    property_address: Optional[str] = None

    grantors_text: Optional[str] = None
    grantees_text: Optional[str] = None

    execution_date: Optional[str] = None  # YYYY-MM-DD
    exhibit_threshold: int = 600

    @validator('execution_date', pre=True, always=False)
    def validate_date_format(cls, v):
        if not v:
            return v
        date.fromisoformat(v)  # raises if invalid
        return v

    @validator('county')
    def county_optional_for_pdf(cls, v):
        # ✅ PHASE 19 FIX: Allow empty county for PDF generation
        # County will be extracted from SiteX CountyName field when available
        # If missing, PDF template will show blank (better than 500 error)
        return v or ''  # Return empty string instead of raising error

    @validator('legal_description')
    def legal_required(cls, v):
        if not v or not v.strip():
            raise ValueError("Legal description is required")
        return v

    @validator('grantors_text')
    def grantor_required(cls, v):
        if not v or not v.strip():
            raise ValueError("Grantor information is required")
        return v

class TaxDeedContext(BaseDeedContext):
    tax_sale_ref: Optional[str] = Field(None, description='Tax sale reference')

