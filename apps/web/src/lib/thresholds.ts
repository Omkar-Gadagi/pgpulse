// Health thresholds for KPI colouring, in one place so cards, gauge and
// tests all agree.

export type Status = 'healthy' | 'warning' | 'critical' | 'neutral'

export const CACHE_HIT_WARNING = 0.99 // below 99% → amber
export const CACHE_HIT_CRITICAL = 0.95 // below 95% → red
export const LONGEST_QUERY_WARNING_S = 5 // over 5s → amber
export const LONGEST_QUERY_CRITICAL_S = 30 // over 30s → red

export function cacheHitStatus(ratio: number | null): Status {
  if (ratio === null) return 'neutral'
  if (ratio < CACHE_HIT_CRITICAL) return 'critical'
  if (ratio < CACHE_HIT_WARNING) return 'warning'
  return 'healthy'
}

export function longestQueryStatus(seconds: number | null): Status {
  if (seconds === null) return 'neutral'
  if (seconds > LONGEST_QUERY_CRITICAL_S) return 'critical'
  if (seconds > LONGEST_QUERY_WARNING_S) return 'warning'
  return 'healthy'
}

/** Words shown next to the colour, so status never relies on colour alone. */
export const STATUS_LABEL: Record<Status, string> = {
  healthy: 'Healthy',
  warning: 'Warning',
  critical: 'Critical',
  neutral: '',
}
