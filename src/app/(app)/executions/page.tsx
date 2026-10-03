import { PageHeader } from '@/components/layout/page-header'
import { ExecutionTable } from '@/components/executions/execution-table'
import { requireWorkspace } from '@/lib/workspace'
import { getSettings } from '@/lib/settings'
import { prisma } from '@/lib/db'

export const metadata = { title: 'Execution History' }
export const dynamic = 'force-dynamic'

export default async function ExecutionsPage({
  searchParams,
}: {
  searchParams: Promise<{ automation?: string }>
}) {
  const { workspaceId, user } = await requireWorkspace()
  const { automation } = await searchParams

  const [executions, settings] = await Promise.all([
    prisma.execution.findMany({
      where: { userId: user.id, ...(automation ? { automationId: automation } : {}) },
      orderBy: { startedAt: 'desc' },
      take: 200,
      include: {
        automation: { select: { name: true } },
        agent: { select: { name: true } },
      },
    }),
    getSettings(),
  ])

  return (
    <div>
      <PageHeader
        title="Execution History"
        description="Every automation run and its result, with the tokens and cost it used."
      />
      <ExecutionTable
        currencySymbol={settings.currencySymbol}
        executions={executions.map((execution) => ({
          id: execution.id,
          status: execution.status,
          source: execution.source,
          automationName: execution.automation?.name ?? null,
          agentName: execution.agent?.name ?? null,
          startedAt: execution.startedAt.toISOString(),
          durationMs: execution.durationMs,
          inputTokens: execution.inputTokens,
          outputTokens: execution.outputTokens,
          costUsd: execution.costUsd,
        }))}
      />
    </div>
  )
}
