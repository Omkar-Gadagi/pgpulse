// Activity & Locks: current sessions plus the blocking relationships
// between them. Read-only, like everything that touches the target database.
import { targetQuery } from '../db/target.js';
import { loadSql } from '../sql/index.js';

const ACTIVITY_SQL = loadSql('activity');

const seconds = (value) => (value === null ? null : Math.round(Number(value) * 10) / 10);

function toSession(row) {
  return {
    pid: row.pid,
    username: row.username,
    applicationName: row.application_name || null,
    clientAddr: row.client_addr,
    // null for sessions that haven't reported a state yet
    state: row.state,
    waitEventType: row.wait_event_type,
    waitEvent: row.wait_event,
    query: row.query,
    connectedSeconds: seconds(row.connected_seconds),
    xactSeconds: seconds(row.xact_seconds),
    querySeconds: seconds(row.query_seconds),
    stateSeconds: seconds(row.state_seconds),
    blockedBy: row.blocked_by ?? [],
    waitingFor: row.waiting_locktype
      ? { locktype: row.waiting_locktype, mode: row.waiting_mode, relation: row.waiting_relation }
      : null,
    // filled in below
    blocking: [],
  };
}

/** Sort: blocked sessions first, then blockers, then active, then longest-running. */
function compareSessions(a, b) {
  const rank = (s) => (s.blockedBy.length ? 0 : s.blocking.length ? 1 : s.state === 'active' ? 2 : 3);
  return rank(a) - rank(b) || (b.xactSeconds ?? -1) - (a.xactSeconds ?? -1) || a.pid - b.pid;
}

export async function readActivity() {
  const { rows } = await targetQuery(ACTIVITY_SQL);
  const sessions = rows.map(toSession);

  // Invert blockedBy into blocking, so each session also knows whom it holds up.
  const byPid = new Map(sessions.map((s) => [s.pid, s]));
  for (const s of sessions) {
    for (const blockerPid of s.blockedBy) byPid.get(blockerPid)?.blocking.push(s.pid);
  }
  sessions.sort(compareSessions);

  const count = (predicate) => sessions.filter(predicate).length;
  const longestXact = sessions.reduce((max, s) => Math.max(max, s.xactSeconds ?? 0), 0);

  return {
    ts: new Date().toISOString(),
    summary: {
      total: sessions.length,
      active: count((s) => s.state === 'active'),
      idle: count((s) => s.state === 'idle'),
      idleInTransaction: count((s) => s.state?.startsWith('idle in transaction')),
      waitingOnLock: count((s) => s.waitEventType === 'Lock'),
      blocked: count((s) => s.blockedBy.length > 0),
      longestTransactionSeconds: seconds(longestXact),
    },
    sessions,
  };
}
