import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, route } from '@/lib/api'
import { requireWorkspace } from '@/lib/workspace'
import { automationSchema } from '@/lib/validation'
import { assertWithinLimit } from '@/lib/plans'
import { randomToken } from '@/lib/crypto'
import { saveGraph } from '@/lib/automation/save-graph'
import { recordAudit } from '@/lib/audit'

export const GET = route(async () => {
  const { workspaceId } = await requireWorkspace()
  const automations = await prisma.automation.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { nodes: true, executions: true } } },
  })
  return ok({ automations })
})

export const POST = route(async (request: NextRequest) => {
  const { workspaceId, user } = await requireWorkspace()
  await assertWithinLimit(workspaceId, 'automations')

  const data = automationSchema.parse(await request.json())

  const automation = await prisma.automation.create({
    data: {
      workspaceId,
      name: data.name,
      description: data.description,
      triggerType: data.triggerType,
      schedule: data.schedule ?? null,
      timezone: data.timezone,
      status: data.status,
      // Webhook automations get their own secret key on creation.
      webhookKey: data.triggerType === 'WEBHOOK' ? randomToken(16) : null,
    },
  })

  await saveGraph(automation.id, workspaceId, data.nodes, data.connections)
  await recordAudit({
    workspaceId,
    userId: user.id,
    action: 'automation.created',
    targetType: 'automation',
    targetId: automation.id,
    metadata: { name: automation.name },
  })
  return ok({ automation }, 201)
})
