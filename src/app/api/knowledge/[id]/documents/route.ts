import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { AppError, ok, route } from '@/lib/api'
import { requireWorkspace } from '@/lib/workspace'
import { assertWithinLimit } from '@/lib/plans'
import { extractText, MAX_FILE_BYTES } from '@/lib/knowledge/extract'
import { ingestDocument } from '@/lib/knowledge/ingest'
import { knowledgeTextSchema } from '@/lib/validation'
import { recordAudit } from '@/lib/audit'
import { limit } from '@/lib/rate-limit'

type Context = { params: Promise<{ id: string }> }

/**
 * Adds a document to a knowledge base.
 *
 * Accepts either a multipart upload (`file`) or a JSON body with pasted text.
 * Ingestion runs inline; for larger corpora move `ingestDocument` behind a job
 * queue — see documentation/knowledge-base.md.
 */
export const POST = route(async (request: NextRequest, context: Context) => {
  const { workspaceId, user } = await requireWorkspace()
  limit(`ingest:${workspaceId}`, 30, 60_000)
  await assertWithinLimit(workspaceId, 'documents')

  const { id } = await context.params
  const base = await prisma.knowledgeBase.findFirst({ where: { id, workspaceId } })
  if (!base) throw new AppError('Knowledge base not found.', 404)

  const contentType = request.headers.get('content-type') ?? ''
  let name: string
  let text: string
  let mimeType = 'text/plain'
  let sizeBytes = 0

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) throw new AppError('No file was uploaded.', 400)
    if (file.size > MAX_FILE_BYTES) {
      throw new AppError(`"${file.name}" is larger than the 5 MB upload limit.`, 413)
    }

    const buffer = await file.arrayBuffer()
    name = file.name
    mimeType = file.type || 'application/octet-stream'
    sizeBytes = file.size
    text = await extractText({ name: file.name, buffer, mimeType })
  } else {
    const parsed = knowledgeTextSchema.parse(await request.json())
    name = parsed.name
    text = parsed.content
    mimeType = 'text/plain'
    sizeBytes = Buffer.byteLength(parsed.content, 'utf8')
  }

  const document = await prisma.document.create({
    data: { knowledgeBaseId: base.id, name, mimeType, sizeBytes, status: 'PENDING' },
  })

  try {
    const result = await ingestDocument({ documentId: document.id, workspaceId, text })
    await recordAudit({
      workspaceId,
      userId: user.id,
      action: 'knowledge.document_added',
      targetType: 'document',
      targetId: document.id,
      metadata: { name, chunks: result.chunks },
    })
    return ok({ document: { ...document, status: 'READY', chunkCount: result.chunks }, ...result }, 201)
  } catch (error) {
    // The document row is kept with status FAILED so the user can see why.
    const message = error instanceof Error ? error.message : 'Indexing failed.'
    throw new AppError(`"${name}" could not be indexed: ${message}`, 422)
  }
})
