import { PageHeader } from '@/components/layout/page-header'
import { AgentIcon } from '@/components/ui/agent-icon'
import { StatusBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table'
import { Bot } from 'lucide-react'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Agents' }
export const dynamic = 'force-dynamic'

const providerLabels: Record<string, string> = {
  OPENAI: 'OpenAI',
  GEMINI: 'Gemini',
  ANTHROPIC: 'Anthropic',
}

export default async function AdminAgentsPage() {
  await requireAdmin()
  const agents = await prisma.agent.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      workspace: { select: { name: true, slug: true } },
      createdBy: { select: { name: true, email: true } },
      _count: { select: { conversations: true, usage: true } },
    },
  })

  return (
    <div>
      <PageHeader title="Agents" description="Every agent created across all accounts." />

      {agents.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="No agents on the platform yet"
          description="Agents created by any user will be listed here."
        />
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Agent</Th>
                <Th>Workspace</Th>
                <Th>Provider</Th>
                <Th>Model</Th>
                <Th>Status</Th>
                <Th className="text-right">Requests</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <Tr key={agent.id}>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <AgentIcon name={agent.icon} size="sm" />
                      <span className="truncate text-[13px] font-medium text-ink">{agent.name}</span>
                    </div>
                  </Td>
                  <Td>
                    <p className="truncate text-[13px] text-ink">{agent.workspace.name}</p>
                    <p className="truncate text-[11px] text-muted">
                      {agent.createdBy?.email ?? 'unknown creator'}
                    </p>
                  </Td>
                  <Td className="text-[13px]">{providerLabels[agent.provider] ?? agent.provider}</Td>
                  <Td className="font-mono text-xs">{agent.model}</Td>
                  <Td>
                    <StatusBadge status={agent.status} />
                  </Td>
                  <Td className="text-right font-mono text-xs">{agent._count.usage}</Td>
                  <Td className="whitespace-nowrap text-[13px] text-muted">{formatDate(agent.createdAt)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </div>
  )
}
