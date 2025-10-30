import time
import httpx
from sqlalchemy.orm import Session
from ..deps import get_settings, get_logger
from ..models import ExternalDeed
from ..storage.s3_storage import StorageClient

logger = get_logger()

# ✅ PHASE 22.1 FIX #3: Retry logic with exponential backoff
async def _call_main_api_with_retry(url: str, headers: dict, json_data: dict, max_retries: int = 3) -> bytes:
    """
    Call Main API with exponential backoff retry logic
    
    Retries on:
    - Connection errors (Main API down)
    - Timeout errors
    - 5xx server errors
    
    Does NOT retry on:
    - 4xx client errors (bad request, validation)
    - 401/403 (auth issues)
    """
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                logger.info(f"[MainAPI] Attempt {attempt+1}/{max_retries}: {url}")
                resp = await client.post(url, json=json_data, headers=headers)
                
                # Don't retry on client errors (4xx) - these won't fix themselves
                if 400 <= resp.status_code < 500:
                    resp.raise_for_status()
                    
                # Retry on server errors (5xx)
                if resp.status_code >= 500:
                    if attempt < max_retries - 1:
                        wait_seconds = 2 ** attempt  # Exponential backoff: 1s, 2s, 4s
                        logger.warning(f"[MainAPI] 5xx error, retrying in {wait_seconds}s... (attempt {attempt+1}/{max_retries})")
                        await asyncio.sleep(wait_seconds)
                        continue
                    else:
                        resp.raise_for_status()  # Last attempt, raise the error
                
                # Success!
                logger.info(f"[MainAPI] ✅ Success on attempt {attempt+1}")
                return resp.content
                
        except (httpx.ConnectError, httpx.TimeoutException) as e:
            if attempt < max_retries - 1:
                wait_seconds = 2 ** attempt
                logger.warning(f"[MainAPI] Connection/timeout error: {str(e)}, retrying in {wait_seconds}s... (attempt {attempt+1}/{max_retries})")
                await asyncio.sleep(wait_seconds)
                continue
            else:
                logger.error(f"[MainAPI] ❌ All retry attempts failed")
                raise
        except httpx.HTTPStatusError as e:
            # Client errors (4xx) - don't retry
            logger.error(f"[MainAPI] ❌ HTTP {e.response.status_code}: {str(e)}")
            raise
    
    raise Exception("Retry logic failed unexpectedly")

async def generate_and_store_pdf(db: Session, partner: str, deed_type: str, order_data: dict) -> ExternalDeed:
    s = get_settings()
    t0 = time.time()
    url = f"{s.MAIN_API_BASE_URL}/api/generate/{deed_type}-deed-ca"
    headers = {"Authorization": f"Bearer {s.MAIN_API_INTERNAL_TOKEN}"}
    
    # ✅ PHASE 22.1 FIX #3: Use retry logic instead of single call
    import asyncio
    pdf_bytes = await _call_main_api_with_retry(url, headers, order_data, max_retries=3)

    storage = StorageClient()
    pdf_url, _ = storage.save_pdf(pdf_bytes, f"{deed_type}_{order_data.get('order_id','noorder')}.pdf")

    ext = ExternalDeed(
        partner=partner,
        order_id=str(order_data.get("order_id","")),
        deed_type=deed_type,
        property_address=str(order_data.get("property_address","")),
        main_deed_id=order_data.get("deed_id") or None,
        pdf_url=pdf_url,
        status="completed",
    )
    db.add(ext); db.commit(); db.refresh(ext)
    logger.info(f"[ExternalDeed] partner={partner} deed_type={deed_type} url={pdf_url} in {int((time.time()-t0)*1000)}ms")
    return ext
