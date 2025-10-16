from typing import Optional
from pydantic import BaseModel, EmailStr
from uuid import UUID

class PartnerBase(BaseModel):
  category: Optional[str] = 'other'
  role: Optional[str] = 'other'
  company_name: str
  contact_name: Optional[str] = None
  email: Optional[EmailStr] = None
  phone: Optional[str] = None
  address_line1: Optional[str] = None
  address_line2: Optional[str] = None
  city: Optional[str] = None
  state: Optional[str] = None
  postal_code: Optional[str] = None
  notes: Optional[str] = None
  is_active: Optional[bool] = True

class PartnerCreate(PartnerBase):
  pass

class PartnerUpdate(PartnerBase):
  pass

class PartnerOut(PartnerBase):
  id: UUID
  organization_id: str
  created_by_user_id: str
  class Config:
    orm_mode = True
