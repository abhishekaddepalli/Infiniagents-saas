import 'server-only'
import { prisma } from '../db'
import { embedQuery } from './embed'

/**
 * Retrieval over a knowledge base.
 *
 * Similarity is computed in application code rather than in the database, so
 * the template installs on any stock PostgreSQL with no extensions. That is
 * the right trade for the corpus sizes a template ships with; past roughly
 * 50,000 chunks you want pgvector doing this in SQL instead —
 * documentation/knowledge-base.md walks through that migration.
 */

export type RetrievedChunk = {
  id: string
  documentId: string
  documentName: string
  content: string
  score: number
}

/** Both vectors are already L2-normalised, but guard against zero magnitude. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0
  let dot = 0
  let magnitudeA = 0
  let magnitudeB = 0
  for (let index = 0; index < a.length; index++) {
    dot += a[index] * b[index]
    magnitudeA += a[index] * a[index]
    magnitudeB += b[index] * b[index]
  }
  if (magnitudeA === 0 || magnitudeB === 0) return 0
  return dot / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB))
}

/** Chunks scoring below this are dropped rather than padding the context. */
const MIN_SCORE = 0.12

/** Hard cap on how many chunks are pulled into memory for scoring. */
const MAX_CANDIDATES = 5000

export async function searchKnowledgeBase(options: {
  workspaceId: string
  knowledgeBaseId: string
  query: string
  limit?: number
}): Promise<RetrievedChunk[]> {
  const { workspaceId, knowledgeBaseId, query } = options
  const limit = options.limit ?? 5

  const base = await prisma.knowledgeBase.findFirst({
    where: { id: knowledgeBaseId, workspaceId },
    select: { id: true, embeddingProvider: true, embeddingModel: true },
  })
  if (!base) return []

  const queryVector = await embedQuery({
    workspaceId,
    provider: base.embeddingProvider,
    model: base.embeddingModel,
    query,
  })
  if (queryVector.length === 0) return []

  const chunks = await prisma.documentChunk.findMany({
    where: { knowledgeBaseId: base.id, document: { status: 'READY' } },
    select: {
      id: true,
      documentId: true,
      content: true,
      embedding: true,
      document: { select: { name: true } },
    },
    take: MAX_CANDIDATES,
  })

  return chunks
    .map((chunk) => ({
      id: chunk.id,
      documentId: chunk.documentId,
      documentName: chunk.document.name,
      content: chunk.content,
      score: cosineSimilarity(queryVector, chunk.embedding),
    }))
    .filter((chunk) => chunk.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/**
 * Formats retrieved chunks as a system-message block.
 *
 * The instruction to prefer the context and admit gaps is what stops the model
 * quietly answering from its own training data when the base has no answer.
 */
export function buildContextBlock(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return ''

  const sources = chunks
    .map((chunk, index) => `[${index + 1}] From "${chunk.documentName}":\n${chunk.content}`)
    .join('\n\n')

  return [
    'Use the following context from the knowledge base to answer the question.',
    'Prefer this context over your own knowledge. If the context does not contain',
    'the answer, say so plainly rather than guessing. Cite sources as [1], [2] where useful.',
    '',
    '<context>',
    sources,
    '</context>',
  ].join('\n')
}
