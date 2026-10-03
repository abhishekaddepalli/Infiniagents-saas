import 'server-only'
import { prisma } from '../db'
import { chunkText } from './chunk'
import { embedTexts } from './embed'

/**
 * Document ingestion: chunk, embed, store.
 *
 * Runs inline with the upload request, which is fine for the file sizes this
 * template accepts (5 MB). For larger corpora, move `ingestDocument` behind a
 * job queue — the function signature is already suited to it, since it takes
 * only ids and updates the document's status as it goes.
 */
export async function ingestDocument(options: {
  documentId: string
  workspaceId: string
  text: string
}): Promise<{ chunks: number; local: boolean }> {
  const { documentId, workspaceId, text } = options

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { knowledgeBase: { select: { id: true, embeddingProvider: true, embeddingModel: true } } },
  })
  if (!document) throw new Error('Document not found.')

  await prisma.document.update({ where: { id: documentId }, data: { status: 'PROCESSING' } })

  try {
    const chunks = chunkText(text)
    if (chunks.length === 0) {
      throw new Error('No readable text was found in this document.')
    }

    const embedding = await embedTexts({
      workspaceId,
      provider: document.knowledgeBase.embeddingProvider,
      model: document.knowledgeBase.embeddingModel,
      texts: chunks.map((chunk) => chunk.content),
    })

    // A base's stored model must match what actually embedded it, or queries
    // would be compared against vectors from a different model.
    if (embedding.model !== document.knowledgeBase.embeddingModel) {
      await prisma.knowledgeBase.update({
        where: { id: document.knowledgeBase.id },
        data: { embeddingModel: embedding.model },
      })
    }

    await prisma.$transaction([
      // Re-ingesting replaces the document's chunks rather than duplicating.
      prisma.documentChunk.deleteMany({ where: { documentId } }),
      prisma.documentChunk.createMany({
        data: chunks.map((chunk, index) => ({
          documentId,
          knowledgeBaseId: document.knowledgeBaseId,
          index: chunk.index,
          content: chunk.content,
          embedding: embedding.vectors[index] ?? [],
          tokens: chunk.tokens,
        })),
      }),
      prisma.document.update({
        where: { id: documentId },
        data: { status: 'READY', chunkCount: chunks.length, error: null },
      }),
    ])

    return { chunks: chunks.length, local: embedding.local }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Indexing failed.'
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'FAILED', error: message.slice(0, 500) },
    })
    throw error
  }
}
