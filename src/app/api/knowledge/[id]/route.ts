import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { AppError, ok, route } from '@/lib/api'
import { requireWorkspace } from '@/lib/workspace'
import { knowledgeBaseSchema } from '@/lib/validation'

type Context = { params: Promise<{ id: string }> }

export const GET = route(async (_request: NextRequest, context: Context) => {
  const { workspaceId } = await requireWorkspace()
  const { id } = await context.params

  const base = await prisma.knowledgeBase.findFirst({
    where: { id, workspaceId },
    include: {
      documents: { orderBy: { createdAt: 'desc' } },
      _count: { select: { chunks: true, agents: true } },
    },
  })
  if (!base) throw new AppError('Knowledge base not found.', 404)
  return ok({ base })
})

export const PATCH = route(async (request: NextRequest, context: Context) => {
  const { workspaceId } = await requireWorkspace()
  const { id } = await context.params

  const existing = await prisma.knowledgeBase.findFirst({ where: { id, workspaceId } })
  if (!existing) throw new AppError('Knowledge base not found.', 404)

  // Only name and description are editable. Changing the embedding model would
  // make existing vectors incomparable with new ones — delete and re-create,
  // or re-index every document, instead.
  const { name, description } = knowledgeBaseSchema.partial().parse(await request.json())
  const base = await prisma.knowledgeBase.update({
    where: { id },
    data: { ...(name ? { name } : {}), ...(description !== undefined ? { description } : {}) },
  })
  return ok({ base })
})

export const DELETE = route(async (_request: NextRequest, context: Context) => {
  const { workspaceId } = await requireWorkspace()
  const { id } = await context.params

  const base = await prisma.knowledgeBase.findFirst({ where: { id, workspaceId } })
  if (!base) throw new AppError('Knowledge base not found.', 404)

  // Agents referencing it fall back to answering without retrieval.
  await prisma.knowledgeBase.delete({ where: { id } })
  return ok({ deleted: true })
})
