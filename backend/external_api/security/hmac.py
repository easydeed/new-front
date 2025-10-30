import hmac, hashlib
from fastapi import HTTPException
from ..deps import get_settings

def verify_webhook_signature(raw_body: bytes, partner: str, signature: str | None):
    if not signature:
        raise HTTPException(status_code=401, detail="Missing signature")
    settings = get_settings()
    secret = settings.SOFTPRO_WEBHOOK_SECRET if partner == "softpro" else settings.QUALIA_WEBHOOK_SECRET
    mac = hmac.new(secret.encode(), msg=raw_body, digestmod=hashlib.sha256).hexdigest()
    if not hmac.compare_digest(mac, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")
    return True
