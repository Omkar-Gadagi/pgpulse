// Overview collector: reads Postgres statistics views and turns them into one
// dashboard snapshot. Two parts:
//
//   readOverview()       one snapshot on demand (used by GET /api/overview)
//   createCollector()    a loop that takes a snapshot every N ms while started
//                        (used by Socket.IO while someone watches the dashboard)
//
// TPS and cache hit ratio come from cumulative counters, so they need two
// readings: rate = (new - old) / elapsed. The previous reading ("baseline") is
// kept in memory and shared by both parts.
import { targetQuery } from '../db/target.js';
import { loadSql } from '../sql/index.js';

const SQL = {
  connections: loadSql('connections'),
  counters: loadSql('db_counters'),
  size: loadSql('db_size'),
  longest: loadSql('longest_query'),
};

// A baseline older than this is too stale to give a meaningful "current" rate.
const BASELINE_MAX_AGE_MS = 30_000;
// With no usable baseline, take one and wait this long before the real reading.
const WARMUP_MS = 1_000;
// Ignore deltas over tiny windows: they produce wildly noisy rates.
const MIN_DELTA_MS = 250;

/** @type {{ xacts:number, blksHit:number, blksRead:number, at:number } | null} */
let baseline = null;
/** Coalesces concurrent callers onto one in-flight read. */
let inFlight = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const round = (value, digits) => {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
};

async function readCounters() {
  const { rows } = await targetQuery(SQL.counters);
  // pg returns bigint columns as strings (they can exceed JS's safe integer
  // range in theory; these counters won't for any realistic database).
  return {
    xacts: Number(rows[0].xacts),
    blksHit: Number(rows[0].blks_hit),
    blksRead: Number(rows[0].blks_read),
    at: Date.now(),
  };
}

function connectionsFromRows(rows) {
  const byState = Object.fromEntries(rows.map((r) => [r.state ?? 'other', r.count]));
  return {
    active: byState.active ?? 0,
    idle: byState.idle ?? 0,
    idleInTransaction:
      (byState['idle in transaction'] ?? 0) + (byState['idle in transaction (aborted)'] ?? 0),
    total: rows.reduce((sum, r) => sum + r.count, 0),
  };
}

/** Rates between two counter readings. null when they can't be computed honestly. */
function computeRates(prev, curr) {
  const dtMs = curr.at - prev.at;
  const dXacts = curr.xacts - prev.xacts;
  const dHit = curr.blksHit - prev.blksHit;
  const dRead = curr.blksRead - prev.blksRead;

  // Negative deltas mean the stats were reset (pg_stat_reset) between readings.
  if (dtMs < MIN_DELTA_MS || dXacts < 0 || dHit < 0 || dRead < 0) {
    return { tps: null, cacheHitRatio: null };
  }

  const tps = round(dXacts / (dtMs / 1000), 1);
  // No block reads at all in the window → nothing to measure.
  const cacheHitRatio = dHit + dRead === 0 ? null : round(dHit / (dHit + dRead), 4);
  return { tps, cacheHitRatio };
}

async function takeSnapshot() {
  if (!baseline || Date.now() - baseline.at > BASELINE_MAX_AGE_MS) {
    baseline = await readCounters();
    await sleep(WARMUP_MS);
  }

  // Four small independent queries in parallel (target pool allows 5).
  const [connRes, counters, sizeRes, longestRes] = await Promise.all([
    targetQuery(SQL.connections),
    readCounters(),
    targetQuery(SQL.size),
    targetQuery(SQL.longest),
  ]);

  const { tps, cacheHitRatio } = computeRates(baseline, counters);
  baseline = counters;

  return {
    ts: new Date(counters.at).toISOString(),
    connections: connectionsFromRows(connRes.rows),
    tps,
    cacheHitRatio,
    dbSizeBytes: Number(sizeRes.rows[0].bytes),
    longestQuerySeconds: round(Number(longestRes.rows[0].seconds), 1),
  };
}

/** One overview snapshot. Concurrent calls share the same read. */
export function readOverview() {
  if (!inFlight) {
    inFlight = takeSnapshot().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

/** Forget the baseline (e.g. after the database was unreachable). */
export function resetBaseline() {
  baseline = null;
}

/**
 * Periodic collector. Uses a setTimeout chain rather than setInterval so a slow
 * read can never overlap the next one.
 *
 * @param {{ intervalMs:number, onSnapshot:(s:object)=>void, onError:(e:Error)=>void }} opts
 */
export function createCollector({ intervalMs, onSnapshot, onError }) {
  let timer = null;
  let running = false;
  let latest = null;

  async function tick() {
    try {
      latest = await readOverview();
      if (running) onSnapshot(latest);
    } catch (err) {
      resetBaseline();
      latest = null;
      if (running) onError(err);
    } finally {
      // Keep going even after errors: this is how we "keep retrying".
      if (running) timer = setTimeout(tick, intervalMs);
    }
  }

  return {
    start() {
      if (running) return;
      running = true;
      tick();
    },
    stop() {
      running = false;
      clearTimeout(timer);
      timer = null;
    },
    isRunning: () => running,
    /** Latest snapshot if it's recent enough to serve as "current". */
    latestFresh() {
      if (!latest) return null;
      const age = Date.now() - Date.parse(latest.ts);
      return age <= intervalMs * 2 ? latest : null;
    },
  };
}
