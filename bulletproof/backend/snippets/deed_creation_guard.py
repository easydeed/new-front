# Example FastAPI guard for POST /api/deeds/create
# Drop this function near your create route and call it before writing to DB.
from typing import List

def enforce_modern_payload_guard(payload: dict) -> List[str]:
    missing = []
    if payload.get('source') == 'modern':
        for k in ('grantor_name', 'grantee_name', 'legal_description'):
            if not payload.get(k):
                missing.append(k)
    return missing

# In your route:
# missing = enforce_modern_payload_guard(payload)
# if missing:
#     return JSONResponse({'detail': f"Missing fields: {', '.join(missing)}"}, status_code=422)
