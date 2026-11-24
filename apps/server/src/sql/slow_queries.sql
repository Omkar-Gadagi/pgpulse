-- Slowest statements recorded by pg_stat_statements for the current database.
-- Used for the list (GET /api/queries), the detail view (GET /api/queries/:id)
-- and the dashboard's top-5 feed.
--
-- Parameters
--   $1  search text, already LIKE-escaped (NULL = no filter)
--   $2  max rows
--   $3  queryid to fetch (NULL = all)
-- Placeholder
--   {{orderBy}}  replaced in JS with a value from a fixed whitelist — never user input
WITH stmts AS (
  SELECT *
  FROM pg_stat_statements
  WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
    -- hide pgPulse's own monitoring queries
    AND userid <> (SELECT oid FROM pg_roles WHERE rolname = current_user)
    AND queryid IS NOT NULL
),
-- The same normalised query can appear once per user; merge those rows.
grouped AS (
  SELECT queryid,
         min(query)            AS query,
         sum(calls)            AS calls,
         sum(total_exec_time)  AS total_exec_time,
         min(min_exec_time)    AS min_exec_time,
         max(max_exec_time)    AS max_exec_time,
         sum(rows)             AS rows,
         sum(shared_blks_hit)  AS shared_blks_hit,
         sum(shared_blks_read) AS shared_blks_read
  FROM stmts
  GROUP BY queryid
),
-- Grand total over ALL statements, so "% of total" stays honest when searching.
totals AS (
  SELECT sum(total_exec_time) AS all_exec_time FROM grouped
)
SELECT g.queryid::text                                   AS query_id,
       g.query,
       g.calls,
       g.total_exec_time,
       g.total_exec_time / NULLIF(g.calls, 0)            AS mean_exec_time,
       g.min_exec_time,
       g.max_exec_time,
       g.rows,
       g.shared_blks_hit,
       g.shared_blks_read,
       round((100 * g.total_exec_time / NULLIF(t.all_exec_time, 0))::numeric, 2)
                                                         AS percent_of_total,
       t.all_exec_time
FROM grouped g
CROSS JOIN totals t
WHERE ($1::text IS NULL OR g.query ILIKE '%' || $1::text || '%')
  AND ($3::bigint IS NULL OR g.queryid = $3::bigint)
ORDER BY {{orderBy}}, g.queryid
LIMIT $2;
