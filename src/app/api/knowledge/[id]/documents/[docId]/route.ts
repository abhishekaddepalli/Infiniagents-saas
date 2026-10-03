import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { AppError, ok, route } from '@/lib/api'
import { requireWorkspace } from '@/lib/workspace'
import { recordAudit } from '@/lib/audit'

type Context = { params: Promise<{ id: string; docId: string }> }

export const DELETE = route(async (_request: NextRequest, context: Context) => {
  const { workspaceId, user } = await requireWorkspace()
  const { id, docId } = await context.params

  const document = await prisma.document.findFirst({
    where: { id: docId, knowledgeBaseId: id, knowledgeBase: { workspaceId } },
  })
  if (!document) throw new AppError('Document not found.', 404)

  // Chunks cascade with the document, removing it from retrieval.
  await prisma.document.delete({ where: { id: docId } })
  await recordAudit({
    workspaceId,
    userId: user.id,
    action: 'knowledge.document_deleted',
    targetType: 'document',
    targetId: docId,
    metadata: { name: document.name },
  })
  return ok({ deleted: true })
})
