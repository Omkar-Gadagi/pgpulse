// Queries page: search + sort + table of the slowest statements, a pie of the
// top 10's share of total time, and a detail drawer.
//
// URL is the source of truth for sort (?sort=), search (?q=) and the open
// drawer (?queryId=), so links are shareable and the dashboard can deep-link
// straight to one query.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { RefreshCw, Search, SearchX, TriangleAlert, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryTable } from '@/components/queries/QueryTable'
import { QueryDrawer } from '@/components/queries/QueryDrawer'
import { QueryPie } from '@/components/queries/QueryPie'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useQueryList } from '@/hooks/useQueries'
import { formatMs } from '@/lib/format'
import type { QuerySort } from '@/lib/types'

const LIMIT = 50
const SORT_OPTIONS: { value: QuerySort; label: string }[] = [
  { value: 'total_time', label: 'Total time' },
  { value: 'mean_time', label: 'Mean time' },
  { value: 'calls', label: 'Calls' },
]
const isSort = (value: string | null): value is QuerySort => SORT_OPTIONS.some((o) => o.value === value)

export default function Queries() {
  const [params, setParams] = useSearchParams()
  const sortParam = params.get('sort')
  const sort: QuerySort = isSort(sortParam) ? sortParam : 'total_time'
  const queryId = params.get('queryId')

  // The input updates instantly; the request waits until typing pauses for 300ms
  const [searchInput, setSearchInput] = useState(() => params.get('q') ?? '')
  const search = useDebouncedValue(searchInput.trim(), 300)
  const [refreshKey, setRefreshKey] = useState(0)

  /** Update some URL params, keeping the rest. replace: no history entry per keystroke. */
  const updateParams = useCallback(
    (changes: Record<string, string | null>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(changes)) {
            if (value === null || value === '') next.delete(key)
            else next.set(key, value)
          }
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  // Mirror the debounced search into the URL
  useEffect(() => {
    if ((params.get('q') ?? '') !== search) updateParams({ q: search || null })
  }, [search, params, updateParams])

  const list = useQueryList({ sort, search, limit: LIMIT, refreshKey })
  // The pie always shows the top 10 by TOTAL time, whatever the table is sorted by
  const pie = useQueryList({ sort: 'total_time', search: '', limit: 10, refreshKey })

  // Remember what had focus (a table row, a pie slice) so closing the drawer returns there
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const openQuery = useCallback(
    (id: string) => {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      updateParams({ queryId: id })
    },
    [updateParams],
  )
  const closeQuery = useCallback(() => updateParams({ queryId: null }), [updateParams])

  const rows = list.data?.queries ?? []
  const firstLoad = list.status === 'loading' && list.data === null

  return (
    <>
      <PageHeader
        title="Queries"
        description="Slowest statements recorded by pg_stat_statements."
        actions={
          <>
            <div className="relative w-full sm:w-72">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search SQL text…"
                aria-label="Search query text"
                className="pr-8 pl-8"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X aria-hidden className="size-4" />
                </button>
              )}
            </div>

            <Select value={sort} onValueChange={(value) => updateParams({ sort: value === 'total_time' ? null : value })}>
              <SelectTrigger aria-label="Sort queries by" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    Sort: {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setRefreshKey((n) => n + 1)}
              aria-label="Refresh queries"
              disabled={list.status === 'loading'}
            >
              <RefreshCw aria-hidden className={list.status === 'loading' ? 'animate-spin' : undefined} />
            </Button>
          </>
        }
      />

      {/* Pie sits beside the table only on very wide screens; otherwise above it,
          so the SQL column keeps enough width to be readable. */}
      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="order-2 gap-0 px-2 py-2 2xl:order-1">
          {list.status === 'error' && (
            <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center">
              <TriangleAlert aria-hidden className="size-8 text-critical" />
              <p className="font-medium">Couldn't load queries</p>
              <p className="max-w-md text-sm text-muted-foreground">{list.error}</p>
              <Button variant="outline" size="sm" onClick={() => setRefreshKey((n) => n + 1)}>
                <RefreshCw aria-hidden /> Try again
              </Button>
            </div>
          )}

          {list.status !== 'error' && !firstLoad && rows.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <SearchX aria-hidden className="size-8 text-muted-foreground" />
              <p className="font-medium">{search ? 'No queries match' : 'No statements recorded yet'}</p>
              <p className="text-sm text-muted-foreground">
                {search ? (
                  <>
                    Nothing contains <code className="text-foreground">{search}</code>.{' '}
                    <button
                      type="button"
                      className="rounded-sm text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => setSearchInput('')}
                    >
                      Clear search
                    </button>
                  </>
                ) : (
                  'pg_stat_statements fills up as the database is used.'
                )}
              </p>
            </div>
          )}

          {list.status !== 'error' && (firstLoad || rows.length > 0) && (
            <>
              <QueryTable queries={rows} sort={sort} selectedId={queryId} onSelect={openQuery} loading={firstLoad} />
              {!firstLoad && (
                <p className="px-2 pt-3 pb-1 text-xs text-muted-foreground" aria-live="polite">
                  Showing {rows.length} statement{rows.length === 1 ? '' : 's'}
                  {search ? ` matching “${search}”` : ''} · top {LIMIT}
                  {list.data?.totalExecTimeMs ? ` · all statements: ${formatMs(list.data.totalExecTimeMs)} total` : ''}
                </p>
              )}
            </>
          )}
        </Card>

        <Card className="order-1 gap-2 px-4 py-4 2xl:order-2 2xl:self-start">
          <div>
            <h2 className="text-sm font-semibold">Where the time goes</h2>
            <p className="text-xs text-muted-foreground">Top 10 statements' share of total execution time</p>
          </div>
          {pie.data ? (
            <QueryPie queries={pie.data.queries} onSelect={openQuery} />
          ) : pie.status === 'error' ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Chart unavailable.</p>
          ) : (
            <Skeleton className="mx-auto my-4 size-52 rounded-full" />
          )}
        </Card>
      </div>

      <QueryDrawer
        queryId={queryId}
        onClose={closeQuery}
        refreshKey={refreshKey}
        returnFocusTo={() => returnFocusRef.current}
      />
    </>
  )
}
