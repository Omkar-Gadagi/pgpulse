// Shapes of everything the pgPulse server sends. Kept in one file so a change
// to the API contract shows up as a type error everywhere it matters.

export interface Health {
  ok: boolean
  targetReachable: boolean
  postgresVersion: string | null
  database: string
  error?: string
}

export interface Connections {
  active: number
  idle: number
  /** null in history samples saved before this column existed */
  idleInTransaction: number | null
  total: number
}

/** One overview snapshot: socket `metrics:update`, GET /api/overview and each history sample. */
export interface MetricsSnapshot {
  /** ISO timestamp */
  ts: string
  connections: Connections
  /** null when it can't be computed yet (first reading, stats reset) */
  tps: number | null
  /** 0..1, null when there was no block activity in the window */
  cacheHitRatio: number | null
  dbSizeBytes: number
  longestQuerySeconds: number
}

export interface MetricsHistory {
  range: HistoryRange
  samples: MetricsSnapshot[]
}

export type HistoryRange = '1h' | '6h' | '24h'

export type QuerySort = 'total_time' | 'mean_time' | 'calls'

export interface QueryStats {
  queryId: string
  query: string
  calls: number
  totalExecTimeMs: number
  meanExecTimeMs: number
  minExecTimeMs: number
  maxExecTimeMs: number
  rows: number
  sharedBlksHit: number
  sharedBlksRead: number
  cacheHitRatio: number | null
  /** share of ALL statements' execution time, 0..100 */
  percentOfTotal: number
}

export interface QueryList {
  sort: QuerySort
  limit: number
  search: string | null
  totalExecTimeMs: number | null
  queries: QueryStats[]
}

export interface TargetStatus {
  /** null until the server has checked at least once */
  reachable: boolean | null
  error?: string
}

export interface TopQueries {
  ts: string
  queries: QueryStats[]
}

// ── Activity & Locks (GET /api/activity) ──
export interface LockWait {
  /** e.g. "transactionid" (waiting for another transaction to finish), "relation", "tuple" */
  locktype: string
  /** e.g. "ShareLock", "RowExclusiveLock" */
  mode: string
  /** table name when the lock is on a relation, otherwise null */
  relation: string | null
}

export interface Session {
  pid: number
  username: string | null
  applicationName: string | null
  clientAddr: string | null
  /** active | idle | idle in transaction | idle in transaction (aborted) | … | null */
  state: string | null
  waitEventType: string | null
  waitEvent: string | null
  query: string
  connectedSeconds: number | null
  xactSeconds: number | null
  querySeconds: number | null
  stateSeconds: number | null
  /** pids holding the lock this session waits for */
  blockedBy: number[]
  /** pids waiting on a lock this session holds */
  blocking: number[]
  waitingFor: LockWait | null
}

export interface ActivitySummary {
  total: number
  active: number
  idle: number
  idleInTransaction: number
  waitingOnLock: number
  blocked: number
  longestTransactionSeconds: number
}

export interface Activity {
  ts: string
  summary: ActivitySummary
  sessions: Session[]
}

// ── Socket.IO event maps (gives typed socket.on / socket.emit) ──
export interface ServerToClientEvents {
  'metrics:update': (snapshot: MetricsSnapshot) => void
  'queries:top': (top: TopQueries) => void
  'target:status': (status: TargetStatus) => void
}

export interface ClientToServerEvents {
  'dashboard:subscribe': () => void
  'dashboard:unsubscribe': () => void
}
