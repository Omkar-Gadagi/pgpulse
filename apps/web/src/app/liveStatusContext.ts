import { createContext } from 'react'

export type ConnectionState =
  /** first load, nothing known yet */
  | 'connecting'
  /** socket connected and monitored database reachable */
  | 'live'
  /** pgPulse server can't be reached (socket down and /api/health failing) */
  | 'server-down'
  /** server is up, but it can't reach the monitored database */
  | 'target-down'

export interface LiveStatus {
  state: ConnectionState
  socketConnected: boolean
  /** Monitored database name and version, from /api/health */
  database: string | null
  postgresVersion: string | null
  /** Error reported for the monitored database, when unreachable */
  targetError: string | null
  /** Error reaching the pgPulse server itself */
  serverError: string | null
  /** ms timestamp of the last fresh data (metrics:update or a health check) */
  lastUpdateAt: number | null
  /** Pages with live data call this whenever new data arrives. */
  markUpdated: () => void
  /** Re-check /api/health now (used by the banner's Retry button). */
  recheck: () => void
}

export const LiveStatusContext = createContext<LiveStatus | null>(null)
