import Link from 'next/link'
import { History } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { StatusBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table'
import { requireAdmin } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { prisma } from '@/lib/db'
import { formatCurrency, formatDateTime, formatDuration, formatNumber } from '@/lib/utils'

export const metadata = { title: 'Executions' }
export const dynamic = 'force-dynamic'

export default async function AdminExecutionsPage() {
  await requireAdmin()
  const [executions, settings] = await Promise.all([
    prisma.execution.findMany({
      orderBy: { startedAt: 'desc' },
      take: 200,
      include: {
        user: { select: { name: true, email: true } },
        workspace: { select: { name: true } },
        automation: { select: { name: true } },
        agent: { select: { name: true } },
      },
    }),
    getSettings(),
  ])

  return (
    <div>
      <PageHeader title="Executions" description="Every workflow run on the platform, newest first." />

      {executions.length === 0 ? (
        <EmptyState
          icon={History}
          title="No executions recorded"
          description="Runs from every account will appear here as soon as users start their automations."
        />
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Execution ID</Th>
                <Th>User</Th>
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
              {executions.map((execution) => (
                <Tr key={execution.id}>
                  <Td className="font-mono text-xs text-muted">{execution.id.slice(-10)}</Td>
                  <Td>
                    <p className="truncate text-[13px] text-ink">
                      {execution.user?.name ?? 'API / scheduled'}
                    </p>
                    <p className="truncate text-[11px] text-muted">
                      {execution.user?.email ?? execution.workspace.name}
                    </p>
                  </Td>
                  <Td className="max-w-[180px] truncate text-[13px]">{execution.automation?.name ?? '—'}</Td>
                  <Td className="max-w-[140px] truncate text-[13px]">{execution.agent?.name ?? '—'}</Td>
                  <Td>
                    <StatusBadge status={execution.status} />
                  </Td>
                  <Td className="whitespace-nowrap text-[13px] text-muted">
                    {formatDateTime(execution.startedAt)}
                  </Td>
                  <Td className="text-right font-mono text-xs">{formatDuration(execution.durationMs)}</Td>
                  <Td className="text-right font-mono text-xs">
                    {formatNumber(execution.inputTokens + execution.outputTokens)}
                  </Td>
                  <Td className="text-right font-mono text-xs">
                    {formatCurrency(execution.costUsd, settings.currencySymbol)}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}

      <p className="mt-3 text-xs text-muted">
        Showing the most recent {executions.length} executions. Users can see the full detail of their own runs at{' '}
        <Link href="/executions" className="text-brand-600 hover:underline dark:text-brand-300">
          Execution History
        </Link>
        .
      </p>
    </div>
  )
}
