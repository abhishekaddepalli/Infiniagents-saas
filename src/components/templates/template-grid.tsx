'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, SearchX, Sparkles, Star } from 'lucide-react'
import { AgentIcon } from '@/components/ui/agent-icon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

export type TemplateItem = {
  id: string
  name: string
  description: string
  category: string
  icon: string
  provider: string
  model: string
  systemPrompt: string
  temperature: number
  featured: boolean
}

export function TemplateGrid({ templates }: { templates: TemplateItem[] }) {
  const router = useRouter()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [preview, setPreview] = useState<TemplateItem | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const categories = useMemo(
    () => ['All', ...[...new Set(templates.map((template) => template.category))].sort()],
    [templates],
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return templates.filter((template) => {
      if (category !== 'All' && template.category !== category) return false
      if (!needle) return true
      return (
        template.name.toLowerCase().includes(needle) ||
        template.description.toLowerCase().includes(needle) ||
        template.category.toLowerCase().includes(needle)
      )
    })
  }, [templates, query, category])

  async function applyTemplate(template: TemplateItem) {
    setBusyId(template.id)
    try {
      const response = await fetch(`/api/templates/${template.id}/use`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) {
        toast.error('Could not create the agent', data.error)
        return
      }
      toast.success(`"${template.name}" added to your agents`)
      setPreview(null)
      router.push(`/agents/${data.agent.id}`)
      router.refresh()
    } catch {
      toast.error('Could not reach the server', 'Check your connection and try again.')
    } finally {
      setBusyId(null)
    }
  }

  if (templates.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No templates available"
        description="An administrator can publish agent templates from the admin panel, and they will appear here."
      />
    )
  }

  return (
    <div>
      <div className="mb-5 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search templates"
            className="pl-9"
            aria-label="Search templates"
          />
        </div>

        <div className="scroll-thin flex gap-1.5 overflow-x-auto pb-1">
          {categories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors',
                category === item
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-line bg-surface text-muted hover:text-ink',
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No templates match your search"
          description="Try a different term, or pick another category."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery('')
                setCategory('All')
              }}
            >
              Clear search
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((template) => (
            <div
              key={template.id}
              className="flex min-w-0 flex-col rounded-xl border border-line bg-surface p-5 shadow-card transition-shadow hover:shadow-pop"
            >
              <div className="flex items-start gap-3">
                <AgentIcon name={template.icon} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-[15px] font-semibold text-ink">{template.name}</h3>
                    {template.featured && (
                      <Star className="h-3.5 w-3.5 shrink-0 fill-current text-warn" aria-label="Featured" />
                    )}
                  </div>
                  <Badge className="mt-1">{template.category}</Badge>
                </div>
              </div>

              <p className="mt-3 line-clamp-3 min-h-[60px] text-[13px] leading-relaxed text-muted">
                {template.description}
              </p>

              <div className="mt-4 flex items-center gap-2 border-t border-line pt-3">
                <Button
                  size="sm"
                  className="flex-1"
                  loading={busyId === template.id}
                  onClick={() => applyTemplate(template)}
                >
                  Use Template
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setPreview(template)}>
                  Preview
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title={preview?.name ?? ''}
        description={preview?.description}
        size="lg"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setPreview(null)}>
              Close
            </Button>
            <Button size="sm" loading={busyId === preview?.id} onClick={() => preview && applyTemplate(preview)}>
              Use Template
            </Button>
          </>
        }
      >
        {preview && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="rounded-lg bg-elevated px-2.5 py-1.5 text-muted">
                Category: <span className="text-ink">{preview.category}</span>
              </span>
              <span className="rounded-lg bg-elevated px-2.5 py-1.5 text-muted">
                Model: <span className="font-mono text-ink">{preview.model}</span>
              </span>
              <span className="rounded-lg bg-elevated px-2.5 py-1.5 text-muted">
                Temperature: <span className="font-mono text-ink">{preview.temperature.toFixed(1)}</span>
              </span>
            </div>

            <div>
              <p className="mb-1.5 text-[13px] font-medium text-ink">System prompt</p>
              <pre className="scroll-thin max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-bg p-3.5 font-mono text-[12px] leading-relaxed text-muted">
                {preview.systemPrompt}
              </pre>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
