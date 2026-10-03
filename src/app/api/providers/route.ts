import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, route } from '@/lib/api'
import { requireWorkspaceRole } from '@/lib/workspace'
import { recordAudit } from '@/lib/audit'
import { providerKeySchema } from '@/lib/validation'
import { encrypt, maskKey } from '@/lib/crypto'

/**
 * Lists which providers this workspace has configured.
 * Only the masked hint is ever returned — the key itself never leaves the
 * server after it is saved.
 */
export const GET = route(async () => {
  const { workspaceId } = await requireWorkspaceRole('ADMIN')
  const keys = await prisma.providerKey.findMany({
    where: { workspaceId },
    select: { provider: true, keyHint: true, verifiedAt: true, updatedAt: true },
  })
  return ok({ keys })
})

/** Save or replace the API key for one provider. */
export const POST = route(async (request: NextRequest) => {
  const { workspaceId, user } = await requireWorkspaceRole('ADMIN')
  const { provider, apiKey } = providerKeySchema.parse(await request.json())

  const record = await prisma.providerKey.upsert({
    where: { workspaceId_provider: { workspaceId, provider } },
    create: {
      workspaceId,
      provider,
      keyCipher: encrypt(apiKey),
      keyHint: maskKey(apiKey),
    },
    update: {
      keyCipher: encrypt(apiKey),
      keyHint: maskKey(apiKey),
      // A replaced key has not been verified yet.
      verifiedAt: null,
    },
    select: { provider: true, keyHint: true, verifiedAt: true },
  })

  await recordAudit({
    workspaceId,
    userId: user.id,
    action: 'provider.key_saved',
    targetType: 'provider',
    targetId: provider,
  })
  return ok({ key: record })
})
