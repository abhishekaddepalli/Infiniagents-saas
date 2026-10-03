import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, route } from '@/lib/api'
import { requireWorkspace } from '@/lib/workspace'
import { knowledgeBaseSchema } from '@/lib/validation'
import { recordAudit } from '@/lib/audit'

export const GET = route(async () => {
  const { workspaceId } = await requireWorkspace()
  const bases = await prisma.knowledgeBase.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { documents: true, chunks: true, agents: true } },
    },
  })
  return ok({ bases })
})

export const POST = route(async (request: NextRequest) => {
  const { workspaceId, user } = await requireWorkspace()
  const data = knowledgeBaseSchema.parse(await request.json())

  const base = await prisma.knowledgeBase.create({ data: { ...data, workspaceId } })
  await recordAudit({
    workspaceId,
    userId: user.id,
    action: 'knowledge.base_created',
    targetType: 'knowledge_base',
    targetId: base.id,
    metadata: { name: base.name },
  })
  return ok({ base }, 201)
})
