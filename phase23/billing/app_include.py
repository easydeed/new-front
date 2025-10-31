from fastapi import FastAPI

def include_billing_routers(app: FastAPI):
    from .router_webhook import router as webhook
    from .router_admin import router as admin
    from .router_usage import router as usage
    app.include_router(webhook)
    app.include_router(admin)
    app.include_router(usage)
