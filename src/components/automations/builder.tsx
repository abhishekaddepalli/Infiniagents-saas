'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Copy, Play, Plus, Save, Settings2, Trash2, Webhook } from 'lucide-react'
import { Canvas, type CanvasConnection, type CanvasNode } from './canvas'
import {
  NodeInspector, type InspectorAgent, type InspectorKnowledgeBase,
} from './node-inspector'
import { NODE_TYPES, NODE_TYPE_LIST, type NodeTypeId } from './node-types'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { Tabs } from '@/components/ui/tabs'
import { ConfirmDialog, Dialog } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { MessageContent } from '@/components/playground/message-content'
import { formatCurrency, formatDuration, formatNumber } from '@/lib/utils'

export type AutomationDraft = {
  id?: string
  name: string
  description: string
  triggerType: 'MANUAL' | 'WEBHOOK' | 'SCHEDULE'
  schedule: string | null
  timezone: string
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED'
  webhookKey?: string | null
  nodes: CanvasNode[]
  connections: CanvasConnection[]
}

type RunResult = {
  executionId: string
  status: string
  output: string
  error?: string
  steps: { nodeId: string; label: string; type: string; status: string; output: string; ms: number }[]
  inputTokens: number
  outputTokens: number
  costUsd: number
  durationMs: number
}

/** Client-side id for a new node — the server maps these to database ids. */
const newId = () => `n_${Math.random().toString(36).slice(2, 10)}`

