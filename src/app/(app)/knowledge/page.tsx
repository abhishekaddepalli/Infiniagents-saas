import { PageHeader } from '@/components/layout/page-header'
import { KnowledgeList } from '@/components/knowledge/knowledge-list'
import { requireWorkspace } from '@/lib/workspace'
import { prisma } from '@/lib/db'
import { env } from '@/lib/env'

export const metadata = { title: 'Knowledge Bases' }
export const dynamic = 'force-dynamic'

/**
 * Embedding models offered when creating a base. These are separate from the
 * chat models in the catalog — `kind: 'embedding'` in Admin → AI Models.
 */
async function embeddingModels() {
  const models = await prisma.aiModel.findMany({
    where: { enabled: true, kind: 'embedding' },
    orderBy: [{ provider: 'asc' }, { name: 'asc' }],
    select: { provider: true, modelId: true, name: true },
  })
  if (models.length > 0) return models

  // Fallback so the screen is usable before an admin adds embedding models.
  return [
    { provider: 'OPENAI', modelId: 'text-embedding-3-small', name: 'text-embedding-3-small' },
    { provider: 'OPENAI', modelId: 'text-embedding-3-large', name: 'text-embedding-3-large' },
    { provider: 'GEMINI', modelId: 'text-embedding-004', name: 'text-embedding-004' },
  ]
}

export default async function KnowledgePage() {
  const { workspaceId } = await requireWorkspace()

  const [bases, models] = await Promise.all([
    prisma.knowledgeBase.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { documents: true, chunks: true, agents: true } } },
    }),
    embeddingModels(),
  ])

  return (
    <div>
      <PageHeader
        title="Knowledge Bases"
        description="Give your agents your own documents to answer from, with the passages they used cited in every reply."
      />
      <KnowledgeList
        demoMode={env.demoMode}
        embeddingModels={models}
        bases={bases.map((base) => ({
          id: base.id,
          name: base.name,
          description: base.description,
          embeddingProvider: base.embeddingProvider,
          embeddingModel: base.embeddingModel,
          documents: base._count.documents,
          chunks: base._count.chunks,
          agents: base._count.agents,
          updatedAt: base.updatedAt.toISOString(),
        }))}
      />
    </div>
  )
}
