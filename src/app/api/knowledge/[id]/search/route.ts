import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { AppError, ok, route } from '@/lib/api'
import { requireWorkspace } from '@/lib/workspace'
import { knowledgeQuerySchema } from '@/lib/validation'
import { searchKnowledgeBase } from '@/lib/knowledge/search'

type Context = { params: Promise<{ id: string }> }

/** Test retrieval directly — useful for tuning a base before wiring an agent. */
export const POST = route(async (request: NextRequest, context: Context) => {
  const { workspaceId } = await requireWorkspace()
  const { id } = await context.params

  const base = await prisma.knowledgeBase.findFirst({ where: { id, workspaceId } })
  if (!base) throw new AppError('Knowledge base not found.', 404)

  const { query, limit } = knowledgeQuerySchema.parse(await request.json())
  const results = await searchKnowledgeBase({ workspaceId, knowledgeBaseId: id, query, limit })

  return ok({
    results: results.map((chunk) => ({
      documentName: chunk.documentName,
      content: chunk.content,
      score: Math.round(chunk.score * 1000) / 1000,
    })),
  })
})
