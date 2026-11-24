// Explains WHY there's no data, instead of leaving charts blank.
// Shown under the top bar on every page.
import { DatabaseZap, RefreshCw, ServerCrash } from 'lucide-react'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useLiveStatus } from '@/hooks/useLiveStatus'
import { API_URL } from '@/lib/api'

export function StatusBanner() {
  const { state, database, targetError, recheck } = useLiveStatus()

  if (state === 'server-down') {
    return (
      <Alert variant="destructive" className="border-critical/40 bg-critical/10" role="alert">
        <ServerCrash aria-hidden />
        <AlertTitle>Can't reach the pgPulse server</AlertTitle>
        <AlertDescription>
          Tried <code className="text-xs">{API_URL}</code>. Start it with{' '}
          <code className="text-xs">npm run dev:server</code> (or <code className="text-xs">docker compose up</code>
          ). Reconnecting automatically…
        </AlertDescription>
        <AlertAction>
          <Button size="sm" variant="outline" onClick={recheck}>
            <RefreshCw aria-hidden /> Retry
          </Button>
        </AlertAction>
      </Alert>
    )
  }

  if (state === 'target-down') {
    return (
      <Alert variant="destructive" className="border-critical/40 bg-critical/10" role="alert">
        <DatabaseZap aria-hidden />
        <AlertTitle>
          Monitored database {database ? <code>{database}</code> : null} is unreachable
        </AlertTitle>
        <AlertDescription>
          <p>
            <code className="text-xs">{targetError ?? 'The server could not connect.'}</code>
          </p>
          <p>Showing the last known data. Retrying every few seconds.</p>
        </AlertDescription>
        <AlertAction>
          <Button size="sm" variant="outline" onClick={recheck}>
            <RefreshCw aria-hidden /> Retry
          </Button>
        </AlertAction>
      </Alert>
    )
  }

  return null
}
