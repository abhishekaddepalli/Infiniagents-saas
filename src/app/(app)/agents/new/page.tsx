import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { AgentEditor } from '@/components/agents/agent-editor'
import { Button } from '@/components/ui/button'
import { requireWorkspace } from '@/lib/workspace'
import { getDefaultModel, getEnabledModels } from '@/lib/models'
import { getSettings } from '@/lib/settings'
import { prisma } from '@/lib/db'

export const metadata = { title: 'Create Agent' }
export const dynamic = 'force-dynamic'

export default async function NewAgentPage() {
  const { workspaceId } = await requireWorkspace()
  const [models, settings, bases] = await Promise.all([
    getEnabledModels(),
    getSettings(),
    prisma.knowledgeBase.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, _count: { select: { documents: true } } },
    }),
  ])
  const defaults = await getDefaultModel(models)

  return (
    <div>
      <PageHeader
        title="Create Agent"
        description="Give your agent instructions, pick a model, and tune how it responds."
        action={
          <Link href="/agents">
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" />
              Back to agents
            </Button>
          </Link>
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
          name: '',
          description: '',
          icon: 'bot',
          provider: defaults.provider,
          model: defaults.model,
          systemPrompt: '',
          temperature: 0.7,
          maxTokens: defaults.maxTokens,
          welcomeMessage: '',
          memoryEnabled: true,
          knowledgeBaseId: null,
          status: 'ACTIVE',
        }}
      />
    </div>
  )
}
