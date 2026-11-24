// One KPI tile: label, big animated number, optional hint, and a status
// (healthy/warning/critical) shown as coloured accent + text label.
import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { STATUS_LABEL, type Status } from '@/lib/thresholds'
import { AnimatedNumber } from './AnimatedNumber'

const STATUS_STYLES: Record<Status, { value: string; badge: string; bar: string }> = {
  healthy: { value: 'text-foreground', badge: 'text-success bg-success/10', bar: 'bg-success' },
  warning: { value: 'text-warning', badge: 'text-warning bg-warning/10', bar: 'bg-warning' },
  critical: { value: 'text-critical', badge: 'text-critical bg-critical/10', bar: 'bg-critical' },
  neutral: { value: 'text-foreground', badge: '', bar: 'bg-primary/60' },
}

interface KpiCardProps {
  label: string
  icon: LucideIcon
  value: number | null
  format: (value: number | null) => string
  status?: Status
  hint?: string
  loading?: boolean
}

export function KpiCard({ label, icon: Icon, value, format, status = 'neutral', hint, loading }: KpiCardProps) {
  const styles = STATUS_STYLES[status]

  return (
    <Card className="relative gap-0 overflow-hidden px-4 py-4 transition-colors hover:border-primary/30">
      {/* thin status bar on the left edge */}
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-0.5', styles.bar)} />

      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          <Icon aria-hidden className="size-3.5" />
          {label}
        </span>
        {status !== 'neutral' && status !== 'healthy' && (
          <span className={cn('rounded-full px-2 py-px text-[11px] font-medium', styles.badge)}>
            {STATUS_LABEL[status]}
          </span>
        )}
      </div>

      <div className="mt-3 min-h-9">
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <AnimatedNumber
            value={value}
            format={format}
            className={cn('tabular text-3xl font-semibold tracking-tight', styles.value)}
          />
        )}
      </div>

      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  )
}
