import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { AppError, ok, route } from '@/lib/api'
import { requireWorkspace } from '@/lib/workspace'
import { agentSchema } from '@/lib/validation'
import { recordAudit } from '@/lib/audit'

type Context = { params: Promise<{ id: string }> }

/**
 * Every handler filters by `workspaceId` as well as `id`, so a valid agent id
 * from another workspace returns 404 rather than someone else's data.
 */
async function ownedAgent(workspaceId: string, id: string) {
  const agent = await prisma.agent.findFirst({ where: { id, workspaceId } })
  if (!agent) throw new AppError('Agent not found.', 404)
  return agent
}

export const GET = route(async (_request: NextRequest, context: Context) => {
  const { workspaceId } = await requireWorkspace()
  const { id } = await context.params
  return ok({ agent: await ownedAgent(workspaceId, id) })
})

export const PATCH = route(async (request: NextRequest, context: Context) => {
  const { workspaceId, user } = await requireWorkspace()
  const { id } = await context.params
  await ownedAgent(workspaceId, id)

  // `partial()` lets the UI send just the changed fields (e.g. a status toggle).
  const data = agentSchema.partial().parse(await request.json())

  // A knowledge base can only be attached if it belongs to this workspace.
  if (data.knowledgeBaseId) {
    const base = await prisma.knowledgeBase.findFirst({
      where: { id: data.knowledgeBaseId, workspaceId },
      select: { id: true },
    })
    if (!base) throw new AppError('That knowledge base is not available in this workspace.', 403)
  }

  const agent = await prisma.agent.update({ where: { id }, data })
  await recordAudit({
    workspaceId,
    userId: user.id,
    action: 'agent.updated',
    targetType: 'agent',
    targetId: id,
    metadata: { name: agent.name },
  })
  return ok({ agent })
})

export const DELETE = route(async (_request: NextRequest, context: Context) => {
  const { workspaceId, user } = await requireWorkspace()
  const { id } = await context.params
  const agent = await ownedAgent(workspaceId, id)

  await prisma.agent.delete({ where: { id } })
  await recordAudit({
    workspaceId,
    userId: user.id,
    action: 'agent.deleted',
    targetType: 'agent',
    targetId: id,
    metadata: { name: agent.name },
  })
  return ok({ deleted: true })
})
