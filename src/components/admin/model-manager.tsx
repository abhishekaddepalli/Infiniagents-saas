'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog, Dialog } from '@/components/ui/dialog'
import { Field, Input, Select, Switch } from '@/components/ui/input'
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'
import { formatNumber } from '@/lib/utils'

export type ModelRow = {
  id: string
  provider: string
  name: string
  modelId: string
  inputCostPerM: number
  outputCostPerM: number
  maxTokens: number
  enabled: boolean
}

const empty: Omit<ModelRow, 'id'> = {
  provider: 'OPENAI',
  name: '',
  modelId: '',
  inputCostPerM: 0,
  outputCostPerM: 0,
  maxTokens: 4096,
  enabled: true,
}

/**
 * Admin → AI Models.
 * Prices live here rather than in code, because provider pricing changes and a
 * buyer must be able to correct it without a redeploy.
 */
export function ModelManager({ models, currencySymbol }: { models: ModelRow[]; currencySymbol: string }) {
  const router = useRouter()
  const toast = useToast()
  const [editing, setEditing] = useState<ModelRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState(empty)
  const [removing, setRemoving] = useState<ModelRow | null>(null)
  const [busy, setBusy] = useState(false)

  function openCreate() {
    setDraft(empty)
    setCreating(true)
  }

  function openEdit(model: ModelRow) {
    setDraft({ ...model })
    setEditing(model)
  }

  async function save() {
    setBusy(true)
    try {
      const response = await fetch(editing ? `/api/admin/models/${editing.id}` : '/api/admin/models', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error('Could not save the model', data.error)
        return
      }
      toast.success(editing ? 'Model updated' : 'Model added')
      setEditing(null)
      setCreating(false)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function toggle(model: ModelRow) {
    await fetch(`/api/admin/models/${model.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !model.enabled }),
    })
    toast.success(model.enabled ? 'Model disabled' : 'Model enabled')
    router.refresh()
  }

  async function remove(model: ModelRow) {
    setBusy(true)
    try {
      const response = await fetch(`/api/admin/models/${model.id}`, { method: 'DELETE' })
      if (!response.ok) {
        toast.error('Could not remove the model')
        return
      }
      toast.success('Model removed')
      router.refresh()
    } finally {
      setBusy(false)
      setRemoving(null)
    }
  }

  const open = creating || Boolean(editing)

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add model
        </Button>
      </div>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>Provider</Th>
              <Th>Name</Th>
              <Th>Model ID</Th>
              <Th className="text-right">Input / 1M</Th>
              <Th className="text-right">Output / 1M</Th>
              <Th className="text-right">Max tokens</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {models.map((model) => (
              <Tr key={model.id}>
                <Td className="text-[13px]">{model.provider}</Td>
                <Td className="text-[13px] font-medium">{model.name}</Td>
                <Td className="font-mono text-xs">{model.modelId}</Td>
                <Td className="text-right font-mono text-xs">
                  {currencySymbol}
                  {model.inputCostPerM}
                </Td>
                <Td className="text-right font-mono text-xs">
                  {currencySymbol}
                  {model.outputCostPerM}
                </Td>
                <Td className="text-right font-mono text-xs">{formatNumber(model.maxTokens)}</Td>
                <Td>
                  <button onClick={() => toggle(model)}>
                    <Badge tone={model.enabled ? 'success' : 'neutral'} dot>
                      {model.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </button>
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => openEdit(model)}
                      className="rounded-lg p-1.5 text-muted hover:bg-elevated hover:text-ink"
                      aria-label={`Edit ${model.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setRemoving(model)}
                      className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                      aria-label={`Delete ${model.name}`}
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

      <p className="mt-3 text-xs text-muted">
        Costs are in {currencySymbol} per 1,000,000 tokens. Every cost figure in the product is calculated from
        these values.
      </p>

      <Dialog
        open={open}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
        title={editing ? `Edit ${editing.name}` : 'Add a model'}
        description="Model IDs must match exactly what the provider's API expects."
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
              Save model
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Provider" required>
              <Select
                value={draft.provider}
                onChange={(event) => setDraft({ ...draft, provider: event.target.value })}
              >
                <option value="OPENAI">OpenAI</option>
                <option value="GEMINI">Google Gemini</option>
                <option value="ANTHROPIC">Anthropic</option>
              </Select>
            </Field>
            <Field label="Display name" required>
              <Input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="GPT-4o mini"
              />
            </Field>
          </div>

          <Field label="Model ID" required hint="The exact identifier sent to the provider's API.">
            <Input
              value={draft.modelId}
              onChange={(event) => setDraft({ ...draft, modelId: event.target.value })}
              placeholder="gpt-4o-mini"
              className="font-mono text-[13px]"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={`Input cost (${currencySymbol}/1M)`}>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={draft.inputCostPerM}
                onChange={(event) => setDraft({ ...draft, inputCostPerM: Number(event.target.value) })}
              />
            </Field>
            <Field label={`Output cost (${currencySymbol}/1M)`}>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={draft.outputCostPerM}
                onChange={(event) => setDraft({ ...draft, outputCostPerM: Number(event.target.value) })}
              />
            </Field>
            <Field label="Max tokens">
              <Input
                type="number"
                min="1"
                value={draft.maxTokens}
                onChange={(event) => setDraft({ ...draft, maxTokens: Number(event.target.value) })}
              />
            </Field>
          </div>

          <Switch
            checked={draft.enabled}
            onChange={(value) => setDraft({ ...draft, enabled: value })}
            label="Available to users"
            description="Disabled models are hidden from every model picker."
          />
        </div>
      </Dialog>

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && remove(removing)}
        loading={busy}
        title={`Remove ${removing?.name}?`}
        confirmLabel="Remove model"
        message="Agents already using this model keep working, but new cost calculations for it will return zero until you add it back."
      />
    </div>
  )
}
