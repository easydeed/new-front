"""Owner-approved creation holds; the frontend reads the same JSON.

Do not use this gate to hide stored records or rewrite historical artifacts.
"""
import json
from pathlib import Path

from fastapi import HTTPException

POLICY = json.loads(Path(__file__).with_suffix(".json").read_text(encoding="utf-8"))


def hold_for(deed_type):
    slug = str(getattr(deed_type, "value", deed_type) or "").strip().lower().replace("_", "-")
    for canonical, hold in POLICY["held"].items():
        if slug == canonical or slug in hold["aliases"]:
            return hold
    return None


def can_generate(deed_type):
    return hold_for(deed_type) is None


def require_generation_available(deed_type):
    hold = hold_for(deed_type)
    if hold:
        raise HTTPException(status_code=409, detail={
            "code": "INSTRUMENT_UNAVAILABLE", "message": hold["reason"],
            "details": [{"field": "body.deed_type", "message": hold["reason"]}],
        })
