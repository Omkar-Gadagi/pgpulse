// pgPulse API entry point: builds the Express app, attaches Socket.IO to the
// same HTTP server, mounts routes, starts listening and shuts down cleanly.
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { config, databaseName } from './config.js';
import { targetPool } from './db/target.js';
import { appPool } from './db/app.js';
import { attachSocket } from './socket.js';
import { healthRouter } from './routes/health.js';
import { createOverviewRouter } from './routes/overview.js';

const app = express();

// One HTTP server shared by Express (REST) and Socket.IO (live updates).
const server = http.createServer(app);
const { io, collector } = attachSocket(server);

app.disable('x-powered-by');
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────
app.use('/api', healthRouter);
app.use('/api', createOverviewRouter(collector));

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
server.listen(config.port, () => {
  console.log(`[api] listening on http://localhost:${config.port}`);
  console.log(`[api] monitoring database "${databaseName(config.targetDatabaseUrl)}"`);
});

// ── Graceful shutdown ────────────────────────────────────────
// Stop accepting requests, then close both pools so Postgres sees clean
// disconnects instead of dropped sockets.
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[api] ${signal} received, shutting down`);
  collector.stop();
  io.close(); // disconnects sockets and closes the HTTP server
  await Promise.allSettled([targetPool.end(), appPool.end()]);
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
