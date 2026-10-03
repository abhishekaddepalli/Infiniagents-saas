import 'server-only'
import { prisma } from '../db'
import { recordAudit } from '../audit'
import { razorpayGateway } from './razorpay'
import { stripeGateway } from './stripe'
import type { GatewayEvent, PaymentGateway } from './types'

/**
 * Payment gateway registry.
 *
 * Both gateways are fully implemented. Whether either is *available* depends
 * on your environment variables — an unconfigured gateway is simply not
 * offered in the UI, so the template still runs with no payments at all.
 */
export const gateways: Record<string, PaymentGateway> = {
  stripe: stripeGateway,
  razorpay: razorpayGateway,
}

export function getGateway(id: string): PaymentGateway | null {
  return gateways[id] ?? null
}

/** The gateways that are actually usable on this deployment. */
export function configuredGateways(): PaymentGateway[] {
  return Object.values(gateways).filter((gateway) => gateway.isConfigured())
}

export function billingEnabled() {
  return configuredGateways().length > 0
}

/**
 * Applies a normalised gateway event to the database.
 *
 * This is the ONLY place a subscription is granted. Checkout never writes one,
 * because the browser can be closed, faked, or replayed — only a signed
 * webhook is trusted. The `webhook_events` table makes the write idempotent,
 * so a redelivered event cannot grant a second subscription.
 */
export async function applyGatewayEvent(gateway: string, event: GatewayEvent): Promise<boolean> {
  // Idempotency: if we have seen this event id, do nothing.
  const seen = await prisma.webhookEvent.findUnique({
    where: { gateway_externalId: { gateway, externalId: event.id } },
  })
  if (seen) return false

  await prisma.webhookEvent.create({
    data: { gateway, externalId: event.id, type: event.type },
  })

  if (event.subscription) {
    const incoming = event.subscription

    // Resolve the workspace either from event metadata (first time) or from
    // the subscription we already store (renewals, cancellations).
    const existing = await prisma.subscription.findFirst({
      where: { externalId: incoming.externalId },
    })
    const workspaceId = incoming.workspaceId ?? existing?.workspaceId

    if (workspaceId) {
      // Fall back to the free plan if the event carries no plan id.
      const planId =
        incoming.planId ??
        existing?.planId ??
        (await prisma.plan.findFirst({ where: { slug: 'free' } }))?.id

      if (planId) {
        await prisma.subscription.upsert({
          where: { workspaceId },
          create: {
            workspaceId,
            planId,
            status: incoming.status,
            gateway,
            externalId: incoming.externalId,
            externalCustomerId: incoming.externalCustomerId ?? null,
            interval: incoming.interval ?? 'monthly',
            cancelAtPeriodEnd: incoming.cancelAtPeriodEnd ?? false,
            currentPeriodEnd: incoming.currentPeriodEnd ?? null,
          },
          update: {
            // A cancellation must not silently re-grant the paid plan, so the
            // plan is only advanced while the subscription is still live.
            ...(incoming.status === 'CANCELED' || incoming.status === 'EXPIRED'
              ? {}
              : { planId }),
            status: incoming.status,
            gateway,
            externalId: incoming.externalId,
            ...(incoming.externalCustomerId
              ? { externalCustomerId: incoming.externalCustomerId }
              : {}),
            ...(incoming.interval ? { interval: incoming.interval } : {}),
            ...(incoming.cancelAtPeriodEnd !== undefined
              ? { cancelAtPeriodEnd: incoming.cancelAtPeriodEnd }
              : {}),
            ...(incoming.currentPeriodEnd ? { currentPeriodEnd: incoming.currentPeriodEnd } : {}),
          },
        })

        // A cancelled or expired subscription drops back to the free plan, so
        // free-tier limits apply again rather than the paid ones.
        if (incoming.status === 'CANCELED' || incoming.status === 'EXPIRED') {
          const freePlan = await prisma.plan.findFirst({ where: { slug: 'free' } })
          if (freePlan) {
            await prisma.subscription.update({
              where: { workspaceId },
              data: { planId: freePlan.id },
            })
          }
        }

        await recordAudit({
          workspaceId,
          action: 'billing.plan_changed',
          targetType: 'subscription',
          targetId: incoming.externalId,
          metadata: { gateway, status: incoming.status, event: event.type },
        })
      }
    }
  }

  if (event.invoice) {
    const workspaceId =
      event.invoice.workspaceId ??
      (
        await prisma.subscription.findFirst({
          where: { gateway, externalCustomerId: { not: null } },
          select: { workspaceId: true },
        })
      )?.workspaceId

    if (workspaceId) {
      await prisma.invoice.create({
        data: {
          workspaceId,
          gateway,
          externalId: event.invoice.externalId,
          number: event.invoice.number ?? null,
          amount: event.invoice.amount,
          currency: event.invoice.currency,
          status: event.invoice.status,
          hostedUrl: event.invoice.hostedUrl ?? null,
          periodStart: event.invoice.periodStart ?? null,
          periodEnd: event.invoice.periodEnd ?? null,
        },
      })
    }
  }

  return true
}

export * from './types'
