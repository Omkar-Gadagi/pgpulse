// Helpers for "last N minutes" live charts.
import type { Series } from 'highcharts'

export const LIVE_WINDOW_MS = 15 * 60 * 1000

/**
 * Append a live point to a series, keeping only the last `windowMs`.
 * Uses series.addPoint(point, redraw, shift): `shift` drops the oldest point
 * once it falls out of the window, so the chart scrolls instead of growing.
 * Redraw is left to the caller so several series can be updated in one paint.
 */
export function appendLivePoint(series: Series, x: number, y: number | null, windowMs = LIVE_WINDOW_MS) {
  const data = series.data
  const lastX = data.length ? data[data.length - 1].x : -Infinity
  if (x <= lastX) return // duplicate or out of order

  const oldestX = data.length ? data[0].x : x
  const shift = data.length > 1 && oldestX < x - windowMs
  series.addPoint([x, y], false, shift, false)

  // A long pause (e.g. laptop asleep) can leave several stale points at once
  while (series.data.length > 1 && series.data[0].x < x - windowMs) {
    series.data[0].remove(false, false)
  }
}
