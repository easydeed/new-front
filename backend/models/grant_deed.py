from typing import Optional, Dict, Any
from pydantic import BaseModel
from .page_setup import PageSetup

class GrantDeedRenderContext(BaseModel):
    requested_by: Optional[str] = None
    title_company: Optional[str] = None
    escrow_no: Optional[str] = None
    title_order_no: Optional[str] = None
    return_to: Optional[Dict[str, Optional[str]]] = None
    apn: Optional[str] = None

    dtt: Optional[Dict[str, Optional[str]]] = None  # { amount, basis, area_type, city_name }

    grantors_text: Optional[str] = None
    grantees_text: Optional[str] = None
    county: Optional[str] = None
    legal_description: Optional[str] = None
    execution_date: Optional[str] = None

    exhibit_threshold: int = 600
    recorder_profile: Optional[Dict[str, Any]] = None

    page: PageSetup = PageSetup()
