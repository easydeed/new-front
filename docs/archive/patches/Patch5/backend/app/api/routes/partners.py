from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.api import deps  # your existing dependencies
from app.schemas.partner import PartnerCreate, PartnerUpdate, PartnerOut
from app.services.partners import list_partners, create_partner, update_partner, delete_partner

router = APIRouter()

@router.get('', response_model=List[PartnerOut])
def list_my_partners(db: Session = Depends(deps.get_db), current_user = Depends(deps.get_current_user)):
  org_id = getattr(current_user, 'organization_id', None)
  if not org_id:
    raise HTTPException(status_code=400, detail='No organization assigned to user')
  return list_partners(db, org_id)

@router.post('', response_model=PartnerOut)
def create_my_partner(payload: PartnerCreate, db: Session = Depends(deps.get_db), current_user = Depends(deps.get_current_user)):
  org_id = getattr(current_user, 'organization_id', None)
  if not org_id:
    raise HTTPException(status_code=400, detail='No organization assigned to user')
  return create_partner(db, org_id, str(getattr(current_user, 'id', '')), payload)

@router.put('/{partner_id}', response_model=PartnerOut)
def update_my_partner(partner_id: str, payload: PartnerUpdate, db: Session = Depends(deps.get_db), current_user = Depends(deps.get_current_user)):
  org_id = getattr(current_user, 'organization_id', None)
  if not org_id:
    raise HTTPException(status_code=400, detail='No organization assigned to user')
  p = update_partner(db, org_id, partner_id, payload)
  if not p:
    raise HTTPException(status_code=404, detail='Partner not found')
  return p

@router.delete('/{partner_id}')
def delete_my_partner(partner_id: str, db: Session = Depends(deps.get_db), current_user = Depends(deps.get_current_user)):
  org_id = getattr(current_user, 'organization_id', None)
  if not org_id:
    raise HTTPException(status_code=400, detail='No organization assigned to user')
  ok = delete_partner(db, org_id, partner_id)
  if not ok:
    raise HTTPException(status_code=404, detail='Partner not found')
  return {'success': True}
