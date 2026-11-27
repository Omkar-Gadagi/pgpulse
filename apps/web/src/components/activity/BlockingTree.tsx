// "Who blocks whom", as nested lists:
//   pid 216  loadgen-lock-holder  idle in transaction 18s   ← the culprit
//     └ pid 224  loadgen-lock-waiter  waiting 16s
//         └ pid 231 …
// Each line is a button that opens the session's detail drawer.
import { ShieldCheck } from 'lucide-react'
import { buildBlockingTrees, countWaiting, type BlockingNode } from '@/lib/blockingTree'
import { formatSeconds, oneLineSql } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Session } from '@/lib/types'
import { StateBadge } from './SessionState'

interface BlockingTreeProps {
  sessions: Session[]
  onSelect: (pid: number) => void
}

function NodeRow({ node, depth, onSelect }: { node: BlockingNode; depth: number; onSelect: (pid: number) => void }) {
  const s = node.session
  const isRoot = depth === 0
  const waitingBelow = countWaiting(node)

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(s.pid)}
        className={cn(
          'flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none',
          'hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring',
        )}
        aria-label={
          isRoot
            ? `Session ${s.pid} is blocking ${waitingBelow} other session${waitingBelow === 1 ? '' : 's'}. Open details.`
            : `Session ${s.pid} is waiting for a lock held by its parent. Open details.`
        }
      >
        {!isRoot && (
          <span aria-hidden className="text-muted-foreground">
            └
          </span>
        )}
        <span
          className={cn(
            'tabular shrink-0 rounded px-1.5 py-px font-mono text-xs font-semibold',
            isRoot ? 'bg-critical/15 text-critical' : 'bg-warning/15 text-warning',
          )}
        >
          {s.pid}
        </span>
        <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
          {s.applicationName ?? s.username ?? 'unknown'}
        </span>
        <StateBadge state={s.state} />
        <span className="tabular shrink-0 text-xs text-muted-foreground">
          {isRoot
            ? `xact ${formatSeconds(s.xactSeconds)}`
            : `waiting ${formatSeconds(s.stateSeconds ?? s.querySeconds)}`}
        </span>
        <code className="min-w-0 truncate text-xs text-muted-foreground" title={oneLineSql(s.query)}>
          {oneLineSql(s.query) || '—'}
        </code>
        {isRoot && (
          <span className="ml-auto shrink-0 rounded-full bg-critical/10 px-2 py-px text-[11px] font-medium text-critical">
            blocking {waitingBelow}
          </span>
        )}
      </button>
      {node.children.length > 0 && (
        <ul className="ml-5 border-l border-border pl-2">
          {node.children.map((child) => (
            <NodeRow key={child.session.pid} node={child} depth={depth + 1} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  )
}

export function BlockingTree({ sessions, onSelect }: BlockingTreeProps) {
  const trees = buildBlockingTrees(sessions)

  if (trees.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-success/25 bg-success/5 px-4 py-3 text-sm">
        <ShieldCheck aria-hidden className="size-5 text-success" />
        <div>
          <p className="font-medium">No blocking right now</p>
          <p className="text-xs text-muted-foreground">No session is waiting on a lock held by another session.</p>
        </div>
      </div>
    )
  }

  return (
    <ul aria-label="Blocking chains" className="flex flex-col gap-2">
      {trees.map((tree) => (
        <NodeRow key={tree.session.pid} node={tree} depth={0} onSelect={onSelect} />
      ))}
    </ul>
  )
}
