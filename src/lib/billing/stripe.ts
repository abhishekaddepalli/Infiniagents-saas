import crypto from 'crypto'
import { BillingError, type CheckoutInterval, type GatewayEvent, type PaymentGateway } from './types'
import type { Plan } from '@prisma/client'

/**
 * Stripe integration, written against the REST API with `fetch`.
 *
 * No SDK dependency on purpose: the whole integration is ~200 readable lines,
 * there is no package version to keep in step with your Next.js version, and
 * you can see exactly what is sent. If you would rather use the official SDK,
 * `npm install stripe` and replace the three `stripeRequest` calls below.
 */
const API = 'https://api.stripe.com/v1'

function secretKey() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new BillingError('Stripe is not configured on this server.', 503)
  return key
}

/** Stripe's API is form-encoded, including nested keys like `metadata[userId]`. */
function formEncode(payload: Record<string, unknown>, prefix = ''): string[] {
  const parts: string[] = []
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue
    const name = prefix ? `${prefix}[${key}]` : key

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          parts.push(...formEncode(item as Record<string, unknown>, `${name}[${index}]`))
        } else {
          parts.push(`${encodeURIComponent(`${name}[${index}]`)}=${encodeURIComponent(String(item))}`)
        }
      })
    } else if (typeof value === 'object') {
      parts.push(...formEncode(value as Record<string, unknown>, name))
    } else {
      parts.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`)
    }
  }
  return parts
}

async function stripeRequest<T>(path: string, payload?: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method: payload ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      ...(payload ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    ...(payload ? { body: formEncode(payload).join('&') } : {}),
  })

  const data = await response.json()
  if (!response.ok) {
    // Log the detail; surface only Stripe's short user-safe message.
    console.error('[agentflow] Stripe API error:', JSON.stringify(data).slice(0, 800))
    throw new BillingError(data?.error?.message || 'Stripe rejected the request.', 502)
  }
  return data as T
}

const STATUS_MAP: Record<string, 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED' | 'TRIALING'> = {
  active: 'ACTIVE',
  trialing: 'TRIALING',
  past_due: 'PAST_DUE',
  unpaid: 'PAST_DUE',
  canceled: 'CANCELED',
  incomplete: 'PAST_DUE',
  incomplete_expired: 'EXPIRED',
  paused: 'CANCELED',
}

export const stripeGateway: PaymentGateway = {
  id: 'stripe',
  label: 'Stripe',

  isConfigured() {
    return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET)
  },

  priceIdFor(plan: Plan, interval: CheckoutInterval) {
    return (interval === 'yearly' ? plan.stripePriceYearlyId : plan.stripePriceMonthlyId) || null
  },

  async createCheckout(request) {
    const priceId = this.priceIdFor(request.plan, request.interval)
    if (!priceId) {
      throw new BillingError(
        `The ${request.plan.name} plan has no Stripe price ID for ${request.interval} billing. Set it in Admin → Plans.`,
        400,
      )
    }

    const session = await stripeRequest<{ url: string }>('/checkout/sessions', {
      mode: 'subscription',
      success_url: request.successUrl,
      cancel_url: request.cancelUrl,
      line_items: [{ price: priceId, quantity: 1 }],
      ...(request.customerId
        ? { customer: request.customerId }
        : { customer_email: request.userEmail }),
      client_reference_id: request.workspaceId,
      // Metadata is echoed back on the webhook. It is the only trustworthy
      // link between a Stripe subscription and a workspace, because we set it.
      metadata: { workspaceId: request.workspaceId, planId: request.plan.id },
      subscription_data: {
        metadata: { workspaceId: request.workspaceId, planId: request.plan.id },
      },
    })

    return { url: session.url }
  },

  async createPortalSession(customerId, returnUrl) {
    const session = await stripeRequest<{ url: string }>('/billing_portal/sessions', {
      customer: customerId,
      return_url: returnUrl,
    })
    return session.url
  },

  async verifyWebhook(rawBody, headers) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET
    const signature = headers.get('stripe-signature')
    if (!secret || !signature) return null

    // Header format: t=<timestamp>,v1=<signature>[,v1=<signature>...]
    const parts = Object.fromEntries(
      signature.split(',').map((part) => {
        const [key, ...rest] = part.split('=')
        return [key.trim(), rest.join('=')]
      }),
    )
    const timestamp = parts.t
    const provided = signature
      .split(',')
      .filter((part) => part.trim().startsWith('v1='))
      .map((part) => part.trim().slice(3))
    if (!timestamp || provided.length === 0) return null

    // Reject anything older than five minutes, so a captured request cannot
    // be replayed later.
    const age = Math.abs(Date.now() / 1000 - Number(timestamp))
    if (!Number.isFinite(age) || age > 300) {
      console.warn('[agentflow] rejected a Stripe webhook outside the 5 minute tolerance')
      return null
    }

    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex')

    const matches = provided.some((candidate) => {
      const a = Buffer.from(candidate)
      const b = Buffer.from(expected)
      return a.length === b.length && crypto.timingSafeEqual(a, b)
    })
    if (!matches) {
      console.warn('[agentflow] rejected a Stripe webhook with a bad signature')
      return null
    }

    const event = JSON.parse(rawBody)
    return normaliseStripeEvent(event)
  },
}

/** Maps a Stripe event onto the gateway-neutral shape. */
function normaliseStripeEvent(event: {
  id: string
  type: string
  data: { object: Record<string, unknown> }
}): GatewayEvent {
  const object = event.data.object
  const base: GatewayEvent = { id: event.id, type: event.type }

  if (event.type.startsWith('customer.subscription.')) {
    const metadata = (object.metadata ?? {}) as Record<string, string>
    const items = object.items as { data?: { price?: { recurring?: { interval?: string } } }[] }
    const interval = items?.data?.[0]?.price?.recurring?.interval === 'year' ? 'yearly' : 'monthly'

    base.subscription = {
      workspaceId: metadata.workspaceId,
      planId: metadata.planId,
      externalId: String(object.id),
      externalCustomerId: object.customer ? String(object.customer) : undefined,
      status:
        event.type === 'customer.subscription.deleted'
          ? 'CANCELED'
          : (STATUS_MAP[String(object.status)] ?? 'ACTIVE'),
      interval,
      currentPeriodEnd: object.current_period_end
        ? new Date(Number(object.current_period_end) * 1000)
        : undefined,
      cancelAtPeriodEnd: Boolean(object.cancel_at_period_end),
    }
  }

  if (event.type === 'checkout.session.completed') {
    const metadata = (object.metadata ?? {}) as Record<string, string>
    base.subscription = {
      workspaceId: metadata.workspaceId,
      planId: metadata.planId,
      externalId: String(object.subscription ?? object.id),
      externalCustomerId: object.customer ? String(object.customer) : undefined,
      status: 'ACTIVE',
    }
  }

  if (event.type.startsWith('invoice.')) {
    const lines = object.lines as { data?: { period?: { start?: number; end?: number } }[] }
    const period = lines?.data?.[0]?.period
    base.invoice = {
      externalId: String(object.id),
      number: object.number ? String(object.number) : undefined,
      amount: Number(object.amount_paid ?? object.amount_due ?? 0) / 100,
      currency: String(object.currency ?? 'usd').toUpperCase(),
      status: event.type === 'invoice.payment_failed' ? 'FAILED' : 'PAID',
      hostedUrl: object.hosted_invoice_url ? String(object.hosted_invoice_url) : undefined,
      periodStart: period?.start ? new Date(period.start * 1000) : undefined,
      periodEnd: period?.end ? new Date(period.end * 1000) : undefined,
    }
    const subscriptionId = object.subscription ? String(object.subscription) : null
    if (subscriptionId && event.type === 'invoice.payment_failed') {
      base.subscription = { externalId: subscriptionId, status: 'PAST_DUE' }
    }
  }

  return base
}
