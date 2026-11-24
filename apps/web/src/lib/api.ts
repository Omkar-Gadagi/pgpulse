// Thin typed wrapper around fetch for the pgPulse REST API.
import type { Health, HistoryRange, MetricsHistory, QueryList, QuerySort, QueryStats } from './types'

/** Base URL of the pgPulse server. Baked in at build time by Vite. */
export const API_URL: string = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(
  /\/$/,
  '',
)

export class ApiError extends Error {
  /** HTTP status, or 0 when the server couldn't be reached at all */
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }

  get isNetworkError() {
    return this.status === 0
  }
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { signal, headers: { Accept: 'application/json' } })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError(`Can't reach the pgPulse server at ${API_URL}`, 0)
  }

  if (!res.ok) {
    // Server errors look like { error, detail? }
    let message = `Request failed with status ${res.status}`
    try {
      const body = (await res.json()) as { error?: string; detail?: string }
      if (body.error) message = body.detail ? `${body.error}: ${body.detail}` : body.error
    } catch {
      // non-JSON error body; keep the generic message
    }
    throw new ApiError(message, res.status)
  }
  return (await res.json()) as T
}

export const api = {
  health: (signal?: AbortSignal) => getJson<Health>('/api/health', signal),

  history: (range: HistoryRange, signal?: AbortSignal) =>
    getJson<MetricsHistory>(`/api/metrics/history?range=${range}`, signal),

  queries: (
    params: { sort: QuerySort; limit: number; search?: string },
    signal?: AbortSignal,
  ) => {
    const qs = new URLSearchParams({ sort: params.sort, limit: String(params.limit) })
    if (params.search) qs.set('search', params.search)
    return getJson<QueryList>(`/api/queries?${qs.toString()}`, signal)
  },

  query: (queryId: string, signal?: AbortSignal) =>
    getJson<QueryStats>(`/api/queries/${encodeURIComponent(queryId)}`, signal),
}

/** Turn anything thrown into a message fit for the UI. */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return 'Something went wrong'
}
