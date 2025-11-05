from typing import Optional, Dict, Any
from pydantic import BaseModel, validator
from .page_setup import PageSetup

class GrantDeedRenderContext(BaseModel):
    requested_by: Optional[str] = None
    title_company: Optional[str] = None
    escrow_no: Optional[str] = None
    title_order_no: Optional[str] = None
    return_to: Optional[Dict[str, Optional[str]]] = None
    apn: Optional[str] = None

    # Phase 24-H: Enhanced DTT fields
    transfer_value: Optional[float] = None  # NEW: Property transfer value for calculation
    dtt: Optional[Dict[str, Any]] = None  # { amount, basis, area_type, city_name, is_exempt, exemption_reason }

    # Phase 24-H: Updated party fields
    grantors_text: Optional[str] = None  # Backend compatibility (maps from grantorName)
    grantees_text: Optional[str] = None  # Backend compatibility (maps from granteeName)
    vesting: Optional[str] = None  # NEW: How title will be held
    county: Optional[str] = None
    legal_description: Optional[str] = None
    execution_date: Optional[str] = None

    exhibit_threshold: int = 600
    recorder_profile: Optional[Dict[str, Any]] = None

    page: PageSetup = PageSetup()

    @validator('dtt', pre=True, always=True)
    def auto_calculate_dtt(cls, v, values):
        """Auto-calculate DTT amount if transfer_value is provided and not exempt"""
        if v is None:
            v = {}
        
        # If exempt, set amount to 0
        if v.get('is_exempt'):
            v['amount'] = '0.00'
            return v
        
        # If transfer_value exists and no amount provided, calculate it
        transfer_val = values.get('transfer_value')
        if transfer_val and not v.get('amount'):
            # California DTT: $1.10 per $1,000
            calculated = round((transfer_val / 1000) * 1.10, 2)
            v['amount'] = f"{calculated:.2f}"
        
        return v