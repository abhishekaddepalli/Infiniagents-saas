import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, route } from '@/lib/api'
import { requireApiKey } from '@/lib/api-keys'
import { clientIp, limit } from '@/lib/rate-limit'

/**
 * GET /api/v1/automations — list workflows in the key's workspace.
 * Scope: automations:read
 */
export const GET = route(async (request: NextRequest) => {
  const { workspaceId, keyId } = await requireApiKey(request, 'automations:read')
  limit(`v1:${keyId}:${clientIp(request)}`, 120, 60_000)

  const automations = await prisma.automation.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true, name: true, description: true, triggerType: true,
      status: true, lastRunAt: true, createdAt: true,
      _count: { select: { nodes: true, executions: true } },
    },
  })
  return ok({ data: automations })
})
