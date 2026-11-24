import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface ChartCardProps {
  title: string
  description?: string
  /** right side of the header, e.g. "last 15 min" */
  meta?: ReactNode
  loading?: boolean
  /** chart height while loading, to avoid layout jump */
  height?: number
  children: ReactNode
}

export function ChartCard({ title, description, meta, loading, height = 260, children }: ChartCardProps) {
  return (
    <Card className="gap-3 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {meta && <div className="shrink-0 text-xs text-muted-foreground">{meta}</div>}
      </div>
      {loading ? <Skeleton className="w-full" style={{ height }} /> : children}
    </Card>
  )
}
