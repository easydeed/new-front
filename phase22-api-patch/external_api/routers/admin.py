from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
import secrets, hashlib

from ..deps import get_db, get_settings
from ..models import ApiKey, ApiUsage

router = APIRouter()

class CreateKeyBody(BaseModel):
    company: str
    user_id: str | None = None
    scopes: list[str] = ["deed:create","deed:read"]
    rate_limit_per_minute: int = 120

@router.post("/admin/api-keys/bootstrap")
def bootstrap_key(
    body: CreateKeyBody,
    db: Session = Depends(get_db),
    x_admin_setup_secret: str = Header(None, alias="X-Admin-Setup-Secret")
):
    settings = get_settings()
    if x_admin_setup_secret != settings.ADMIN_SETUP_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")

    raw = f"{settings.API_KEY_MIN_PREFIX}{secrets.token_urlsafe(32)}"
    prefix = raw[:16]
    digest = hashlib.sha256(raw.encode()).hexdigest()

    ak = ApiKey(
        key_prefix=prefix,
        key_hash=digest,
        company=body.company,
        user_id=body.user_id,
        scopes=body.scopes,
        rate_limit_per_minute=body.rate_limit_per_minute
    )
    db.add(ak); db.commit(); db.refresh(ak)
    return {"api_key": raw, "key_prefix": prefix, "scopes": ak.scopes, "rate_limit_per_minute": ak.rate_limit_per_minute}

@router.get("/admin/api-keys")
def list_keys(db: Session = Depends(get_db), x_admin_setup_secret: str = Header(None, alias="X-Admin-Setup-Secret")):
    settings = get_settings()
    if x_admin_setup_secret != settings.ADMIN_SETUP_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")
    rows = db.query(ApiKey).all()
    return [{"key_prefix": r.key_prefix, "company": r.company, "is_active": r.is_active, "scopes": r.scopes, "rate_limit_per_minute": r.rate_limit_per_minute, "created_at": r.created_at} for r in rows]

@router.delete("/admin/api-keys/{key_prefix}")
def revoke_key(key_prefix: str, db: Session = Depends(get_db), x_admin_setup_secret: str = Header(None, alias="X-Admin-Setup-Secret")):
    settings = get_settings()
    if x_admin_setup_secret != settings.ADMIN_SETUP_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")
    ak = db.query(ApiKey).filter(ApiKey.key_prefix == key_prefix).first()
    if not ak:
        raise HTTPException(status_code=404, detail="Not found")
    ak.is_active = False
    ak.revoked_at = datetime.utcnow()
    db.add(ak); db.commit()
    return {"ok": True}

@router.get("/admin/usage")
def usage(db: Session = Depends(get_db), x_admin_setup_secret: str = Header(None, alias="X-Admin-Setup-Secret")):
    settings = get_settings()
    if x_admin_setup_secret != settings.ADMIN_SETUP_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")
    rows = db.query(ApiUsage).order_by(ApiUsage.id.desc()).limit(500).all()
    return [
        {"prefix": r.api_key_prefix, "endpoint": r.endpoint, "status": r.status_code, "latency_ms": r.latency_ms, "at": r.created_at}
        for r in rows
    ]
