// Socket.IO: pushes live dashboard metrics to browsers.
//
// Clients join the "dashboard" room with `dashboard:subscribe`. The collector
// runs only while that room has at least one member, so an idle pgPulse puts
// zero load on the monitored database.
//
// Events
//   client → server  dashboard:subscribe | dashboard:unsubscribe
//   server → client  metrics:update  { ts, connections, tps, cacheHitRatio, dbSizeBytes, longestQuerySeconds }
//                    queries:top     { ts, queries: [top 5 by total time] }  every 10s
//                    target:status   { reachable, error? }
import { Server } from 'socket.io';
import { config } from './config.js';
import { createCollector } from './collectors/overview.js';
import { listQueries } from './collectors/queries.js';
import { describeError } from './lib/errors.js';

const DASHBOARD_ROOM = 'dashboard';
const TOP_QUERIES_INTERVAL_MS = 10_000;
const TOP_QUERIES_LIMIT = 5;

export function attachSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: config.corsOrigin },
  });

  // Last known reachability, so new subscribers get it straight away and we
  // only broadcast when it actually changes.
  let targetStatus = { reachable: null };

  function setTargetStatus(next) {
    const changed =
      next.reachable !== targetStatus.reachable || next.error !== targetStatus.error;
    targetStatus = next;
    if (changed) io.to(DASHBOARD_ROOM).emit('target:status', targetStatus);
  }

  const collector = createCollector({
    intervalMs: config.collectIntervalMs,
    onSnapshot(snapshot) {
      setTargetStatus({ reachable: true });
      io.to(DASHBOARD_ROOM).emit('metrics:update', snapshot);
    },
    onError(err) {
      const message = describeError(err);
      console.warn('[collector] target unreachable:', message);
      setTargetStatus({ reachable: false, error: message });
    },
  });

  // ── Top-5 slow queries feed (slower cadence: pg_stat_statements is heavier) ──
  let topRunning = false;
  let topTimer = null;
  let latestTop = null;

  async function topTick() {
    try {
      const { queries } = await listQueries({ sort: 'total_time', limit: TOP_QUERIES_LIMIT });
      latestTop = { ts: new Date().toISOString(), queries };
      if (topRunning) io.to(DASHBOARD_ROOM).emit('queries:top', latestTop);
    } catch (err) {
      // Reachability is already reported by the overview collector.
      console.warn('[queries:top] skipped:', describeError(err));
    } finally {
      if (topRunning) topTimer = setTimeout(topTick, TOP_QUERIES_INTERVAL_MS);
    }
  }

  function startTopQueries() {
    topRunning = true;
    topTick();
  }

  function stopTopQueries() {
    topRunning = false;
    clearTimeout(topTimer);
  }

  const roomSize = () => io.sockets.adapter.rooms.get(DASHBOARD_ROOM)?.size ?? 0;

  // Start/stop both feeds whenever the room's membership changes.
  // The adapter fires leave-room on disconnect too, so closed tabs are handled.
  function syncCollector() {
    const watchers = roomSize();
    if (watchers > 0 && !collector.isRunning()) {
      console.log('[collector] started (first dashboard subscriber)');
      collector.start();
      startTopQueries();
    } else if (watchers === 0 && collector.isRunning()) {
      console.log('[collector] stopped (no dashboard subscribers)');
      collector.stop();
      stopTopQueries();
    }
  }
  io.sockets.adapter.on('join-room', (room) => room === DASHBOARD_ROOM && syncCollector());
  io.sockets.adapter.on('leave-room', (room) => room === DASHBOARD_ROOM && syncCollector());

  io.on('connection', (socket) => {
    socket.on('dashboard:subscribe', () => {
      socket.join(DASHBOARD_ROOM);
      // Don't make a new subscriber wait up to 2s for the first numbers.
      if (targetStatus.reachable !== null) socket.emit('target:status', targetStatus);
      const latest = collector.latestFresh();
      if (latest) socket.emit('metrics:update', latest);
      if (latestTop) socket.emit('queries:top', latestTop);
    });

    socket.on('dashboard:unsubscribe', () => {
      socket.leave(DASHBOARD_ROOM);
    });
  });

  return {
    io,
    collector,
    stop() {
      collector.stop();
      stopTopQueries();
    },
  };
}
