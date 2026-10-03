import { Suspense } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Playground } from '@/components/playground/playground'
import { Skeleton } from '@/components/ui/skeleton'
import { requireWorkspace } from '@/lib/workspace'
import { getSettings } from '@/lib/settings'
import { prisma } from '@/lib/db'

export const metadata = { title: 'Playground' }
export const dynamic = 'force-dynamic'

export default async function PlaygroundPage() {
  const { workspaceId, user } = await requireWorkspace()
  const [agents, settings] = await Promise.all([
    prisma.agent.findMany({
      where: { workspaceId },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      select: {
        id: true, name: true, icon: true, provider: true, model: true,
        status: true, welcomeMessage: true, temperature: true, maxTokens: true,
        knowledgeBase: { select: { name: true } },
      },
    }),
    getSettings(),
  ])

  return (
    <div>
      <PageHeader
        title="Playground"
        description="Chat with any of your agents and watch the tokens, cost, and response time for each reply."
      />
      <Suspense fallback={<Skeleton className="h-[520px]" />}>
        <Playground
          currencySymbol={settings.currencySymbol}
          agents={agents.map((agent) => ({
            ...agent,
            knowledgeBaseName: agent.knowledgeBase?.name ?? null,
          }))}
        />
      </Suspense>
    </div>
  )
}
