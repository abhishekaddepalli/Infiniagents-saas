import Link from 'next/link'
import {
  Activity, Bot, CircleDollarSign, Coins, History, Plus, Power, Sparkles, Workflow, Zap,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { AreaChart } from '@/components/charts/area-chart'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/badge'
import { AgentIcon } from '@/components/ui/agent-icon'
import { requireWorkspace } from '@/lib/workspace'
import { getDailyUsage, getDashboardStats } from '@/lib/stats'
import { getSettings } from '@/lib/settings'
import { prisma } from '@/lib/db'
import { formatCurrency, formatDuration, formatNumber, timeAgo } from '@/lib/utils'

export const metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

const quickActions = [
  { href: '/agents/new', label: 'Create Agent', description: 'Configure a new AI assistant', icon: Bot },
  { href: '/automations/new', label: 'Create Automation', description: 'Build a workflow on the canvas', icon: Workflow },
  { href: '/templates', label: 'Browse Templates', description: 'Start from a ready-made agent', icon: Sparkles },
]

export default async function DashboardPage() {
  const { workspaceId, user } = await requireWorkspace()
  const [stats, daily, settings, recent, agents] = await Promise.all([
    getDashboardStats(workspaceId),
    getDailyUsage(workspaceId, 14),
    getSettings(),
    prisma.execution.findMany({
      where: { workspaceId },
      orderBy: { startedAt: 'desc' },
      take: 6,
      include: { automation: { select: { name: true } }, agent: { select: { name: true, icon: true } } },
    }),
    prisma.agent.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { id: true, name: true, icon: true, model: true, status: true, updatedAt: true },
    }),
  ])

  const symbol = settings.currencySymbol

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user.name.split(' ')[0]}`}
        description="Here is what your agents and automations have been doing."
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Total Agents" value={formatNumber(stats.totalAgents)} icon={Bot} hint={`${stats.activeAgents} active`} />
        <StatCard label="Active Agents" value={formatNumber(stats.activeAgents)} icon={Power} hint="Available to run" />
        <StatCard label="Automations" value={formatNumber(stats.automations)} icon={Workflow} hint="Workflows built" />
        <StatCard label="Executions" value={formatNumber(stats.executions)} icon={History} hint="All time" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <StatCard
          label="AI Requests"
          value={formatNumber(stats.aiRequests)}
          icon={Zap}
          hint={`${stats.requestsToday} today`}
          trend={daily.map((day) => day.requests)}
        />
        <StatCard label="Tokens Used" value={formatNumber(stats.totalTokens)} icon={Coins} hint="Input + output, all time" />
        <StatCard
          label="Estimated AI Cost"
          value={formatCurrency(stats.estimatedCost, symbol)}
          icon={CircleDollarSign}
          hint={`${formatCurrency(stats.costThisMonth, symbol)} this month`}
        />
      </div>

      {/* Usage chart + quick actions */}
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Token usage"
            description="Input and output tokens over the last 14 days"
            action={
              <Link href="/usage">
                <Button variant="ghost" size="sm">
                  View details
                </Button>
              </Link>
            }
          />
          <CardBody>
            <AreaChart
              data={daily.map((day) => ({ label: day.label, values: [day.inputTokens, day.outputTokens] }))}
              series={[
                { name: 'Input tokens', color: 'var(--viz-1)' },
                { name: 'Output tokens', color: 'var(--viz-2)' },
              ]}
              format="number"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Quick actions" description="Common places to start" />
          <CardBody className="space-y-2 p-3">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 rounded-lg border border-line p-3 transition-colors hover:bg-elevated"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-300">
                  <action.icon className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">{action.label}</span>
                  <span className="block truncate text-xs text-muted">{action.description}</span>
                </span>
              </Link>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Recent executions + agents */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent executions"
            description="The last few workflow runs"
            action={
              <Link href="/executions">
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </Link>
            }
          />
          <CardBody className="p-0">
            {recent.length === 0 ? (
              <EmptyState
                className="border-0"
                icon={Activity}
                title="No executions yet"
                description="Run an automation or chat with an agent, and the history will appear here."
                action={
                  <Link href="/automations">
                    <Button size="sm">Go to automations</Button>
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-line">
                {recent.map((execution) => (
                  <li key={execution.id}>
                    <Link
                      href={`/executions/${execution.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-elevated"
                    >
                      <AgentIcon name={execution.agent?.icon ?? 'workflow'} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">
                          {execution.automation?.name ?? execution.agent?.name ?? 'Direct run'}
                        </p>
                        <p className="truncate text-xs text-muted">{execution.input || 'No input'}</p>
                      </div>
                      <div className="hidden shrink-0 text-right sm:block">
                        <p className="text-xs text-muted">{formatDuration(execution.durationMs)}</p>
                        <p className="text-xs text-faint">{timeAgo(execution.startedAt)}</p>
                      </div>
                      <StatusBadge status={execution.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Your agents"
            action={
              <Link href="/agents">
                <Button variant="ghost" size="sm">
                  All agents
                </Button>
              </Link>
            }
          />
          <CardBody className="p-0">
            {agents.length === 0 ? (
              <EmptyState
                className="border-0"
                icon={Bot}
                title="No AI agents yet"
                description="Create your first AI agent and start testing it."
                action={
                  <Link href="/agents/new">
                    <Button size="sm">
                      <Plus className="h-4 w-4" />
                      Create Agent
                    </Button>
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-line">
                {agents.map((agent) => (
                  <li key={agent.id}>
                    <Link
                      href={`/agents/${agent.id}`}
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-elevated"
                    >
                      <AgentIcon name={agent.icon} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{agent.name}</p>
                        <p className="truncate font-mono text-[11px] text-muted">{agent.model}</p>
                      </div>
                      <StatusBadge status={agent.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
