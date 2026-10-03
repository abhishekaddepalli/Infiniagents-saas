import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { AppError, ok, route } from '@/lib/api'
import { requireWorkspaceRole } from '@/lib/workspace'
import { checkoutSchema } from '@/lib/validation'
import { billingEnabled, getGateway, BillingError } from '@/lib/billing'
import { recordAudit } from '@/lib/audit'
import { env } from '@/lib/env'

/**
 * Starts a checkout.
 *
 * Nothing is granted here — the subscription is written only when the
 * gateway's signed webhook arrives. Free plans are the one exception, since
 * there is no payment to verify.
 */
export const POST = route(async (request: NextRequest) => {
  const { workspaceId, workspaceName, user } = await requireWorkspaceRole('ADMIN')
  const { planSlug, interval, gateway: gatewayId } = checkoutSchema.parse(await request.json())

  const plan = await prisma.plan.findFirst({ where: { slug: planSlug, active: true } })
  if (!plan) throw new AppError('That plan is not available.', 404)

  // Downgrading to free needs no gateway round trip.
  if (plan.priceMonthly === 0 && plan.priceYearly === 0) {
    await prisma.subscription.upsert({
      where: { workspaceId },
      create: { workspaceId, planId: plan.id, status: 'ACTIVE', gateway: 'none' },
      update: { planId: plan.id, status: 'ACTIVE' },
    })
    await recordAudit({
      workspaceId,
      userId: user.id,
      action: 'billing.plan_changed',
      metadata: { plan: plan.slug },
    })
    return ok({ changed: true, plan: { name: plan.name, slug: plan.slug } })
  }

  if (!billingEnabled()) {
    throw new AppError(
      'No payment gateway is configured on this server, so paid plans cannot be purchased yet. See documentation/payments.md.',
      503,
    )
  }

  const gateway = getGateway(gatewayId)
  if (!gateway || !gateway.isConfigured()) {
    throw new AppError('That payment gateway is not available on this server.', 400)
  }

  const subscription = await prisma.subscription.findUnique({ where: { workspaceId } })

  try {
    const session = await gateway.createCheckout({
      plan,
      interval,
      workspaceId,
      workspaceName,
      userEmail: user.email,
      customerId: subscription?.externalCustomerId,
      successUrl: `${env.appUrl}/billing?checkout=success`,
      cancelUrl: `${env.appUrl}/billing?checkout=cancelled`,
    })
    return ok({ gateway: gateway.id, ...session })
  } catch (error) {
    if (error instanceof BillingError) throw new AppError(error.message, error.status)
    throw error
  }
})
