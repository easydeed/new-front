
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.db import get_db  # adapt to your project
from app.core.auth import get_current_user  # adapt to your project
from app.schemas.partner import PartnerOut, PartnerCreate
from app.crud.partner import partner_crud

router = APIRouter()

@router.get('/', response_model=List[PartnerOut])
def list_partners(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return partner_crud.list_for_user(db, user_id=user.id)

@router.post('/', response_model=PartnerOut, status_code=status.HTTP_201_CREATED)
def create_partner(body: PartnerCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    existing = partner_crud.get_by_name(db, user_id=user.id, name=body.name.strip())
    if existing:
        return existing
    return partner_crud.create(db, user_id=user.id, name=body.name.strip())
