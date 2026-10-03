'use client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

function VerifyEmail() {
  const params = useSearchParams()
  const token = params.get('token') ?? ''
  const [state, setState] = useState<'working' | 'done' | 'failed'>('working')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setState('failed')
      setMessage('This confirmation link is missing its token.')
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const data = await response.json()
        if (cancelled) return
        if (!response.ok) {
          setState('failed')
          setMessage(data.error || 'This confirmation link is invalid or has expired.')
          return
        }
        setState('done')
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
  }, [token])

  if (state === 'working') {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Confirming your email…</h1>
        <p className="mt-2 text-sm text-muted">This only takes a moment.</p>
      </div>
    )
  }

  if (state === 'failed') {
    return (
      <div>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-danger/10 text-danger">
          <XCircle className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Could not confirm</h1>
        <p className="mt-2 text-sm text-muted">{message}</p>
        <p className="mt-2 text-sm text-muted">
          You can request a new confirmation link from your profile once signed in.
        </p>
        <Link href="/dashboard" className="mt-6 block">
          <Button className="w-full">Go to dashboard</Button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-ok/10 text-ok">
        <CheckCircle2 className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Email confirmed</h1>
      <p className="mt-2 text-sm text-muted">
        Thanks — your address is verified and your account is fully set up.
      </p>
      <Link href="/dashboard" className="mt-6 block">
        <Button className="w-full">Go to dashboard</Button>
      </Link>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
      <VerifyEmail />
    </Suspense>
  )
}
