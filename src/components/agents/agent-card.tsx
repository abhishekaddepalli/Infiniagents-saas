'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Copy, MessageSquare, MoreVertical, Pencil, Power, Trash2 } from 'lucide-react'
import { AgentIcon } from '@/components/ui/agent-icon'
import { StatusBadge } from '@/components/ui/badge'
import { Dropdown } from '@/components/ui/dropdown'
import { ConfirmDialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'

export type AgentSummary = {
  id: string
  name: string
  description: string
  icon: string
  provider: string
  model: string
  status: string
  isDemo: boolean
}

const providerLabels: Record<string, string> = {
  OPENAI: 'OpenAI',
  GEMINI: 'Gemini',
  ANTHROPIC: 'Anthropic',
}

export function AgentCard({ agent }: { agent: AgentSummary }) {
  const router = useRouter()
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  async function call(path: string, init: RequestInit, successMessage: string) {
    setBusy(true)
    try {
      const response = await fetch(path, init)
      const data = await response.json()
      if (!response.ok) {
        toast.error('Action failed', data.error)
        return false
      }
      toast.success(successMessage)
      router.refresh()
      return true
    } catch {
      toast.error('Could not reach the server', 'Check your connection and try again.')
      return false
    } finally {
      setBusy(false)
    }
  }

  const toggleStatus = () =>
    call(
      `/api/agents/${agent.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: agent.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }),
      },
      agent.status === 'ACTIVE' ? 'Agent disabled' : 'Agent enabled',
    )

  const duplicate = () => call(`/api/agents/${agent.id}/duplicate`, { method: 'POST' }, 'Agent duplicated')

  async function remove() {
    const done = await call(`/api/agents/${agent.id}`, { method: 'DELETE' }, 'Agent deleted')
    if (done) setConfirming(false)
  }

  return (
    <>
      <div className="group flex min-w-0 flex-col rounded-xl border border-line bg-surface p-5 shadow-card transition-shadow hover:shadow-pop">
        <div className="flex items-start gap-3">
          <AgentIcon name={agent.icon} />
          <div className="min-w-0 flex-1">
            <Link href={`/agents/${agent.id}`} className="block">
              <h3 className="truncate text-[15px] font-semibold text-ink hover:underline">{agent.name}</h3>
            </Link>
            <p className="mt-0.5 truncate font-mono text-[11px] text-muted">
              {providerLabels[agent.provider] ?? agent.provider} · {agent.model}
            </p>
          </div>

          <Dropdown
            trigger={
              <button className="rounded-lg p-1.5 text-muted hover:bg-elevated" aria-label={`Actions for ${agent.name}`}>
                <MoreVertical className="h-4 w-4" />
              </button>
            }
            items={[
              { label: 'Edit', icon: Pencil, onClick: () => router.push(`/agents/${agent.id}`) },
              { label: 'Test in playground', icon: MessageSquare, onClick: () => router.push(`/playground?agent=${agent.id}`) },
              { label: 'Duplicate', icon: Copy, onClick: duplicate },
              { label: agent.status === 'ACTIVE' ? 'Disable' : 'Enable', icon: Power, onClick: toggleStatus },
              { label: 'Delete', icon: Trash2, onClick: () => setConfirming(true), danger: true },
            ]}
          />
        </div>

        <p className="mt-3 line-clamp-2 min-h-[40px] text-[13px] leading-relaxed text-muted">
          {agent.description || 'No description yet.'}
        </p>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
          <div className="flex items-center gap-2">
            <StatusBadge status={agent.status} />
            {agent.isDemo && <span className="text-[11px] text-faint">Sample</span>}
          </div>
          <Link
            href={`/playground?agent=${agent.id}`}
            className="flex items-center gap-1.5 text-[13px] font-medium text-brand-600 hover:underline dark:text-brand-300"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Test
          </Link>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={remove}
        loading={busy}
        title={`Delete "${agent.name}"?`}
        message="This permanently deletes the agent along with its conversations. Automations using it will need a different agent selected. This cannot be undone."
      />
    </>
  )
}
