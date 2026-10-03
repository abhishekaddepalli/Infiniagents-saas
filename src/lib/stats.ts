import { prisma } from './db'

/**
 * Aggregations shared by the dashboard, usage page, and admin panel.
 * All of them read from `ai_usage` and `executions`, so the numbers on every
 * screen stay consistent.
 */

export function startOfDay(offsetDays = 0) {
  const date = new Date()
  date.setDate(date.getDate() - offsetDays)
  date.setHours(0, 0, 0, 0)
  return date
}

export function startOfMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

export type DashboardStats = {
  totalAgents: number
  activeAgents: number
  automations: number
  executions: number
  aiRequests: number
  totalTokens: number
  estimatedCost: number
  requestsToday: number
  costThisMonth: number
}

export async function getDashboardStats(workspaceId: string): Promise<DashboardStats> {
  const [agents, activeAgents, automations, executions, allTime, today, month] = await Promise.all([
    prisma.agent.count({ where: { workspaceId } }),
    prisma.agent.count({ where: { workspaceId, status: 'ACTIVE' } }),
    prisma.automation.count({ where: { workspaceId } }),
    prisma.execution.count({ where: { workspaceId } }),
    prisma.aiUsage.aggregate({
      where: { workspaceId },
      _count: true,
      _sum: { inputTokens: true, outputTokens: true, costUsd: true },
    }),
    prisma.aiUsage.count({ where: { workspaceId, createdAt: { gte: startOfDay() } } }),
    prisma.aiUsage.aggregate({
      where: { workspaceId, createdAt: { gte: startOfMonth() } },
      _sum: { costUsd: true },
    }),
  ])

  return {
    totalAgents: agents,
    activeAgents,
    automations,
    executions,
    aiRequests: allTime._count,
    totalTokens: (allTime._sum.inputTokens ?? 0) + (allTime._sum.outputTokens ?? 0),
    estimatedCost: allTime._sum.costUsd ?? 0,
    requestsToday: today,
    costThisMonth: month._sum.costUsd ?? 0,
  }
}

export type DailyUsage = { label: string; date: string; requests: number; inputTokens: number; outputTokens: number; cost: number }

/**
 * Usage bucketed by day for the last N days, including days with no activity
 * so the chart has an unbroken x-axis.
 */
export async function getDailyUsage(workspaceId: string | null, days = 14): Promise<DailyUsage[]> {
  const since = startOfDay(days - 1)
  const rows = await prisma.aiUsage.findMany({
    where: { ...(workspaceId ? { workspaceId } : {}), createdAt: { gte: since } },
    select: { createdAt: true, inputTokens: true, outputTokens: true, costUsd: true },
  })

  const buckets = new Map<string, DailyUsage>()
  for (let index = days - 1; index >= 0; index--) {
    const date = startOfDay(index)
    const key = date.toISOString().slice(0, 10)
    buckets.set(key, {
      label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      date: key,
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
    })
  }

  for (const row of rows) {
    const key = row.createdAt.toISOString().slice(0, 10)
    const bucket = buckets.get(key)
    if (!bucket) continue
    bucket.requests += 1
    bucket.inputTokens += row.inputTokens
    bucket.outputTokens += row.outputTokens
    bucket.cost += row.costUsd
  }

  return [...buckets.values()]
}

/** Per-agent usage totals, ranked by request count. */
export async function getUsageByAgent(workspaceId: string, take = 6) {
  const grouped = await prisma.aiUsage.groupBy({
    by: ['agentId'],
    where: { workspaceId, agentId: { not: null } },
    _count: true,
    _sum: { inputTokens: true, outputTokens: true, costUsd: true },
    orderBy: { _count: { agentId: 'desc' } },
    take,
  })

  const agents = await prisma.agent.findMany({
    where: { id: { in: grouped.map((row) => row.agentId!).filter(Boolean) } },
    select: { id: true, name: true, icon: true },
  })
  const nameById = new Map(agents.map((agent) => [agent.id, agent]))

  return grouped.map((row) => ({
    agentId: row.agentId!,
    name: nameById.get(row.agentId!)?.name ?? 'Deleted agent',
    icon: nameById.get(row.agentId!)?.icon ?? 'bot',
    requests: row._count,
    tokens: (row._sum.inputTokens ?? 0) + (row._sum.outputTokens ?? 0),
    cost: row._sum.costUsd ?? 0,
  }))
}

/** Per-model usage totals, used for the cost breakdown table. */
export async function getUsageByModel(workspaceId: string | null) {
  const grouped = await prisma.aiUsage.groupBy({
    by: ['provider', 'model'],
    where: workspaceId ? { workspaceId } : {},
    _count: true,
    _sum: { inputTokens: true, outputTokens: true, costUsd: true },
  })

  return grouped
    .map((row) => ({
      provider: row.provider,
      model: row.model,
      requests: row._count,
      inputTokens: row._sum.inputTokens ?? 0,
      outputTokens: row._sum.outputTokens ?? 0,
      cost: row._sum.costUsd ?? 0,
    }))
    .sort((a, b) => b.requests - a.requests)
}
