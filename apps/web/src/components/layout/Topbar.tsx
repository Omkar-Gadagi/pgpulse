// Top bar: which database we're watching, whether we're live, and how fresh
// the data is. The "Xs ago" text lives in its own component so the per-second
// tick re-renders only that span, not the whole bar.
import { Database } from 'lucide-react'
import { useLiveStatus } from '@/hooks/useLiveStatus'
import { useNow } from '@/hooks/useNow'
import { formatAge } from '@/lib/format'
import { LiveDot } from './LiveDot'
import { MobileNav } from './MobileNav'

function UpdatedAgo({ at }: { at: number | null }) {
  const now = useNow(1000)
  return (
    <span className="tabular hidden text-sm text-muted-foreground sm:inline">
      updated {formatAge(at, now)}
    </span>
  )
}

export function Topbar() {
  const { state, database, postgresVersion, lastUpdateAt } = useLiveStatus()

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur md:px-6">
      <MobileNav />

      <div className="flex min-w-0 items-center gap-2">
        <Database aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <span className="sr-only">Monitored database:</span>
        <span className="truncate font-mono text-sm font-medium">{database ?? '…'}</span>
        {postgresVersion && (
          <span className="hidden rounded border border-border px-1.5 py-px text-xs text-muted-foreground sm:inline">
            PostgreSQL {postgresVersion}
          </span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-4">
        <UpdatedAgo at={lastUpdateAt} />
        <LiveDot state={state} />
      </div>
    </header>
  )
}
