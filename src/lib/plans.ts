import { prisma } from './db'
import { AppError } from './api'

/**
 * Plan limit enforcement.
 *
 * Limits live in the `plans` table (Admin → Plans), never in code, and apply
 * per workspace. A value of -1 means unlimited.
 */
export async function getWorkspacePlan(workspaceId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { workspaceId },
    include: { plan: true },
  })
  // TRIALING counts as active; PAST_DUE deliberately does not, so an unpaid
  // workspace drops back to free limits rather than keeping paid ones.
  if (subscription && (subscription.status === 'ACTIVE' || subscription.status === 'TRIALING')) {
    return subscription.plan
  }
  return prisma.plan.findFirst({ where: { slug: 'free' } })
}

function startOfMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

export type PlanUsage = {
  planName: string
  planSlug: string
  agents: { used: number; limit: number }
  automations: { used: number; limit: number }
  requests: { used: number; limit: number }
  members: { used: number; limit: number }
  documents: { used: number; limit: number }
}

export async function getPlanUsage(workspaceId: string): Promise<PlanUsage> {
  const plan = await getWorkspacePlan(workspaceId)
  const [agents, automations, requests, members, documents] = await Promise.all([
    prisma.agent.count({ where: { workspaceId } }),
    prisma.automation.count({ where: { workspaceId } }),
    prisma.aiUsage.count({ where: { workspaceId, createdAt: { gte: startOfMonth() } } }),
    prisma.workspaceMember.count({ where: { workspaceId } }),
    prisma.document.count({ where: { knowledgeBase: { workspaceId } } }),
  ])

  return {
    planName: plan?.name ?? 'Free',
    planSlug: plan?.slug ?? 'free',
    agents: { used: agents, limit: plan?.maxAgents ?? 3 },
    automations: { used: automations, limit: plan?.maxAutomations ?? 1 },
    requests: { used: requests, limit: plan?.maxRequests ?? 100 },
    members: { used: members, limit: plan?.maxMembers ?? 1 },
    documents: { used: documents, limit: plan?.maxDocuments ?? 10 },
  }
}

export type LimitedResource = 'agents' | 'automations' | 'requests' | 'members' | 'documents'

/** Throws a user-facing error when the action would exceed the plan limit. */
export async function assertWithinLimit(workspaceId: string, resource: LimitedResource) {
  const usage = await getPlanUsage(workspaceId)
  const { used, limit } = usage[resource]
  if (limit === -1 || used < limit) return

  const nouns: Record<LimitedResource, string> = {
    agents: 'agent',
    automations: 'automation',
    requests: 'AI request',
    members: 'team member',
    documents: 'knowledge base document',
  }
  const noun = nouns[resource]
  const label = `${noun}${limit === 1 ? '' : 's'}${resource === 'requests' ? ' this month' : ''}`

  throw new AppError(
    `Your ${usage.planName} plan allows ${limit} ${label}. Upgrade your plan to continue.`,
    402,
  )
}
