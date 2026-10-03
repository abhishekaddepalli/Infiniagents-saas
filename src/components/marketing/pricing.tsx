'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type PricingPlan = {
  id: string
  name: string
  slug: string
  description: string
  priceMonthly: number
  priceYearly: number
  features: string[]
  highlighted: boolean
}

export function PricingTable({
  plans,
  currencySymbol = '$',
  ctaHref = '/register',
  currentPlanSlug,
  onSelect,
}: {
  plans: PricingPlan[]
  currencySymbol?: string
  ctaHref?: string
  currentPlanSlug?: string
  onSelect?: (plan: PricingPlan) => void
}) {
  const [yearly, setYearly] = useState(false)

  return (
    <div>
      <div className="mb-8 flex items-center justify-center gap-3">
        <span className={cn('text-sm', !yearly ? 'font-medium text-ink' : 'text-muted')}>Monthly</span>
        <button
          role="switch"
          aria-checked={yearly}
          aria-label="Switch to yearly billing"
          onClick={() => setYearly((value) => !value)}
          className={cn('relative h-6 w-11 rounded-full transition-colors', yearly ? 'bg-brand-600' : 'bg-line')}
        >
          <span
            className={cn(
              'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
              yearly ? 'translate-x-[22px]' : 'translate-x-0.5',
            )}
          />
        </button>
        <span className={cn('text-sm', yearly ? 'font-medium text-ink' : 'text-muted')}>
          Yearly <span className="text-brand-600 dark:text-brand-300">· 2 months free</span>
        </span>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const price = yearly ? plan.priceYearly : plan.priceMonthly
          const isCurrent = currentPlanSlug === plan.slug
          return (
            <div
              key={plan.id}
              className={cn(
                'relative flex flex-col rounded-2xl border bg-surface p-6',
                plan.highlighted ? 'border-brand-600 shadow-pop' : 'border-line shadow-card',
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-6 rounded-full bg-brand-600 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                  Most popular
                </span>
              )}

              <h3 className="text-base font-semibold text-ink">{plan.name}</h3>
              <p className="mt-1 min-h-[36px] text-[13px] text-muted">{plan.description}</p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-semibold tracking-tight text-ink">
                  {currencySymbol}
                  {price}
                </span>
                <span className="text-sm text-muted">/{yearly ? 'year' : 'month'}</span>
              </div>

              <ul className="mt-5 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2.5 text-[13px] text-muted">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {onSelect ? (
                  <Button
                    className="w-full"
                    variant={plan.highlighted ? 'primary' : 'secondary'}
                    disabled={isCurrent}
                    onClick={() => onSelect(plan)}
                  >
                    {isCurrent ? 'Current plan' : `Switch to ${plan.name}`}
                  </Button>
                ) : (
                  <Link href={ctaHref} className="block">
                    <Button className="w-full" variant={plan.highlighted ? 'primary' : 'secondary'}>
                      {plan.priceMonthly === 0 ? 'Start free' : `Choose ${plan.name}`}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
