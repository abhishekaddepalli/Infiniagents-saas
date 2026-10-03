'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Check, Copy, KeyRound, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { ConfirmDialog, Dialog } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Field, Input, Select } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { formatDate, timeAgo } from '@/lib/utils'

export type ApiKeyRow = {
  id: string
  name: string
  keyPrefix: string
  scopes: string[]
  lastUsedAt: string | null
  expiresAt: string | null
  revokedAt: string | null
  createdAt: string
  createdBy: string
}

const SCOPES: { value: string; label: string; description: string }[] = [
  { value: 'agents:read', label: 'Read agents', description: 'List agents and their configuration' },
  { value: 'chat:write', label: 'Chat', description: 'Send messages to an agent' },
  { value: 'automations:read', label: 'Read automations', description: 'List workflows' },
  { value: 'automations:run', label: 'Run automations', description: 'Trigger a workflow' },
  { value: 'executions:read', label: 'Read executions', description: 'Read run history' },
]

export function ApiKeysPanel({ keys, appUrl }: { keys: ApiKeyRow[]; appUrl: string }) {
  const router = useRouter()
  const toast = useToast()

  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({
    name: '',
    scopes: ['agents:read', 'chat:write'],
    expiresInDays: 0,
  })
  const [issued, setIssued] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [revoking, setRevoking] = useState<ApiKeyRow | null>(null)
  const [busy, setBusy] = useState(false)

  function toggleScope(scope: string) {
    setDraft((current) => ({
      ...current,
      scopes: current.scopes.includes(scope)
        ? current.scopes.filter((item) => item !== scope)
        : [...current.scopes, scope],
    }))
  }

  async function create() {
    setBusy(true)
    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error('Could not create the key', data.error)
        return
      }
      // Shown once, here. There is deliberately no way to recover it later.
      setIssued(data.key)
      setDraft({ name: '', scopes: ['agents:read', 'chat:write'], expiresInDays: 0 })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function revoke(key: ApiKeyRow) {
    setBusy(true)
    try {
      const response = await fetch(`/api/api-keys/${key.id}`, { method: 'DELETE' })
      if (!response.ok) {
        toast.error('Could not revoke the key')
        return
      }
      toast.success(`"${key.name}" revoked`)
      router.refresh()
    } finally {
      setBusy(false)
      setRevoking(null)
    }
  }

  const active = keys.filter((key) => !key.revokedAt)

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="API keys"
          description="Let your own product or customers call this workspace's agents and automations."
          action={
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              New key
            </Button>
          }
        />
        <CardBody className="p-0">
          {keys.length === 0 ? (
            <EmptyState
              className="border-0"
              icon={KeyRound}
              title="No API keys yet"
              description="Create a key to call the REST API from your own application. Keys are scoped, so you can grant only what a given integration needs."
              action={
                <Button onClick={() => setCreating(true)}>
                  <Plus className="h-4 w-4" />
                  Create API key
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {keys.map((key) => {
                const expired = key.expiresAt && new Date(key.expiresAt) < new Date()
                return (
                  <li key={key.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-elevated text-muted">
                      <KeyRound className="h-4 w-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">{key.name}</p>
                      <p className="truncate font-mono text-[11px] text-muted">
                        {key.keyPrefix}
                        {'•'.repeat(12)}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {key.scopes.map((scope) => (
                          <span
                            key={scope}
                            className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-muted"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="hidden shrink-0 text-right sm:block">
                      <p className="text-[11px] text-muted">
                        {key.lastUsedAt ? `Used ${timeAgo(key.lastUsedAt)}` : 'Never used'}
                      </p>
                      <p className="text-[11px] text-faint">Created {formatDate(key.createdAt)}</p>
                    </div>

                    {key.revokedAt ? (
                      <Badge tone="danger">Revoked</Badge>
                    ) : expired ? (
                      <Badge tone="warning">Expired</Badge>
                    ) : (
                      <Badge tone="success" dot>
                        Active
                      </Badge>
                    )}

                    {!key.revokedAt && (
                      <button
                        onClick={() => setRevoking(key)}
                        className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                        aria-label={`Revoke ${key.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      {active.length > 0 && (
        <Card>
          <CardHeader title="Quick start" description="Send your first request" />
          <CardBody>
            <div className="scroll-thin overflow-x-auto rounded-lg border border-line bg-[#0d0d14] p-4">
              <pre className="font-mono text-[12px] leading-relaxed text-gray-300">
                <code>{`curl -X POST \\
  ${appUrl}/api/v1/agents/AGENT_ID/chat \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello"}'`}</code>
              </pre>
            </div>
            <p className="mt-3 text-[13px] text-muted">
              Full endpoint reference is in{' '}
              <span className="font-mono text-ink">documentation/api.md</span>.
            </p>
          </CardBody>
        </Card>
      )}

      {/* ---------------------------- Create dialog --------------------------- */}
      <Dialog
        open={creating}
        onClose={() => {
          setCreating(false)
          setIssued(null)
          setCopied(false)
        }}
        title={issued ? 'Copy your API key now' : 'Create an API key'}
        description={
          issued
            ? 'This is the only time the full key is shown. Store it somewhere safe.'
            : 'Grant only the scopes the integration actually needs.'
        }
        footer={
          issued ? (
            <Button
              size="sm"
              onClick={() => {
                setCreating(false)
                setIssued(null)
                setCopied(false)
              }}
            >
              Done
            </Button>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={create}
                loading={busy}
                disabled={draft.name.trim().length < 2 || draft.scopes.length === 0}
              >
                Create key
              </Button>
            </>
          )
        }
      >
        {issued ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-line bg-bg p-3.5">
              <p className="break-all font-mono text-[13px] text-ink">{issued}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(issued)
                setCopied(true)
                toast.success('API key copied')
              }}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy key'}
            </Button>
            <p className="rounded-lg border border-warn/20 bg-warn/10 p-3 text-[12px] leading-relaxed text-muted">
              Only a hash is stored, so this value cannot be recovered. If you lose it, revoke the key
              and create a new one.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Name" required hint="Something that identifies where the key is used.">
              <Input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="Production backend"
                autoFocus
              />
            </Field>

            <div>
              <p className="mb-2 text-[13px] font-medium text-ink">Scopes</p>
              <div className="space-y-1.5">
                {SCOPES.map((scope) => (
                  <label
                    key={scope.value}
                    className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line p-2.5 transition-colors hover:bg-elevated"
                  >
                    <input
                      type="checkbox"
                      checked={draft.scopes.includes(scope.value)}
                      onChange={() => toggleScope(scope.value)}
                      className="mt-0.5 h-4 w-4 accent-brand-600"
                    />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-ink">{scope.label}</span>
                      <span className="block text-[11px] text-muted">{scope.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <Field label="Expiry">
              <Select
                value={String(draft.expiresInDays)}
                onChange={(event) =>
                  setDraft({ ...draft, expiresInDays: Number(event.target.value) })
                }
              >
                <option value="0">Never expires</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
              </Select>
            </Field>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={Boolean(revoking)}
        onClose={() => setRevoking(null)}
        onConfirm={() => revoking && revoke(revoking)}
        loading={busy}
        confirmLabel="Revoke key"
        title={`Revoke "${revoking?.name}"?`}
        message="Any integration using this key stops working immediately. This cannot be undone."
      />
    </div>
  )
}
