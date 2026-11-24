// Top 5 slowest statements (by total time), pushed every 10s via queries:top.
// Each row opens the Queries page with that query's drawer open.
// Rows are focusable: Tab to a row, Enter or Space to open it.
import type { KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatInteger, formatMs, formatPercent, oneLineSql } from '@/lib/format'
import type { TopQueries as TopQueriesData } from '@/lib/types'
import { ChartCard } from './ChartCard'

export function TopQueries({ data }: { data: TopQueriesData | null }) {
  const navigate = useNavigate()
  const open = (queryId: string) => navigate(`/queries?queryId=${encodeURIComponent(queryId)}`)

  const onRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, queryId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      open(queryId)
    }
  }

  return (
    <ChartCard
      title="Top 5 slowest queries"
      description="By total execution time · refreshed every 10s"
      meta={
        <Link
          to="/queries"
          className="inline-flex items-center gap-1 rounded-sm text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          All queries <ArrowRight aria-hidden className="size-3" />
        </Link>
      }
    >
      {data === null ? (
        <div className="flex flex-col gap-2" aria-label="Loading top queries">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : data.queries.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No statements recorded yet. pg_stat_statements fills up as the database is used.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Query</TableHead>
              <TableHead className="text-right">Calls</TableHead>
              <TableHead className="text-right">Mean</TableHead>
              <TableHead className="w-36 text-right">% of total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.queries.map((q) => (
              <TableRow
                key={q.queryId}
                tabIndex={0}
                aria-label={`Open details for query: ${oneLineSql(q.query).slice(0, 80)}`}
                onClick={() => open(q.queryId)}
                onKeyDown={(e) => onRowKeyDown(e, q.queryId)}
                className="cursor-pointer outline-none focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <TableCell className="max-w-0 w-full">
                  <code className="block truncate text-xs" title={oneLineSql(q.query)}>
                    {oneLineSql(q.query)}
                  </code>
                </TableCell>
                <TableCell className="tabular text-right">{formatInteger(q.calls)}</TableCell>
                <TableCell className="tabular text-right">{formatMs(q.meanExecTimeMs)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span aria-hidden className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(100, q.percentOfTotal)}%` }}
                      />
                    </span>
                    <span className="tabular w-12">{formatPercent(q.percentOfTotal)}</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </ChartCard>
  )
}
