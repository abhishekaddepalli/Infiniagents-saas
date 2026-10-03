'use client'
import { Search } from 'lucide-react'
import { Input, Select } from '@/components/ui/input'

/** Search + status/provider filters for the agent list. */
export function AgentFilters({
  query,
  status,
  provider,
  onQuery,
  onStatus,
  onProvider,
}: {
  query: string
  status: string
  provider: string
  onQuery: (value: string) => void
  onStatus: (value: string) => void
  onProvider: (value: string) => void
}) {
  return (
    <div className="mb-5 flex flex-col gap-2 sm:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <Input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search agents by name or description"
          className="pl-9"
          aria-label="Search agents"
        />
      </div>
      <Select value={status} onChange={(event) => onStatus(event.target.value)} className="sm:w-40" aria-label="Filter by status">
        <option value="">All statuses</option>
        <option value="ACTIVE">Active</option>
        <option value="INACTIVE">Inactive</option>
      </Select>
      <Select value={provider} onChange={(event) => onProvider(event.target.value)} className="sm:w-44" aria-label="Filter by provider">
        <option value="">All providers</option>
        <option value="OPENAI">OpenAI</option>
        <option value="GEMINI">Google Gemini</option>
        <option value="ANTHROPIC">Anthropic</option>
      </Select>
    </div>
  )
}
