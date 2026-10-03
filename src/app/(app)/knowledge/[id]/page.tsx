import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { KnowledgeDetail } from '@/components/knowledge/knowledge-detail'
import { Button } from '@/components/ui/button'
import { requireWorkspace } from '@/lib/workspace'
import { prisma } from '@/lib/db'
import { LOCAL_EMBEDDING_MODEL } from '@/lib/knowledge/local-embed'

export const metadata = { title: 'Knowledge Base' }
export const dynamic = 'force-dynamic'

export default async function KnowledgeBasePage({ params }: { params: Promise<{ id: string }> }) {
  const { workspaceId } = await requireWorkspace()
  const { id } = await params

  const base = await prisma.knowledgeBase.findFirst({
    where: { id, workspaceId },
    include: {
      documents: { orderBy: { createdAt: 'desc' } },
      agents: { select: { id: true, name: true } },
      _count: { select: { chunks: true } },
    },
  })
  if (!base) notFound()

  return (
    <div>
      <PageHeader
        title={base.name}
        description={base.description || 'Documents your agents can answer from.'}
        action={
          <Link href="/knowledge">
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" />
              All knowledge bases
            </Button>
          </Link>
        }
      />

      {base.agents.length > 0 && (
        <p className="mb-5 rounded-lg border border-line bg-surface px-4 py-2.5 text-[13px] text-muted">
          Used by{' '}
          {base.agents.map((agent, index) => (
            <span key={agent.id}>
              {index > 0 && ', '}
              <Link href={`/agents/${agent.id}`} className="font-medium text-ink hover:underline">
                {agent.name}
              </Link>
            </span>
          ))}
          .
        </p>
      )}

      <KnowledgeDetail
        baseId={base.id}
        chunkCount={base._count.chunks}
        usingLocalEmbeddings={base.embeddingModel === LOCAL_EMBEDDING_MODEL}
        documents={base.documents.map((document) => ({
          id: document.id,
          name: document.name,
          mimeType: document.mimeType,
          sizeBytes: document.sizeBytes,
          status: document.status,
          error: document.error,
          chunkCount: document.chunkCount,
          createdAt: document.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}
