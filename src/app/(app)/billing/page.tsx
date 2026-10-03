import { PageHeader } from '@/components/layout/page-header'
import { BillingPanel } from '@/components/settings/billing-panel'
import { requireWorkspace, hasAtLeast } from '@/lib/workspace'
import { getPlanUsage, getWorkspacePlan } from '@/lib/plans'
import { getSettings } from '@/lib/settings'
import { configuredGateways } from '@/lib/billing'
import { prisma } from '@/lib/db'

export const metadata = { title: 'Plan & Billing' }
export const dynamic = 'force-dynamic'

export default async function BillingPage() {
  const context = await requireWorkspace()
  const { workspaceId } = context

  const [plans, planUsage, currentPlan, settings, subscription, invoices] = await Promise.all([
    prisma.plan.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    getPlanUsage(workspaceId),
    getWorkspacePlan(workspaceId),
    getSettings(),
    prisma.subscription.findUnique({ where: { workspaceId } }),
    prisma.invoice.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
  ])

  return (
    <div>
      <PageHeader
        title="Plan & Billing"
        description={`What ${context.workspaceName} is allowed to do, and how it is billed.`}
      />
      <BillingPanel
        plans={plans}
        planUsage={planUsage}
        currentSlug={currentPlan?.slug ?? 'free'}
        currencySymbol={settings.currencySymbol}
        canManage={hasAtLeast(context.role, 'ADMIN')}
        gateways={configuredGateways().map((gateway) => ({ id: gateway.id, label: gateway.label }))}
        subscription={
          subscription
            ? {
                status: subscription.status,
                gateway: subscription.gateway,
                interval: subscription.interval,
                cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
                currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
                hasCustomer: Boolean(subscription.externalCustomerId),
              }
            : null
        }
        invoices={invoices.map((invoice) => ({
          id: invoice.id,
          number: invoice.number,
          amount: invoice.amount,
          currency: invoice.currency,
          status: invoice.status,
          hostedUrl: invoice.hostedUrl,
          createdAt: invoice.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}
