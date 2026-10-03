import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, route } from '@/lib/api'
import { requireApiKey } from '@/lib/api-keys'
import { clientIp, limit } from '@/lib/rate-limit'

/**
 * GET /api/v1/executions — run history for the key's workspace.
 * Scope: executions:read
 *
 * Query: ?limit=50&automationId=...
 */
export const GET = route(async (request: NextRequest) => {
  const { workspaceId, keyId } = await requireApiKey(request, 'executions:read')
  limit(`v1:${keyId}:${clientIp(request)}`, 120, 60_000)

  const params = new URL(request.url).searchParams
  const take = Math.min(Math.max(Number(params.get('limit') ?? 50) || 50, 1), 100)
  const automationId = params.get('automationId')

  const executions = await prisma.execution.findMany({
    where: { workspaceId, ...(automationId ? { automationId } : {}) },
    orderBy: { startedAt: 'desc' },
    take,
    select: {
      id: true, status: true, source: true, input: true, output: true, error: true,
      inputTokens: true, outputTokens: true, costUsd: true, durationMs: true,
      startedAt: true, finishedAt: true,
      automation: { select: { id: true, name: true } },
    },
  })
  return ok({ data: executions })
})
