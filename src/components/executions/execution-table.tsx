'use client'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { History, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input, Select } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/badge'
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table'
import { formatCurrency, formatDateTime, formatDuration, formatNumber } from '@/lib/utils'

export type ExecutionRow = {
  id: string
  status: string
  source: string
  automationName: string | null
  agentName: string | null
  startedAt: string
  durationMs: number
  inputTokens: number
  outputTokens: number
  costUsd: number
}

export function ExecutionTable({
  executions,
  currencySymbol = '$',
}: {
  executions: ExecutionRow[]
  currencySymbol?: string
}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return executions.filter((row) => {
      if (status && row.status !== status) return false
      if (!needle) return true
      return (
        (row.automationName ?? '').toLowerCase().includes(needle) ||
        (row.agentName ?? '').toLowerCase().includes(needle) ||
        row.id.toLowerCase().includes(needle)
      )
    })
  }, [executions, query, status])

  if (executions.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No executions yet"
        description="Run an automation or chat with an agent in the playground, and every run will be recorded here with its tokens and cost."
        action={
          <Link href="/automations">
            <Button>Go to automations</Button>
          </Link>
        }
      />
    )
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by automation, agent, or execution ID"
          className="flex-1"
          aria-label="Search executions"
        />
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="sm:w-44"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
          <option value="RUNNING">Running</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No executions match those filters"
          description="Try a different search term or clear the status filter."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery('')
                setStatus('')
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Execution ID</Th>
                <Th>Automation</Th>
                <Th>Agent</Th>
                <Th>Status</Th>
                <Th>Started</Th>
                <Th className="text-right">Duration</Th>
                <Th className="text-right">Tokens</Th>
                <Th className="text-right">Cost</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <Tr key={row.id}>
                  <Td>
                    <Link
                      href={`/executions/${row.id}`}
                      className="font-mono text-xs text-brand-600 hover:underline dark:text-brand-300"
                    >
                      {row.id.slice(-10)}
                    </Link>
                  </Td>
                  <Td className="max-w-[200px] truncate text-[13px]">{row.automationName ?? '—'}</Td>
                  <Td className="max-w-[160px] truncate text-[13px]">{row.agentName ?? '—'}</Td>
                  <Td>
                    <StatusBadge status={row.status} />
                  </Td>
                  <Td className="whitespace-nowrap text-[13px] text-muted">{formatDateTime(row.startedAt)}</Td>
                  <Td className="text-right font-mono text-xs">{formatDuration(row.durationMs)}</Td>
                  <Td className="text-right font-mono text-xs">
                    {formatNumber(row.inputTokens + row.outputTokens)}
                  </Td>
                  <Td className="text-right font-mono text-xs">{formatCurrency(row.costUsd, currencySymbol)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}

      <p className="mt-3 text-xs text-muted">
        Showing {filtered.length} of {executions.length} executions.
      </p>
    </div>
  )
}
