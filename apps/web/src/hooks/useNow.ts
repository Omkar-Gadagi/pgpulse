import { useEffect, useState } from 'react'

/**
 * Current time, refreshed every `intervalMs`. Used for "updated 3s ago".
 * Keep it in small leaf components so only they re-render each second.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}
