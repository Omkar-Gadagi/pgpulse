// Small shared pieces for the Activity page: state badge and wait description.
import { cn } from '@/lib/utils'
import type { Session } from '@/lib/types'

const STATE_STYLES: Record<string, string> = {
  active: 'bg-primary/15 text-primary',
  idle: 'bg-muted text-muted-foreground',
  'idle in transaction': 'bg-warning/15 text-warning',
  'idle in transaction (aborted)': 'bg-critical/15 text-critical',
}

export function StateBadge({ state }: { state: string | null }) {
  const label = state ?? 'unknown'
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-px text-[11px] font-medium whitespace-nowrap',
        STATE_STYLES[label] ?? 'bg-muted text-muted-foreground',
      )}
    >
      {label}
    </span>
  )
}

/** "Lock: transactionid (ShareLock)" / "IO: DataFileRead" / "—" */
export function describeWait(session: Session): string {
  if (session.waitingFor) {
    const { locktype, mode, relation } = session.waitingFor
    return `Lock: ${locktype}${relation ? ` on ${relation}` : ''} (${mode})`
  }
  if (session.waitEventType && session.waitEventType !== 'Client') {
    return `${session.waitEventType}: ${session.waitEvent ?? '?'}`
  }
  return '—'
}

/** Plain-language explanation of a lock wait, for the detail drawer. */
export function explainWait(session: Session): string | null {
  if (!session.waitingFor) return null
  if (session.waitingFor.locktype === 'transactionid') {
    return 'Waiting for another transaction to commit or roll back, usually because both want to change the same row.'
  }
  if (session.waitingFor.locktype === 'relation') {
    return `Waiting for a lock on the table ${session.waitingFor.relation ?? ''}, e.g. behind an ALTER TABLE or explicit LOCK.`
  }
  if (session.waitingFor.locktype === 'tuple') {
    return 'Queued for a row lock behind another session that is already waiting for the same row.'
  }
  return null
}
