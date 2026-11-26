// Pretty-printed SQL with a copy button.
// sql-formatter is loaded with a dynamic import the first time a query is
// opened, so it isn't part of the page's initial download.
import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'

async function prettySql(sql: string): Promise<string> {
  try {
    const { format } = await import('sql-formatter')
    return format(sql, { language: 'postgresql', keywordCase: 'upper', tabWidth: 2 })
  } catch {
    // Not every statement parses (e.g. COPY ... FROM stdin); show it as recorded
    return sql
  }
}

export function FormattedSql({ sql }: { sql: string }) {
  const [formatted, setFormatted] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    setFormatted(null)
    prettySql(sql).then((text) => {
      if (!cancelled) setFormatted(text)
    })
    return () => {
      cancelled = true
    }
  }, [sql])

  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(id)
  }, [copied])

  async function copy() {
    try {
      await navigator.clipboard.writeText(formatted ?? sql)
      setCopied(true)
    } catch {
      // Clipboard can be blocked (e.g. non-secure context); nothing else to do
    }
  }

  return (
    <div className="relative rounded-lg border border-border bg-background/60">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={copy}
        aria-label={copied ? 'SQL copied to clipboard' : 'Copy SQL to clipboard'}
        className="absolute top-2 right-2"
      >
        {copied ? <Check aria-hidden className="text-success" /> : <Copy aria-hidden />}
      </Button>
      <pre className="max-h-[45vh] overflow-auto p-4 pr-12 font-mono text-xs leading-relaxed whitespace-pre text-foreground">
        <code>{formatted ?? sql}</code>
      </pre>
      {/* Announce the copy result to screen readers */}
      <span className="sr-only" aria-live="polite">
        {copied ? 'Copied' : ''}
      </span>
    </div>
  )
}
