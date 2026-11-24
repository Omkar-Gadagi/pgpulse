-- ─────────────────────────────────────────────────────────────
-- pgPulse demo bootstrap (run by init.sh as the superuser)
--   demo_shop : the MONITORED database (pgbench + slow-query load)
--   pgpulse   : pgPulse's OWN database (metric history)
-- psql variables: :reader_user, :reader_password
-- ─────────────────────────────────────────────────────────────

CREATE DATABASE demo_shop;
CREATE DATABASE pgpulse;

-- ── Read-only monitoring role ────────────────────────────────
-- pg_monitor is a built-in role that bundles pg_read_all_settings,
-- pg_read_all_stats and pg_stat_scan_tables: it can read every
-- statistics view (incl. other users' query text) but no table data.
CREATE ROLE :"reader_user" LOGIN PASSWORD :'reader_password';
GRANT pg_monitor TO :"reader_user";

-- Belt and braces: every session of this role is read-only by default,
-- and slow monitoring queries are cancelled after 5 seconds.
ALTER ROLE :"reader_user" SET default_transaction_read_only = on;
ALTER ROLE :"reader_user" SET statement_timeout = '5s';

-- Only allow the reader into the monitored database.
REVOKE CONNECT ON DATABASE pgpulse FROM PUBLIC;
GRANT CONNECT ON DATABASE demo_shop TO :"reader_user";

-- ── Monitored database ───────────────────────────────────────
\connect demo_shop

-- Requires shared_preload_libraries=pg_stat_statements (set in docker-compose.yml).
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ── pgPulse application database ─────────────────────────────
\connect pgpulse

CREATE TABLE IF NOT EXISTS metric_samples (
  id                     BIGSERIAL PRIMARY KEY,
  captured_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  active_connections     INT,
  idle_connections       INT,
  total_connections      INT,
  tps                    NUMERIC,
  cache_hit_ratio        NUMERIC,
  db_size_bytes          BIGINT,
  longest_query_seconds  NUMERIC
);

CREATE INDEX IF NOT EXISTS idx_metric_samples_captured_at
  ON metric_samples (captured_at);
