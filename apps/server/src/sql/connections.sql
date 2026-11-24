-- Connections to the monitored database, grouped by state
-- (active, idle, idle in transaction, ...). Our own backend is excluded,
-- otherwise this very query would always count as one "active" connection.
SELECT state, count(*)::int AS count
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid()
GROUP BY state;
