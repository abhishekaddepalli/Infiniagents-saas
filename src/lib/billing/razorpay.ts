import crypto from 'crypto'
import { BillingError, type CheckoutInterval, type GatewayEvent, type PaymentGateway } from './types'
import type { Plan } from '@prisma/client'

/**
 * Razorpay integration for Indian customers, written against the REST API
 * with `fetch` — no SDK dependency, same reasoning as the Stripe module.
 *
 * Razorpay Checkout opens in the page rather than redirecting, so
 * `createCheckout` returns a subscription id and public key for the browser
 * widget instead of a URL.
 */
const API = 'https://api.razorpay.com/v1'

function credentials() {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) throw new BillingError('Razorpay is not configured on this server.', 503)
  return { keyId, keySecret }
}

async function razorpayRequest<T>(path: string, payload?: Record<string, unknown>): Promise<T> {
  const { keyId, keySecret } = credentials()
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64')

  const response = await fetch(`${API}${path}`, {
    method: payload ? 'POST' : 'GET',
    headers: {
      Authorization: `Basic ${auth}`,
      ...(payload ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  })

  const data = await response.json()
  if (!response.ok) {
    console.error('[agentflow] Razorpay API error:', JSON.stringify(data).slice(0, 800))
    throw new BillingError(data?.error?.description || 'Razorpay rejected the request.', 502)
  }
  return data as T
}

const STATUS_MAP: Record<string, 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED' | 'TRIALING'> = {
  created: 'PAST_DUE',
  authenticated: 'ACTIVE',
  active: 'ACTIVE',
  pending: 'PAST_DUE',
  halted: 'PAST_DUE',
  cancelled: 'CANCELED',
  completed: 'EXPIRED',
  expired: 'EXPIRED',
}

export const razorpayGateway: PaymentGateway = {
  id: 'razorpay',
  label: 'Razorpay',

  isConfigured() {
    return Boolean(
      process.env.RAZORPAY_KEY_ID &&
        process.env.RAZORPAY_KEY_SECRET &&
        process.env.RAZORPAY_WEBHOOK_SECRET,
    )
  },

  priceIdFor(plan: Plan, interval: CheckoutInterval) {
    return (interval === 'yearly' ? plan.razorpayPlanYearlyId : plan.razorpayPlanMonthlyId) || null
  },

  async createCheckout(request) {
    const planId = this.priceIdFor(request.plan, request.interval)
    if (!planId) {
      throw new BillingError(
        `The ${request.plan.name} plan has no Razorpay plan ID for ${request.interval} billing. Set it in Admin → Plans.`,
        400,
      )
    }

    const subscription = await razorpayRequest<{ id: string }>('/subscriptions', {
      plan_id: planId,
      customer_notify: 1,
      // 12 monthly cycles, or 5 yearly — Razorpay requires a finite count.
      total_count: request.interval === 'yearly' ? 5 : 12,
      notes: { workspaceId: request.workspaceId, planId: request.plan.id },
    })

    return { subscriptionId: subscription.id, keyId: credentials().keyId }
  },

  async verifyWebhook(rawBody, headers) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET
    const signature = headers.get('x-razorpay-signature')
    if (!secret || !signature) return null

    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
    const a = Buffer.from(signature)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      console.warn('[agentflow] rejected a Razorpay webhook with a bad signature')
      return null
    }

    return normaliseRazorpayEvent(JSON.parse(rawBody))
  },
}

function normaliseRazorpayEvent(event: {
  event: string
  payload: Record<string, { entity?: Record<string, unknown> }>
}): GatewayEvent {
  const subscription = event.payload?.subscription?.entity
  const payment = event.payload?.payment?.entity

  // Razorpay has no event id header; derive a stable one for idempotency.
  const id = `${event.event}:${subscription?.id ?? payment?.id ?? Date.now()}`
  const base: GatewayEvent = { id, type: event.event }

  if (subscription) {
    const notes = (subscription.notes ?? {}) as Record<string, string>
    base.subscription = {
      workspaceId: notes.workspaceId,
      planId: notes.planId,
      externalId: String(subscription.id),
      externalCustomerId: subscription.customer_id ? String(subscription.customer_id) : undefined,
      status: STATUS_MAP[String(subscription.status)] ?? 'ACTIVE',
      currentPeriodEnd: subscription.current_end
        ? new Date(Number(subscription.current_end) * 1000)
        : undefined,
    }
  }

  if (payment && event.event.startsWith('subscription.charged')) {
    const notes = (subscription?.notes ?? {}) as Record<string, string>
    base.invoice = {
      workspaceId: notes.workspaceId,
      externalId: String(payment.id),
      // Razorpay amounts are in the smallest currency unit (paise).
      amount: Number(payment.amount ?? 0) / 100,
      currency: String(payment.currency ?? 'INR').toUpperCase(),
      status: 'PAID',
    }
  }

  return base
}
