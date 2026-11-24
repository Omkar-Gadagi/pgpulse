-- How long the longest currently running query has been running, in seconds.
-- 0 when nothing else is active.
SELECT COALESCE(EXTRACT(EPOCH FROM max(now() - query_start)), 0) AS seconds
FROM pg_stat_activity
WHERE state = 'active'
  AND datname = current_database()
  AND pid <> pg_backend_pid();
