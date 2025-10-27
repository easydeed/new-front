
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PartnerBase(BaseModel):
    name: str

class PartnerCreate(PartnerBase):
    pass

class PartnerOut(PartnerBase):
    id: str
    created_at: datetime

    class Config:
        orm_mode = True
