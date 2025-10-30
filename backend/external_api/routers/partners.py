from fastapi import APIRouter, Depends, HTTPException, Request, Response, Header
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy.orm import Session
import time, uuid

from ..deps import get_db, get_logger
from ..models import ExternalDeed, ApiUsage
from ..security.apikey import ensure_scopes
from ..security.hmac import verify_webhook_signature
from ..rate_limit import limiter

from ..services.deed_generation import generate_and_store_pdf

logger = get_logger()
router = APIRouter()

class OrderPayload(BaseModel):
    order_id: str = Field(..., description="Partner order id")
    property_address: Optional[str] = None
    parties: Optional[dict] = None
    data: Optional[dict] = None

@router.post("/v1/deeds/{deed_type}", response_model=dict)
async def create_deed(
    deed_type: str,
    payload: OrderPayload,
    db: Session = Depends(get_db),
    auth=Depends(ensure_scopes(["deed:create"])),
    request: Request = None,
    response: Response = None
):
    ak, prefix = auth
    allowed, remaining, reset = limiter.allow(prefix, ak.rate_limit_per_minute)
    response.headers["X-RateLimit-Limit"] = str(ak.rate_limit_per_minute)
    response.headers["X-RateLimit-Remaining"] = str(remaining)
    response.headers["X-RateLimit-Reset"] = str(reset)
    if not allowed:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    t0 = time.time()
    status = 500
    try:
        ext = await generate_and_store_pdf(db, partner=ak.company, deed_type=deed_type, order_data=payload.model_dump())
        status = 200
        return {"external_deed_id": str(ext.id), "pdf_url": ext.pdf_url, "status": ext.status}
    finally:
        usage = ApiUsage(
            api_key_prefix=prefix,
            endpoint=f"/v1/deeds/{deed_type}",
            status_code=status,
            request_id=str(uuid.uuid4()),
            latency_ms=int((time.time()-t0)*1000),
            cost_units=1
        )
        db.add(usage); db.commit()

@router.get("/v1/deeds/{external_deed_id}", response_model=dict)
async def get_deed(
    external_deed_id: str,
    db: Session = Depends(get_db),
    auth=Depends(ensure_scopes(["deed:read"]))
):
    import uuid as _uuid
    ext = db.get(ExternalDeed, _uuid.UUID(external_deed_id))
    if not ext:
        raise HTTPException(status_code=404, detail="Not found")
    return {
        "external_deed_id": str(ext.id),
        "partner": ext.partner,
        "order_id": ext.order_id,
        "deed_type": ext.deed_type,
        "property_address": ext.property_address,
        "pdf_url": ext.pdf_url,
        "status": ext.status,
        "created_at": ext.created_at.isoformat()
    }

# ============================================================================
# PHASE 22.1 FIX #1: WEBHOOK ENDPOINTS WITH SIGNATURE VALIDATION
# ============================================================================

class WebhookPayload(BaseModel):
    """Generic webhook payload for SoftPro/Qualia"""
    order_id: str = Field(..., description="Partner order id")
    deed_type: str = Field(default="grant", description="Type of deed: grant, quitclaim, etc.")
    property_address: Optional[str] = None
    parties: Optional[dict] = None
    metadata: Optional[dict] = None

@router.post("/v1/webhooks/softpro", response_model=dict)
async def softpro_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_signature: str = Header(None, alias="X-SoftPro-Signature")
):
    """
    SoftPro 360 webhook endpoint with HMAC-SHA256 signature validation
    
    SoftPro should send:
    - X-SoftPro-Signature: HMAC-SHA256 hex digest of raw body
    - Secret configured in SOFTPRO_WEBHOOK_SECRET env var
    """
    t0 = time.time()
    status = 500
    
    try:
        # ✅ PHASE 22.1 FIX #1: Validate webhook signature BEFORE processing
        raw_body = await request.body()
        verify_webhook_signature(raw_body, "softpro", x_signature)
        
        # Parse payload after signature validation
        import json
        payload_dict = json.loads(raw_body.decode('utf-8'))
        payload = WebhookPayload(**payload_dict)
        
        # Generate deed PDF
        ext = await generate_and_store_pdf(
            db, 
            partner="SoftPro 360",
            deed_type=payload.deed_type, 
            order_data=payload.model_dump()
        )
        
        status = 200
        logger.info(f"[SoftPro Webhook] ✅ order_id={payload.order_id} deed_id={ext.id}")
        
        return {
            "success": True,
            "external_deed_id": str(ext.id),
            "pdf_url": ext.pdf_url,
            "status": ext.status,
            "order_id": payload.order_id
        }
        
    except HTTPException:
        raise  # Re-raise auth errors
    except Exception as e:
        status = 500
        logger.error(f"[SoftPro Webhook] ❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Webhook processing failed: {str(e)}")
    finally:
        # Track webhook usage (no API key, use 'webhook' prefix)
        usage = ApiUsage(
            api_key_prefix="webhook_softpro",
            endpoint="/v1/webhooks/softpro",
            status_code=status,
            request_id=str(uuid.uuid4()),
            latency_ms=int((time.time()-t0)*1000),
            cost_units=1
        )
        db.add(usage); db.commit()

@router.post("/v1/webhooks/qualia", response_model=dict)
async def qualia_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_signature: str = Header(None, alias="X-Qualia-Signature")
):
    """
    Qualia webhook endpoint with HMAC-SHA256 signature validation
    
    Qualia should send:
    - X-Qualia-Signature: HMAC-SHA256 hex digest of raw body
    - Secret configured in QUALIA_WEBHOOK_SECRET env var
    """
    t0 = time.time()
    status = 500
    
    try:
        # ✅ PHASE 22.1 FIX #1: Validate webhook signature BEFORE processing
        raw_body = await request.body()
        verify_webhook_signature(raw_body, "qualia", x_signature)
        
        # Parse payload after signature validation
        import json
        payload_dict = json.loads(raw_body.decode('utf-8'))
        payload = WebhookPayload(**payload_dict)
        
        # Generate deed PDF
        ext = await generate_and_store_pdf(
            db, 
            partner="Qualia",
            deed_type=payload.deed_type, 
            order_data=payload.model_dump()
        )
        
        status = 200
        logger.info(f"[Qualia Webhook] ✅ order_id={payload.order_id} deed_id={ext.id}")
        
        return {
            "success": True,
            "external_deed_id": str(ext.id),
            "pdf_url": ext.pdf_url,
            "status": ext.status,
            "order_id": payload.order_id
        }
        
    except HTTPException:
        raise  # Re-raise auth errors
    except Exception as e:
        status = 500
        logger.error(f"[Qualia Webhook] ❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Webhook processing failed: {str(e)}")
    finally:
        # Track webhook usage
        usage = ApiUsage(
            api_key_prefix="webhook_qualia",
            endpoint="/v1/webhooks/qualia",
            status_code=status,
            request_id=str(uuid.uuid4()),
            latency_ms=int((time.time()-t0)*1000),
            cost_units=1
        )
        db.add(usage); db.commit()
