'use client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input, PasswordInput } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'

type Mode = 'login' | 'register'

/**
 * Shared sign-in / sign-up form.
 * Errors from the API are surfaced inline rather than as raw responses.
 */
export function AuthForm({ mode, demoEmail }: { mode: Mode; demoEmail?: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [values, setValues] = useState({ name: '', email: '', password: '' })

  const isRegister = mode === 'register'

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isRegister ? values : { email: values.email, password: values.password }),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        return
      }

      toast.success(isRegister ? 'Account created' : 'Welcome back')
      // A full navigation makes sure server components pick up the new session.
      // ?next= carries an invitation or deep link through sign-in.
      const next = params.get('next')
      router.push(next || data.redirectTo || '/dashboard')
      router.refresh()
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        {isRegister ? 'Create your account' : 'Welcome back'}
      </h1>
      <p className="mt-1.5 text-sm text-muted">
        {isRegister ? 'Start building AI agents in a couple of minutes.' : 'Sign in to continue to your dashboard.'}
      </p>

      {demoEmail && !isRegister && (
        <div className="mt-5 rounded-lg border border-brand-500/20 bg-brand-500/5 p-3">
          <p className="text-xs font-medium text-ink">Demo account</p>
          <p className="mt-1 text-xs text-muted">
            Sign in with <span className="font-mono">{demoEmail}</span> to explore the sample data.
          </p>
          <button
            type="button"
            onClick={() => setValues((current) => ({ ...current, email: demoEmail, password: 'Demo@12345' }))}
            className="mt-2 text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
          >
            Fill demo credentials
          </button>
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-4">
        {isRegister && (
          <Field label="Full name" required>
            <Input
              value={values.name}
              onChange={(event) => setValues({ ...values, name: event.target.value })}
              placeholder="Jane Cooper"
              autoComplete="name"
              required
            />
          </Field>
        )}

        <Field label="Email address" required>
          <Input
            type="email"
            value={values.email}
            onChange={(event) => setValues({ ...values, email: event.target.value })}
            placeholder="you@company.com"
            autoComplete="email"
            required
          />
        </Field>

        <Field label="Password" required hint={isRegister ? 'At least 8 characters.' : undefined}>
          <PasswordInput
            value={values.password}
            onChange={(event) => setValues({ ...values, password: event.target.value })}
            placeholder="••••••••"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            required
          />
        </Field>

        {!isRegister && (
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-[13px] text-brand-600 hover:underline dark:text-brand-300">
              Forgot password?
            </Link>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-[13px] text-danger">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" loading={loading}>
          {isRegister ? 'Create account' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {isRegister ? 'Already have an account? ' : "Don't have an account? "}
        <Link
          href={isRegister ? '/login' : '/register'}
          className="font-medium text-brand-600 hover:underline dark:text-brand-300"
        >
          {isRegister ? 'Sign in' : 'Create one'}
        </Link>
      </p>
    </div>
  )
}
