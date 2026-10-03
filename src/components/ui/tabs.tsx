'use client'
import { cn } from '@/lib/utils'

/** Controlled tab strip used in settings and detail views. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { value: T; label: string; icon?: React.ComponentType<{ className?: string }> }[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={cn('scroll-thin flex gap-1 overflow-x-auto border-b border-line', className)} role="tablist">
      {tabs.map((tab) => {
        const active = tab.value === value
        const Icon = tab.icon
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'border-brand-600 text-ink'
                : 'border-transparent text-muted hover:border-line hover:text-ink',
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
