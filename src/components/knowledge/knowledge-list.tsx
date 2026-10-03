'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { BookOpen, FileText, Layers, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { formatNumber, timeAgo } from '@/lib/utils'

export type KnowledgeBaseRow = {
  id: string
  name: string
  description: string
  embeddingProvider: string
  embeddingModel: string
  documents: number
  chunks: number
  agents: number
  updatedAt: string
}

export type EmbeddingModelOption = { provider: string; modelId: string; name: string }

export function KnowledgeList({
  bases,
  embeddingModels,
  demoMode,
}: {
  bases: KnowledgeBaseRow[]
  embeddingModels: EmbeddingModelOption[]
  demoMode: boolean
}) {
  const router = useRouter()
  const toast = useToast()
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState({
    name: '',
    description: '',
    embeddingProvider: 'OPENAI',
    embeddingModel: embeddingModels.find((model) => model.provider === 'OPENAI')?.modelId ?? '',
  })

  const providerModels = embeddingModels.filter((model) => model.provider === draft.embeddingProvider)

  async function create() {
    setBusy(true)
    try {
      const response = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error('Could not create the knowledge base', data.error)
        return
      }
      toast.success(`"${draft.name}" created`)
      setCreating(false)
      router.push(`/knowledge/${data.base.id}`)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          New knowledge base
        </Button>
      </div>

      {bases.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No knowledge bases yet"
          description="Upload your documentation, policies or product notes, then attach the base to an agent so it answers from your own content instead of guessing."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              Create knowledge base
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {bases.map((base) => (
            <Link
              key={base.id}
              href={`/knowledge/${base.id}`}
              className="flex min-w-0 flex-col rounded-xl border border-line bg-surface p-5 shadow-card transition-shadow hover:shadow-pop"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300">
                  <BookOpen className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[15px] font-semibold text-ink">{base.name}</h3>
                  <p className="truncate font-mono text-[11px] text-muted">{base.embeddingModel}</p>
                </div>
              </div>

              <p className="mt-3 line-clamp-2 min-h-[40px] text-[13px] leading-relaxed text-muted">
                {base.description || 'No description yet.'}
              </p>

              <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[11px] text-muted">
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {base.documents}
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    {formatNumber(base.chunks)}
                  </span>
                </span>
                <span>{timeAgo(base.updatedAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title="New knowledge base"
        description="Documents added here are chunked, embedded, and searched when an attached agent answers."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={create} loading={busy} disabled={draft.name.trim().length < 2}>
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name" required>
            <Input
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="Product Handbook"
              autoFocus
            />
          </Field>

          <Field label="Description">
            <Textarea
              rows={2}
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              placeholder="Policies and product facts the support agent answers from."
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Embedding provider" hint="Anthropic does not offer embeddings.">
              <Select
                value={draft.embeddingProvider}
                onChange={(event) => {
                  const provider = event.target.value
                  const first = embeddingModels.find((model) => model.provider === provider)
                  setDraft({
                    ...draft,
                    embeddingProvider: provider,
                    embeddingModel: first?.modelId ?? '',
                  })
                }}
              >
                <option value="OPENAI">OpenAI</option>
                <option value="GEMINI">Google Gemini</option>
              </Select>
            </Field>
            <Field label="Embedding model" required>
              <Select
                value={draft.embeddingModel}
                onChange={(event) => setDraft({ ...draft, embeddingModel: event.target.value })}
              >
                <option value="">Select a model</option>
                {providerModels.map((model) => (
                  <option key={model.modelId} value={model.modelId}>
                    {model.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <p className="rounded-lg border border-line bg-bg p-3 text-[12px] leading-relaxed text-muted">
            The embedding model is fixed once documents are indexed — mixing models within one base
            makes similarity meaningless.
            {demoMode && (
              <>
                {' '}
                With no API key configured, documents are indexed with the built-in keyword embedder so
                retrieval still works; it matches wording rather than meaning.
              </>
            )}
          </p>
        </div>
      </Dialog>
    </div>
  )
}
