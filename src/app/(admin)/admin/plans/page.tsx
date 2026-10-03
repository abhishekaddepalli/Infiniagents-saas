import { PageHeader } from '@/components/layout/page-header'
import { PlanManager } from '@/components/admin/plan-manager'
import { requireAdmin } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { prisma } from '@/lib/db'

export const metadata = { title: 'Plans' }
export const dynamic = 'force-dynamic'

export default async function AdminPlansPage() {
  await requireAdmin()
  const [plans, settings] = await Promise.all([
    prisma.plan.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { subscriptions: true } } },
    }),
    getSettings(),
  ])

  return (
    <div>
      <PageHeader
        title="Plans"
        description="Prices, limits, and features for every plan. Changes apply to subscribers immediately."
      />
      <PlanManager
        currencySymbol={settings.currencySymbol}
        plans={plans.map((plan) => ({
          id: plan.id,
          name: plan.name,
          slug: plan.slug,
          description: plan.description,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          maxAgents: plan.maxAgents,
          maxRequests: plan.maxRequests,
          maxAutomations: plan.maxAutomations,
          maxMembers: plan.maxMembers,
          maxDocuments: plan.maxDocuments,
          stripePriceMonthlyId: plan.stripePriceMonthlyId,
          stripePriceYearlyId: plan.stripePriceYearlyId,
          razorpayPlanMonthlyId: plan.razorpayPlanMonthlyId,
          razorpayPlanYearlyId: plan.razorpayPlanYearlyId,
          features: plan.features,
          highlighted: plan.highlighted,
          active: plan.active,
          subscribers: plan._count.subscriptions,
        }))}
      />
    </div>
  )
}
