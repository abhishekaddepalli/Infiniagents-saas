import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { AppError, ok, route } from '@/lib/api'
import { requireWorkspace } from '@/lib/workspace'
import { assertWithinLimit } from '@/lib/plans'

type Context = { params: Promise<{ id: string }> }

/** Creates an agent in the active workspace from a published template. */
export const POST = route(async (_request: NextRequest, context: Context) => {
  const { workspaceId, user } = await requireWorkspace()
  await assertWithinLimit(workspaceId, 'agents')

  const { id } = await context.params
  const template = await prisma.agentTemplate.findFirst({ where: { id, status: 'PUBLISHED' } })
  if (!template) throw new AppError('Template not found.', 404)

  const [agent] = await prisma.$transaction([
    prisma.agent.create({
      data: {
        workspaceId,
        createdById: user.id,
        name: template.name,
        description: template.description,
        icon: template.icon,
        provider: template.provider,
        model: template.model,
        systemPrompt: template.systemPrompt,
        temperature: template.temperature,
        maxTokens: template.maxTokens,
        welcomeMessage: template.welcomeMessage,
        status: 'ACTIVE',
      },
    }),
    // Track how often each template is used, shown in the admin panel.
    prisma.agentTemplate.update({ where: { id }, data: { usageCount: { increment: 1 } } }),
  ])

  return ok({ agent }, 201)
})
