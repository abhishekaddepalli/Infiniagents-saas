'use client'
import Link from 'next/link'
import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [resetUrl, setResetUrl] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Could not process that request.')
        return
      }
      // In development the API returns the link directly, because no email
      // provider is wired up. See documentation/customization.md.
      setResetUrl(data.resetUrl ?? null)
      setSent(true)
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-ok/10 text-ok">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Check your email</h1>
        <p className="mt-2 text-sm text-muted">
          If an account exists for <span className="font-medium text-ink">{email}</span>, we have sent a link to
          reset the password. The link expires in one hour.
        </p>

        {resetUrl && (
          <div className="mt-5 rounded-lg border border-warn/20 bg-warn/10 p-3">
            <p className="text-xs font-medium text-ink">Development mode</p>
            <p className="mt-1 text-xs text-muted">
              No email provider is configured, so the reset link is shown here instead. Connect an email service
              before going live.
            </p>
            <Link
              href={resetUrl}
              className="mt-2 block break-all text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
            >
              {resetUrl}
            </Link>
          </div>
        )}

        <Link href="/login" className="mt-6 block">
          <Button variant="secondary" className="w-full">
            Back to sign in
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Forgot your password?</h1>
      <p className="mt-1.5 text-sm text-muted">
        Enter the email on your account and we will send you a link to choose a new password.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Email address" required>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            required
          />
        </Field>

        {error && (
          <p role="alert" className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-[13px] text-danger">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" loading={loading}>
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Remembered it?{' '}
        <Link href="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-300">
          Sign in
        </Link>
      </p>
    </div>
  )
}
