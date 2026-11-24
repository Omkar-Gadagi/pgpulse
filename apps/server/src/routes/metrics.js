// GET /api/metrics/history?range=1h   (1h | 6h | 24h)
// Saved samples from metric_samples, oldest first, in the same shape as
// metrics:update so the charts can treat history and live points identically.
import { Router } from 'express';
import { appQuery } from '../db/app.js';
import { describeError } from '../lib/errors.js';

// Whitelist: the client picks a key, the interval string comes from here.
const RANGES = Object.freeze({
  '1h': '1 hour',
  '6h': '6 hours',
  '24h': '24 hours',
});
const DEFAULT_RANGE = '1h';

const HISTORY_SQL = `
  SELECT captured_at, active_connections, idle_connections,
         idle_in_transaction_connections, total_connections, tps,
         cache_hit_ratio, db_size_bytes, longest_query_seconds
  FROM metric_samples
  WHERE captured_at >= now() - $1::interval
  ORDER BY captured_at`;

const num = (value) => (value === null ? null : Number(value));

function toSample(row) {
  return {
    ts: row.captured_at.toISOString(),
    connections: {
      active: row.active_connections,
      idle: row.idle_connections,
      idleInTransaction: row.idle_in_transaction_connections,
      total: row.total_connections,
    },
    tps: num(row.tps),
    cacheHitRatio: num(row.cache_hit_ratio),
    dbSizeBytes: num(row.db_size_bytes),
    longestQuerySeconds: num(row.longest_query_seconds),
  };
}

export const metricsRouter = Router();

metricsRouter.get('/metrics/history', async (req, res) => {
  const range = req.query.range ?? DEFAULT_RANGE;
  if (!Object.hasOwn(RANGES, range)) {
    return res.status(400).json({ error: `Invalid range "${range}"`, allowed: Object.keys(RANGES) });
  }

  try {
    const { rows } = await appQuery(HISTORY_SQL, [RANGES[range]]);
    res.json({ range, samples: rows.map(toSample) });
  } catch (err) {
    res.status(503).json({ error: 'Could not read metric history', detail: describeError(err) });
  }
});
