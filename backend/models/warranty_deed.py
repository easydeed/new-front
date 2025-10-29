
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

    # ✅ PHASE 19 FIX: Remove strict validators to match Grant Deed's approach
    # Grant Deed works because all fields are optional with NO validators
    # The validators were rejecting valid data, causing 500 errors

class WarrantyDeedContext(BaseDeedContext):
    covenants: Optional[str] = Field(None, description='Optional covenant language')

