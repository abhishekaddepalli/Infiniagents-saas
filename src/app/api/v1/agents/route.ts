import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, route } from '@/lib/api'
import { requireApiKey } from '@/lib/api-keys'
import { clientIp, limit } from '@/lib/rate-limit'

/**
 * GET /api/v1/agents — list the agents in the key's workspace.
 * Scope: agents:read
 */
export const GET = route(async (request: NextRequest) => {
  const { workspaceId, keyId } = await requireApiKey(request, 'agents:read')
  limit(`v1:${keyId}:${clientIp(request)}`, 120, 60_000)

  const agents = await prisma.agent.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true, name: true, description: true, provider: true, model: true,
      temperature: true, maxTokens: true, status: true, createdAt: true,
    },
  })
  return ok({ data: agents })
})
