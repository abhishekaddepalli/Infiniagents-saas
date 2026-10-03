import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, History } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { AutomationBuilder } from '@/components/automations/builder'
import { Button } from '@/components/ui/button'
import { requireWorkspace } from '@/lib/workspace'
import { getSettings } from '@/lib/settings'
import { env } from '@/lib/env'
import { prisma } from '@/lib/db'
import type { NodeTypeId } from '@/components/automations/node-types'

export const metadata = { title: 'Automation Builder' }
export const dynamic = 'force-dynamic'

export default async function EditAutomationPage({ params }: { params: Promise<{ id: string }> }) {
  const { workspaceId, user } = await requireWorkspace()
  const { id } = await params

  const [automation, agents, bases, settings] = await Promise.all([
    prisma.automation.findFirst({
      where: { id, workspaceId },
      include: { nodes: true, connections: true },
    }),
    prisma.agent.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, status: true },
    }),
    prisma.knowledgeBase.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, _count: { select: { documents: true } } },
    }),
    getSettings(),
  ])
  if (!automation) notFound()

  return (
    <div>
      <PageHeader
        title={automation.name}
        description={automation.description || 'Edit the workflow on the canvas below.'}
        action={
          <>
            <Link href="/automations">
              <Button variant="secondary">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <Link href={`/executions?automation=${automation.id}`}>
              <Button variant="secondary">
                <History className="h-4 w-4" />
                History
              </Button>
            </Link>
          </>
        }
      />

      <AutomationBuilder
        agents={agents}
        knowledgeBases={bases.map((base) => ({
          id: base.id,
          name: base.name,
          documents: base._count.documents,
        }))}
        appUrl={env.appUrl}
        currencySymbol={settings.currencySymbol}
        initial={{
          id: automation.id,
          name: automation.name,
          description: automation.description,
          triggerType: automation.triggerType,
          schedule: automation.schedule,
          timezone: automation.timezone,
          status: automation.status,
          webhookKey: automation.webhookKey,
          nodes: automation.nodes.map((node) => ({
            id: node.id,
            type: node.type as NodeTypeId,
            label: node.label,
            config: (node.config ?? {}) as Record<string, unknown>,
            positionX: node.positionX,
            positionY: node.positionY,
            agentId: node.agentId,
          })),
          connections: automation.connections.map((connection) => ({
            id: connection.id,
            sourceId: connection.sourceId,
            targetId: connection.targetId,
            branch: connection.branch,
          })),
        }}
      />
    </div>
  )
}
