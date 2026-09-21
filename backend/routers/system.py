"""System/health endpoints (T8 split — moved verbatim from main.py)."""
import os

from fastapi import APIRouter, HTTPException

from middleware.qa_instrumentation import get_qa_health_status

router = APIRouter()

# Health check
@router.get("/health")
def health():
    """LIVENESS. Deliberately touches nothing.

    The platform's own health check may call this, and a check that fails
    when the database blips will restart containers that are perfectly
    healthy — turning a database incident into a rolling outage. So this
    answers as soon as the ASGI app is up and says nothing more.

    It is NOT readiness. See `/ready`.
    """
    return {"status": "ok", "message": "DeedPro API is running"}


@router.get("/ready")
def ready():
    """READINESS — and the honest statement of what that means here.

    ═══ WHY THIS IS NOT `/health` (owner-ruled 2026-09-21) ═══

    `/try`'s warming state counts down against something. Counting
    against `/health` would be counting against the ASGI app having
    booted, which is not the question: on a cold container the app can
    answer `/health` in milliseconds while the first database call is
    still opening a connection. A timer that finishes while the service
    is still waking is worse than no timer, because the page then
    promises readiness and the next click hangs.

    So this one OPENS A CONNECTION AND RUNS A QUERY. That is the part
    `/health` must not do, and the reason the two are separate rather
    than one endpoint made stricter.

    ═══ WHAT A 200 HERE DOES NOT PROVE ═══

    **A warm pool is not a warm renderer.** The first WeasyPrint render
    in a process loads fonts and builds its CSS machinery, and can take
    seconds on a container this endpoint already calls ready. Nothing
    here measures that, and a caller must not present `ready: true` as
    "the next request will be fast" — only as "the database path is
    open". Measuring render warmth would mean rendering a PDF on every
    poll, which is a cost this endpoint exists to avoid.
    """
    from database import get_db_connection

    conn = None
    try:
        conn = get_db_connection()
        if conn is None:
            return {"ready": False, "database": "unavailable",
                    "note": "a warm pool is not a warm renderer"}
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        cursor.close()
        return {"ready": True, "database": "ok",
                "note": "a warm pool is not a warm renderer"}
    except Exception:
        # The reason is deliberately not echoed: this endpoint is
        # unauthenticated, and a database error string is infrastructure
        # detail. The caller needs the boolean.
        return {"ready": False, "database": "error",
                "note": "a warm pool is not a warm renderer"}
    finally:
        if conn is not None:
            conn.close()

@router.get("/health/qa")
async def qa_health_check():
    """QA-specific health check with instrumentation metrics"""
    if os.getenv("ENVIRONMENT") != "staging":
        raise HTTPException(status_code=404, detail="QA health endpoint only available in staging")

    return get_qa_health_status()
