import { PageHeader } from '@/components/layout/PageHeader'

export default function Dashboard() {
  return (
    <>
      <PageHeader title="Dashboard" description="Live health and performance of the monitored database." />
      <p className="text-sm text-muted-foreground">KPI cards and live charts arrive in the next commit.</p>
    </>
  )
}
