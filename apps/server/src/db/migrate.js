// Makes sure pgPulse's own schema exists in the app database.
// init.sql creates it on a fresh Docker volume, but running this on every
// startup means the server also works against an existing or external
// database, and picks up columns added after the volume was first created.
// Every statement is idempotent (IF NOT EXISTS), so running it twice is safe.
import { appQuery } from './app.js';

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS metric_samples (
     id                     BIGSERIAL PRIMARY KEY,
     captured_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
     active_connections     INT,
     idle_connections       INT,
     total_connections      INT,
     tps                    NUMERIC,
     cache_hit_ratio        NUMERIC,
     db_size_bytes          BIGINT,
     longest_query_seconds  NUMERIC
   )`,
  `CREATE INDEX IF NOT EXISTS idx_metric_samples_captured_at
     ON metric_samples (captured_at)`,
  // Added after Part 1's original schema: feeds the "Connections by state" chart.
  `ALTER TABLE metric_samples
     ADD COLUMN IF NOT EXISTS idle_in_transaction_connections INT`,
];

export async function migrateAppDb() {
  for (const sql of STATEMENTS) {
    await appQuery(sql);
  }
}
