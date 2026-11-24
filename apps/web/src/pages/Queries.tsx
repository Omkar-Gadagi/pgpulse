import { PageHeader } from '@/components/layout/PageHeader'

export default function Queries() {
  return (
    <>
      <PageHeader title="Queries" description="Slowest statements recorded by pg_stat_statements." />
      <p className="text-sm text-muted-foreground">The slow-query table arrives in a later commit.</p>
    </>
  )
}
