# backend/services/deeds.py
# Database helper made defensive: accepts Pydantic model or dict; rejects blanks.
from typing import Any, Dict

def _ensure_dict(obj: Any) -> Dict[str, Any]:
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    if isinstance(obj, dict):
        return obj
    raise TypeError("Unsupported deed payload type")

def create_deed(db, deed_data):
    data = _ensure_dict(deed_data)

    # Defensive guard
    for k in ("grantor_name", "grantee_name", "legal_description"):
        v = (data.get(k) or "").strip()
        if not v:
            raise ValueError(f"Missing required field: {k}")

    # Example SQLAlchemy pattern, adapt to your models
    from ..models import Deed  # adjust to your project
    deed = Deed(
        deed_type=data.get("deed_type"),
        property_address=data.get("property_address"),
        apn=data.get("apn"),
        county=data.get("county"),
        grantor_name=data.get("grantor_name"),
        grantee_name=data.get("grantee_name"),
        legal_description=data.get("legal_description"),
        vesting=data.get("vesting"),
        source=data.get("source"),
    )
    db.add(deed)
    db.commit()
    db.refresh(deed)
    return deed
