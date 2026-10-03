import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, route } from '@/lib/api'
import { requireWorkspaceRole } from '@/lib/workspace'
import { recordAudit } from '@/lib/audit'
import { providerEnum } from '@/lib/validation'

type Context = { params: Promise<{ provider: string }> }

/** Remove a stored provider key. */
export const DELETE = route(async (_request: NextRequest, context: Context) => {
  const { workspaceId, user } = await requireWorkspaceRole('ADMIN')
  const { provider: raw } = await context.params
  const provider = providerEnum.parse(raw.toUpperCase())

  await prisma.providerKey.deleteMany({ where: { workspaceId, provider } })
  await recordAudit({
    workspaceId,
    userId: user.id,
    action: 'provider.key_removed',
    targetType: 'provider',
    targetId: provider,
  })
  return ok({ deleted: true })
})
