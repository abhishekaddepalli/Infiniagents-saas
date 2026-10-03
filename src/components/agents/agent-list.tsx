'use client'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Bot, Plus, SearchX } from 'lucide-react'
import { AgentCard, type AgentSummary } from './agent-card'
import { AgentFilters } from './agent-filters'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'

export function AgentList({ agents }: { agents: AgentSummary[] }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [provider, setProvider] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return agents.filter((agent) => {
      if (status && agent.status !== status) return false
      if (provider && agent.provider !== provider) return false
      if (!needle) return true
      return (
        agent.name.toLowerCase().includes(needle) || agent.description.toLowerCase().includes(needle)
      )
    })
  }, [agents, query, status, provider])

  if (agents.length === 0) {
    return (
      <EmptyState
        icon={Bot}
        title="No AI agents yet"
        description="Create your first AI agent and start testing it, or begin from one of the ready-made templates."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/agents/new">
              <Button>
                <Plus className="h-4 w-4" />
                Create Agent
              </Button>
            </Link>
            <Link href="/templates">
              <Button variant="secondary">Browse templates</Button>
            </Link>
          </div>
        }
      />
    )
  }

  return (
    <div>
      <AgentFilters
        query={query}
        status={status}
        provider={provider}
        onQuery={setQuery}
        onStatus={setStatus}
        onProvider={setProvider}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No agents match those filters"
          description="Try a different search term, or clear the filters to see all of your agents."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery('')
                setStatus('')
                setProvider('')
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  )
}
