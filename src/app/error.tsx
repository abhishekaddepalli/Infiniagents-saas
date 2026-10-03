'use client'
import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Global error boundary.
 * Users see a readable message; the technical detail goes to the server log
 * rather than the screen.
 */
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('[agentflow] page error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h1 className="text-xl font-semibold text-ink">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        We could not load this page. Try again, and if the problem continues, check your server logs.
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
