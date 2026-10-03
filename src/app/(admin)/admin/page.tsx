import Link from 'next/link'
import { Bot, CircleDollarSign, History, Sparkles, UserPlus, Users, Workflow, Zap } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { AreaChart } from '@/components/charts/area-chart'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { requireAdmin } from '@/lib/auth'
import { getDailyUsage, startOfDay } from '@/lib/stats'
import { getSettings } from '@/lib/settings'
import { prisma } from '@/lib/db'
import { formatCurrency, formatNumber, timeAgo } from '@/lib/utils'

export const metadata = { title: 'Admin' }
export const dynamic = 'force-dynamic'

export default async function AdminOverviewPage() {
  await requireAdmin()

  const [users, agents, automations, executions, usage, newUsers, daily, settings, recentUsers, recentRuns] =
    await Promise.all([
      prisma.user.count(),
      prisma.agent.count(),
      prisma.automation.count(),
      prisma.execution.count(),
      prisma.aiUsage.aggregate({
        _count: true,
        _sum: { inputTokens: true, outputTokens: true, costUsd: true },
      }),
      prisma.user.count({ where: { createdAt: { gte: startOfDay(7) } } }),
      // Passing null aggregates across every user, not just one.
      getDailyUsage(null, 14),
      getSettings(),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, email: true, status: true, createdAt: true },
      }),
      prisma.execution.findMany({
        orderBy: { startedAt: 'desc' },
        take: 5,
        include: { automation: { select: { name: true } }, user: { select: { name: true } } },
      }),
    ])

  const symbol = settings.currencySymbol

  return (
    <div>
      <PageHeader
        title="Admin overview"
        description="Platform-wide activity across every account."
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Total Users" value={formatNumber(users)} icon={Users} hint={`${newUsers} in the last 7 days`} />
        <StatCard label="Total Agents" value={formatNumber(agents)} icon={Bot} hint="Across all accounts" />
        <StatCard label="Total Automations" value={formatNumber(automations)} icon={Workflow} hint="Workflows built" />
        <StatCard label="Total Executions" value={formatNumber(executions)} icon={History} hint="All time" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <StatCard
          label="AI Requests"
          value={formatNumber(usage._count)}
          icon={Zap}
          trend={daily.map((day) => day.requests)}
          hint="All providers"
        />
        <StatCard
          label="Tokens Used"
          value={formatNumber((usage._sum.inputTokens ?? 0) + (usage._sum.outputTokens ?? 0))}
          icon={Sparkles}
          hint="Input + output"
        />
        <StatCard
          label="Estimated AI Cost"
          value={formatCurrency(usage._sum.costUsd ?? 0, symbol)}
          icon={CircleDollarSign}
          hint="From your model prices"
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Platform usage" description="Requests and tokens across all accounts, last 14 days" />
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
          <CardHeader
            title="New registrations"
            description="Most recent sign-ups"
            action={
              <Link href="/admin/users">
                <Button variant="ghost" size="sm">
                  All users
                </Button>
              </Link>
            }
          />
          <CardBody className="p-0">
            <ul className="divide-y divide-line">
              {recentUsers.map((user) => (
                <li key={user.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-300">
                    <UserPlus className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">{user.name}</p>
                    <p className="truncate text-[11px] text-muted">{user.email}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-faint">{timeAgo(user.createdAt)}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader
          title="Recent executions"
          description="The latest workflow runs from every account"
          action={
            <Link href="/admin/executions">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          }
        />
        <CardBody className="p-0">
          <ul className="divide-y divide-line">
            {recentRuns.map((run) => (
              <li key={run.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink">
                    {run.automation?.name ?? 'Direct run'}
                  </p>
                  <p className="truncate text-[11px] text-muted">
                    {run.user?.name ?? 'API / scheduled'} · {timeAgo(run.startedAt)}
                  </p>
                </div>
                <StatusBadge status={run.status} />
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  )
}