export function AutomationBuilder({
  initial,
  agents,
  knowledgeBases,
  appUrl,
  currencySymbol = '$',
}: {
  initial: AutomationDraft
  agents: InspectorAgent[]
  knowledgeBases: InspectorKnowledgeBase[]
  appUrl: string
  currencySymbol?: string
}) {
  const router = useRouter()
  const toast = useToast()

  const [draft, setDraft] = useState(initial)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panel, setPanel] = useState<'steps' | 'settings'>('steps')
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [runOpen, setRunOpen] = useState(false)
  const [runInput, setRunInput] = useState('')
  const [result, setResult] = useState<RunResult | null>(null)
  const [confirming, setConfirming] = useState(false)

  const isEdit = Boolean(initial.id)
  const selected = draft.nodes.find((node) => node.id === selectedId) ?? null
  const agentNames = Object.fromEntries(agents.map((agent) => [agent.id, agent.name]))

  function addNode(type: NodeTypeId) {
    const meta = NODE_TYPES[type]
    // Place each new node to the right of the last one, wrapping into rows.
    const index = draft.nodes.length
    const node: CanvasNode = {
      id: newId(),
      type,
      label: meta.label,
      config: { ...meta.defaultConfig },
      positionX: 60 + (index % 4) * 240,
      positionY: 60 + Math.floor(index / 4) * 130,
      agentId: type === 'AI_AGENT' ? (agents.find((a) => a.status === 'ACTIVE')?.id ?? null) : null,
    }
    setDraft((current) => ({ ...current, nodes: [...current.nodes, node] }))
    setSelectedId(node.id)
  }

  function updateNode(id: string, patch: Partial<CanvasNode>) {
    setDraft((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (node.id === id ? { ...node, ...patch } : node)),
    }))
  }

  function deleteNode(id: string) {
    setDraft((current) => ({
      ...current,
      nodes: current.nodes.filter((node) => node.id !== id),
      // Drop any edge that touched the removed node.
      connections: current.connections.filter(
        (connection) => connection.sourceId !== id && connection.targetId !== id,
      ),
    }))
    setSelectedId(null)
  }

  function connect(sourceId: string, targetId: string, branch: string | null) {
    setDraft((current) => {
      const duplicate = current.connections.some(
        (connection) =>
          connection.sourceId === sourceId &&
          connection.targetId === targetId &&
          (connection.branch ?? null) === branch,
      )
      if (duplicate) return current

      // A non-branching output has a single next step, so replace it.
      const filtered = branch
        ? current.connections.filter(
            (connection) => !(connection.sourceId === sourceId && connection.branch === branch),
          )
        : current.connections.filter((connection) => connection.sourceId !== sourceId)

      return {
        ...current,
        connections: [...filtered, { id: newId(), sourceId, targetId, branch }],
      }
    })
  }

  async function save(): Promise<string | null> {
    if (draft.name.trim().length < 2) {
      toast.error('Name your automation', 'Give it at least 2 characters so you can find it later.')
      return null
    }
    if (draft.nodes.length === 0) {
      toast.error('Add at least one step', 'Start with a trigger, then chain an action onto it.')
      return null
    }

    setSaving(true)
    try {
      const response = await fetch(isEdit ? `/api/automations/${initial.id}` : '/api/automations', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error('Could not save the automation', data.error)
        return null
      }
      toast.success(isEdit ? 'Automation saved' : 'Automation created')
      const id: string = data.automation.id
      if (!isEdit) router.replace(`/automations/${id}`)
      router.refresh()
      return id
    } catch {
      toast.error('Could not reach the server', 'Check your connection and try again.')
      return null
    } finally {
      setSaving(false)
    }
  }

  async function run() {
    // Save first so the run uses exactly what is on screen.
    const id = (await save()) ?? initial.id
    if (!id) return

    setRunning(true)
    setResult(null)
    try {
      const response = await fetch(`/api/automations/${id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: runInput }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error('The run could not start', data.error)
        return
      }
      setResult(data)
      if (data.status === 'FAILED') toast.error('Run failed', data.error)
      else toast.success('Run completed', `Finished in ${formatDuration(data.durationMs)}`)
      router.refresh()
    } catch {
      toast.error('Could not reach the server', 'Check your connection and try again.')
    } finally {
      setRunning(false)
    }
  }

  async function remove() {
    setSaving(true)
    try {
      const response = await fetch(`/api/automations/${initial.id}`, { method: 'DELETE' })
      if (!response.ok) {
        toast.error('Could not delete the automation')
        return
      }
      toast.success('Automation deleted')
      router.push('/automations')
      router.refresh()
    } finally {
      setSaving(false)
      setConfirming(false)
    }
  }

  const webhookUrl = draft.webhookKey ? `${appUrl}/api/webhooks/${draft.webhookKey}` : null

  return (
    <>
      {/* minmax(0,1fr) — without it the wide canvas stretches the column and
          forces the whole page to scroll sideways. */}
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* --------------------------- Left panel -------------------------- */}
        <div className="space-y-4">
          <Tabs
            value={panel}
            onChange={setPanel}
            tabs={[
              { value: 'steps', label: 'Steps', icon: Plus },
              { value: 'settings', label: 'Settings', icon: Settings2 },
            ]}
          />

          {panel === 'steps' && !selected && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted">Click a step to add it to the canvas.</p>
              {NODE_TYPE_LIST.map((meta) => (
                <button
                  key={meta.id}
                  onClick={() => addNode(meta.id)}
                  className="flex w-full items-center gap-2.5 rounded-lg border border-line bg-surface p-2.5 text-left transition-colors hover:bg-elevated"
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.accent}`}>
                    <meta.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-ink">{meta.label}</span>
                    <span className="block truncate text-[11px] text-muted">{meta.description}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {panel === 'steps' && selected && (
            <div className="rounded-xl border border-line bg-surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-ink">Edit step</h3>
                <button
                  onClick={() => setSelectedId(null)}
                  className="text-[11px] font-medium text-brand-600 dark:text-brand-300"
                >
                  Add another
                </button>
              </div>
              <NodeInspector
                node={selected}
                agents={agents}
                knowledgeBases={knowledgeBases}
                onChange={(patch) => updateNode(selected.id, patch)}
                onDelete={() => deleteNode(selected.id)}
              />
            </div>
          )}

          {panel === 'settings' && (
            <div className="space-y-4 rounded-xl border border-line bg-surface p-4">
              <Field label="Name" required>
                <Input
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  placeholder="Support Ticket Triage"
                />
              </Field>

              <Field label="Description">
                <Textarea
                  rows={3}
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  placeholder="What this workflow does and when it should run."
                />
              </Field>

              <Field label="Trigger">
                <Select
                  value={draft.triggerType}
                  onChange={(event) =>
                    setDraft({ ...draft, triggerType: event.target.value as AutomationDraft['triggerType'] })
                  }
                >
                  <option value="MANUAL">Manual — run it yourself</option>
                  <option value="WEBHOOK">Webhook — trigger over HTTP</option>
                  <option value="SCHEDULE">Schedule — run on a cron expression</option>
                </Select>
              </Field>

              {draft.triggerType === 'SCHEDULE' && (
                <>
                  <Field label="Cron expression" hint="For example 0 9 * * 1 for Mondays at 9am.">
                    <Input
                      value={draft.schedule ?? ''}
                      onChange={(event) => setDraft({ ...draft, schedule: event.target.value })}
                      placeholder="0 9 * * 1"
                      className="font-mono text-[13px]"
                    />
                  </Field>
                  <p className="rounded-lg border border-warn/20 bg-warn/10 p-3 text-[11px] leading-relaxed text-muted">
                    Scheduling needs a runner outside the web process. The schedule is stored and the trigger
                    endpoint is ready — see <span className="font-medium text-ink">documentation/scheduling.md</span>{' '}
                    for a cron or Vercel Cron setup.
                  </p>
                </>
              )}

              {draft.triggerType === 'WEBHOOK' && (
                <div className="rounded-lg border border-line bg-bg p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-ink">
                    <Webhook className="h-3.5 w-3.5" />
                    Webhook URL
                  </p>
                  {webhookUrl ? (
                    <>
                      <p className="mt-1.5 break-all font-mono text-[11px] text-muted">{webhookUrl}</p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(webhookUrl)
                          toast.success('Webhook URL copied')
                        }}
                        className="mt-2 flex items-center gap-1 text-[11px] font-medium text-brand-600 dark:text-brand-300"
                      >
                        <Copy className="h-3 w-3" />
                        Copy URL
                      </button>
                      <p className="mt-2 text-[11px] text-faint">
                        Treat this URL as a secret — anyone with it can run this workflow. The automation must be
                        Active to accept requests.
                      </p>
                    </>
                  ) : (
                    <p className="mt-1.5 text-[11px] text-muted">
                      Save the automation to generate its webhook URL.
                    </p>
                  )}
                </div>
              )}

              <Field label="Status">
                <Select
                  value={draft.status}
                  onChange={(event) =>
                    setDraft({ ...draft, status: event.target.value as AutomationDraft['status'] })
                  }
                >
                  <option value="DRAFT">Draft — not running</option>
                  <option value="ACTIVE">Active — triggers accepted</option>
                  <option value="PAUSED">Paused — temporarily off</option>
                </Select>
              </Field>

              {isEdit && (
                <Button variant="ghost" className="w-full text-danger" onClick={() => setConfirming(true)}>
                  <Trash2 className="h-4 w-4" />
                  Delete automation
                </Button>
              )}
            </div>
          )}
        </div>

        {/* ---------------------------- Canvas ----------------------------- */}
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={draft.status} />
            <span className="text-xs text-muted">
              {draft.nodes.length} {draft.nodes.length === 1 ? 'step' : 'steps'} ·{' '}
              {draft.connections.length} {draft.connections.length === 1 ? 'connection' : 'connections'}
            </span>
            <div className="ml-auto flex gap-2">
              <Button variant="secondary" onClick={() => setRunOpen(true)} disabled={draft.nodes.length === 0}>
                <Play className="h-4 w-4" />
                Run
              </Button>
              <Button onClick={save} loading={saving}>
                <Save className="h-4 w-4" />
                Save
              </Button>
            </div>
          </div>

          <Canvas
            nodes={draft.nodes}
            connections={draft.connections}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id)
              if (id) setPanel('steps')
            }}
            onMoveNode={(id, x, y) => updateNode(id, { positionX: x, positionY: y })}
            onConnect={connect}
            onDeleteConnection={(id) =>
              setDraft((current) => ({
                ...current,
                connections: current.connections.filter((connection) => connection.id !== id),
              }))
            }
            agentNames={agentNames}
          />

          <p className="mt-2 text-[11px] text-muted">
            Drag a node to move it · Drag from a coloured port to another node to connect · Click a connection to
            remove it
          </p>
        </div>
      </div>

      {/* ----------------------------- Run dialog ---------------------------- */}
      <Dialog
        open={runOpen}
        onClose={() => setRunOpen(false)}
        title="Run automation"
        description="The input below is passed to the trigger and flows through your workflow."
        size="lg"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setRunOpen(false)}>
              Close
            </Button>
            <Button size="sm" onClick={run} loading={running}>
              <Play className="h-4 w-4" />
              Run now
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Input">
            <Textarea
              rows={3}
              value={runInput}
              onChange={(event) => setRunInput(event.target.value)}
              placeholder="Customer cannot log in after resetting their password."
            />
          </Field>

          {result && (
            <div className="space-y-4 border-t border-line pt-4">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={result.status} />
                <span className="rounded-lg bg-elevated px-2 py-1 text-[11px] text-muted">
                  {formatDuration(result.durationMs)}
                </span>
                <span className="rounded-lg bg-elevated px-2 py-1 text-[11px] text-muted">
                  {formatNumber(result.inputTokens + result.outputTokens)} tokens
                </span>
                <span className="rounded-lg bg-elevated px-2 py-1 text-[11px] text-muted">
                  {formatCurrency(result.costUsd, currencySymbol)}
                </span>
              </div>

              {result.error && (
                <p className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-[13px] text-danger">
                  {result.error}
                </p>
              )}

              <div>
                <p className="mb-2 text-[13px] font-medium text-ink">Steps</p>
                <ol className="space-y-1.5">
                  {result.steps.map((step, index) => (
                    <li
                      key={`${step.nodeId}-${index}`}
                      className="flex items-center gap-2.5 rounded-lg border border-line bg-bg px-3 py-2"
                    >
                      <span className="font-mono text-[11px] text-faint">{index + 1}</span>
                      <span className="flex-1 truncate text-[13px] text-ink">{step.label}</span>
                      <span className="text-[11px] text-muted">{formatDuration(step.ms)}</span>
                      <StatusBadge status={step.status === 'completed' ? 'COMPLETED' : step.status === 'failed' ? 'FAILED' : 'DRAFT'} />
                    </li>
                  ))}
                </ol>
              </div>

              {result.output && (
                <div>
                  <p className="mb-2 text-[13px] font-medium text-ink">Output</p>
                  <div className="scroll-thin max-h-64 overflow-auto rounded-lg border border-line bg-bg p-3.5 text-ink">
                    <MessageContent content={result.output} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={remove}
        loading={saving}
        title={`Delete "${draft.name}"?`}
        message="This permanently deletes the workflow and its execution history. This cannot be undone."
      />
    </>
  )
}
