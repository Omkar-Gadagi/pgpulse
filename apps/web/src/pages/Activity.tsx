// Activity & Locks: who is connected, what they're doing, and who blocks whom.
// Data: GET /api/activity, polled every 3s (see useActivity).
// URL state: ?filter= (session filter) and ?pid= (open drawer), like the Queries page.
import { useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router'
import { Hourglass, Lock, Pause, Play, Plug, RefreshCw, Timer, TriangleAlert, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { BlockingTree } from '@/components/activity/BlockingTree'
import { SessionTable } from '@/components/activity/SessionTable'
import { SessionDrawer } from '@/components/activity/SessionDrawer'
import { ACTIVITY_POLL_MS, useActivity } from '@/hooks/useActivity'
import { formatInteger, formatSeconds } from '@/lib/format'
import { blockedStatus, longTransactionStatus } from '@/lib/thresholds'
import { cn } from '@/lib/utils'
import type { Session } from '@/lib/types'

type Filter = 'busy' | 'all' | 'active' | 'idle-tx' | 'waiting'

const FILTERS: { value: Filter; label: string; test: (s: Session) => boolean }[] = [
  { value: 'busy', label: 'Not idle', test: (s) => s.state !== 'idle' },
  { value: 'all', label: 'All', test: () => true },
  { value: 'active', label: 'Active', test: (s) => s.state === 'active' },
  { value: 'idle-tx', label: 'Idle in transaction', test: (s) => !!s.state?.startsWith('idle in transaction') },
  { value: 'waiting', label: 'Waiting on lock', test: (s) => s.blockedBy.length > 0 || s.waitEventType === 'Lock' },
]
const isFilter = (v: string | null): v is Filter => FILTERS.some((f) => f.value === v)

export default function Activity() {
  const { data, error, paused, live, togglePaused, refresh } = useActivity()
  const [params, setParams] = useSearchParams()

  const filterParam = params.get('filter')
  const filter: Filter = isFilter(filterParam) ? filterParam : 'busy'
  const pidParam = params.get('pid')
  const selectedPid = pidParam && /^\d+$/.test(pidParam) ? Number(pidParam) : null

  const updateParams = useCallback(
    (changes: Record<string, string | null>) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(changes)) {
            if (v === null) next.delete(k)
            else next.set(k, v)
          }
          return next
        },
        { replace: true },
      ),
    [setParams],
  )

  // Keep the last snapshot of every session we've seen, so the drawer can keep
  // showing a session that just finished instead of going blank.
  const lastSeen = useRef(new Map<number, Session>())
  for (const s of data?.sessions ?? []) lastSeen.current.set(s.pid, s)

  const current = selectedPid !== null ? data?.sessions.find((s) => s.pid === selectedPid) : undefined
  const selected = current ?? (selectedPid !== null ? lastSeen.current.get(selectedPid) ?? null : null)

  const returnFocus = useRef<HTMLElement | null>(null)
  const closingPid = useRef<number | null>(null)
  const openSession = (pid: number) => {
    if (selectedPid === null) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    }
    updateParams({ pid: String(pid) })
  }

  const sessions = data?.sessions ?? []
  const activeFilter = FILTERS.find((f) => f.value === filter) ?? FILTERS[0]
  const visible = sessions.filter(activeFilter.test)
  const summary = data?.summary
  const loading = data === null

  return (
    <>
      <PageHeader
        title="Activity & Locks"
        description="Live sessions from pg_stat_activity, and who is blocking whom."
        actions={
          <>
            <span className="text-xs text-muted-foreground" aria-live="polite">
              {live ? `Refreshing every ${ACTIVITY_POLL_MS / 1000}s` : paused ? 'Paused' : 'Paused while tab is hidden'}
            </span>
            <Button variant="outline" size="sm" onClick={togglePaused} aria-pressed={paused}>
              {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
              {paused ? 'Resume' : 'Pause'}
            </Button>
            <Button variant="outline" size="icon" onClick={refresh} aria-label="Refresh sessions now">
              <RefreshCw aria-hidden />
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-4">
        {error && (
          <p role="alert" className="flex items-center gap-2 rounded-lg border border-critical/30 bg-critical/10 px-3 py-2 text-sm">
            <TriangleAlert aria-hidden className="size-4 text-critical" />
            Couldn't refresh sessions: {error}
            {data && <span className="text-muted-foreground">Showing the last snapshot.</span>}
          </p>
        )}

        <section aria-label="Session summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <KpiCard label="Sessions" icon={Users} value={summary?.total ?? null} format={formatInteger} hint="client connections" loading={loading} />
          <KpiCard label="Active" icon={Plug} value={summary?.active ?? null} format={formatInteger} hint="running a query now" loading={loading} />
          <KpiCard
            label="Idle in transaction"
            icon={Hourglass}
            value={summary?.idleInTransaction ?? null}
            format={formatInteger}
            hint="open transaction, client silent"
            loading={loading}
          />
          <KpiCard
            label="Blocked"
            icon={Lock}
            value={summary?.blocked ?? null}
            format={formatInteger}
            status={summary ? blockedStatus(summary.blocked) : 'neutral'}
            hint="waiting on another session's lock"
            loading={loading}
          />
          <KpiCard
            label="Longest transaction"
            icon={Timer}
            value={summary?.longestTransactionSeconds ?? null}
            format={formatSeconds}
            status={longTransactionStatus(summary?.longestTransactionSeconds ?? null)}
            hint="warn > 1 min"
            loading={loading}
          />
        </section>

        <Card className="gap-3 px-4 py-4">
          <div>
            <h2 className="text-sm font-semibold">Blocking</h2>
            <p className="text-xs text-muted-foreground">
              Top line = the session holding the lock. Indented = sessions queued behind it (from pg_blocking_pids).
            </p>
          </div>
          {loading ? <Skeleton className="h-12 w-full" /> : <BlockingTree sessions={sessions} onSelect={openSession} />}
        </Card>

        <Card className="gap-2 px-2 py-2">
          <div className="flex flex-wrap items-center gap-1 px-2 pt-1" role="group" aria-label="Filter sessions">
            {FILTERS.map((f) => {
              const count = sessions.filter(f.test).length
              const pressed = f.value === filter
              return (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => updateParams({ filter: f.value === 'busy' ? null : f.value })}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    pressed ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {f.label} <span className="tabular opacity-70">{loading ? '' : count}</span>
                </button>
              )
            })}
          </div>

          {loading ? (
            <div className="flex flex-col gap-2 p-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No sessions match this filter right now.</p>
          ) : (
            <SessionTable sessions={visible} selectedPid={selectedPid} onSelect={openSession} />
          )}
        </Card>
      </div>

      <SessionDrawer
        open={selectedPid !== null}
        session={selected}
        stillConnected={current !== undefined}
        onClose={() => {
          closingPid.current = selectedPid
          updateParams({ pid: null })
        }}
        onSelect={openSession}
        getReturnFocus={() => {
          // 1. the element that opened the drawer, if it still exists
          //    (a tree line vanishes as soon as the block resolves)
          if (returnFocus.current?.isConnected) return returnFocus.current
          // 2. otherwise that session's row in the table, 3. otherwise the page
          const row = document.querySelector<HTMLElement>(`tr[data-pid="${closingPid.current}"]`)
          return row ?? document.getElementById('main')
        }}
      />
    </>
  )
}
