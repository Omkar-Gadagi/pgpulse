// Live sessions table. Blocked sessions get a red edge, blockers an amber one.
// Keyboard: Tab into the table, ↑/↓ between rows, Enter or Space for details.
import type { KeyboardEvent } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatSeconds, oneLineSql } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Session } from '@/lib/types'
import { describeWait, StateBadge } from './SessionState'

interface SessionTableProps {
  sessions: Session[]
  selectedPid: number | null
  onSelect: (pid: number) => void
}

function focusSibling(row: HTMLTableRowElement, next: boolean) {
  const sibling = next ? row.nextElementSibling : row.previousElementSibling
  if (sibling instanceof HTMLTableRowElement) sibling.focus()
}

/** The most useful "how long" for a session: open transaction, else current query/state. */
function durationOf(s: Session): number | null {
  return s.xactSeconds ?? (s.state === 'active' ? s.querySeconds : s.stateSeconds)
}

export function SessionTable({ sessions, selectedPid, onSelect }: SessionTableProps) {
  const onKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, pid: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(pid)
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      focusSibling(event.currentTarget, event.key === 'ArrowDown')
    }
  }

  return (
    <Table aria-label="Sessions">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-20">PID</TableHead>
          <TableHead>Application</TableHead>
          <TableHead>State</TableHead>
          <TableHead>Waiting on</TableHead>
          <TableHead className="text-right">Duration</TableHead>
          <TableHead className="w-full">Query</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((s) => {
          const blocked = s.blockedBy.length > 0
          const blocker = s.blocking.length > 0
          const sql = oneLineSql(s.query)
          return (
            <TableRow
              key={s.pid}
              data-pid={s.pid}
              tabIndex={0}
              aria-selected={s.pid === selectedPid}
              data-state={s.pid === selectedPid ? 'selected' : undefined}
              aria-label={`Session ${s.pid}, ${s.applicationName ?? 'unknown application'}, ${s.state ?? 'unknown state'}${
                blocked ? `, blocked by ${s.blockedBy.join(', ')}` : ''
              }${blocker ? `, blocking ${s.blocking.join(', ')}` : ''}. Press Enter for details.`}
              onClick={() => onSelect(s.pid)}
              onKeyDown={(e) => onKeyDown(e, s.pid)}
              className={cn(
                'cursor-pointer outline-none focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset data-[state=selected]:bg-primary/10',
                blocked && 'shadow-[inset_3px_0_0_var(--critical)]',
                !blocked && blocker && 'shadow-[inset_3px_0_0_var(--warning)]',
              )}
            >
              <TableCell className="tabular font-mono text-xs">{s.pid}</TableCell>
              <TableCell className="max-w-48">
                <span className="block truncate text-xs" title={s.applicationName ?? undefined}>
                  {s.applicationName ?? <span className="text-muted-foreground">—</span>}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">{s.username ?? ''}</span>
              </TableCell>
              <TableCell>
                <StateBadge state={s.state} />
              </TableCell>
              <TableCell className={cn('text-xs whitespace-nowrap', blocked ? 'text-critical' : 'text-muted-foreground')}>
                {blocked ? `pid ${s.blockedBy.join(', ')} · ` : ''}
                {describeWait(s)}
              </TableCell>
              <TableCell className="tabular text-right text-xs whitespace-nowrap">{formatSeconds(durationOf(s))}</TableCell>
              <TableCell className="max-w-0">
                <code className="block truncate text-xs" title={sql}>
                  {sql || <span className="text-muted-foreground">—</span>}
                </code>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
