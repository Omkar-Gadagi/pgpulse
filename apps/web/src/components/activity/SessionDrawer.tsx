// Detail drawer for one session: full SQL, timings, what it waits for, and
// who it blocks / is blocked by (clickable, to walk the chain).
// If the session ends while the drawer is open, the last snapshot stays
// visible with an "ended" note instead of the drawer going blank.
import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { FormattedSql } from '@/components/queries/FormattedSql'
import { formatSeconds } from '@/lib/format'
import type { Session } from '@/lib/types'
import { describeWait, explainWait, StateBadge } from './SessionState'

interface SessionDrawerProps {
  session: Session | null
  /** false when the session is no longer in the latest snapshot */
  stillConnected: boolean
  open: boolean
  onClose: () => void
  onSelect: (pid: number) => void
  /** Where keyboard focus should go after closing (the drawer has no trigger button). */
  getReturnFocus: () => HTMLElement | null
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="tabular mt-1 text-sm font-medium break-words">{children}</dd>
    </div>
  )
}

function PidLinks({ pids, onSelect }: { pids: number[]; onSelect: (pid: number) => void }) {
  if (pids.length === 0) return <span className="text-muted-foreground">none</span>
  return (
    <span className="flex flex-wrap gap-1.5">
      {pids.map((pid) => (
        <button
          key={pid}
          type="button"
          onClick={() => onSelect(pid)}
          className="rounded bg-muted px-1.5 py-px font-mono text-xs outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Open session ${pid}`}
        >
          {pid}
        </button>
      ))}
    </span>
  )
}

export function SessionDrawer({ session: s, stillConnected, open, onClose, onSelect, getReturnFocus }: SessionDrawerProps) {
  const explanation = s ? explainWait(s) : null

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto sm:max-w-xl"
        onCloseAutoFocus={(event) => {
          const target = getReturnFocus()
          if (target) {
            event.preventDefault()
            target.focus()
          }
        }}
      >
        <SheetHeader className="border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            Session <span className="font-mono">{s?.pid ?? '—'}</span>
            {s && <StateBadge state={s.state} />}
          </SheetTitle>
          <SheetDescription>
            {s ? `${s.applicationName ?? 'unknown application'} · ${s.username ?? 'unknown user'}` : 'Session not found'}
          </SheetDescription>
        </SheetHeader>

        {s && (
          <div className="flex flex-col gap-5 p-4">
            {!stillConnected && (
              <p role="status" className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
                <Info aria-hidden className="size-4 text-muted-foreground" />
                This session has ended or changed. Showing its last known state.
              </p>
            )}

            {explanation && (
              <p role="note" className="rounded-lg border border-critical/30 bg-critical/10 px-3 py-2 text-sm">
                {explanation}
              </p>
            )}
            {s.state?.startsWith('idle in transaction') && s.blocking.length > 0 && (
              <p role="note" className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm">
                This session holds locks but is idle: its client opened a transaction and hasn't committed. Every
                session queued behind it waits until it commits, rolls back, or is terminated.
              </p>
            )}

            <section aria-label="Current or last query">
              <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {s.state === 'active' ? 'Running query' : 'Last query'}
              </h3>
              {s.query ? <FormattedSql sql={s.query} /> : <p className="text-sm text-muted-foreground">No query text.</p>}
            </section>

            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Field label="Transaction open">{formatSeconds(s.xactSeconds)}</Field>
              <Field label="Query running">{formatSeconds(s.querySeconds)}</Field>
              <Field label="In this state">{formatSeconds(s.stateSeconds)}</Field>
              <Field label="Connected for">{formatSeconds(s.connectedSeconds)}</Field>
              <Field label="Client">{s.clientAddr ?? 'local socket'}</Field>
              <Field label="Waiting on">{describeWait(s)}</Field>
              <Field label="Blocked by">
                <PidLinks pids={s.blockedBy} onSelect={onSelect} />
              </Field>
              <Field label="Blocking">
                <PidLinks pids={s.blocking} onSelect={onSelect} />
              </Field>
            </dl>

            <p className="text-xs text-muted-foreground">
              pgPulse is read-only, so it won't cancel or terminate sessions. To end one, a DBA can run{' '}
              <code className="text-foreground">SELECT pg_terminate_backend({s.pid});</code>
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
