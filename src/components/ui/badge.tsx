import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger'

const tones: Record<Tone, string> = {
  neutral: 'bg-elevated text-muted border-line',
  brand: 'bg-brand-500/10 text-brand-600 border-brand-500/20 dark:text-brand-300',
  success: 'bg-ok/10 text-ok border-ok/20',
  warning: 'bg-warn/10 text-warn border-warn/20',
  danger: 'bg-danger/10 text-danger border-danger/20',
}

export function Badge({
  tone = 'neutral',
  className,
  children,
  dot,
}: {
  tone?: Tone
  className?: string
  children: React.ReactNode
  dot?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

/** Maps the domain status enums onto a consistent badge. */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: Tone; label: string }> = {
    ACTIVE: { tone: 'success', label: 'Active' },
    INACTIVE: { tone: 'neutral', label: 'Inactive' },
    DRAFT: { tone: 'neutral', label: 'Draft' },
    PAUSED: { tone: 'warning', label: 'Paused' },
    COMPLETED: { tone: 'success', label: 'Completed' },
    FAILED: { tone: 'danger', label: 'Failed' },
    RUNNING: { tone: 'brand', label: 'Running' },
    PUBLISHED: { tone: 'success', label: 'Published' },
    DISABLED: { tone: 'danger', label: 'Disabled' },
    CANCELED: { tone: 'neutral', label: 'Canceled' },
    EXPIRED: { tone: 'danger', label: 'Expired' },
  }
  const entry = map[status] ?? { tone: 'neutral' as Tone, label: status }
  return (
    <Badge tone={entry.tone} dot>
      {entry.label}
    </Badge>
  )
}
