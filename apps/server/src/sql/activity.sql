-- Every client session connected to the monitored database, with what it's
-- doing right now and what (if anything) it is waiting for.
--
-- pg_blocking_pids(pid)  → the pids holding the lock this session waits on
--                          (empty array when it isn't blocked). This is how
--                          the UI builds the "who blocks whom" tree.
-- waiting_*              → the lock this session asked for and hasn't got yet
--                          (from pg_locks, granted = false).
--
-- Read-only: needs only pg_monitor (pg_read_all_stats lets us see every
-- session's query text). pg_locks is readable by everyone.
SELECT a.pid,
       a.usename                                           AS username,
       a.application_name,
       host(a.client_addr)                                 AS client_addr,
       a.state,
       a.wait_event_type,
       a.wait_event,
       a.query,
       EXTRACT(EPOCH FROM now() - a.backend_start)         AS connected_seconds,
       EXTRACT(EPOCH FROM now() - a.xact_start)            AS xact_seconds,
       EXTRACT(EPOCH FROM now() - a.query_start)           AS query_seconds,
       EXTRACT(EPOCH FROM now() - a.state_change)          AS state_seconds,
       pg_blocking_pids(a.pid)                             AS blocked_by,
       w.locktype                                          AS waiting_locktype,
       w.mode                                              AS waiting_mode,
       w.relation::regclass::text                          AS waiting_relation
FROM pg_stat_activity a
LEFT JOIN LATERAL (
  SELECT l.locktype, l.mode, l.relation
  FROM pg_locks l
  WHERE l.pid = a.pid AND NOT l.granted
  LIMIT 1
) w ON true
WHERE a.datname = current_database()
  AND a.backend_type = 'client backend'
  -- hide the connection running this very query
  AND a.pid <> pg_backend_pid();
