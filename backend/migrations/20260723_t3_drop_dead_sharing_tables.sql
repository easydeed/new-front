-- T3: drop the three dead sharing tables.
--
-- DO NOT RUN until the pre-drop dumps are taken (owner gate).
--
-- Evidence (2026-07-23 investigation, all code-verified):
--   * shared_deeds        — no live reader/writer; the only reference was the
--                           revoke handler bug fixed in this same PR (it now
--                           targets deed_shares like every other endpoint).
--   * sharing_activity_log — schema-only; no code ever read or wrote it.
--   * deed_share_activity  — only writer was utils/notifications.py
--                           log_share_activity(), which was never called
--                           (removed in this PR).
--   * external_api/ sweep: zero references to any of the three.
--
-- Pre-drop insurance (run in the Render shell, attach output to the PR):
--   pg_dump "$DATABASE_URL" --table=shared_deeds --table=sharing_activity_log \
--       --table=deed_share_activity > t3_predrop_backup_$(date +%Y%m%d).sql
--
-- Then, and only then:

DROP TABLE IF EXISTS sharing_activity_log;
DROP TABLE IF EXISTS deed_share_activity;
DROP TABLE IF EXISTS shared_deeds;
