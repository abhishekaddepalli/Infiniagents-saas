'use client'
import { useMemo, useState } from 'react'
import { Check, Copy, Library, Search, SearchX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

export type PromptItem = {
  id: string
  title: string
  category: string
  body: string
  tags: string[]
}

export function PromptLibrary({ prompts }: { prompts: PromptItem[] }) {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [active, setActive] = useState<PromptItem | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const categories = useMemo(
    () => ['All', ...[...new Set(prompts.map((prompt) => prompt.category))].sort()],
    [prompts],
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return prompts.filter((prompt) => {
      if (category !== 'All' && prompt.category !== category) return false
      if (!needle) return true
      return (
        prompt.title.toLowerCase().includes(needle) ||
        prompt.body.toLowerCase().includes(needle) ||
        prompt.tags.some((tag) => tag.toLowerCase().includes(needle))
      )
    })
  }, [prompts, query, category])

  async function copy(prompt: PromptItem) {
    try {
      await navigator.clipboard.writeText(prompt.body)
      setCopiedId(prompt.id)
      toast.success('Prompt copied to clipboard')
      setTimeout(() => setCopiedId(null), 1800)
    } catch {
      toast.error('Could not copy', 'Your browser blocked clipboard access.')
    }
  }

  if (prompts.length === 0) {
    return (
      <EmptyState
        icon={Library}
        title="No prompts in the library"
        description="Add prompts to prisma/seed-data/prompts.ts and run the seed to populate this library."
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
            placeholder="Search prompts by title, content, or tag"
            className="pl-9"
            aria-label="Search prompts"
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
          title="No prompts match your search"
          description="Try a different keyword, or choose another category."
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
          {filtered.map((prompt) => (
            <div key={prompt.id} className="flex min-w-0 flex-col rounded-xl border border-line bg-surface p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[15px] font-semibold text-ink">{prompt.title}</h3>
                <Badge>{prompt.category}</Badge>
              </div>

              <p className="mt-3 line-clamp-4 flex-1 whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-muted">
                {prompt.body}
              </p>

              {prompt.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {prompt.tags.map((tag) => (
                    <span key={tag} className="rounded bg-elevated px-1.5 py-0.5 text-[11px] text-muted">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 flex gap-2 border-t border-line pt-3">
                <Button size="sm" variant="secondary" className="flex-1" onClick={() => copy(prompt)}>
                  {copiedId === prompt.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedId === prompt.id ? 'Copied' : 'Copy'}
                </Button>
                <Button size="sm" className="flex-1" onClick={() => setActive(prompt)}>
                  Use Prompt
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(active)}
        onClose={() => setActive(null)}
        title={active?.title ?? ''}
        description="Copy this prompt and paste it into the playground or an agent's instructions."
        size="lg"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setActive(null)}>
              Close
            </Button>
            <Button size="sm" onClick={() => active && copy(active)}>
              <Copy className="h-3.5 w-3.5" />
              Copy prompt
            </Button>
          </>
        }
      >
        {active && (
          <div>
            <p className="mb-2 text-xs text-muted">
              Replace every <code className="rounded bg-elevated px-1 py-0.5 font-mono">{'{{placeholder}}'}</code>{' '}
              with your own details before sending.
            </p>
            <pre className="scroll-thin max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-bg p-3.5 font-mono text-[12px] leading-relaxed text-ink">
              {active.body}
            </pre>
          </div>
        )}
      </Dialog>
    </div>
  )
}
