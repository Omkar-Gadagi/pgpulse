// Connection pool for pgPulse's OWN database (metric_samples history).
// This is the only database the server is allowed to write to.
import pg from 'pg';
import { config } from '../config.js';

export const appPool = new pg.Pool({
  connectionString: config.appDatabaseUrl,
  max: 5,
  connectionTimeoutMillis: 3000,
  idleTimeoutMillis: 30000,
  application_name: 'pgpulse-app',
});

appPool.on('error', (err) => {
  console.error('[app-db] idle client error:', err.message);
});

export function appQuery(text, params) {
  return appPool.query(text, params);
}
