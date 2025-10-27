
# Backend Patch — Partners + Modern Finalize Shim

This patch adds a minimal **Industry Partners** feature and an optional modern finalize shim that forwards canonical payloads to your existing deed creation service.

## Add routers

```py
from app.api.routers import partners, deeds_finalize_modern
app.include_router(partners.router, prefix='/api/partners', tags=['partners'])
# Optional shim for modern finalize, if you want a distinct endpoint
# app.include_router(deeds_finalize_modern.router, prefix='/api/deeds-modern', tags=['deeds'])
```

## Migration

Run Alembic migration included:
```bash
alembic upgrade head
```

Tables:
- `industry_partners` — id, user_id (owner), name, created_at

Security:
- Routers rely on your existing dependency `get_current_user()` returning a user with `id`.
