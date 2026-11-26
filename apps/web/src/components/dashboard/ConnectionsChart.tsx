// "Connections by state" live stacked area, last 15 minutes.
// The top edge of the stack is the total. Same live-update pattern as
// TpsChart: build options once, then addPoint on each of the three series and
// redraw ONCE per snapshot.
import { useEffect, useRef, useState } from 'react'
// Named import: the package is CommonJS and its default export doesn't survive Vite's interop
import { HighchartsReact, type HighchartsReactRefObject } from 'highcharts-react-official'
import type { Options } from 'highcharts'
import { Highcharts } from '@/charts/highcharts'
import { palette } from '@/charts/palette'
import { appendLivePoint, LIVE_WINDOW_MS } from '@/charts/liveWindow'
import type { MetricsFeed } from '@/hooks/useMetrics'
import type { MetricsSnapshot } from '@/lib/types'

// Order = stacking order from the bottom up
const SERIES = [
  { name: 'Active', color: palette.accent, pick: (s: MetricsSnapshot) => s.connections.active },
  {
    name: 'Idle in transaction',
    color: palette.warning,
    pick: (s: MetricsSnapshot) => s.connections.idleInTransaction,
  },
  { name: 'Idle', color: '#6b7a90', pick: (s: MetricsSnapshot) => s.connections.idle },
] as const

interface SharedTooltipContext {
  x: number
  points?: { y: number | null; color: string; series: { name: string } }[]
}

export function ConnectionsChart({ getPoints, subscribeLive }: MetricsFeed) {
  const chartRef = useRef<HighchartsReactRefObject>(null)

  const [options] = useState<Options>(() => {
    const cutoff = Date.now() - LIVE_WINDOW_MS
    const points = getPoints().filter((p) => Date.parse(p.ts) >= cutoff)

    return {
      chart: { type: 'area', height: 260 },
      accessibility: {
        description: 'Connections to the monitored database by state, stacked, over the last 15 minutes.',
      },
      xAxis: { type: 'datetime' },
      yAxis: { min: 0, allowDecimals: false },
      // Below the plot: three items don't fit beside the title on narrow cards
      legend: { enabled: true, align: 'center', verticalAlign: 'bottom', margin: 6, padding: 0, itemDistance: 16 },
      tooltip: {
        shared: true,
        formatter() {
          const ctx = this as unknown as SharedTooltipContext
          const rows = ctx.points ?? []
          const total = rows.reduce((sum, p) => sum + (p.y ?? 0), 0)
          return [
            `<span style="font-size:11px">${Highcharts.dateFormat('%H:%M:%S', ctx.x)}</span>`,
            ...rows.map((p) => `<span style="color:${p.color}">●</span> ${p.series.name}: <b>${p.y ?? '—'}</b>`),
            `Total: <b>${total}</b>`,
          ].join('<br/>')
        },
      },
      plotOptions: {
        area: {
          stacking: 'normal',
          lineWidth: 1.5,
          fillOpacity: 0.35,
          cropThreshold: 100_000,
        },
      },
      series: SERIES.map((s) => ({
        type: 'area' as const,
        name: s.name,
        color: s.color,
        data: points.map((p) => [Date.parse(p.ts), s.pick(p)] as [number, number | null]),
      })),
    }
  })

  useEffect(
    () =>
      subscribeLive((snapshot) => {
        const chart = chartRef.current?.chart
        if (!chart) return
        const x = Date.parse(snapshot.ts)
        SERIES.forEach((s, i) => appendLivePoint(chart.series[i], x, s.pick(snapshot)))
        chart.redraw() // one repaint for all three series
      }),
    [subscribeLive],
  )

  return <HighchartsReact ref={chartRef} highcharts={Highcharts} options={options} />
}
