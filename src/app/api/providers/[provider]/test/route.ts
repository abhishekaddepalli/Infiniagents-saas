import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { AppError, ok, route } from '@/lib/api'
import { requireWorkspaceRole } from '@/lib/workspace'
import { providerEnum } from '@/lib/validation'
import { getProvider, resolveApiKey } from '@/lib/ai'
import { ProviderError } from '@/lib/ai/types'
import { limit } from '@/lib/rate-limit'

type Context = { params: Promise<{ provider: string }> }

/**
 * "Test Connection" — makes the cheapest possible call to the provider to
 * confirm the key works, then records when it was last verified.
 */
export const POST = route(async (_request: NextRequest, context: Context) => {
  const { workspaceId, user } = await requireWorkspaceRole('ADMIN')
  limit(`provider-test:${user.id}`, 10, 60_000)

  const { provider: raw } = await context.params
  const provider = providerEnum.parse(raw.toUpperCase())

  const apiKey = await resolveApiKey(workspaceId, provider)
  if (!apiKey) {
    throw new AppError('No API key is configured for this provider yet.', 400)
  }

  try {
    await getProvider(provider).verify(apiKey)
  } catch (error) {
    if (error instanceof ProviderError) throw new AppError(error.message, 400)
    throw new AppError('Could not reach the provider. Check the key and your network, then try again.', 502)
  }

  await prisma.providerKey.updateMany({
    where: { workspaceId, provider },
    data: { verifiedAt: new Date() },
  })

  return ok({ connected: true })
})
