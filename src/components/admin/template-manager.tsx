'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Eye, EyeOff, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { AgentIcon, IconPicker } from '@/components/ui/agent-icon'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog, Dialog } from '@/components/ui/dialog'
import { Field, Input, Select, Slider, Switch, Textarea } from '@/components/ui/input'
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'

export type TemplateRow = {
  id: string
  name: string
  description: string
  category: string
  icon: string
  provider: string
  model: string
  systemPrompt: string
  temperature: number
  maxTokens: number
  welcomeMessage: string
  status: string
  featured: boolean
  usageCount: number
}

export type ModelChoice = { provider: string; modelId: string; name: string }

const empty = {
  name: '',
  description: '',
  category: 'Business',
  icon: 'sparkles',
  provider: 'OPENAI',
  model: '',
  systemPrompt: '',
  temperature: 0.7,
  maxTokens: 1024,
  welcomeMessage: '',
  status: 'PUBLISHED',
  featured: false,
}

export function TemplateManager({
  templates,
  models,
}: {
  templates: TemplateRow[]
  models: ModelChoice[]
}) {
  const router = useRouter()
  const toast = useToast()
  const [draft, setDraft] = useState<typeof empty>({ ...empty, model: models[0]?.modelId ?? '' })
  const [editing, setEditing] = useState<TemplateRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [removing, setRemoving] = useState<TemplateRow | null>(null)
  const [busy, setBusy] = useState(false)

  function openCreate() {
    setDraft({ ...empty, model: models[0]?.modelId ?? '' })
    setCreating(true)
  }

  function openEdit(template: TemplateRow) {
    setDraft({ ...template })
    setEditing(template)
  }

  async function save() {
    setBusy(true)
    try {
      const response = await fetch(
        editing ? `/api/admin/templates/${editing.id}` : '/api/admin/templates',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        },
      )
      const data = await response.json()
      if (!response.ok) {
        toast.error('Could not save the template', data.error)
        return
      }
      toast.success(editing ? 'Template updated' : 'Template created')
      setEditing(null)
      setCreating(false)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function patch(template: TemplateRow, body: object, message: string) {
    await fetch(`/api/admin/templates/${template.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    toast.success(message)
    router.refresh()
  }

  async function remove(template: TemplateRow) {
    setBusy(true)
    try {
      const response = await fetch(`/api/admin/templates/${template.id}`, { method: 'DELETE' })
      if (!response.ok) {
        toast.error('Could not delete the template')
        return
      }
      toast.success('Template deleted')
      router.refresh()
    } finally {
      setBusy(false)
      setRemoving(null)
    }
  }

  const providerModels = models.filter((model) => model.provider === draft.provider)

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Create template
        </Button>
      </div>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>Template</Th>
              <Th>Category</Th>
              <Th>Model</Th>
              <Th>Status</Th>
              <Th className="text-right">Times used</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {templates.map((template) => (
              <Tr key={template.id}>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <AgentIcon name={template.icon} size="sm" />
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-[13px] font-medium text-ink">
                        {template.name}
                        {template.featured && <Star className="h-3 w-3 shrink-0 fill-current text-warn" />}
                      </p>
                      <p className="max-w-md truncate text-[11px] text-muted">{template.description}</p>
                    </div>
                  </div>
                </Td>
                <Td>
                  <Badge>{template.category}</Badge>
                </Td>
                <Td className="font-mono text-xs">{template.model}</Td>
                <Td>
                  <StatusBadge status={template.status} />
                </Td>
                <Td className="text-right font-mono text-xs">{template.usageCount}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() =>
                        patch(
                          template,
                          { featured: !template.featured },
                          template.featured ? 'Removed from featured' : 'Marked as featured',
                        )
                      }
                      className="rounded-lg p-1.5 text-muted hover:bg-elevated hover:text-ink"
                      aria-label={template.featured ? 'Unfeature template' : 'Feature template'}
                    >
                      <Star className={`h-3.5 w-3.5 ${template.featured ? 'fill-current text-warn' : ''}`} />
                    </button>
                    <button
                      onClick={() =>
                        patch(
                          template,
                          { status: template.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' },
                          template.status === 'PUBLISHED' ? 'Template unpublished' : 'Template published',
                        )
                      }
                      className="rounded-lg p-1.5 text-muted hover:bg-elevated hover:text-ink"
                      aria-label={template.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                    >
                      {template.status === 'PUBLISHED' ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => openEdit(template)}
                      className="rounded-lg p-1.5 text-muted hover:bg-elevated hover:text-ink"
                      aria-label={`Edit ${template.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setRemoving(template)}
                      className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                      aria-label={`Delete ${template.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>

      <Dialog
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
        title={editing ? `Edit ${editing.name}` : 'Create template'}
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setCreating(false)
                setEditing(null)
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={save} loading={busy}>
              Save template
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Template name" required>
              <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </Field>
            <Field label="Category" required>
              <Input
                value={draft.category}
                onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                placeholder="Marketing"
              />
            </Field>
          </div>

          <Field label="Description" required>
            <Input
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              placeholder="What this agent does, in one sentence."
            />
          </Field>

          <Field label="Icon">
            <IconPicker value={draft.icon} onChange={(icon) => setDraft({ ...draft, icon })} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Provider" required>
              <Select
                value={draft.provider}
                onChange={(event) => {
                  const provider = event.target.value
                  const first = models.find((model) => model.provider === provider)
                  setDraft({ ...draft, provider, model: first?.modelId ?? '' })
                }}
              >
                <option value="OPENAI">OpenAI</option>
                <option value="GEMINI">Google Gemini</option>
                <option value="ANTHROPIC">Anthropic</option>
              </Select>
            </Field>
            <Field label="Recommended model" required>
              <Select value={draft.model} onChange={(event) => setDraft({ ...draft, model: event.target.value })}>
                <option value="">Select a model</option>
                {providerModels.map((model) => (
                  <option key={model.modelId} value={model.modelId}>
                    {model.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="System prompt" required>
            <Textarea
              rows={10}
              className="font-mono text-[12px]"
              value={draft.systemPrompt}
              onChange={(event) => setDraft({ ...draft, systemPrompt: event.target.value })}
            />
          </Field>

          <Field label="Welcome message">
            <Input
              value={draft.welcomeMessage}
              onChange={(event) => setDraft({ ...draft, welcomeMessage: event.target.value })}
            />
          </Field>

          <div>
            <span className="mb-2 block text-[13px] font-medium text-ink">Temperature</span>
            <Slider
              value={draft.temperature}
              min={0}
              max={2}
              step={0.1}
              onChange={(temperature) => setDraft({ ...draft, temperature })}
              format={(value) => value.toFixed(1)}
            />
          </div>

          <div className="space-y-4 border-t border-line pt-4">
            <Switch
              checked={draft.status === 'PUBLISHED'}
              onChange={(value) => setDraft({ ...draft, status: value ? 'PUBLISHED' : 'DRAFT' })}
              label="Published"
              description="Only published templates appear in the user-facing template library."
            />
            <Switch
              checked={draft.featured}
              onChange={(featured) => setDraft({ ...draft, featured })}
              label="Featured"
              description="Featured templates are pinned to the top of the library."
            />
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && remove(removing)}
        loading={busy}
        title={`Delete "${removing?.name}"?`}
        message="Agents already created from this template keep working. Only the template itself is removed."
      />
    </div>
  )
}
