from fastapi import FastAPI
from .router_webhook import router as webhook_router
from .router_admin import router as admin_router
from .router_usage import router as usage_router

def include_billing_routers(app: FastAPI):
    app.include_router(webhook_router)
    app.include_router(admin_router)
    app.include_router(usage_router)
