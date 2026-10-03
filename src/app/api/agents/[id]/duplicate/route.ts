import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { AppError, ok, route } from '@/lib/api'
import { requireWorkspace } from '@/lib/workspace'
import { assertWithinLimit } from '@/lib/plans'

type Context = { params: Promise<{ id: string }> }

export const POST = route(async (_request: NextRequest, context: Context) => {
  const { workspaceId, user } = await requireWorkspace()
  await assertWithinLimit(workspaceId, 'agents')

  const { id } = await context.params
  const source = await prisma.agent.findFirst({ where: { id, workspaceId } })
  if (!source) throw new AppError('Agent not found.', 404)

  const agent = await prisma.agent.create({
    data: {
      workspaceId,
      createdById: user.id,
      name: `${source.name} (copy)`,
      description: source.description,
      icon: source.icon,
      provider: source.provider,
      model: source.model,
      systemPrompt: source.systemPrompt,
      temperature: source.temperature,
      maxTokens: source.maxTokens,
      welcomeMessage: source.welcomeMessage,
      memoryEnabled: source.memoryEnabled,
      knowledgeBaseId: source.knowledgeBaseId,
      status: source.status,
    },
  })
  return ok({ agent }, 201)
})
