# Payments

## What ships

**Stripe and Razorpay are both fully implemented.** Checkout, signed webhooks,
subscription lifecycle, plan downgrades on cancellation, and invoice history all
work. What is *not* included is your account: paid plans stay unpurchasable until
you set the gateway keys and the per-plan price IDs.

The billing page says so on screen while no gateway is configured, so the
product is never misleading about its own state.

| File | Role |
|---|---|
| `src/lib/billing/types.ts` | The `PaymentGateway` interface every gateway implements |
| `src/lib/billing/stripe.ts` | Stripe, against the REST API |
| `src/lib/billing/razorpay.ts` | Razorpay, against the REST API |
| `src/lib/billing/index.ts` | Registry + `applyGatewayEvent`, the only writer of subscriptions |
| `src/app/api/billing/checkout/route.ts` | Starts a checkout |
| `src/app/api/billing/portal/route.ts` | Opens the gateway's hosted portal |
| `src/app/api/webhooks/stripe/route.ts` | Stripe webhook |
| `src/app/api/webhooks/razorpay/route.ts` | Razorpay webhook |

### No SDK dependency

Both integrations use `fetch` and Node's `crypto`. That is deliberate: the whole
thing is a few hundred readable lines, there is no package version to keep in
step with your Next.js version, and you can see exactly what is sent. If you
prefer the official SDKs, `npm install stripe` and swap the request helper — the
interface stays the same.

---

## The rule that matters

**A subscription is written only from a verified webhook.** Never from the
browser returning from checkout.

A `success_url` redirect proves nothing: it can be visited directly, replayed,
or forged. `applyGatewayEvent` in `src/lib/billing/index.ts` is the single place
that grants a plan, and it runs only after the signature check passes.

The `webhook_events` table records every event id already processed, so a
redelivered webhook — which both gateways do routinely — cannot grant a second
subscription.

---

## Stripe (international)

```env
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
```

### 1. Create the products

In the Stripe dashboard create one Product per plan, with a monthly and a yearly
recurring Price.

### 2. Paste the price IDs

**Admin → Plans → edit a plan → Payment gateway IDs.** The columns already exist
(`stripePriceMonthlyId`, `stripePriceYearlyId`) — no migration needed.

Without them, checkout returns a clear error naming the missing ID rather than
failing obscurely.

### 3. Point the webhook at your deployment

In the Stripe dashboard, add an endpoint at
`https://your-domain.com/api/webhooks/stripe` subscribed to:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

Test locally with the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

That is the whole setup. Everything below is reference for how it works.

### 2. Start a checkout instead of switching

```ts
// src/app/api/billing/route.ts
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const plan = await prisma.plan.findFirst({ where: { slug: planSlug, active: true } })
if (!plan) throw new AppError('That plan is not available.', 404)

// Free plans need no checkout.
if (plan.priceMonthly === 0) {
  await prisma.subscription.upsert({ /* as today */ })
  return ok({ plan })
}

const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: plan.stripePriceId!, quantity: 1 }],
  customer_email: user.email,
  // Never trust these values on the way back — they are a convenience only.
  client_reference_id: user.id,
  metadata: { userId: user.id, planId: plan.id },
  success_url: `${env.appUrl}/billing?checkout=success`,
  cancel_url: `${env.appUrl}/billing?checkout=cancelled`,
})

return ok({ checkoutUrl: session.url })
```

The client then redirects to `data.checkoutUrl`.

### 3. Handle the webhook

`src/app/api/webhooks/stripe/route.ts`:

```ts
export async function POST(request: Request) {
  const body = await request.text()          // raw body — required for signature checks
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { userId, planId } = session.metadata ?? {}
    if (userId && planId) {
      await prisma.subscription.upsert({
        where: { userId },
        create: { userId, planId, status: 'ACTIVE', gateway: 'stripe', externalId: session.subscription as string },
        update: { planId, status: 'ACTIVE', gateway: 'stripe', externalId: session.subscription as string },
      })
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    await prisma.subscription.updateMany({
      where: { externalId: subscription.id },
      data: { status: 'CANCELED' },
    })
  }

  return new Response('ok')
}
```

**Verify the signature.** Without it, anyone can POST to your webhook and grant
themselves a paid plan.

Also handle `customer.subscription.updated` (plan changes and payment failures)
and `invoice.payment_failed`.

---

## Razorpay (India)

```bash
npm install razorpay
```

```env
RAZORPAY_KEY_ID="rzp_live_..."
RAZORPAY_KEY_SECRET="..."
RAZORPAY_WEBHOOK_SECRET="..."
```

Razorpay uses Plans and Subscriptions. Create a Plan per tier in the dashboard
and store its id on your `Plan` row.

```ts
import Razorpay from 'razorpay'
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

const subscription = await razorpay.subscriptions.create({
  plan_id: plan.razorpayPlanId!,
  customer_notify: 1,
  total_count: 12,
  notes: { userId: user.id, planId: plan.id },
})

return ok({ subscriptionId: subscription.id, keyId: process.env.RAZORPAY_KEY_ID })
```

The client opens Razorpay Checkout with that subscription id.

Verify the webhook signature yourself:

```ts
import crypto from 'crypto'

const body = await request.text()
const expected = crypto
  .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
  .update(body)
  .digest('hex')

if (expected !== request.headers.get('x-razorpay-signature')) {
  return new Response('Invalid signature', { status: 400 })
}
```

Handle `subscription.activated`, `subscription.charged`, `subscription.halted`
and `subscription.cancelled`.

For Indian pricing, set the currency symbol to `₹` in Admin → Settings and enter
your plan prices in rupees — no conversion is applied anywhere, the symbol is a
label.

---

## Checklist before charging real money

- [ ] Webhook signature verification implemented and tested
- [ ] Subscription written **only** from the webhook, never from a client callback
- [ ] Failed payments downgrade or suspend the subscription
- [ ] Cancellation flow, and what happens at period end
- [ ] Users over a reduced limit after a downgrade are handled gracefully
- [ ] Invoices and receipts
- [ ] Tax handling (GST, VAT, sales tax) for your jurisdiction
- [ ] Refund policy written into your Terms
- [ ] Tested end to end in the gateway's test mode
