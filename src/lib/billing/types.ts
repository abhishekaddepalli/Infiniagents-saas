import type { Plan } from '@prisma/client'

export type CheckoutInterval = 'monthly' | 'yearly'

export type CheckoutRequest = {
  plan: Plan
  interval: CheckoutInterval
  workspaceId: string
  workspaceName: string
  userEmail: string
  successUrl: string
  cancelUrl: string
  /** Existing gateway customer id, when the workspace has paid before. */
  customerId?: string | null
}

export type CheckoutSession = {
  /** Where to send the browser to complete payment. */
  url?: string
  /** Razorpay Checkout opens in-page instead of redirecting. */
  subscriptionId?: string
  keyId?: string
}

/**
 * Every payment gateway implements this interface.
 *
 * To add one (Paddle, Lemon Squeezy, Paystack, ...):
 *   1. Create `src/lib/billing/<name>.ts` exporting a PaymentGateway.
 *   2. Register it in the `gateways` map in `src/lib/billing/index.ts`.
 *   3. Add a webhook route that calls `applySubscriptionEvent`.
 * No other file needs to change.
 */
export type PaymentGateway = {
  id: 'stripe' | 'razorpay'
  label: string
  /** False when the required environment variables are missing. */
  isConfigured(): boolean
  /** Returns the plan's price identifier for this gateway, or null. */
  priceIdFor(plan: Plan, interval: CheckoutInterval): string | null
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>
  /** Customer-facing page for updating card details or cancelling. */
  createPortalSession?(customerId: string, returnUrl: string): Promise<string>
  /** Verifies a webhook signature and returns the parsed event. */
  verifyWebhook(rawBody: string, headers: Headers): Promise<GatewayEvent | null>
}

/** The gateway-neutral shape every webhook is normalised into. */
export type GatewayEvent = {
  id: string
  type: string
  /** Set for events that change a subscription. */
  subscription?: {
    workspaceId?: string
    planId?: string
    externalId: string
    externalCustomerId?: string
    status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED' | 'TRIALING'
    interval?: CheckoutInterval
    currentPeriodEnd?: Date
    cancelAtPeriodEnd?: boolean
  }
  invoice?: {
    workspaceId?: string
    externalId: string
    number?: string
    amount: number
    currency: string
    status: 'PAID' | 'OPEN' | 'FAILED' | 'REFUNDED'
    hostedUrl?: string
    periodStart?: Date
    periodEnd?: Date
  }
}

export class BillingError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'BillingError'
    this.status = status
  }
}
