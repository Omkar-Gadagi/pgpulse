// Shown when a page crashes while rendering, instead of a blank screen or
// React Router's developer error page. The shell (sidebar, top bar) stays.
import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function RouteError() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unknown error'

  return (
    <div role="alert" className="mx-auto flex max-w-lg flex-col items-center gap-3 py-20 text-center">
      <TriangleAlert aria-hidden className="size-8 text-critical" />
      <h1 className="text-lg font-semibold">This page hit an error</h1>
      <p className="font-mono text-xs break-all text-muted-foreground">{message}</p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reload
        </Button>
        <Button asChild variant="ghost">
          <Link to="/">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
