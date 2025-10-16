
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core.auth import get_current_user
# from app.schemas.deed import DeedOut  # assume exists in your project
# from app.services.deeds import create_deed_from_canonical  # assume existing service

router = APIRouter()

@router.post('/')
def finalize_modern(payload: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # payload is canonical from modern UI; delegate to your existing service
    # deed = create_deed_from_canonical(db=db, user_id=user.id, payload=payload)
    # if not deed:
    #     raise HTTPException(status_code=400, detail='Unable to create deed')
    # return deed
    return {"status": "ok", "echo": payload}
