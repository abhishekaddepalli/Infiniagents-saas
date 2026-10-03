import Link from 'next/link'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { AgentList } from '@/components/agents/agent-list'
import { Button } from '@/components/ui/button'
import { requireWorkspace } from '@/lib/workspace'
import { prisma } from '@/lib/db'

export const metadata = { title: 'AI Agents' }
export const dynamic = 'force-dynamic'

export default async function AgentsPage() {
  const { workspaceId } = await requireWorkspace()
  const agents = await prisma.agent.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true, name: true, description: true, icon: true,
      provider: true, model: true, status: true, isDemo: true,
    },
  })

  return (
    <div>
      <PageHeader
        title="AI Agents"
        description="Every agent has its own instructions, model, and response settings."
        action={
          <Link href="/agents/new">
            <Button>
              <Plus className="h-4 w-4" />
              Create Agent
            </Button>
          </Link>
        }
      />
      <AgentList agents={agents} />
    </div>
  )
}
