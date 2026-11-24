-- Cumulative counters since the last stats reset. On their own they only ever
-- grow, so the collector takes two readings and uses the difference:
--   TPS             = Δxacts / Δseconds
--   cache hit ratio = Δblks_hit / (Δblks_hit + Δblks_read)
SELECT xact_commit + xact_rollback AS xacts,
       blks_hit,
       blks_read
FROM pg_stat_database
WHERE datname = current_database();
