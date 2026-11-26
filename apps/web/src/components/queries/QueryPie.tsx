// Donut: how the database's total execution time splits across the top 10
// statements, plus an "Other" slice for everything else. Clicking a slice or
// its legend entry opens that query's drawer.
//
// Layout is responsive: legend beside the donut when the card is wide (above
// the table), donut only when the card is narrow (2xl sidebar column, phones).
//
// The chart redraws only when its data really changes (Refresh); unlike the
// dashboard charts it isn't updated every 2 seconds.
import { useMemo } from 'react'
import { HighchartsReact } from 'highcharts-react-official'
import type { Options, PointOptionsObject } from 'highcharts'
import { Highcharts } from '@/charts/highcharts'
import { seriesColors } from '@/charts/palette'
import { formatMs, formatPercent, oneLineSql } from '@/lib/format'
import type { QueryStats } from '@/lib/types'

interface QueryPieProps {
  queries: QueryStats[]
  onSelect: (queryId: string) => void
}

interface SliceCustom {
  queryId?: string
  totalMs?: number
}

const OTHER_COLOR = '#3a4250'
const MONO = '"JetBrains Mono Variable", ui-monospace, monospace'

export function QueryPie({ queries, onSelect }: QueryPieProps) {
  const options = useMemo<Options>(() => {
    const top = queries.slice(0, 10)
    const topShare = top.reduce((sum, q) => sum + q.percentOfTotal, 0)
    const other = Math.max(0, 100 - topShare)

    const data: PointOptionsObject[] = top.map((q, i) => {
      const sql = oneLineSql(q.query)
      return {
        name: sql.length > 44 ? `${sql.slice(0, 44)}…` : sql,
        y: q.percentOfTotal,
        color: seriesColors[i % seriesColors.length],
        custom: { queryId: q.queryId, totalMs: q.totalExecTimeMs } satisfies SliceCustom,
      }
    })
    if (other >= 0.05) {
      data.push({ name: 'Other statements', y: Number(other.toFixed(2)), color: OTHER_COLOR, custom: {} })
    }

    const openSlice = (custom: unknown) => {
      const id = (custom as SliceCustom | undefined)?.queryId
      if (id) onSelect(id)
    }

    return {
      chart: { type: 'pie', height: 260 },
      accessibility: {
        description: 'Share of total execution time taken by each of the 10 slowest statements.',
        point: { valueSuffix: '%' },
      },
      tooltip: {
        pointFormatter() {
          const custom = (this.options.custom ?? {}) as SliceCustom
          const total = custom.totalMs !== undefined ? ` · ${formatMs(custom.totalMs)}` : ''
          return `<b>${formatPercent(this.y ?? null)}</b> of total time${total}`
        },
      },
      legend: {
        enabled: true,
        layout: 'vertical',
        align: 'right',
        verticalAlign: 'middle',
        itemMarginBottom: 3,
        itemStyle: { fontFamily: MONO, fontSize: '11px', fontWeight: '400' },
        labelFormatter() {
          const point = this as unknown as { name: string; y?: number }
          return `${point.name} <span style="opacity:.65">${formatPercent(point.y ?? null)}</span>`
        },
      },
      plotOptions: {
        pie: {
          innerSize: '55%',
          size: '90%',
          center: ['18%', '50%'],
          cursor: 'pointer',
          showInLegend: true,
          dataLabels: { enabled: false },
          point: {
            events: {
              click() {
                openSlice(this.options.custom)
              },
              // Default would hide the slice; open the query instead
              legendItemClick(event) {
                event.preventDefault()
                openSlice(this.options.custom)
              },
            },
          },
        },
      },
      responsive: {
        rules: [
          {
            // Narrow card (2xl sidebar column, phones): an 11-item legend would
            // squeeze the donut to nothing, so show the donut alone. The table
            // right next to it lists every statement anyway; tooltips still work.
            condition: { maxWidth: 560 },
            chartOptions: {
              chart: { height: 240 },
              legend: { enabled: false },
              plotOptions: { pie: { center: ['50%', '50%'], size: '90%' } },
            },
          },
        ],
      },
      series: [{ type: 'pie', name: 'Share of total time', data }],
    }
  }, [queries, onSelect])

  return <HighchartsReact highcharts={Highcharts} options={options} />
}
