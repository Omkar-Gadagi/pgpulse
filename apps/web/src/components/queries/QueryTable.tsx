// Slow-query table.
// Keyboard: Tab into the table, ↑/↓ move between rows, Enter or Space opens
// the detail drawer. The selected row is marked with aria-selected and the
// sorted column with aria-sort, so screen readers announce both.
import type { KeyboardEvent } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { formatInteger, formatMs, formatPercent, oneLineSql } from '@/lib/format'
import type { QuerySort, QueryStats } from '@/lib/types'

interface QueryTableProps {
  queries: QueryStats[]
  sort: QuerySort
  selectedId: string | null
  onSelect: (queryId: string) => void
  /** first load: show skeleton rows */
  loading?: boolean
}

const COLUMNS: { key: string; label: string; sort?: QuerySort; className?: string }[] = [
  { key: 'query', label: 'Query' },
  { key: 'calls', label: 'Calls', sort: 'calls', className: 'text-right' },
  { key: 'total', label: 'Total', sort: 'total_time', className: 'text-right' },
  { key: 'mean', label: 'Mean', sort: 'mean_time', className: 'text-right' },
  { key: 'max', label: 'Max', className: 'text-right' },
  { key: 'pct', label: '% of total', className: 'w-40 text-right' },
]

function focusSiblingRow(row: HTMLTableRowElement, direction: 'next' | 'previous') {
  const sibling = direction === 'next' ? row.nextElementSibling : row.previousElementSibling
  if (sibling instanceof HTMLTableRowElement) sibling.focus()
}

export function QueryTable({ queries, sort, selectedId, onSelect, loading }: QueryTableProps) {
  const onRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, queryId: string) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault()
        onSelect(queryId)
        break
      case 'ArrowDown':
        event.preventDefault()
        focusSiblingRow(event.currentTarget, 'next')
        break
      case 'ArrowUp':
        event.preventDefault()
        focusSiblingRow(event.currentTarget, 'previous')
        break
    }
  }

  return (
    <Table aria-label="Slowest queries" aria-rowcount={loading ? undefined : queries.length + 1}>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {COLUMNS.map((col) => (
            <TableHead
              key={col.key}
              className={col.className}
              aria-sort={col.sort ? (col.sort === sort ? 'descending' : 'none') : undefined}
            >
              {col.label}
              {col.sort === sort && (
                <span aria-hidden className="ml-1 text-primary">
                  ↓
                </span>
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading
          ? Array.from({ length: 8 }, (_, i) => (
              <TableRow key={i} className="hover:bg-transparent">
                {COLUMNS.map((col) => (
                  <TableCell key={col.key}>
                    <Skeleton className={cn('h-4', col.key === 'query' ? 'w-full' : 'ml-auto w-14')} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          : queries.map((q) => {
              const sql = oneLineSql(q.query)
              const selected = q.queryId === selectedId
              return (
                <TableRow
                  key={q.queryId}
                  tabIndex={0}
                  aria-selected={selected}
                  aria-label={`${sql.slice(0, 80)}. ${formatInteger(q.calls)} calls, ${formatMs(q.totalExecTimeMs)} total. Press Enter for details.`}
                  data-state={selected ? 'selected' : undefined}
                  onClick={() => onSelect(q.queryId)}
                  onKeyDown={(e) => onRowKeyDown(e, q.queryId)}
                  className="cursor-pointer outline-none focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset data-[state=selected]:bg-primary/10"
                >
                  <TableCell className="w-full max-w-0">
                    <code className="block truncate text-xs" title={sql}>
                      {sql}
                    </code>
                  </TableCell>
                  <TableCell className="tabular text-right">{formatInteger(q.calls)}</TableCell>
                  <TableCell className="tabular text-right">{formatMs(q.totalExecTimeMs)}</TableCell>
                  <TableCell className="tabular text-right">{formatMs(q.meanExecTimeMs)}</TableCell>
                  <TableCell className="tabular text-right">{formatMs(q.maxExecTimeMs)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span aria-hidden className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                        <span
                          className="block h-full rounded-full bg-primary"
                          style={{ width: `${Math.min(100, q.percentOfTotal)}%` }}
                        />
                      </span>
                      <span className="tabular w-12">{formatPercent(q.percentOfTotal)}</span>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
      </TableBody>
    </Table>
  )
}
