import { prisma } from '@/lib/db'
import { AppError, ok, route } from '@/lib/api'
import { requireWorkspaceRole } from '@/lib/workspace'
import { getGateway, BillingError } from '@/lib/billing'
import { env } from '@/lib/env'

/**
 * Opens the gateway's own customer portal, where a subscriber updates their
 * card or cancels. Building those screens ourselves would mean handling card
 * data; the hosted portal avoids that entirely.
 */
export const POST = route(async () => {
  const { workspaceId } = await requireWorkspaceRole('ADMIN')

  const subscription = await prisma.subscription.findUnique({ where: { workspaceId } })
  if (!subscription?.externalCustomerId) {
    throw new AppError('This workspace has no billing account yet.', 400)
  }

  const gateway = getGateway(subscription.gateway)
  if (!gateway?.createPortalSession) {
    throw new AppError(
      `${subscription.gateway} does not provide a hosted billing portal. Manage this subscription from the gateway dashboard.`,
      400,
    )
  }

  try {
    const url = await gateway.createPortalSession(
      subscription.externalCustomerId,
      `${env.appUrl}/billing`,
    )
    return ok({ url })
  } catch (error) {
    if (error instanceof BillingError) throw new AppError(error.message, error.status)
    throw error
  }
})
