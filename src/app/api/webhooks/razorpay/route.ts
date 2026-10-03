import { NextRequest } from 'next/server'
import { applyGatewayEvent, gateways } from '@/lib/billing'

/**
 * Razorpay webhook. Same contract as the Stripe one: verify the signature
 * over the raw body, then apply the normalised event idempotently.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  const event = await gateways.razorpay.verifyWebhook(rawBody, request.headers)
  if (!event) {
    return new Response('Invalid signature', { status: 400 })
  }

  try {
    const applied = await applyGatewayEvent('razorpay', event)
    return Response.json({ received: true, applied })
  } catch (error) {
    console.error('[agentflow] Razorpay webhook handling failed:', error)
    return new Response('Webhook handler failed', { status: 500 })
  }
}
