// "Transactions/sec" live line, last 15 minutes.
//
// Options are built ONCE (useState initialiser) from the buffered history.
// After that, each live point is appended through the chart ref with
// series.addPoint, so React never re-renders this chart.
import { useEffect, useRef, useState } from 'react'
// Named import: the package is CommonJS and its default export doesn't survive Vite's interop
import { HighchartsReact, type HighchartsReactRefObject } from 'highcharts-react-official'
import type { Options } from 'highcharts'
import { Highcharts } from '@/charts/highcharts'
import { palette } from '@/charts/palette'
import { appendLivePoint, LIVE_WINDOW_MS } from '@/charts/liveWindow'
import { formatDecimal } from '@/lib/format'
import type { MetricsFeed } from '@/hooks/useMetrics'

export function TpsChart({ getPoints, subscribeLive }: MetricsFeed) {
  const chartRef = useRef<HighchartsReactRefObject>(null)

  const [options] = useState<Options>(() => {
    const cutoff = Date.now() - LIVE_WINDOW_MS
    const data = getPoints()
      .filter((p) => Date.parse(p.ts) >= cutoff)
      .map((p) => [Date.parse(p.ts), p.tps] as [number, number | null])

    return {
      chart: { type: 'areaspline', height: 260 },
      accessibility: { description: 'Transactions per second over the last 15 minutes, updated live.' },
      xAxis: { type: 'datetime' },
      yAxis: { min: 0, labels: { format: '{value:,.0f}' } },
      legend: { enabled: false },
      tooltip: {
        xDateFormat: '%H:%M:%S',
        pointFormatter() {
          return `Transactions/sec: <b>${formatDecimal(this.y ?? null)}</b>`
        },
      },
      plotOptions: {
        areaspline: {
          lineWidth: 2,
          // keep all points in series.data (needed by the sliding window)
          cropThreshold: 100_000,
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, 'rgba(74,168,236,0.35)'],
              [1, 'rgba(74,168,236,0)'],
            ],
          },
        },
      },
      series: [{ type: 'areaspline', name: 'Transactions/sec', color: palette.accent, data }],
    }
  })

  useEffect(
    () =>
      subscribeLive((snapshot) => {
        const chart = chartRef.current?.chart
        if (!chart) return
        appendLivePoint(chart.series[0], Date.parse(snapshot.ts), snapshot.tps)
        chart.redraw()
      }),
    [subscribeLive],
  )

  return <HighchartsReact ref={chartRef} highcharts={Highcharts} options={options} />
}
