// pgPulse API entry point: builds the Express app, attaches Socket.IO to the
// same HTTP server, mounts routes, starts the history sampler, and shuts down
// cleanly.
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { config, databaseName } from './config.js';
import { targetPool } from './db/target.js';
import { appPool } from './db/app.js';
import { migrateAppDb } from './db/migrate.js';
import { attachSocket } from './socket.js';
import { startSampler } from './collectors/sampler.js';
import { describeError } from './lib/errors.js';
import { healthRouter } from './routes/health.js';
import { createOverviewRouter } from './routes/overview.js';
import { queriesRouter } from './routes/queries.js';
import { metricsRouter } from './routes/metrics.js';
import { activityRouter } from './routes/activity.js';

const app = express();

// One HTTP server shared by Express (REST) and Socket.IO (live updates).
const server = http.createServer(app);
const live = attachSocket(server);

app.disable('x-powered-by');
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────
app.use('/api', healthRouter);
app.use('/api', createOverviewRouter(live.collector));
app.use('/api', queriesRouter);
app.use('/api', metricsRouter);
app.use('/api', activityRouter);

// Unknown /api/* paths get JSON, not Express's default HTML page
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Express 5 forwards errors thrown in async handlers here automatically
app.use((err, _req, res, _next) => {
  console.error('[api] unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ────────────────────────────────────────────────────
// Schema first, so the sampler's first INSERT has a table to write to.
// If the app DB is down we still start: live metrics don't need it, and the
// sampler logs and retries every interval.
try {
  await migrateAppDb();
} catch (err) {
  console.warn('[app-db] migration skipped (app database unreachable):', describeError(err));
}

const sampler = startSampler({ intervalMs: config.sampleIntervalMs, collector: live.collector });

// Friendly message for the most common startup failure instead of a stack trace.
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `[api] port ${config.port} is already in use. Is another pgPulse server running?\n` +
        `      Stop it, or set SERVER_PORT in .env to a free port.`,
    );
  } else {
    console.error('[api] server error:', err);
  }
  process.exit(1);
});

server.listen(config.port, () => {
  console.log(`[api] listening on http://localhost:${config.port}`);
  console.log(`[api] monitoring database "${databaseName(config.targetDatabaseUrl)}"`);
  console.log(`[sampler] saving a history sample every ${config.sampleIntervalMs / 1000}s`);
});

// ── Graceful shutdown ────────────────────────────────────────
// Stop timers and sockets, then close both pools so Postgres sees clean
// disconnects instead of dropped sockets.
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[api] ${signal} received, shutting down`);
  sampler.stop();
  live.stop();
  live.io.close(); // disconnects sockets and closes the HTTP server
  await Promise.allSettled([targetPool.end(), appPool.end()]);
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
