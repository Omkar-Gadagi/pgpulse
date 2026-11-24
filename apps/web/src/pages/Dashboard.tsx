// Dashboard: 5 KPI cards → TPS + connections charts → top queries + cache gauge.
// Data flow is all in useMetrics(): history back-fill, then live socket updates.
import { Activity, Database, Gauge, Plug, Timer } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { ChartCard } from '@/components/dashboard/ChartCard'
import { TpsChart } from '@/components/dashboard/TpsChart'
import { ConnectionsChart } from '@/components/dashboard/ConnectionsChart'
import { CacheGauge } from '@/components/dashboard/CacheGauge'
import { TopQueries } from '@/components/dashboard/TopQueries'
import { useMetrics } from '@/hooks/useMetrics'
import { formatBytes, formatDecimal, formatInteger, formatRatio, formatSeconds } from '@/lib/format'
import { cacheHitStatus, longestQueryStatus } from '@/lib/thresholds'

export default function Dashboard() {
  const { latest, cacheHitAvg, topQueries, historyStatus, getPoints, subscribeLive } = useMetrics()

  const loading = latest === null
  // Prefer the 30s average; fall back to the latest single reading on first load
  const cacheHit = cacheHitAvg ?? latest?.cacheHitRatio ?? null
  const chartsLoading = historyStatus === 'loading'
  const feed = { getPoints, subscribeLive }

  return (
    <>
      <PageHeader title="Dashboard" description="Live health and performance of the monitored database." />

      <div className="flex flex-col gap-4">
        {/* Row 1: KPIs */}
        <section aria-label="Key metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <KpiCard
            label="Active connections"
            icon={Plug}
            value={latest?.connections.active ?? null}
            format={formatInteger}
            hint={latest ? `${latest.connections.total} total · ${latest.connections.idle} idle` : undefined}
            loading={loading}
          />
          <KpiCard
            label="Transactions / sec"
            icon={Activity}
            value={latest?.tps ?? null}
            format={formatDecimal}
            hint="commits + rollbacks"
            loading={loading}
          />
          <KpiCard
            label="Cache hit"
            icon={Gauge}
            value={cacheHit}
            format={formatRatio}
            status={cacheHitStatus(cacheHit)}
            hint="30s average · warn < 99%"
            loading={loading}
          />
          <KpiCard
            label="Database size"
            icon={Database}
            value={latest?.dbSizeBytes ?? null}
            format={formatBytes}
            hint="pg_database_size"
            loading={loading}
          />
          <KpiCard
            label="Longest query"
            icon={Timer}
            value={latest?.longestQuerySeconds ?? null}
            format={formatSeconds}
            status={longestQueryStatus(latest?.longestQuerySeconds ?? null)}
            hint="running now · warn > 5s"
            loading={loading}
          />
        </section>

        {/* Row 2: live charts */}
        <section aria-label="Live charts" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="Transactions/sec" meta="last 15 min · live" loading={chartsLoading}>
            <TpsChart {...feed} />
          </ChartCard>
          <ChartCard title="Connections by state" meta="last 15 min · live" loading={chartsLoading}>
            <ConnectionsChart {...feed} />
          </ChartCard>
        </section>

        {/* Row 3: top queries + gauge */}
        <section aria-label="Queries and cache" className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
          <TopQueries data={topQueries} />
          <ChartCard title="Cache hit ratio" meta="avg last 30s" loading={loading} height={220}>
            <CacheGauge ratio={cacheHit} />
          </ChartCard>
        </section>
      </div>
    </>
  )
}
