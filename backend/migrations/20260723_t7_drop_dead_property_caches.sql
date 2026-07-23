-- T7: drop the dead property-cache tables.
--
-- DO NOT RUN until the pre-drop dumps are taken (owner gate).
--
-- Evidence (2026-07-23 investigation + this PR):
--   * property_cache_tp       — created by database.py, never read or written
--                               by any code, ever.
--   * property_cache_enhanced — served only the legacy Google-era endpoints
--                               (/validate, /search-legacy, /cached-properties)
--                               removed in this PR; zero frontend consumers.
--   * property_search_history — written only by /search-legacy (removed in
--                               this PR), read only by /search-history
--                               (removed in this PR).
--   * external_api/ sweep: zero references to any of the three.
--
-- KEPT: property_cache (live AI-suggestions cache) and api_integration_logs
-- (written by the live /search-v2 path).
--
-- Pre-drop insurance (Render shell; skip per-table if row count is 0):
--   pg_dump "$DATABASE_URL" --table=property_cache_tp \
--       --table=property_cache_enhanced --table=property_search_history \
--       > t7_predrop_backup_$(date +%Y%m%d).sql
--
-- Then, and only then:

DROP TABLE IF EXISTS property_cache_tp;
DROP TABLE IF EXISTS property_cache_enhanced;
DROP TABLE IF EXISTS property_search_history;
