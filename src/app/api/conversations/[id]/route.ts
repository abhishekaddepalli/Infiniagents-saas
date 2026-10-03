import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { AppError, ok, route } from '@/lib/api'
import { requireWorkspace } from '@/lib/workspace'

type Context = { params: Promise<{ id: string }> }

/** Load a conversation's messages (used when resuming a saved thread). */
export const GET = route(async (_request: NextRequest, context: Context) => {
  const { workspaceId } = await requireWorkspace()
  const { id } = await context.params

  const conversation = await prisma.conversation.findFirst({
    where: { id, workspaceId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      agent: { select: { id: true, name: true, icon: true } },
    },
  })
  if (!conversation) throw new AppError('Conversation not found.', 404)
  return ok({ conversation })
})

export const DELETE = route(async (_request: NextRequest, context: Context) => {
  const { workspaceId } = await requireWorkspace()
  const { id } = await context.params

  const conversation = await prisma.conversation.findFirst({ where: { id, workspaceId } })
  if (!conversation) throw new AppError('Conversation not found.', 404)

  await prisma.conversation.delete({ where: { id } })
  return ok({ deleted: true })
})
