import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { AppError, ok, route } from '@/lib/api'
import { requireWorkspace } from '@/lib/workspace'
import { automationSchema } from '@/lib/validation'
import { randomToken } from '@/lib/crypto'
import { saveGraph } from '@/lib/automation/save-graph'
import { recordAudit } from '@/lib/audit'

type Context = { params: Promise<{ id: string }> }

async function ownedAutomation(workspaceId: string, id: string) {
  const automation = await prisma.automation.findFirst({ where: { id, workspaceId } })
  if (!automation) throw new AppError('Automation not found.', 404)
  return automation
}

export const GET = route(async (_request: NextRequest, context: Context) => {
  const { workspaceId } = await requireWorkspace()
  const { id } = await context.params
  await ownedAutomation(workspaceId, id)

  const automation = await prisma.automation.findUnique({
    where: { id },
    include: { nodes: true, connections: true },
  })
  return ok({ automation })
})

export const PATCH = route(async (request: NextRequest, context: Context) => {
  const { workspaceId, user } = await requireWorkspace()
  const { id } = await context.params
  const existing = await ownedAutomation(workspaceId, id)

  const data = automationSchema.parse(await request.json())

  const automation = await prisma.automation.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      triggerType: data.triggerType,
      schedule: data.schedule ?? null,
      timezone: data.timezone,
      status: data.status,
      // Generate a webhook key the first time a workflow becomes webhook-driven.
      webhookKey:
        data.triggerType === 'WEBHOOK' ? (existing.webhookKey ?? randomToken(16)) : existing.webhookKey,
    },
  })

  await saveGraph(id, workspaceId, data.nodes, data.connections)
  await recordAudit({
    workspaceId,
    userId: user.id,
    action: 'automation.updated',
    targetType: 'automation',
    targetId: id,
    metadata: { name: automation.name },
  })
  return ok({ automation })
})

export const DELETE = route(async (_request: NextRequest, context: Context) => {
  const { workspaceId, user } = await requireWorkspace()
  const { id } = await context.params
  const automation = await ownedAutomation(workspaceId, id)

  await prisma.automation.delete({ where: { id } })
  await recordAudit({
    workspaceId,
    userId: user.id,
    action: 'automation.deleted',
    targetType: 'automation',
    targetId: id,
    metadata: { name: automation.name },
  })
  return ok({ deleted: true })
})
