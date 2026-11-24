// Single source of truth for "is everything connected?".
//
// Inputs
//   - the shared socket's connect/disconnect (useSocket)
//   - `target:status` events (sent by the server to dashboard subscribers)
//   - GET /api/health every 10s, and again whenever the socket reconnects,
//     so status stays correct on pages that don't subscribe to the dashboard
//
// Whichever source reported most recently wins for "is the target reachable".
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, errorMessage } from '@/lib/api'
import { useSocket, useSocketEvent } from '@/hooks/useSocket'
import { LiveStatusContext, type ConnectionState, type LiveStatus } from './liveStatusContext'

const HEALTH_POLL_MS = 10_000

interface TargetInfo {
  reachable: boolean | null
  error: string | null
}

export function LiveStatusProvider({ children }: { children: ReactNode }) {
  const { connected: socketConnected } = useSocket()

  const [serverReachable, setServerReachable] = useState<boolean | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [target, setTarget] = useState<TargetInfo>({ reachable: null, error: null })
  const [database, setDatabase] = useState<string | null>(null)
  const [postgresVersion, setPostgresVersion] = useState<string | null>(null)
  const [lastUpdateAt, setLastUpdateAt] = useState<number | null>(null)
  const [recheckToken, setRecheckToken] = useState(0)

  const markUpdated = useCallback(() => setLastUpdateAt(Date.now()), [])
  const recheck = useCallback(() => setRecheckToken((n) => n + 1), [])

  // ── Health polling ──
  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function check() {
      try {
        const health = await api.health(controller.signal)
        if (cancelled) return
        setServerReachable(true)
        setServerError(null)
        setDatabase(health.database)
        if (health.postgresVersion) setPostgresVersion(health.postgresVersion)
        setTarget({ reachable: health.targetReachable, error: health.error ?? null })
        if (health.targetReachable) setLastUpdateAt((prev) => Math.max(prev ?? 0, Date.now()))
      } catch (err) {
        if (cancelled || controller.signal.aborted) return
        setServerReachable(false)
        setServerError(errorMessage(err))
      }
    }

    check()
    const timer = window.setInterval(check, HEALTH_POLL_MS)
    return () => {
      cancelled = true
      controller.abort()
      window.clearInterval(timer)
    }
    // socketConnected: re-check immediately when the socket (re)connects or drops
  }, [recheckToken, socketConnected])

  // ── Push updates from the server ──
  useSocketEvent('target:status', (status) => {
    setTarget({ reachable: status.reachable, error: status.error ?? null })
  })
  useSocketEvent('metrics:update', () => {
    setTarget((prev) => (prev.reachable === true ? prev : { reachable: true, error: null }))
    markUpdated()
  })

  const state: ConnectionState = useMemo(() => {
    if (!socketConnected && serverReachable === false) return 'server-down'
    if (target.reachable === false && serverReachable !== false) return 'target-down'
    if (socketConnected && target.reachable === true) return 'live'
    return 'connecting'
  }, [socketConnected, serverReachable, target.reachable])

  const value: LiveStatus = useMemo(
    () => ({
      state,
      socketConnected,
      database,
      postgresVersion,
      targetError: target.error,
      serverError,
      lastUpdateAt,
      markUpdated,
      recheck,
    }),
    [
      state,
      socketConnected,
      database,
      postgresVersion,
      target.error,
      serverError,
      lastUpdateAt,
      markUpdated,
      recheck,
    ],
  )

  return <LiveStatusContext.Provider value={value}>{children}</LiveStatusContext.Provider>
}
