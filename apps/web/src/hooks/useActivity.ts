// Polls GET /api/activity every few seconds.
//
// Why polling and not the socket? Sessions are a snapshot that is only
// interesting while this page is open, the payload is small, and REST keeps
// the server's Socket.IO contract unchanged. Polling pauses automatically
// while the browser tab is hidden, and the user can pause it to read a
// snapshot without rows jumping around.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { api, errorMessage } from '@/lib/api'
import type { Activity } from '@/lib/types'

export const ACTIVITY_POLL_MS = 3000

function subscribeVisibility(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange)
  return () => document.removeEventListener('visibilitychange', onChange)
}
const isVisible = () => document.visibilityState === 'visible'

export function useActivity() {
  const [data, setData] = useState<Activity | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)
  const visible = useSyncExternalStore(subscribeVisibility, isVisible, () => true)
  const inFlight = useRef<AbortController | null>(null)

  const fetchOnce = useCallback(async () => {
    inFlight.current?.abort()
    const controller = new AbortController()
    inFlight.current = controller
    try {
      const next = await api.activity(controller.signal)
      setData(next)
      setError(null)
    } catch (err) {
      if (controller.signal.aborted) return
      setError(errorMessage(err)) // keep showing the last good snapshot
    }
  }, [])

  useEffect(() => {
    // One fetch on mount / manual refresh / resume, even while paused
    fetchOnce()
    const id = paused || !visible ? undefined : window.setInterval(fetchOnce, ACTIVITY_POLL_MS)
    return () => {
      window.clearInterval(id)
      inFlight.current?.abort()
    }
  }, [fetchOnce, paused, visible, refreshToken])

  return {
    data,
    error,
    paused,
    /** polling is actually running (not paused, tab visible) */
    live: !paused && visible,
    togglePaused: () => setPaused((p) => !p),
    refresh: () => setRefreshToken((n) => n + 1),
  }
}
