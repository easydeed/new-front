import hashlib, hmac
from typing import List, Optional, Tuple
from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from ..deps import get_db, get_settings
from ..models import ApiKey

def hash_key(full_key: str) -> Tuple[str, str]:
    prefix = full_key[:16]
    digest = hashlib.sha256(full_key.encode()).hexdigest()
    return prefix, digest

def verify_key(db: Session, provided_key: str) -> Tuple[ApiKey, str]:
    prefix = provided_key[:16]
    digest = hashlib.sha256(provided_key.encode()).hexdigest()
    ak: Optional[ApiKey] = db.query(ApiKey).filter(ApiKey.key_prefix == prefix, ApiKey.is_active == True).first()
    if not ak or not hmac.compare_digest(ak.key_hash, digest):
        raise HTTPException(status_code=401, detail="Invalid API key")
    return ak, prefix

def require_api_key(x_api_key: str = Header(..., alias="X-API-Key"), db: Session = Depends(get_db)) -> Tuple[ApiKey, str]:
    settings = get_settings()
    if not x_api_key or not x_api_key.startswith(settings.API_KEY_MIN_PREFIX):
        raise HTTPException(status_code=401, detail="Missing or malformed API key")
    return verify_key(db, x_api_key)

def ensure_scopes(required: List[str]):
    def checker(api_key_info = Depends(require_api_key)):
        ak, prefix = api_key_info
        if not set(required).issubset(set(ak.scopes or [])):
            raise HTTPException(status_code=403, detail="Insufficient scopes")
        return ak, prefix
    return checker
