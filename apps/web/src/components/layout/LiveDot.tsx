// Pulsing status dot. Colour AND text carry the meaning (never colour alone),
// and the pulse animation is switched off by prefers-reduced-motion in index.css.
import { cn } from '@/lib/utils'
import type { ConnectionState } from '@/app/liveStatusContext'

const STYLES: Record<ConnectionState, { dot: string; label: string }> = {
  live: { dot: 'bg-success', label: 'Live' },
  connecting: { dot: 'bg-warning', label: 'Connecting' },
  'target-down': { dot: 'bg-critical', label: 'Database unreachable' },
  'server-down': { dot: 'bg-critical', label: 'Disconnected' },
}

export function LiveDot({ state }: { state: ConnectionState }) {
  const { dot, label } = STYLES[state]
  return (
    <span className="inline-flex items-center gap-2 text-sm" role="status" aria-live="polite">
      <span className="relative flex size-2.5" aria-hidden>
        {state === 'live' && (
          <span className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-60', dot)} />
        )}
        <span className={cn('relative inline-flex size-2.5 rounded-full', dot)} />
      </span>
      <span className="font-medium">{label}</span>
    </span>
  )
}
