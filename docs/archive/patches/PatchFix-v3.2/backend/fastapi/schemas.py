
from pydantic import BaseModel, Field
from typing import Optional, List, Literal

PartnerCategory = Literal['title_company', 'real_estate', 'lender']
PartnerRole = Literal['title_officer', 'realtor', 'loan_officer']

class PartnerCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    category: PartnerCategory
    person: Optional['PartnerPersonCreate'] = None

class PartnerPersonCreate(BaseModel):
    name: str
    role: Optional[PartnerRole] = None
    email: Optional[str] = None
    phone: Optional[str] = None

PartnerCreate.update_forward_refs()

class PartnerSelectItem(BaseModel):
    display: str
    partner_id: str
    person_id: Optional[str] = None
    category: PartnerCategory
    role: Optional[PartnerRole] = None
