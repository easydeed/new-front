# Phase 7 — Notifications & Deed Sharing: Install & Rollout

Objective: Close gaps in system notifications and deed sharing/visibility with minimal risk to the wizard.

1) Database Migration (safe, additive)
   Apply: psql $DATABASE_URL -f backend/migrations/20251011_phase7_notifications_and_shares.sql

2) Backend (FastAPI)
   Mount routers in backend/main.py as shown in CURSOR_TASKS.md.
   Feature flags:
     - NOTIFICATIONS_ENABLED
     - SHARING_ENABLED

3) Frontend (Next.js)
   Add:
     - components/notifications/NotificationsBell.tsx
     - components/notifications/ToastCenter.tsx
     - features/wizard/finalize/* (two‑stage preview → finalize & save, optional share)
     - app/api/notifications/* (proxy to backend)
   Env (Vercel):
     - NEXT_PUBLIC_NOTIFICATIONS_ENABLED=true
     - NEXT_PUBLIC_NOTIFICATIONS_POLL_MS=30000

4) QA checklist
   - Finalize flow creates DB record in /deeds and triggers notification.
   - Past Deeds & Shared Deeds render live data (no mock arrays).
   - Unread bell increments and marks-as-read via dropdown.
   - Email share sends via SendGrid when configured; otherwise logs to stdout.

5) Rollback
   - Disable NOTIFICATIONS_ENABLED and SHARING_ENABLED; UI hides bell and finalize panel falls back to old button.
