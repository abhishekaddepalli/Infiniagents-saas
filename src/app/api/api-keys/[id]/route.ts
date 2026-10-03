import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { AppError, ok, route } from '@/lib/api'
import { requireWorkspaceRole } from '@/lib/workspace'
import { recordAudit } from '@/lib/audit'

type Context = { params: Promise<{ id: string }> }

/**
 * Revokes a key.
 *
 * The row is kept rather than deleted so the audit trail and "last used"
 * history survive; `revokedAt` is what authentication actually checks.
 */
export const DELETE = route(async (_request: NextRequest, context: Context) => {
  const { workspaceId, user } = await requireWorkspaceRole('ADMIN')
  const { id } = await context.params

  const key = await prisma.apiKey.findFirst({ where: { id, workspaceId } })
  if (!key) throw new AppError('API key not found.', 404)

  await prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } })
  await recordAudit({
    workspaceId,
    userId: user.id,
    action: 'apikey.revoked',
    targetType: 'api_key',
    targetId: id,
    metadata: { name: key.name },
  })
  return ok({ revoked: true })
})
