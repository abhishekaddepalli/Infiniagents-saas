import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { AutomationBuilder } from '@/components/automations/builder'
import { Button } from '@/components/ui/button'
import { requireWorkspace } from '@/lib/workspace'
import { getSettings } from '@/lib/settings'
import { env } from '@/lib/env'
import { prisma } from '@/lib/db'

export const metadata = { title: 'Automation Builder' }
export const dynamic = 'force-dynamic'

export default async function NewAutomationPage() {
  const { workspaceId, user } = await requireWorkspace()
  const [agents, bases, settings] = await Promise.all([
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

  return (
    <div>
      <PageHeader
        title="Automation Builder"
        description="Drag steps onto the canvas and connect them into a workflow."
        action={
          <Link href="/automations">
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
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
          name: '',
          description: '',
          triggerType: 'MANUAL',
          schedule: null,
          timezone: 'UTC',
          status: 'DRAFT',
          nodes: [
            {
              id: 'n_trigger',
              type: 'TRIGGER',
              label: 'Start',
              config: {},
              positionX: 60,
              positionY: 140,
              agentId: null,
            },
          ],
          connections: [],
        }}
      />
    </div>
  )
}
