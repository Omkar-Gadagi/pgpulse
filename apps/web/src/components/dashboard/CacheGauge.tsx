// "Cache hit ratio" solid gauge (80–100%). The arc colour follows the same
// thresholds as the KPI card. Created once; new values go through
// point.update() via the chart ref instead of re-creating the chart.
import { useEffect, useRef, useState } from 'react'
// Named import: the package is CommonJS and its default export doesn't survive Vite's interop
import { HighchartsReact, type HighchartsReactRefObject } from 'highcharts-react-official'
import type { Options } from 'highcharts'
import { Highcharts } from '@/charts/highcharts'
import { palette } from '@/charts/palette'
import { cacheHitStatus, type Status } from '@/lib/thresholds'

const GAUGE_MIN = 80
const GAUGE_MAX = 100

const STATUS_COLOR: Record<Status, string> = {
  healthy: palette.success,
  warning: palette.warning,
  critical: palette.critical,
  neutral: palette.textMuted,
}

/** The arc can't go below the axis minimum; the label still shows the real value. */
function toPoint(ratio: number | null) {
  const percent = ratio === null ? null : ratio * 100
  return {
    y: percent === null ? GAUGE_MIN : Math.max(GAUGE_MIN, Math.min(GAUGE_MAX, percent)),
    color: STATUS_COLOR[cacheHitStatus(ratio)],
    custom: { label: percent === null ? '—' : `${percent.toFixed(2)}%` },
  }
}

export function CacheGauge({ ratio }: { ratio: number | null }) {
  const chartRef = useRef<HighchartsReactRefObject>(null)

  const [options] = useState<Options>(() => ({
    chart: { type: 'solidgauge', height: 220 },
    accessibility: { description: 'Share of block reads served from shared buffers, average of the last 30 seconds.' },
    tooltip: { enabled: false },
    pane: {
      center: ['50%', '72%'],
      size: '130%',
      startAngle: -90,
      endAngle: 90,
      background: [
        {
          backgroundColor: 'rgba(255,255,255,0.06)',
          borderWidth: 0,
          innerRadius: '62%',
          outerRadius: '100%',
          shape: 'arc',
        },
      ],
    },
    yAxis: {
      min: GAUGE_MIN,
      max: GAUGE_MAX,
      lineWidth: 0,
      tickWidth: 0,
      minorTickInterval: undefined,
      // 99% (the warning line) sits too close to 100% to label both
      tickPositions: [GAUGE_MIN, 90, 95, GAUGE_MAX],
      labels: { distance: 14, format: '{value}%', style: { fontSize: '10px' } },
    },
    plotOptions: {
      solidgauge: {
        // The arc is drawn from `threshold` to the value. Highcharts 13 inherits
        // threshold: 0 here, which with an 80–100 axis puts the arc's start far
        // outside the pane and renders a full circle. Start it at the axis minimum.
        threshold: GAUGE_MIN,
        innerRadius: '62%',
        radius: '100%',
        dataLabels: {
          y: -28,
          borderWidth: 0,
          useHTML: false,
          format:
            '<span style="font-size:26px;font-weight:600;color:' +
            palette.text +
            '">{point.custom.label}</span>',
        },
      },
    },
    series: [{ type: 'solidgauge', name: 'Cache hit ratio', data: [toPoint(ratio)] }],
  }))

  useEffect(() => {
    const point = chartRef.current?.chart?.series[0]?.points[0]
    if (point) point.update(toPoint(ratio), true)
  }, [ratio])

  return <HighchartsReact ref={chartRef} highcharts={Highcharts} options={options} />
}
