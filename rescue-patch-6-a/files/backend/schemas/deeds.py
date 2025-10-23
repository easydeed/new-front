# backend/schemas/deeds.py
# Pydantic v2 schema with non-empty validation
from typing import Optional
from pydantic import BaseModel, Field

class DeedCreate(BaseModel):
    deed_type: str = Field(..., description="Deed type, e.g., 'grant-deed'")
    property_address: Optional[str] = Field(default=None)
    apn: Optional[str] = Field(default=None)
    county: Optional[str] = Field(default=None)
    grantor_name: str = Field(..., min_length=1)
    grantee_name: str = Field(..., min_length=1)
    legal_description: str = Field(..., min_length=1)
    vesting: Optional[str] = Field(default=None)
    source: Optional[str] = Field(default=None)

    model_config = {
        "extra": "ignore"
    }
