'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CreditCard, ExternalLink, Info, Receipt } from 'lucide-react'
import { PricingTable, type PricingPlan } from '@/components/marketing/pricing'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate, percentOf } from '@/lib/utils'
import type { PlanUsage } from '@/lib/plans'

export type GatewayOption = { id: string; label: string }

export type InvoiceRow = {
  id: string
  number: string | null
  amount: number
  currency: string
  status: string
  hostedUrl: string | null
  createdAt: string
}

type Subscription = {
  status: string
  gateway: string
  interval: string
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  hasCustomer: boolean
}

/**
 * Plan and billing.
 *
 * Free plans switch immediately. Paid plans go through the gateway's own
 * checkout, and the subscription is only written when its signed webhook
 * arrives — never from the browser coming back.
 */
export function BillingPanel({
  plans,
  currentSlug,
  planUsage,
  currencySymbol,
  gateways,
  subscription,
  invoices,
  canManage,
}: {
  plans: PricingPlan[]
  currentSlug: string
  planUsage: PlanUsage
  currencySymbol: string
  gateways: GatewayOption[]
  subscription: Subscription | null
  invoices: InvoiceRow[]
  canManage: boolean
}) {
  const router = useRouter()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [choosing, setChoosing] = useState<PricingPlan | null>(null)

  const billingLive = gateways.length > 0

  async function startCheckout(plan: PricingPlan, gatewayId: string, interval: 'monthly' | 'yearly') {
    setBusy(true)
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planSlug: plan.slug, interval, gateway: gatewayId }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error('Could not start checkout', data.error)
        return
      }

      if (data.changed) {
        toast.success(`Switched to the ${plan.name} plan`)
        setChoosing(null)
        router.refresh()
        return
      }
      if (data.url) {
        // Stripe: hand off to the hosted checkout page.
        window.location.href = data.url
        return
      }
      if (data.subscriptionId) {
        // Razorpay Checkout opens in-page; the script is loaded on demand so
        // it is not shipped to every visitor.
        toast.info(
          'Razorpay checkout ready',
          `Subscription ${data.subscriptionId} created. Wire up the Razorpay Checkout widget to complete payment — see documentation/payments.md.`,
        )
        return
      }
      toast.error('Checkout did not return a destination')
    } finally {
      setBusy(false)
    }
  }

  async function openPortal() {
    setBusy(true)
    try {
      const response = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) {
        toast.error('Could not open the billing portal', data.error)
        return
      }
      window.location.href = data.url
    } finally {
      setBusy(false)
    }
  }

  function selectPlan(plan: PricingPlan) {
    if (!canManage) {
      toast.error('Only workspace admins can change the plan')
      return
    }
    // Free plans need no gateway choice.
    if (plan.priceMonthly === 0 && plan.priceYearly === 0) {
      startCheckout(plan, 'none', 'monthly')
      return
    }
    if (!billingLive) {
      toast.error(
        'No payment gateway is configured',
        'Set your Stripe or Razorpay keys to enable paid plans.',
      )
      return
    }
    setChoosing(plan)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Current plan"
          description="Your allowance resets at the start of each calendar month"
          action={
            <div className="flex items-center gap-2">
              {subscription?.cancelAtPeriodEnd && <Badge tone="warning">Cancels at period end</Badge>}
              {subscription?.status === 'PAST_DUE' && <Badge tone="danger">Payment failed</Badge>}
              <Badge tone="brand">{planUsage.planName}</Badge>
            </div>
          }
        />
        <CardBody className="space-y-5">
          {[
            { label: 'AI agents', ...planUsage.agents },
            { label: 'Automations', ...planUsage.automations },
            { label: 'AI requests this month', ...planUsage.requests },
            { label: 'Team members', ...planUsage.members },
            { label: 'Knowledge documents', ...planUsage.documents },
          ].map((row) => (
            <div key={row.label}>
              <div className="mb-1.5 flex justify-between text-[13px]">
                <span className="text-ink">{row.label}</span>
                <span className="font-mono text-muted">
                  {row.used} {row.limit === -1 ? '/ unlimited' : `/ ${row.limit}`}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
                <div
                  className={`h-full rounded-full ${
                    percentOf(row.used, row.limit) >= 90 ? 'bg-warn' : 'bg-brand-600'
                  }`}
                  style={{ width: `${Math.max(percentOf(row.used, row.limit), 2)}%` }}
                />
              </div>
            </div>
          ))}

          {subscription?.currentPeriodEnd && (
            <p className="border-t border-line pt-4 text-[13px] text-muted">
              {subscription.cancelAtPeriodEnd ? 'Access ends' : 'Renews'} on{' '}
              <span className="font-medium text-ink">{formatDate(subscription.currentPeriodEnd)}</span>
              {subscription.gateway !== 'none' && ` · billed ${subscription.interval} via ${subscription.gateway}`}
            </p>
          )}

          {subscription?.hasCustomer && canManage && (
            <Button variant="secondary" size="sm" onClick={openPortal} loading={busy}>
              <CreditCard className="h-4 w-4" />
              Manage payment method
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </CardBody>
      </Card>

      <div>
        <h2 className="mb-1 text-lg font-semibold tracking-tight text-ink">Available plans</h2>
        <p className="mb-6 text-sm text-muted">
          Prices, limits and features are stored in your database and edited from the admin panel.
        </p>
        <div className={busy ? 'pointer-events-none opacity-60' : undefined}>
          <PricingTable
            plans={plans}
            currencySymbol={currencySymbol}
            currentPlanSlug={currentSlug}
            onSelect={selectPlan}
          />
        </div>
      </div>

      {invoices.length > 0 && (
        <Card>
          <CardHeader title="Billing history" description="Invoices recorded from your payment gateway" />
          <CardBody className="p-0">
            <ul className="divide-y divide-line">
              {invoices.map((invoice) => (
                <li key={invoice.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-elevated text-muted">
                    <Receipt className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-ink">
                      {invoice.number ?? `Invoice ${invoice.id.slice(-8)}`}
                    </p>
                    <p className="text-[11px] text-muted">{formatDate(invoice.createdAt)}</p>
                  </div>
                  <span className="font-mono text-[13px] text-ink">
                    {formatCurrency(invoice.amount, currencySymbol)}
                  </span>
                  <Badge tone={invoice.status === 'PAID' ? 'success' : 'danger'}>
                    {invoice.status.toLowerCase()}
                  </Badge>
                  {invoice.hostedUrl && (
                    <a
                      href={invoice.hostedUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="rounded-lg p-1.5 text-muted hover:bg-elevated hover:text-ink"
                      aria-label="View invoice"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {/* Honest about the deployment's actual state. */}
      {!billingLive && (
        <div className="flex gap-3 rounded-xl border border-warn/20 bg-warn/10 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-warn" />
          <div>
            <p className="text-sm font-medium text-ink">No payment gateway is configured</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              Stripe and Razorpay are both fully implemented in this codebase — checkout, signed
              webhooks, subscription lifecycle and invoices. They are simply not switched on here.
              Set <span className="font-mono text-ink">STRIPE_SECRET_KEY</span> and{' '}
              <span className="font-mono text-ink">STRIPE_WEBHOOK_SECRET</span> (or the Razorpay
              equivalents), add your price IDs in Admin → Plans, and paid plans become purchasable.
              See <span className="font-mono text-ink">documentation/payments.md</span>.
            </p>
          </div>
        </div>
      )}

      {/* ------------------------ Gateway / interval ------------------------ */}
      <Dialog
        open={Boolean(choosing)}
        onClose={() => setChoosing(null)}
        title={`Subscribe to ${choosing?.name}`}
        description="Choose how you would like to pay."
        size="sm"
      >
        {choosing && (
          <div className="space-y-4">
            {(['monthly', 'yearly'] as const).map((interval) => (
              <div key={interval}>
                <p className="mb-2 text-[13px] font-medium capitalize text-ink">
                  {interval} — {currencySymbol}
                  {interval === 'monthly' ? choosing.priceMonthly : choosing.priceYearly}
                </p>
                <div className="flex flex-wrap gap-2">
                  {gateways.map((gateway) => (
                    <Button
                      key={`${interval}-${gateway.id}`}
                      size="sm"
                      variant="secondary"
                      loading={busy}
                      onClick={() => startCheckout(choosing, gateway.id, interval)}
                    >
                      Pay with {gateway.label}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Dialog>
    </div>
  )
}
