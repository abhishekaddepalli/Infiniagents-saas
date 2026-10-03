import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, route } from '@/lib/api'
import { requireWorkspace } from '@/lib/workspace'
import { agentSchema } from '@/lib/validation'
import { assertWithinLimit } from '@/lib/plans'
import { recordAudit } from '@/lib/audit'

/** List the agents in the active workspace. */
export const GET = route(async () => {
  const { workspaceId } = await requireWorkspace()
  const agents = await prisma.agent.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: 'desc' },
  })
  return ok({ agents })
})

/** Create an agent, respecting the workspace plan's agent limit. */
export const POST = route(async (request: NextRequest) => {
  const { workspaceId, user } = await requireWorkspace()
  await assertWithinLimit(workspaceId, 'agents')

  const data = agentSchema.parse(await request.json())
  const agent = await prisma.agent.create({
    data: { ...data, workspaceId, createdById: user.id },
  })

  await recordAudit({
    workspaceId,
    userId: user.id,
    action: 'agent.created',
    targetType: 'agent',
    targetId: agent.id,
    metadata: { name: agent.name },
  })
  return ok({ agent }, 201)
})
