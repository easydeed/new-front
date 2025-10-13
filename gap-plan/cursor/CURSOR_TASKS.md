# Cursor Tasks: Phase 7 Notifications & Sharing

## Branch & layout
1. Create branch `phase7/notifications-sharing-finalize`.
2. Copy the bundle contents into your repo root (backend, templates, frontend, docs).

## Backend
3. Add env flags to Render: `NOTIFICATIONS_ENABLED=true`, `SHARING_ENABLED=true` (keep false in production until ready).
4. Apply migration: run `psql $DATABASE_URL -f backend/migrations/20251011_phase7_notifications_and_shares.sql`.
5. Mount routers by adding to `backend/main.py`:
   from routers.notifications import router as notifications_router
   from routers.shares_enhanced import router as shares_enhanced_router
   app.include_router(notifications_router, prefix="/notifications", tags=["notifications"])
   app.include_router(shares_enhanced_router, prefix="/deeds", tags=["deed-sharing"])

6. Deploy backend to Render. Verify `/docs` shows Notifications and Deed Sharing tags.

## Frontend
7. Add env flags in Vercel:
   - NEXT_PUBLIC_NOTIFICATIONS_ENABLED=true
   - NEXT_PUBLIC_NOTIFICATIONS_POLL_MS=30000
8. Import and place the bell in the shell header (e.g., components/Header.tsx):
   import { NotificationsBell } from '@/components/notifications/NotificationsBell';
   <NotificationsBell />
9. Mount toast center once in the root layout:
   import { ToastCenter } from '@/components/notifications/ToastCenter';
   <ToastCenter />
10. In Step5Preview.tsx, render the finalize panel where the Generate button used to be:
   import { FinalizePanel } from '@/features/wizard/finalize/FinalizePanel';
   <FinalizePanel docType={docType} gatherContext={buildContext} />

## Verification
11. Run locally: create a deed → Generate Preview → Finalize & Save → confirm record appears in Dashboard/Past Deeds and a “Deed generated” notification appears.
12. Share the deed to an email → verify /shared-deeds shows status and recipient gets an email (if SENDGRID_API_KEY configured).

## Staging rollout
13. Enable flags on staging only. Test for one day.
14. If stable, enable flags in production. Keep Announcements via notifications to inform admins.
