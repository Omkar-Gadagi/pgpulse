// History sampler: saves one overview snapshot to metric_samples every
// SAMPLE_INTERVAL_MS (60s), whether or not anyone has the dashboard open,
// so the history charts have no gaps. It costs one small read per minute.
//
// If the live collector already has a fresh snapshot it reuses that one
// instead of querying the monitored database again.
import { appQuery } from '../db/app.js';
import { readOverview } from './overview.js';
import { describeError } from '../lib/errors.js';

const RETENTION = '7 days';

const INSERT_SQL = `
  INSERT INTO metric_samples (
    captured_at, active_connections, idle_connections, idle_in_transaction_connections,
    total_connections, tps, cache_hit_ratio, db_size_bytes, longest_query_seconds
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;

// Cheap thanks to the captured_at index; keeps the table from growing forever.
const PRUNE_SQL = `DELETE FROM metric_samples WHERE captured_at < now() - interval '${RETENTION}'`;

export async function saveSample(snapshot) {
  const c = snapshot.connections;
  await appQuery(INSERT_SQL, [
    snapshot.ts,
    c.active,
    c.idle,
    c.idleInTransaction,
    c.total,
    snapshot.tps,
    snapshot.cacheHitRatio,
    snapshot.dbSizeBytes,
    snapshot.longestQuerySeconds,
  ]);
}

/**
 * @param {{ intervalMs:number, collector:{ latestFresh:()=>object|null } }} opts
 */
export function startSampler({ intervalMs, collector }) {
  let timer = null;
  let stopped = false;

  async function tick() {
    try {
      const snapshot = collector.latestFresh() ?? (await readOverview());
      await saveSample(snapshot);
      await appQuery(PRUNE_SQL);
    } catch (err) {
      // Target or app DB down: skip this sample, try again next interval.
      console.warn('[sampler] sample skipped:', describeError(err));
    } finally {
      if (!stopped) timer = setTimeout(tick, intervalMs);
    }
  }

  tick(); // first sample right away, so history isn't empty for a minute

  return {
    stop() {
      stopped = true;
      clearTimeout(timer);
    },
  };
}
