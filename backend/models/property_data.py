"""
Structured Property Data Model
Normalized property data from SiteX for consistent frontend hydration.

Phase 1.2 of DeedPro Enhancement Project
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


class PropertyOwner(BaseModel):
    """Structured owner information from SiteX"""
    full_name: str = ""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    mailing_address: Optional[str] = None
    mailing_city: Optional[str] = None
    mailing_state: Optional[str] = None
    mailing_zip: Optional[str] = None
    
    class Config:
        extra = "allow"  # Allow additional fields from SiteX


class PropertyData(BaseModel):
    """
    Normalized property data from SiteX.
    All fields have sensible defaults for partial data scenarios.
    
    This model serves as the contract between SiteX enrichment
    and frontend wizard hydration.
    """
    # Core identifiers
    apn: str = Field(default="", description="Assessor Parcel Number")
    apn_formatted: str = Field(default="", description="APN with formatting dashes")
    fips: str = Field(default="", description="FIPS county code")
    
    # Location
    address: str = Field(default="", description="Full street address")
    street_number: Optional[str] = None
    street_name: Optional[str] = None
    street_suffix: Optional[str] = None
    unit_number: Optional[str] = None
    city: str = ""
    state: str = "CA"
    zip_code: str = ""
    county: str = Field(default="", description="County name (e.g., 'LOS ANGELES')")
    
    # Legal
    legal_description: str = Field(default="", description="Brief legal description")
    legal_description_full: Optional[str] = Field(None, description="Full legal description text")
    subdivision_name: Optional[str] = None
    tract_number: Optional[str] = None
    lot_number: Optional[str] = None
    block_number: Optional[str] = None
    
    # Ownership
    primary_owner: PropertyOwner = Field(default_factory=PropertyOwner)
    secondary_owner: Optional[PropertyOwner] = None
    ownership_type: Optional[str] = Field(None, description="Corporation, Trust, Individual, etc.")
    vesting_type: Optional[str] = Field(None, description="Joint Tenants, Community Property, etc.")
    
    # Property details
    property_type: Optional[str] = Field(None, description="SFR, Condo, Multi-Family, etc.")
    use_code: Optional[str] = None
    use_code_description: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    square_feet: Optional[int] = None
    lot_size_sqft: Optional[int] = None
    lot_size_acres: Optional[float] = None
    year_built: Optional[int] = None
    stories: Optional[int] = None
    
    # Valuation
    assessed_value: Optional[int] = None
    assessed_land_value: Optional[int] = None
    assessed_improvement_value: Optional[int] = None
    market_value: Optional[int] = None
    tax_amount: Optional[float] = None
    
    # Sale history
    last_sale_price: Optional[int] = None
    last_sale_date: Optional[str] = None
    last_sale_doc_number: Optional[str] = None
    
    # Metadata
    enrichment_source: str = Field(default="sitex", description="Data source identifier")
    enrichment_timestamp: datetime = Field(default_factory=datetime.utcnow)
    confidence_score: float = Field(default=1.0, description="Data confidence 0-1")
    raw_response: Optional[dict] = Field(None, description="Original SiteX response for debugging")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }
        extra = "allow"  # Allow additional fields


class PropertyMatch(BaseModel):
    """
    Represents a single property match candidate when multiple properties
    match a search query (multi-match scenario).
    """
    address: str
    city: str = ""
    state: str = "CA"
    zip_code: str = ""
    apn: str = ""
    fips: str = ""
    owner_name: str = ""
    property_type: Optional[str] = None
    
    class Config:
        extra = "allow"


class PropertySearchResult(BaseModel):
    """
    Result from property search operation.
    Handles single match, multi-match, and no-match scenarios.
    """
    status: str = Field(
        description="'success' (single match), 'multi_match', 'not_found', or 'error'"
    )
    data: Optional[PropertyData] = Field(
        None, description="Property data (when status='success')"
    )
    matches: Optional[List[PropertyMatch]] = Field(
        None, description="Match candidates (when status='multi_match')"
    )
    message: str = Field(default="", description="Human-readable status message")
    match_count: int = Field(default=0, description="Number of matches found")
    
    class Config:
        extra = "allow"

