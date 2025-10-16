
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Adjust these imports to your project structure:
from . import schemas  # type: ignore
from ..models import Partner, PartnerPerson
from ..deps import get_current_user, CurrentUser

# You need to provide a way to get an AsyncSession, adapt accordingly.
async def get_session() -> AsyncSession:  # pragma: no cover
    from your_project.db import async_session  # <-- replace with your session factory
    async with async_session() as session:
        yield session

router = APIRouter()

@router.get("/selectlist", response_model=List[schemas.PartnerSelectItem])
async def selectlist(session: AsyncSession = Depends(get_session), user: CurrentUser = Depends(get_current_user)):
    org_id = user.organization_id or "default-org"
    q = await session.execute(select(Partner, PartnerPerson).join(PartnerPerson, isouter=True).where(Partner.organization_id == org_id))
    rows = q.all()
    out = []
    for p, person in rows:
        if person:
            label = f"{p.name} — {person.name} ({person.role or 'contact'})"
            out.append(schemas.PartnerSelectItem(display=label, partner_id=p.id, person_id=person.id, category=p.category, role=person.role))
        else:
            out.append(schemas.PartnerSelectItem(display=p.name, partner_id=p.id, category=p.category))
    return out

@router.post("", status_code=201)
async def create(payload: schemas.PartnerCreate, session: AsyncSession = Depends(get_session), user: CurrentUser = Depends(get_current_user)):
    org_id = user.organization_id
    if not org_id:
        raise HTTPException(status_code=400, detail="organization_id required")

    p = Partner(id=str(uuid.uuid4()), organization_id=org_id, name=payload.name.strip(), category=payload.category)
    session.add(p)
    if payload.person and payload.person.name.strip():
        person = PartnerPerson(
            id=str(uuid.uuid4()),
            partner_id=p.id,
            name=payload.person.name.strip(),
            role=payload.person.role,
            email=payload.person.email,
            phone=payload.person.phone
        )
        session.add(person)
    await session.commit()
    return {"id": p.id, "success": True}
