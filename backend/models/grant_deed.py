from typing import Optional, Dict, Any
from pydantic import BaseModel

class PageMargins(BaseModel):
    top: str = "1in"
    right: str = "1in"
    bottom: str = "1in"
    left: str = "1in"

class PageSetup(BaseModel):
    size: str = "Letter"   # "Letter" | custom "8.5in 11in"
    margins: PageMargins = PageMargins()

class GrantDeedRenderContext(BaseModel):
    # --- fields from Steps 2–4 (same names used in your Jinja) ---
    requested_by: Optional[str] = None
    title_company: Optional[str] = None
    escrow_no: Optional[str] = None
    title_order_no: Optional[str] = None
    return_to: Optional[Dict[str, Optional[str]]] = None  # name, company, address1, address2, city, state, zip
    apn: Optional[str] = None

    dtt: Optional[Dict[str, Optional[str]]] = None  # { amount, basis, area_type, city_name }

    grantors_text: Optional[str] = None
    grantees_text: Optional[str] = None
    county: Optional[str] = None
    legal_description: Optional[str] = None
    execution_date: Optional[str] = None

    # exhibit threshold and recorder profile are optional
    exhibit_threshold: int = 600
    recorder_profile: Optional[Dict[str, Any]] = None

    # --- NEW: page setup, for pixel-perfect rendering ---
    page: PageSetup = PageSetup()
