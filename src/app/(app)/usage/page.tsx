import { BarChart3, CircleDollarSign, Coins, Zap } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { AreaChart } from '@/components/charts/area-chart'
import { BarChart, RankedBars } from '@/components/charts/bar-chart'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { requireWorkspace } from '@/lib/workspace'
import { getSettings } from '@/lib/settings'
import { getDailyUsage, getUsageByAgent, getUsageByModel, startOfDay, startOfMonth } from '@/lib/stats'
import { getPlanUsage } from '@/lib/plans'
import { prisma } from '@/lib/db'
import { formatCurrency, formatNumber, percentLabel } from '@/lib/utils'

export const metadata = { title: 'Usage' }
export const dynamic = 'force-dynamic'

const providerLabels: Record<string, string> = {
  OPENAI: 'OpenAI',
  GEMINI: 'Google Gemini',
  ANTHROPIC: 'Anthropic',
}

export default async function UsagePage() {
  const { workspaceId } = await requireWorkspace()

  const [daily, byAgent, byModel, settings, planUsage, today, month, allTime] = await Promise.all([
    getDailyUsage(workspaceId, 30),
    getUsageByAgent(workspaceId, 8),
    getUsageByModel(workspaceId),
    getSettings(),
    getPlanUsage(workspaceId),
    prisma.aiUsage.aggregate({
      where: { workspaceId, createdAt: { gte: startOfDay() } },
      _count: true,
      _sum: { inputTokens: true, outputTokens: true, costUsd: true },
    }),
    prisma.aiUsage.aggregate({
      where: { workspaceId, createdAt: { gte: startOfMonth() } },
      _count: true,
      _sum: { inputTokens: true, outputTokens: true, costUsd: true },
    }),
    prisma.aiUsage.aggregate({
      where: { workspaceId },
      _count: true,
      _sum: { inputTokens: true, outputTokens: true, costUsd: true },
    }),
  ])

  const symbol = settings.currencySymbol
  const monthTokens = (month._sum.inputTokens ?? 0) + (month._sum.outputTokens ?? 0)
  const hasUsage = allTime._count > 0

  return (
    <div>
      <PageHeader
        title="Usage"
        description="AI requests, tokens, and estimated cost across your agents and automations."
      />

      {!hasUsage ? (
        <EmptyState
          icon={BarChart3}
          title="No usage recorded yet"
          description="Once you chat with an agent or run an automation, your requests, tokens, and estimated cost will be charted here."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard
              label="Requests today"
              value={formatNumber(today._count)}
              icon={Zap}
              hint={`${formatNumber(month._count)} this month`}
              trend={daily.slice(-14).map((day) => day.requests)}
            />
            <StatCard
              label="Tokens this month"
              value={formatNumber(monthTokens)}
              icon={Coins}
              hint={`${formatNumber((allTime._sum.inputTokens ?? 0) + (allTime._sum.outputTokens ?? 0))} all time`}
            />
            <StatCard
              label="Cost this month"
              value={formatCurrency(month._sum.costUsd ?? 0, symbol)}
              icon={CircleDollarSign}
              hint={`${formatCurrency(today._sum.costUsd ?? 0, symbol)} today`}
            />
            <StatCard
              label="Plan allowance"
              value={percentLabel(planUsage.requests.used, planUsage.requests.limit)}
              icon={BarChart3}
              hint={
                planUsage.requests.limit === -1
                  ? `${planUsage.planName} plan`
                  : `${planUsage.requests.used} of ${planUsage.requests.limit} requests`
              }
            />
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Tokens per day" description="Input and output tokens over the last 30 days" />
              <CardBody>
                <AreaChart
                  height={240}
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
              <CardHeader title="Requests per day" description="Last 30 days" />
              <CardBody>
                <BarChart
                  height={240}
                  data={daily.map((day) => ({ label: day.label, value: day.requests }))}
                  format="plain"
                  unit="requests"
                />
              </CardBody>
            </Card>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title="Usage by agent" description="Ranked by number of requests" />
              <CardBody>
                <RankedBars
                  data={byAgent.map((agent) => ({
                    label: agent.name,
                    value: agent.requests,
                    hint: `${formatNumber(agent.tokens)} tokens · ${formatCurrency(agent.cost, symbol)}`,
                  }))}
                  format="plain"
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Cost by model"
                description="Calculated from the prices set in the admin panel"
              />
              <CardBody className="p-0">
                {/* The table carries the exact values that the charts only approximate. */}
                <TableWrap className="rounded-none border-0">
                  <Table>
                    <thead>
                      <tr>
                        <Th>Provider</Th>
                        <Th>Model</Th>
                        <Th className="text-right">Requests</Th>
                        <Th className="text-right">Tokens</Th>
                        <Th className="text-right">Cost</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {byModel.map((row) => (
                        <Tr key={`${row.provider}-${row.model}`}>
                          <Td className="text-[13px]">{providerLabels[row.provider] ?? row.provider}</Td>
                          <Td className="font-mono text-xs">{row.model}</Td>
                          <Td className="text-right font-mono text-xs">{formatNumber(row.requests)}</Td>
                          <Td className="text-right font-mono text-xs">
                            {formatNumber(row.inputTokens + row.outputTokens)}
                          </Td>
                          <Td className="text-right font-mono text-xs">{formatCurrency(row.cost, symbol)}</Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrap>
              </CardBody>
            </Card>
          </div>

          <p className="mt-4 text-xs text-muted">
            Costs are estimates calculated from the per-model prices stored in your database. Check your
            provider&apos;s dashboard for authoritative billing figures.
          </p>
        </>
      )}
    </div>
  )
}
