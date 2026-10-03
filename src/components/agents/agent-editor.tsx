'use client'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { BookOpen, Info, Save, Send, Settings2, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Slider, Switch, Textarea } from '@/components/ui/input'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { AgentIcon, IconPicker } from '@/components/ui/agent-icon'
import { ConfirmDialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { Tooltip } from '@/components/ui/tooltip'

export type ModelOption = {
  provider: string
  name: string
  modelId: string
  maxTokens: number
  inputCostPerM: number
  outputCostPerM: number
}

export type KnowledgeBaseOption = { id: string; name: string; documents: number }

export type AgentDraft = {
  id?: string
  name: string
  description: string
  icon: string
  provider: string
  model: string
  systemPrompt: string
  temperature: number
  maxTokens: number
  welcomeMessage: string
  memoryEnabled: boolean
  knowledgeBaseId: string | null
  status: string
}

const providerLabels: Record<string, string> = {
  OPENAI: 'OpenAI',
  GEMINI: 'Google Gemini',
  ANTHROPIC: 'Anthropic',
}

/**
 * Create / edit form for an agent.
 * Used by both /agents/new and /agents/[id] — the only difference is whether
 * `initial.id` is set.
 */
export function AgentEditor({
  initial,
  models,
  knowledgeBases,
  currencySymbol = '$',
}: {
  initial: AgentDraft
  models: ModelOption[]
  knowledgeBases: KnowledgeBaseOption[]
  currencySymbol?: string
}) {
  const router = useRouter()
  const toast = useToast()
  const [draft, setDraft] = useState<AgentDraft>(initial)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEdit = Boolean(initial.id)
  const set = <K extends keyof AgentDraft>(key: K, value: AgentDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const providers = useMemo(() => [...new Set(models.map((model) => model.provider))], [models])
  const providerModels = useMemo(
    () => models.filter((model) => model.provider === draft.provider),
    [models, draft.provider],
  )
  const activeModel = providerModels.find((model) => model.modelId === draft.model)

  /** Switching provider resets the model to the first one that provider offers. */
  function changeProvider(provider: string) {
    const first = models.find((model) => model.provider === provider)
    setDraft((current) => ({ ...current, provider, model: first?.modelId ?? '' }))
  }

  function validate() {
    const next: Record<string, string> = {}
    if (draft.name.trim().length < 2) next.name = 'Give the agent a name of at least 2 characters.'
    if (!draft.model) next.model = 'Choose a model for this agent.'
    if (draft.systemPrompt.trim().length < 10) {
      next.systemPrompt = 'System instructions need at least 10 characters — tell the agent what it does.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function save(thenTest = false) {
    if (!validate()) {
      toast.error('Check the form', 'Some fields still need attention.')
      return
    }
    setSaving(true)
    try {
      const response = await fetch(isEdit ? `/api/agents/${initial.id}` : '/api/agents', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error('Could not save the agent', data.error)
        return
      }
      toast.success(isEdit ? 'Agent updated' : 'Agent created')
      const id = data.agent?.id ?? initial.id
      router.push(thenTest ? `/playground?agent=${id}` : '/agents')
      router.refresh()
    } catch {
      toast.error('Could not reach the server', 'Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    setSaving(true)
    try {
      const response = await fetch(`/api/agents/${initial.id}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json()
        toast.error('Could not delete the agent', data.error)
        return
      }
      toast.success('Agent deleted')
      router.push('/agents')
      router.refresh()
    } finally {
      setSaving(false)
      setConfirming(false)
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        {/* ---------------------- Basic information --------------------- */}
        <Card>
          <CardHeader title="Basic information" description="How this agent appears across the product" />
          <CardBody className="space-y-4">
            <div className="flex items-center gap-4">
              <AgentIcon name={draft.icon} size="lg" />
              <div className="min-w-0 flex-1">
                <Field label="Agent name" required error={errors.name}>
                  <Input
                    value={draft.name}
                    onChange={(event) => set('name', event.target.value)}
                    placeholder="Customer Support Agent"
                  />
                </Field>
              </div>
            </div>

            <Field label="Description" hint="A short line describing what this agent is for.">
              <Input
                value={draft.description}
                onChange={(event) => set('description', event.target.value)}
                placeholder="Answers product questions and resolves common issues."
              />
            </Field>

            <Field label="Icon">
              <IconPicker value={draft.icon} onChange={(icon) => set('icon', icon)} />
            </Field>
          </CardBody>
        </Card>

        {/* --------------------------- AI model -------------------------- */}
        <Card>
          <CardHeader title="AI model" description="Which provider and model answers this agent's requests" />
          <CardBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Provider" required>
                <Select value={draft.provider} onChange={(event) => changeProvider(event.target.value)}>
                  {providers.map((provider) => (
                    <option key={provider} value={provider}>
                      {providerLabels[provider] ?? provider}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Model" required error={errors.model}>
                <Select value={draft.model} onChange={(event) => set('model', event.target.value)}>
                  <option value="">Select a model</option>
                  {providerModels.map((model) => (
                    <option key={model.modelId} value={model.modelId}>
                      {model.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {activeModel && (
              <div className="rounded-lg border border-line bg-bg p-3.5">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink">
                  <Info className="h-3.5 w-3.5" />
                  {activeModel.name} pricing
                </p>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="text-muted">Input</p>
                    <p className="mt-0.5 font-mono text-ink">
                      {currencySymbol}
                      {activeModel.inputCostPerM} / 1M
                    </p>
                  </div>
                  <div>
                    <p className="text-muted">Output</p>
                    <p className="mt-0.5 font-mono text-ink">
                      {currencySymbol}
                      {activeModel.outputCostPerM} / 1M
                    </p>
                  </div>
                  <div>
                    <p className="text-muted">Max tokens</p>
                    <p className="mt-0.5 font-mono text-ink">{activeModel.maxTokens.toLocaleString()}</p>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-faint">
                  Prices are managed in the admin panel and may not match your provider&apos;s current rates.
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* ------------------------- Instructions ------------------------ */}
        <Card>
          <CardHeader
            title="Instructions"
            description="The system prompt sent before every conversation"
            action={
              <Tooltip label="Be specific about role, rules, and output format.">
                <Sparkles className="h-4 w-4 text-muted" />
              </Tooltip>
            }
          />
          <CardBody className="space-y-4">
            <Field label="System instructions" required error={errors.systemPrompt}>
              <Textarea
                value={draft.systemPrompt}
                onChange={(event) => set('systemPrompt', event.target.value)}
                rows={12}
                className="font-mono text-[13px]"
                placeholder={'You are a customer support assistant for a software product.\n\nRules:\n- Resolve the issue in as few messages as possible\n- Never invent product behaviour or pricing\n- Escalate honestly when you cannot help'}
              />
            </Field>

            <Field
              label="Welcome message"
              hint="Shown at the top of the playground before the first message."
            >
              <Input
                value={draft.welcomeMessage}
                onChange={(event) => set('welcomeMessage', event.target.value)}
                placeholder="Hi! How can I help you today?"
              />
            </Field>
          </CardBody>
        </Card>
      </div>

      {/* --------------------------- Side column ------------------------- */}
      <div className="space-y-5">
        <Card>
          <CardHeader title="Response settings" />
          <CardBody className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[13px] font-medium text-ink">Temperature</span>
                <Tooltip label="Lower is more consistent and factual; higher is more varied and creative.">
                  <Info className="h-3.5 w-3.5 text-muted" />
                </Tooltip>
              </div>
              <Slider
                value={draft.temperature}
                min={0}
                max={2}
                step={0.1}
                onChange={(value) => set('temperature', value)}
                format={(value) => value.toFixed(1)}
              />
              <p className="mt-1.5 text-xs text-muted">
                {draft.temperature <= 0.3
                  ? 'Precise — best for support, classification, and data tasks.'
                  : draft.temperature <= 0.8
                    ? 'Balanced — a good default for most agents.'
                    : 'Creative — better for brainstorming and copywriting.'}
              </p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[13px] font-medium text-ink">Maximum tokens</span>
                <Tooltip label="The longest response this agent may return. Higher costs more.">
                  <Info className="h-3.5 w-3.5 text-muted" />
                </Tooltip>
              </div>
              <Slider
                value={draft.maxTokens}
                min={256}
                max={Math.max(activeModel?.maxTokens ?? 4096, 4096)}
                step={256}
                onChange={(value) => set('maxTokens', value)}
                format={(value) => (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value))}
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Knowledge base"
            description="Answer from your own documents (RAG)"
            action={
              <Tooltip label="The agent retrieves matching passages and is told to prefer them.">
                <BookOpen className="h-4 w-4 text-muted" />
              </Tooltip>
            }
          />
          <CardBody className="space-y-3">
            <Select
              value={draft.knowledgeBaseId ?? ''}
              onChange={(event) => set('knowledgeBaseId', event.target.value || null)}
              aria-label="Knowledge base"
            >
              <option value="">None — answer from the model only</option>
              {knowledgeBases.map((base) => (
                <option key={base.id} value={base.id}>
                  {base.name} ({base.documents} {base.documents === 1 ? 'document' : 'documents'})
                </option>
              ))}
            </Select>
            {knowledgeBases.length === 0 ? (
              <p className="text-xs text-muted">
                No knowledge bases in this workspace yet. Create one under Knowledge Bases to let this
                agent answer from your own content.
              </p>
            ) : (
              <p className="text-xs text-muted">
                With a base attached, each message retrieves the closest passages and cites them in the
                reply.
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Advanced settings" />
          <CardBody className="space-y-5">
            <Switch
              checked={draft.memoryEnabled}
              onChange={(value) => set('memoryEnabled', value)}
              label="Conversation memory"
              description="Send earlier messages with each request so the agent remembers context. Uses more tokens."
            />
            <Switch
              checked={draft.status === 'ACTIVE'}
              onChange={(value) => set('status', value ? 'ACTIVE' : 'INACTIVE')}
              label="Agent enabled"
              description="Disabled agents cannot be used in the playground or in automations."
            />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-2">
            <Button className="w-full" onClick={() => save(false)} loading={saving}>
              <Save className="h-4 w-4" />
              {isEdit ? 'Save changes' : 'Save agent'}
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => save(true)} disabled={saving}>
              <Send className="h-4 w-4" />
              Save &amp; test agent
            </Button>
            {isEdit && (
              <Button variant="ghost" className="w-full text-danger" onClick={() => setConfirming(true)} disabled={saving}>
                <Trash2 className="h-4 w-4" />
                Delete agent
              </Button>
            )}
          </CardBody>
        </Card>

        <div className="flex items-start gap-2.5 rounded-xl border border-line bg-surface p-4 text-xs text-muted">
          <Settings2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            No API key configured? The app answers with a built-in simulator so you can still test the flow. Add a
            real key under <span className="font-medium text-ink">Settings → AI Providers</span>.
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={remove}
        loading={saving}
        title={`Delete "${draft.name}"?`}
        message="This permanently deletes the agent and its conversations. This cannot be undone."
      />
    </div>
  )
}
