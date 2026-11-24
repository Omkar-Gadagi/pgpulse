// Formatting helpers for numbers shown in the UI. All return strings and
// render "—" for missing values, so components never print "null" or "NaN".

const DASH = '—'

const isMissing = (value: number | null | undefined): value is null | undefined =>
  value === null || value === undefined || Number.isNaN(value)

/** 1536 → "1.5 KB", 368073751 → "351 MB" (binary units, like pg_size_pretty) */
export function formatBytes(bytes: number | null | undefined): string {
  if (isMissing(bytes)) return DASH
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  let value = bytes
  let unit = 0
  while (Math.abs(value) >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  const digits = value >= 100 || unit === 0 ? 0 : 1
  return `${value.toFixed(digits)} ${units[unit]}`
}

/** Milliseconds, auto-scaled: 0.29 → "0.29 ms", 361.9 → "362 ms", 21979 → "22.0 s" */
export function formatMs(ms: number | null | undefined): string {
  if (isMissing(ms)) return DASH
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)} min`
  if (ms >= 1_000) return `${(ms / 1_000).toFixed(1)} s`
  if (ms >= 100) return `${Math.round(ms)} ms`
  if (ms >= 1) return `${ms.toFixed(1)} ms`
  return `${ms.toFixed(2)} ms`
}

/** Ratio 0..1 → "99.52%" */
export function formatRatio(ratio: number | null | undefined, digits = 2): string {
  if (isMissing(ratio)) return DASH
  return `${(ratio * 100).toFixed(digits)}%`
}

/** Already-a-percentage 0..100 → "40.6%" */
export function formatPercent(percent: number | null | undefined, digits = 1): string {
  if (isMissing(percent)) return DASH
  return `${percent.toFixed(digits)}%`
}

const integerFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const decimalFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/** 2555412 → "2,555,412" */
export function formatInteger(value: number | null | undefined): string {
  if (isMissing(value)) return DASH
  return integerFormat.format(value)
}

/** 1771.34 → "1,771.3" */
export function formatDecimal(value: number | null | undefined): string {
  if (isMissing(value)) return DASH
  return decimalFormat.format(value)
}

/** Seconds of a running query: 0.6 → "0.6 s", 95 → "1m 35s" */
export function formatSeconds(seconds: number | null | undefined): string {
  if (isMissing(seconds)) return DASH
  if (seconds < 60) return `${seconds.toFixed(1)} s`
  const minutes = Math.floor(seconds / 60)
  const rest = Math.round(seconds % 60)
  return `${minutes}m ${rest}s`
}

/** "updated 3s ago" style relative age from a timestamp (ms since epoch). */
export function formatAge(fromMs: number | null, nowMs: number): string {
  if (fromMs === null) return 'never'
  const seconds = Math.max(0, Math.round((nowMs - fromMs) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}

/** Collapse whitespace so multi-line SQL fits on one table row. */
export function oneLineSql(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim()
}
