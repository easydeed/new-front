# Cursor Tasks — Auth & DB Hardening

Run these from the Tasks panel:

1) **AUTH: Apply Backend Patches**
   - Adds `routers/auth_extra.py`, email helper, roles helper
   - (Best-effort) patches for: hardcoded user_id fix, JWT secret enforcement

2) **AUTH: Apply Frontend Patches**
   - Adds reset & verify pages and token utils

3) **AUTH: Run DB Migrations (dev)**
   - Applies SQL migrations against $DATABASE_URL (psql required)
   - For Render, copy the SQL files to the dashboard and run there

4) **AUTH: Dev (FE+BE)**
   - Launches backend (:8000) and frontend (:3000)

5) **AUTH: Smoke (Auth flows)**
   - Headless test: register, login, forgot+reset, verify-email (if enabled)
