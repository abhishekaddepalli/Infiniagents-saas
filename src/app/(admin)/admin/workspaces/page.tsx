import { Building2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table'
import { requireAdmin } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { prisma } from '@/lib/db'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'

export const metadata = { title: 'Workspaces' }
export const dynamic = 'force-dynamic'

export default async function AdminWorkspacesPage() {
  await requireAdmin()

  const [workspaces, settings] = await Promise.all([
    prisma.workspace.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        owner: { select: { name: true, email: true } },
        subscription: { include: { plan: { select: { name: true } } } },
        _count: { select: { members: true, agents: true, automations: true, knowledgeBases: true } },
      },
    }),
    getSettings(),
  ])

  // Spend per workspace, aggregated in one query rather than N.
  const spend = await prisma.aiUsage.groupBy({
    by: ['workspaceId'],
    _sum: { costUsd: true },
    _count: true,
  })
  const spendById = new Map(spend.map((row) => [row.workspaceId, row]))

  return (
    <div>
      <PageHeader
        title="Workspaces"
        description="Every workspace on the platform, its plan and what it is spending."
      />

      {workspaces.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No workspaces yet"
          description="A workspace is created for every account at registration."
        />
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Workspace</Th>
                <Th>Owner</Th>
                <Th>Plan</Th>
                <Th className="text-right">Members</Th>
                <Th className="text-right">Agents</Th>
                <Th className="text-right">Automations</Th>
                <Th className="text-right">Requests</Th>
                <Th className="text-right">Spend</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {workspaces.map((workspace) => {
                const usage = spendById.get(workspace.id)
                return (
                  <Tr key={workspace.id}>
                    <Td>
                      <p className="flex items-center gap-2 truncate text-[13px] font-medium text-ink">
                        {workspace.name}
                        {workspace.isPersonal && <Badge>Personal</Badge>}
                      </p>
                      <p className="truncate font-mono text-[11px] text-muted">{workspace.slug}</p>
                    </Td>
                    <Td>
                      <p className="truncate text-[13px] text-ink">{workspace.owner.name}</p>
                      <p className="truncate text-[11px] text-muted">{workspace.owner.email}</p>
                    </Td>
                    <Td>
                      <Badge tone={workspace.subscription?.status === 'ACTIVE' ? 'success' : 'neutral'}>
                        {workspace.subscription?.plan.name ?? 'Free'}
                      </Badge>
                    </Td>
                    <Td className="text-right font-mono text-xs">{workspace._count.members}</Td>
                    <Td className="text-right font-mono text-xs">{workspace._count.agents}</Td>
                    <Td className="text-right font-mono text-xs">{workspace._count.automations}</Td>
                    <Td className="text-right font-mono text-xs">
                      {formatNumber(usage?._count ?? 0)}
                    </Td>
                    <Td className="text-right font-mono text-xs">
                      {formatCurrency(usage?._sum.costUsd ?? 0, settings.currencySymbol)}
                    </Td>
                    <Td className="whitespace-nowrap text-[13px] text-muted">
                      {formatDate(workspace.createdAt)}
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </div>
  )
}
