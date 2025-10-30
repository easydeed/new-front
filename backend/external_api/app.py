from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
import time, uuid

from .deps import get_logger, get_settings
from .routers.partners import router as partners_router
from .routers.admin import router as admin_router

logger = get_logger()
app = FastAPI(title="DeedPro External Partner API", version="22.0.0")

settings = get_settings()
if settings.STORAGE_DRIVER == "local":
    app.mount("/files", StaticFiles(directory=settings.LOCAL_STORAGE_DIR), name="files")

@app.middleware("http")
async def add_request_id_and_log(request: Request, call_next):
    rid = str(uuid.uuid4())
    start = time.time()
    response = None
    try:
        response = await call_next(request)
        return response
    finally:
        dur = int((time.time()-start)*1000)
        logger.info(f"{rid} {request.method} {request.url.path} -> {getattr(response, 'status_code', 'ERR')} {dur}ms")

@app.get("/healthz")
async def healthz():
    return {"ok": True}

app.include_router(partners_router)
app.include_router(admin_router)
