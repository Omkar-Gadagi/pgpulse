// Central place for every setting the server reads from the environment.
// The rest of the code imports `config` and never touches process.env directly.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Load the repo-root .env (two levels up from apps/server/src).
// dotenv never overwrites variables that already exist, so inside Docker
// the values passed by docker-compose.yml win over the file.
const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '../../../.env'), quiet: true });

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name} (see .env.example)`);
  }
  return value;
}

function integer(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) {
    throw new Error(`Environment variable ${name} must be an integer, got "${raw}"`);
  }
  return value;
}

export const config = Object.freeze({
  port: integer('SERVER_PORT', 4000),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Monitored database: read-only user, small pool, hard query timeout
  targetDatabaseUrl: required('TARGET_DATABASE_URL'),
  targetStatementTimeoutMs: integer('TARGET_STATEMENT_TIMEOUT_MS', 5000),
  targetPoolMax: 5,

  // pgPulse's own database (metric history)
  appDatabaseUrl: required('APP_DATABASE_URL'),

  collectIntervalMs: integer('COLLECT_INTERVAL_MS', 2000),
  sampleIntervalMs: integer('SAMPLE_INTERVAL_MS', 60000),
});

// Database name only, for logs and the UI. Never log the full URL (it has the password).
export function databaseName(url) {
  try {
    return new URL(url).pathname.replace(/^\//, '') || 'unknown';
  } catch {
    return 'unknown';
  }
}
