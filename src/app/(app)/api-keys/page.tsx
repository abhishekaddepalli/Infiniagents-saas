import { PageHeader } from '@/components/layout/page-header'
import { ApiKeysPanel } from '@/components/settings/api-keys-panel'
import { requireWorkspaceRole } from '@/lib/workspace'
import { prisma } from '@/lib/db'
import { env } from '@/lib/env'

export const metadata = { title: 'API Keys' }
export const dynamic = 'force-dynamic'

export default async function ApiKeysPage() {
  // Only admins and owners manage keys — a member could otherwise mint a
  // credential with more reach than their own role.
  const { workspaceId } = await requireWorkspaceRole('ADMIN')

  const keys = await prisma.apiKey.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, keyPrefix: true, scopes: true, lastUsedAt: true,
      expiresAt: true, revokedAt: true, createdAt: true,
      createdBy: { select: { name: true } },
    },
  })

  return (
    <div>
      <PageHeader
        title="API Keys"
        description="Call this workspace's agents and automations from your own application."
      />
      <ApiKeysPanel
        appUrl={env.appUrl}
        keys={keys.map((key) => ({
          id: key.id,
          name: key.name,
          keyPrefix: key.keyPrefix,
          scopes: key.scopes,
          lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
          expiresAt: key.expiresAt?.toISOString() ?? null,
          revokedAt: key.revokedAt?.toISOString() ?? null,
          createdAt: key.createdAt.toISOString(),
          createdBy: key.createdBy.name,
        }))}
      />
    </div>
  )
}
