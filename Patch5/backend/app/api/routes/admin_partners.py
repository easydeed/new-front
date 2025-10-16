from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.api import deps
from app.schemas.partner import PartnerOut
from app.services.partners import admin_list_all

router = APIRouter()

@router.get('', response_model=List[PartnerOut])
def admin_partners(db: Session = Depends(deps.get_db), current_user = Depends(deps.get_current_user)):
  if not getattr(current_user, 'is_superuser', False):
    # re-use your existing admin guard here if different
    raise Exception('Admins only')
  return admin_list_all(db)
