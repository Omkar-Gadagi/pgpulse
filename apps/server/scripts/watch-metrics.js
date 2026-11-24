// Tiny terminal client for the live dashboard feed.
//   npm run watch -w apps/server              (defaults to http://localhost:4000)
//   node scripts/watch-metrics.js http://host:4000
// Subscribes to the dashboard room and prints one line per metrics:update.
import { io } from 'socket.io-client';

const url = process.argv[2] || process.env.API_URL || 'http://localhost:4000';
const socket = io(url, { transports: ['websocket'] });

const fmtBytes = (b) => `${(b / 1024 / 1024).toFixed(0)} MB`;
const fmtPct = (r) => (r === null ? '  n/a ' : `${(r * 100).toFixed(2)}%`);
const fmtTps = (t) => (t === null ? '   n/a' : t.toFixed(1).padStart(7));

socket.on('connect', () => {
  console.log(`connected to ${url} (id ${socket.id}), subscribing to dashboard...`);
  socket.emit('dashboard:subscribe');
});

socket.on('metrics:update', (m) => {
  const c = m.connections;
  const time = new Date(m.ts).toLocaleTimeString();
  console.log(
    `${time}  tps ${fmtTps(m.tps)}  cache ${fmtPct(m.cacheHitRatio)}  ` +
      `conns ${c.active} active / ${c.idle} idle / ${c.idleInTransaction} idle-tx / ${c.total} total  ` +
      `size ${fmtBytes(m.dbSizeBytes)}  longest ${m.longestQuerySeconds.toFixed(1)}s`,
  );
});

socket.on('queries:top', ({ queries }) => {
  console.log('  top queries by total time:');
  for (const q of queries) {
    const sql = q.query.replace(/\s+/g, ' ').slice(0, 60);
    console.log(`    ${String(q.percentOfTotal).padStart(6)}%  ${String(q.calls).padStart(8)} calls  ${sql}`);
  }
});

socket.on('target:status', (s) => {
  // Plain ASCII so it renders in every terminal (Windows PowerShell included)
  console.log(s.reachable ? '[up]   target reachable' : `[down] target UNREACHABLE: ${s.error}`);
});

socket.on('disconnect', (reason) => console.log(`disconnected: ${reason}`));
socket.on('connect_error', (err) => console.log(`connect error: ${err.message} (retrying)`));

process.on('SIGINT', () => {
  socket.emit('dashboard:unsubscribe');
  socket.close();
  process.exit(0);
});
