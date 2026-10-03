'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CheckCircle2, ExternalLink, KeyRound, Trash2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'

export type ProviderMeta = {
  id: string
  label: string
  consoleUrl: string
  keyPlaceholder: string
  /** Masked hint of the stored key, e.g. sk-••••••••82a. Null when unset. */
  keyHint: string | null
  verifiedAt: string | null
  /** True when a server-wide key from .env covers this provider. */
  hasEnvKey: boolean
}

/**
 * Settings → AI Providers.
 * Keys are written to the server and never read back — only the masked hint
 * returned by the API is displayed.
 */
export function ProviderSettings({ providers, demoMode }: { providers: ProviderMeta[]; demoMode: boolean }) {
  const router = useRouter()
  const toast = useToast()
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [removing, setRemoving] = useState<ProviderMeta | null>(null)

  async function save(provider: ProviderMeta) {
    const apiKey = (drafts[provider.id] ?? '').trim()
    if (!apiKey) {
      toast.error('Enter a key first')
      return
    }
    setBusy(provider.id)
    try {
      const response = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: provider.id, apiKey }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error('Could not save the key', data.error)
        return
      }
      toast.success(`${provider.label} key saved`, 'Run Test Connection to confirm it works.')
      setDrafts((current) => ({ ...current, [provider.id]: '' }))
      router.refresh()
    } catch {
      toast.error('Could not reach the server')
    } finally {
      setBusy(null)
    }
  }

  async function test(provider: ProviderMeta) {
    setBusy(`test-${provider.id}`)
    try {
      const response = await fetch(`/api/providers/${provider.id.toLowerCase()}/test`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) {
        toast.error(`${provider.label} is not connected`, data.error)
        return
      }
      toast.success(`${provider.label} connected`)
      router.refresh()
    } catch {
      toast.error('Could not reach the server')
    } finally {
      setBusy(null)
    }
  }

  async function remove(provider: ProviderMeta) {
    setBusy(provider.id)
    try {
      const response = await fetch(`/api/providers/${provider.id.toLowerCase()}`, { method: 'DELETE' })
      if (!response.ok) {
        toast.error('Could not remove the key')
        return
      }
      toast.success(`${provider.label} key removed`)
      router.refresh()
    } finally {
      setBusy(null)
      setRemoving(null)
    }
  }

  const anyConfigured = providers.some((provider) => provider.keyHint || provider.hasEnvKey)

  return (
    <div className="space-y-5">
      {demoMode && !anyConfigured && (
        <div className="rounded-xl border border-warn/20 bg-warn/10 p-4">
          <Badge tone="warning">Demo Mode active</Badge>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            No provider key is configured, so AI requests are answered by the built-in simulator. Everything works —
            agents, the playground, automations, usage tracking — but the responses are generated locally. Add a key
            below for real completions.
          </p>
        </div>
      )}

      {providers.map((provider) => {
        const connected = Boolean(provider.keyHint || provider.hasEnvKey)
        return (
          <Card key={provider.id}>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  {provider.label}
                  {connected ? (
                    <Badge tone="success" dot>
                      Connected
                    </Badge>
                  ) : (
                    <Badge dot>Not Connected</Badge>
                  )}
                </span>
              }
              description={
                provider.verifiedAt
                  ? `Last verified ${formatDate(provider.verifiedAt)}`
                  : 'Enter an API key to use this provider.'
              }
              action={
                <a
                  href={provider.consoleUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-1 text-[13px] text-brand-600 hover:underline dark:text-brand-300"
                >
                  Get a key
                  <ExternalLink className="h-3 w-3" />
                </a>
              }
            />
            <CardBody className="space-y-4">
              {provider.keyHint && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-bg px-3.5 py-2.5">
                  <span className="flex items-center gap-2 font-mono text-[13px] text-ink">
                    <KeyRound className="h-3.5 w-3.5 text-muted" />
                    {provider.keyHint}
                  </span>
                  <button
                    onClick={() => setRemoving(provider)}
                    className="flex items-center gap-1 text-[11px] font-medium text-danger hover:underline"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                </div>
              )}

              {!provider.keyHint && provider.hasEnvKey && (
                <p className="rounded-lg border border-line bg-bg px-3.5 py-2.5 text-[13px] text-muted">
                  Using the server key from your <span className="font-mono text-ink">.env</span> file. Saving a key
                  here overrides it for your account only.
                </p>
              )}

              <Field
                label={provider.keyHint ? 'Replace API key' : 'API key'}
                hint="Stored encrypted with AES-256-GCM. It is never sent back to the browser."
              >
                <Input
                  type="password"
                  autoComplete="off"
                  value={drafts[provider.id] ?? ''}
                  onChange={(event) => setDrafts({ ...drafts, [provider.id]: event.target.value })}
                  placeholder={provider.keyPlaceholder}
                  className="font-mono text-[13px]"
                />
              </Field>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => save(provider)} loading={busy === provider.id}>
                  Save key
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => test(provider)}
                  loading={busy === `test-${provider.id}`}
                  disabled={!connected}
                >
                  {provider.verifiedAt ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  Test Connection
                </Button>
              </div>
            </CardBody>
          </Card>
        )
      })}

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && remove(removing)}
        loading={Boolean(busy)}
        title={`Remove the ${removing?.label} key?`}
        confirmLabel="Remove key"
        message="Agents using this provider will fall back to the server key from your .env file, or to Demo Mode if none is set."
      />
    </div>
  )
}
