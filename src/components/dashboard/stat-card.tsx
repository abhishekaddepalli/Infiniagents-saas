import { cn } from '@/lib/utils'
import { Sparkline } from '@/components/charts/sparkline'

/** Headline metric tile. The number is the point — everything else is quiet. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  className,
}: {
  label: string
  value: string
  hint?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: number[]
  className?: string
}) {
  return (
    <div className={cn('min-w-0 rounded-xl border border-line bg-surface p-4 shadow-card sm:p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-300">
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold tracking-tight text-ink sm:text-2xl">{value}</p>
          {hint && <p className="mt-0.5 truncate text-xs text-muted">{hint}</p>}
        </div>
        {/* Hidden on the narrowest screens so the hint text keeps its room. */}
        {trend && trend.length > 1 && (
          <span className="hidden sm:block">
            <Sparkline values={trend} />
          </span>
        )}
      </div>
    </div>
  )
}
