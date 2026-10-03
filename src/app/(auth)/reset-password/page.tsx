'use client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, PasswordInput } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'

function ResetForm() {
  const params = useSearchParams()
  const router = useRouter()
  const toast = useToast()
  const token = params.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Could not reset the password.')
        return
      }
      toast.success('Password updated', 'You can now sign in with your new password.')
      router.push('/login')
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Invalid reset link</h1>
        <p className="mt-2 text-sm text-muted">
          This link is missing its token. Request a new one to continue.
        </p>
        <Link href="/forgot-password" className="mt-6 block">
          <Button className="w-full">Request a new link</Button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Choose a new password</h1>
      <p className="mt-1.5 text-sm text-muted">Pick something you have not used on this account before.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="New password" required hint="At least 8 characters.">
          <PasswordInput
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>
        <Field label="Confirm new password" required>
          <PasswordInput
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>

        {error && (
          <p role="alert" className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-[13px] text-danger">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" loading={loading}>
          Update password
        </Button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
      <ResetForm />
    </Suspense>
  )
}
