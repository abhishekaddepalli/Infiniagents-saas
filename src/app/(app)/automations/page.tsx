import Link from 'next/link'
import { Clock, MousePointerClick, Plus, Webhook, Workflow } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/badge'
import { requireWorkspace } from '@/lib/workspace'
import { prisma } from '@/lib/db'
import { timeAgo } from '@/lib/utils'

export const metadata = { title: 'Automations' }
export const dynamic = 'force-dynamic'

const triggerMeta = {
  MANUAL: { icon: MousePointerClick, label: 'Manual' },
  WEBHOOK: { icon: Webhook, label: 'Webhook' },
  SCHEDULE: { icon: Clock, label: 'Schedule' },
}

export default async function AutomationsPage() {
  const { workspaceId, user } = await requireWorkspace()
  const automations = await prisma.automation.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { nodes: true, executions: true } } },
  })

  return (
    <div>
      <PageHeader
        title="Automations"
        description="Chain agents and actions into workflows that run on demand or from a webhook."
        action={
          <Link href="/automations/new">
            <Button>
              <Plus className="h-4 w-4" />
              Create Automation
            </Button>
          </Link>
        }
      />

      {automations.length === 0 ? (
        <EmptyState
          icon={Workflow}
          title="No automations yet"
          description="Build your first workflow: start with a trigger, send the input to an agent, and return the result."
          action={
            <Link href="/automations/new">
              <Button>
                <Plus className="h-4 w-4" />
                Create Automation
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {automations.map((automation) => {
            const trigger = triggerMeta[automation.triggerType]
            return (
              <Link
                key={automation.id}
                href={`/automations/${automation.id}`}
                className="flex min-w-0 flex-col rounded-xl border border-line bg-surface p-5 shadow-card transition-shadow hover:shadow-pop"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-[15px] font-semibold text-ink">{automation.name}</h3>
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
                      <trigger.icon className="h-3 w-3" />
                      {trigger.label} trigger
                    </p>
                  </div>
                  <StatusBadge status={automation.status} />
                </div>

                <p className="mt-3 line-clamp-2 min-h-[40px] text-[13px] leading-relaxed text-muted">
                  {automation.description || 'No description yet.'}
                </p>

                <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[11px] text-muted">
                  <span>
                    {automation._count.nodes} steps · {automation._count.executions} runs
                  </span>
                  <span>{timeAgo(automation.updatedAt)}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
