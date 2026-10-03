import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { AgentEditor } from '@/components/agents/agent-editor'
import { Button } from '@/components/ui/button'
import { requireWorkspace } from '@/lib/workspace'
import { getEnabledModels } from '@/lib/models'
import { getSettings } from '@/lib/settings'
import { prisma } from '@/lib/db'

export const metadata = { title: 'Edit Agent' }
export const dynamic = 'force-dynamic'

export default async function EditAgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { workspaceId, user } = await requireWorkspace()
  const { id } = await params

  const [agent, models, settings, bases] = await Promise.all([
    prisma.agent.findFirst({ where: { id, workspaceId } }),
    getEnabledModels(),
    getSettings(),
    prisma.knowledgeBase.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, _count: { select: { documents: true } } },
    }),
  ])
  if (!agent) notFound()

  return (
    <div>
      <PageHeader
        title={agent.name}
        description="Edit this agent's instructions, model, and response settings."
        action={
          <>
            <Link href="/agents">
              <Button variant="secondary">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <Link href={`/playground?agent=${agent.id}`}>
              <Button variant="secondary">
                <MessageSquare className="h-4 w-4" />
                Test agent
              </Button>
            </Link>
          </>
        }
      />

      <AgentEditor
        currencySymbol={settings.currencySymbol}
        models={models}
        knowledgeBases={bases.map((base) => ({
          id: base.id,
          name: base.name,
          documents: base._count.documents,
        }))}
        initial={{
          id: agent.id,
          name: agent.name,
          description: agent.description,
          icon: agent.icon,
          provider: agent.provider,
          model: agent.model,
          systemPrompt: agent.systemPrompt,
          temperature: agent.temperature,
          maxTokens: agent.maxTokens,
          welcomeMessage: agent.welcomeMessage,
          memoryEnabled: agent.memoryEnabled,
          knowledgeBaseId: agent.knowledgeBaseId,
          status: agent.status,
        }}
      />
    </div>
  )
}
