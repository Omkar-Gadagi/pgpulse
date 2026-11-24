// Socket.IO: pushes live dashboard metrics to browsers.
//
// Clients join the "dashboard" room with `dashboard:subscribe`. The collector
// runs only while that room has at least one member, so an idle pgPulse puts
// zero load on the monitored database.
//
// Events
//   client → server  dashboard:subscribe | dashboard:unsubscribe
//   server → client  metrics:update  { ts, connections, tps, cacheHitRatio, dbSizeBytes, longestQuerySeconds }
//                    target:status   { reachable, error? }
import { Server } from 'socket.io';
import { config } from './config.js';
import { createCollector } from './collectors/overview.js';
import { describeError } from './lib/errors.js';

const DASHBOARD_ROOM = 'dashboard';

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

  const roomSize = () => io.sockets.adapter.rooms.get(DASHBOARD_ROOM)?.size ?? 0;

  // Start/stop the collector whenever the room's membership changes.
  // The adapter fires leave-room on disconnect too, so closed tabs are handled.
  function syncCollector() {
    const watchers = roomSize();
    if (watchers > 0 && !collector.isRunning()) {
      console.log('[collector] started (first dashboard subscriber)');
      collector.start();
    } else if (watchers === 0 && collector.isRunning()) {
      console.log('[collector] stopped (no dashboard subscribers)');
      collector.stop();
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
    });

    socket.on('dashboard:unsubscribe', () => {
      socket.leave(DASHBOARD_ROOM);
    });
  });

  return { io, collector };
}
