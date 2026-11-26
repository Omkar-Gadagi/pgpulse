// Side drawer with one statement's full SQL and stats.
// Opens whenever ?queryId= is in the URL (row click, dashboard link, or a
// pasted link) and always fetches fresh details from /api/queries/:id.
import type { ReactNode } from 'react'
import { SearchX } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useQueryDetail } from '@/hooks/useQueries'
import { formatInteger, formatMs, formatPercent, formatRatio } from '@/lib/format'
import { cacheHitStatus } from '@/lib/thresholds'
import { cn } from '@/lib/utils'
import { FormattedSql } from './FormattedSql'

interface QueryDrawerProps {
  queryId: string | null
  onClose: () => void
  refreshKey: number
  /** Element to focus again when the drawer closes (the row that opened it). */
  returnFocusTo?: () => HTMLElement | null
}

function Stat({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className={cn('tabular mt-1 text-base font-semibold', className)}>{value}</dd>
    </div>
  )
}

const CACHE_COLOR = { healthy: 'text-success', warning: 'text-warning', critical: 'text-critical', neutral: '' }

export function QueryDrawer({ queryId, onClose, refreshKey, returnFocusTo }: QueryDrawerProps) {
  const detail = useQueryDetail(queryId, refreshKey)
  const q = detail?.status === 'success' ? detail.data : null

  return (
    <Sheet open={queryId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto sm:max-w-xl"
        // The drawer is opened from the URL, not a trigger button, so Radix has
        // nowhere to return focus. Send keyboard users back to the row they left.
        onCloseAutoFocus={(event) => {
          const target = returnFocusTo?.()
          if (target?.isConnected) {
            event.preventDefault()
            target.focus()
          }
        }}
      >
        <SheetHeader className="border-b border-border">
          <SheetTitle>Query details</SheetTitle>
          <SheetDescription className="font-mono text-xs">
            queryid {queryId ?? '—'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 p-4">
          {detail?.status === 'loading' && (
            <>
              <Skeleton className="h-40 w-full" />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            </>
          )}

          {(detail?.status === 'not-found' || detail?.status === 'error') && (
            <div role="alert" className="flex flex-col items-center gap-2 py-12 text-center">
              <SearchX aria-hidden className="size-8 text-muted-foreground" />
              <p className="font-medium">{detail.status === 'not-found' ? 'Query not found' : 'Could not load query'}</p>
              <p className="max-w-sm text-sm text-muted-foreground">{detail.error}</p>
            </div>
          )}

          {q && (
            <>
              <section aria-label="SQL">
                <FormattedSql sql={q.query} />
              </section>

              <section aria-label="Statistics">
                <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Stat label="Calls" value={formatInteger(q.calls)} />
                  <Stat label="Total time" value={formatMs(q.totalExecTimeMs)} />
                  <Stat label="% of total" value={formatPercent(q.percentOfTotal)} className="text-primary" />
                  <Stat label="Mean" value={formatMs(q.meanExecTimeMs)} />
                  <Stat label="Min" value={formatMs(q.minExecTimeMs)} />
                  <Stat label="Max" value={formatMs(q.maxExecTimeMs)} />
                  <Stat label="Rows" value={formatInteger(q.rows)} />
                  <Stat label="Rows / call" value={q.calls ? (q.rows / q.calls).toFixed(1) : '—'} />
                  <Stat
                    label="Cache hit"
                    value={formatRatio(q.cacheHitRatio)}
                    className={CACHE_COLOR[cacheHitStatus(q.cacheHitRatio)]}
                  />
                </dl>
                <p className="mt-3 text-xs text-muted-foreground">
                  Times are cumulative since pg_stat_statements was last reset. Cache hit = shared blocks found in
                  memory ÷ (found + read from disk) for this statement.
                </p>
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
