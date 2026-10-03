import { NextRequest } from 'next/server'
import { applyGatewayEvent, gateways } from '@/lib/billing'

/**
 * Stripe webhook.
 *
 * The raw body is required: the signature is computed over the exact bytes
 * Stripe sent, so parsing first would break verification. An unverified
 * request is rejected before it can touch the database.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  const event = await gateways.stripe.verifyWebhook(rawBody, request.headers)
  if (!event) {
    return new Response('Invalid signature', { status: 400 })
  }

  try {
    const applied = await applyGatewayEvent('stripe', event)
    return Response.json({ received: true, applied })
  } catch (error) {
    // Returning 500 asks Stripe to retry, which is what we want for a
    // transient database failure.
    console.error('[agentflow] Stripe webhook handling failed:', error)
    return new Response('Webhook handler failed', { status: 500 })
  }
}
