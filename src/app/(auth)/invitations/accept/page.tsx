'use client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { Building2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

function AcceptInvitation() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') ?? ''

  const [state, setState] = useState<'working' | 'failed'>('working')
  const [message, setMessage] = useState('')
  const [needsSignIn, setNeedsSignIn] = useState(false)

  useEffect(() => {
    if (!token) {
      setState('failed')
      setMessage('This invitation link is missing its token.')
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const response = await fetch('/api/invitations/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const data = await response.json()
        if (cancelled) return

        if (response.status === 401) {
          // Not signed in — send them to log in, then straight back here.
          setNeedsSignIn(true)
          setState('failed')
          setMessage('Sign in to accept this invitation.')
          return
        }
        if (!response.ok) {
          setState('failed')
          setMessage(data.error || 'This invitation is invalid or has expired.')
          return
        }

        router.push('/dashboard')
        router.refresh()
      } catch {
        if (!cancelled) {
          setState('failed')
          setMessage('Could not reach the server. Please try again.')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token, router])

  if (state === 'working') {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Accepting invitation…</h1>
        <p className="mt-2 text-sm text-muted">One moment.</p>
      </div>
    )
  }

  return (
    <div>
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${
          needsSignIn ? 'bg-brand-500/10 text-brand-600 dark:text-brand-300' : 'bg-danger/10 text-danger'
        }`}
      >
        {needsSignIn ? <Building2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        {needsSignIn ? 'Sign in to continue' : 'Could not accept'}
      </h1>
      <p className="mt-2 text-sm text-muted">{message}</p>

      <div className="mt-6 space-y-2">
        {needsSignIn ? (
          <>
            <Link href={`/login?next=/invitations/accept?token=${token}`} className="block">
              <Button className="w-full">Sign in</Button>
            </Link>
            <Link href="/register" className="block">
              <Button variant="secondary" className="w-full">
                Create an account
              </Button>
            </Link>
          </>
        ) : (
          <Link href="/dashboard" className="block">
            <Button className="w-full">Go to dashboard</Button>
          </Link>
        )}
      </div>
    </div>
  )
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
      <AcceptInvitation />
    </Suspense>
  )
}
