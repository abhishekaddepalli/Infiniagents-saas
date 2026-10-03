import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, route } from '@/lib/api'
import { requireWorkspaceRole } from '@/lib/workspace'
import { apiKeySchema } from '@/lib/validation'
import { issueApiKey } from '@/lib/api-keys'
import { recordAudit } from '@/lib/audit'

export const GET = route(async () => {
  const { workspaceId } = await requireWorkspaceRole('ADMIN')
  const keys = await prisma.apiKey.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    // The hash is never selected, so it cannot leak through this endpoint.
    select: {
      id: true, name: true, keyPrefix: true, scopes: true, lastUsedAt: true,
      expiresAt: true, revokedAt: true, createdAt: true,
      createdBy: { select: { name: true } },
    },
  })
  return ok({ keys })
})

/** Issues a key. The full value is returned here and never again. */
export const POST = route(async (request: NextRequest) => {
  const { workspaceId, user } = await requireWorkspaceRole('ADMIN')
  const { name, scopes, expiresInDays } = apiKeySchema.parse(await request.json())

  const issued = await issueApiKey({ workspaceId, userId: user.id, name, scopes, expiresInDays })
  await recordAudit({
    workspaceId,
    userId: user.id,
    action: 'apikey.created',
    targetType: 'api_key',
    targetId: issued.id,
    metadata: { name, scopes },
  })

  return ok({ id: issued.id, key: issued.key, prefix: issued.prefix }, 201)
})
