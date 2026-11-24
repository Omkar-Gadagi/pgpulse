// Connection pool for the MONITORED database.
// Rules: read-only, small, and every query is cancelled after a few seconds,
// so pgPulse can never become the thing that slows the database down.
import pg from 'pg';
import { config } from '../config.js';

export const targetPool = new pg.Pool({
  connectionString: config.targetDatabaseUrl,
  max: config.targetPoolMax,
  // Postgres cancels any statement that runs longer than this
  statement_timeout: config.targetStatementTimeoutMs,
  // Give up quickly if the database is down instead of hanging the request
  connectionTimeoutMillis: 3000,
  idleTimeoutMillis: 30000,
  // Shows up in pg_stat_activity, so DBAs can see who is connected
  application_name: 'pgpulse',
  // Extra safety on top of the read-only role: every transaction is read-only
  options: '-c default_transaction_read_only=on',
});

// An idle client can error when the database restarts. Without this listener
// pg re-throws the error and the whole Node process crashes.
targetPool.on('error', (err) => {
  console.error('[target-db] idle client error:', err.message);
});

/** Run a read-only query against the monitored database. */
export function targetQuery(text, params) {
  return targetPool.query(text, params);
}
