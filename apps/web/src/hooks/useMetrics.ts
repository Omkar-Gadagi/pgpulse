// Everything the dashboard needs, in one hook:
//
//   1. On mount: GET /api/metrics/history?range=1h to pre-fill the charts.
//   2. Join the "dashboard" room (dashboard:subscribe) and leave it on unmount.
//      Also re-join after every reconnect: the server forgets room membership
//      when a socket drops, so without this the dashboard would silently freeze.
//   3. Keep the latest snapshot (KPI cards) and top queries in React state.
//   4. Keep the point buffer in a ref and fan live points out to charts through
//      `subscribeLive`, so charts append with series.addPoint() instead of
//      React re-rendering them every 2 seconds.
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import type { MetricsSnapshot, TopQueries } from '@/lib/types'
import { useSocket, useSocketEvent } from './useSocket'

const HISTORY_WINDOW_MS = 60 * 60 * 1000
/** Cache-hit KPI averages this window: a single 2s window swings too much to read. */
const CACHE_AVG_WINDOW_MS = 30_000

export type HistoryStatus = 'loading' | 'ready' | 'error'
type LiveListener = (snapshot: MetricsSnapshot) => void

const tsOf = (s: MetricsSnapshot) => Date.parse(s.ts)

function averageCacheHit(points: MetricsSnapshot[], now: number): number | null {
  const recent = points.filter(
    (p) => p.cacheHitRatio !== null && now - tsOf(p) <= CACHE_AVG_WINDOW_MS,
  )
  if (recent.length === 0) return null
  return recent.reduce((sum, p) => sum + (p.cacheHitRatio as number), 0) / recent.length
}

export function useMetrics() {
  const { socket } = useSocket()

  const [latest, setLatest] = useState<MetricsSnapshot | null>(null)
  const [cacheHitAvg, setCacheHitAvg] = useState<number | null>(null)
  const [topQueries, setTopQueries] = useState<TopQueries | null>(null)
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>('loading')

  const pointsRef = useRef<MetricsSnapshot[]>([])
  const listenersRef = useRef(new Set<LiveListener>())

  // 1. History
  useEffect(() => {
    const controller = new AbortController()
    api
      .history('1h', controller.signal)
      .then(({ samples }) => {
        // Merge with any live points that arrived while the request was in flight
        const lastHistoryTs = samples.length ? tsOf(samples[samples.length - 1]) : 0
        const liveAfter = pointsRef.current.filter((p) => tsOf(p) > lastHistoryTs)
        pointsRef.current = [...samples, ...liveAfter]
        setLatest((prev) => prev ?? samples[samples.length - 1] ?? null)
        setHistoryStatus('ready')
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        console.warn('[dashboard] history unavailable:', err)
        setHistoryStatus('error') // charts still start, just without back-fill
      })
    return () => controller.abort()
  }, [])

  // 2. Room membership
  useEffect(() => {
    const subscribe = () => socket.emit('dashboard:subscribe')
    subscribe()
    socket.on('connect', subscribe)
    return () => {
      socket.off('connect', subscribe)
      socket.emit('dashboard:unsubscribe')
    }
  }, [socket])

  // 3 + 4. Live data
  useSocketEvent('metrics:update', (snapshot) => {
    const points = pointsRef.current
    const last = points[points.length - 1]
    // Ignore duplicates/out-of-order points (e.g. the same snapshot saved to history)
    if (!last || tsOf(snapshot) > tsOf(last)) {
      points.push(snapshot)
      const cutoff = tsOf(snapshot) - HISTORY_WINDOW_MS
      while (points.length && tsOf(points[0]) < cutoff) points.shift()
      listenersRef.current.forEach((listener) => listener(snapshot))
    }
    setLatest(snapshot)
    setCacheHitAvg(averageCacheHit(points, tsOf(snapshot)))
  })

  useSocketEvent('queries:top', setTopQueries)

  /** Snapshot of all buffered points (history + live), oldest first. */
  const getPoints = useCallback(() => pointsRef.current.slice(), [])

  /** Register a chart's live-point handler. Returns the unsubscribe function. */
  const subscribeLive = useCallback((listener: LiveListener) => {
    listenersRef.current.add(listener)
    return () => {
      listenersRef.current.delete(listener)
    }
  }, [])

  return { latest, cacheHitAvg, topQueries, historyStatus, getPoints, subscribeLive }
}

export type MetricsFeed = Pick<ReturnType<typeof useMetrics>, 'getPoints' | 'subscribeLive'>
