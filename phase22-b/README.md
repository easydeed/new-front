# DeedPro — Phase 22‑B: Partner Onboarding & Admin UI (Cursor Package)

This package adds a **Partner Management** section to your Next.js Admin and **server-side proxy routes** that call the External Partner API without exposing secrets.

## Drop-in files
- `src/app/admin/partners/page.tsx`
- `src/app/admin/partners/[prefix]/page.tsx`
- `src/components/CreatePartnerModal.tsx`
- `src/app/api/partners/admin/list/route.ts`
- `src/app/api/partners/admin/bootstrap/route.ts`
- `src/app/api/partners/admin/revoke/[prefix]/route.ts`
- `src/app/api/partners/admin/usage/route.ts`
- `src/lib/externalAdmin.ts`
- `env/.env.local.example`
- `docs/PARTNER_OPS_RUNBOOK.md`

## Env
Copy `env/.env.local.example` → `.env.local` and set:
```
EXTERNAL_API_BASE_URL=http://localhost:8001
EXTERNAL_API_ADMIN_SETUP_SECRET=change-me-admin-bootstrap-secret
ROLE_PARTNER_ADMIN_BYPASS=true
```
