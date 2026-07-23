"""System/health endpoints (T8 split — moved verbatim from main.py)."""
import os

from fastapi import APIRouter, HTTPException

from middleware.qa_instrumentation import get_qa_health_status

router = APIRouter()

# Health check
@router.get("/health")
def health():
    return {"status": "ok", "message": "DeedPro API is running"}

@router.get("/health/qa")
async def qa_health_check():
    """QA-specific health check with instrumentation metrics"""
    if os.getenv("ENVIRONMENT") != "staging":
        raise HTTPException(status_code=404, detail="QA health endpoint only available in staging")

    return get_qa_health_status()
