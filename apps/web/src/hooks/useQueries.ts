// Data hooks for the Queries page.
//
//   useQueryList({ sort, search, limit, refreshKey })  → GET /api/queries
//   useQueryDetail(queryId, refreshKey)                → GET /api/queries/:id
//
// Each request gets an AbortController: when the inputs change (new search
// text, new sort) the previous request is cancelled, so a slow old response
// can never overwrite a newer one.
import { useEffect, useState } from 'react'
import { api, ApiError, errorMessage } from '@/lib/api'
import type { QueryList, QuerySort, QueryStats } from '@/lib/types'

type AsyncState<T> =
  | { status: 'loading'; data: T | null; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'error'; data: T | null; error: string }

const isAbort = (err: unknown) => err instanceof DOMException && err.name === 'AbortError'

export function useQueryList(params: {
  sort: QuerySort
  search: string
  limit: number
  /** change to force a refetch (Refresh button) */
  refreshKey: number
}): AsyncState<QueryList> {
  const { sort, search, limit, refreshKey } = params
  const [state, setState] = useState<AsyncState<QueryList>>({ status: 'loading', data: null, error: null })

  useEffect(() => {
    const controller = new AbortController()
    // Keep showing the previous rows while the new ones load (no flicker)
    setState((prev) => ({ status: 'loading', data: prev.data, error: null }))

    api
      .queries({ sort, limit, search: search || undefined }, controller.signal)
      .then((data) => setState({ status: 'success', data, error: null }))
      .catch((err: unknown) => {
        if (isAbort(err)) return
        setState((prev) => ({ status: 'error', data: prev.data, error: errorMessage(err) }))
      })

    return () => controller.abort()
  }, [sort, search, limit, refreshKey])

  return state
}

export type DetailState = AsyncState<QueryStats> | { status: 'not-found'; data: null; error: string }

export function useQueryDetail(queryId: string | null, refreshKey = 0): DetailState | null {
  const [state, setState] = useState<DetailState | null>(null)

  useEffect(() => {
    if (!queryId) {
      setState(null)
      return
    }
    const controller = new AbortController()
    setState({ status: 'loading', data: null, error: null })

    api
      .query(queryId, controller.signal)
      .then((data) => setState({ status: 'success', data, error: null }))
      .catch((err: unknown) => {
        if (isAbort(err)) return
        if (err instanceof ApiError && err.status === 404) {
          setState({
            status: 'not-found',
            data: null,
            error: 'This query is no longer in pg_stat_statements (stats may have been reset).',
          })
        } else {
          setState({ status: 'error', data: null, error: errorMessage(err) })
        }
      })

    return () => controller.abort()
  }, [queryId, refreshKey])

  return state
}
