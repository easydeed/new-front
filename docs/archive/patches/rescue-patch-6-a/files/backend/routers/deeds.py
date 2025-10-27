# backend/routers/deeds.py
# FastAPI router patch: typed payload + robust logging
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from .deps import get_db  # adjust import to your project
from ..schemas.deeds import DeedCreate

router = APIRouter()

@router.post("/api/deeds/create")
async def create_deed_endpoint(payload: DeedCreate, request: Request, db: Session = Depends(get_db)):
    # NOTE: Do NOT call await request.json() here — body was already parsed into 'payload'
    # Validate non-empty already enforced by Pydantic
    data = payload.model_dump()

    # Extra defense: strip whitespace
    for k in ("grantor_name", "grantee_name", "legal_description"):
        data[k] = (data.get(k) or "").strip()
        if not data[k]:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                                detail=f"Missing fields: {k}")

    # Create deed via your DB layer
    from ..services.deeds import create_deed  # adjust to your project structure
    try:
        deed = create_deed(db, data)  # expects dict
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Create deed failed: {e}")

    return {"success": True, "id": getattr(deed, 'id', None)}
