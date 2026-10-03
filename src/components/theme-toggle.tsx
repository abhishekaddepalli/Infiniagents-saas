'use client'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type Theme } from './theme-provider'
import { cn } from '@/lib/utils'

const options: { value: Theme; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

/** Three-way theme switch: Light / Dark / System. */
export function ThemeToggle({ full }: { full?: boolean }) {
  const { theme, setTheme } = useTheme()
  return (
    <div
      className={cn('inline-flex gap-0.5 rounded-lg border border-line bg-surface p-0.5', full && 'w-full')}
      role="radiogroup"
      aria-label="Colour theme"
    >
      {options.map((option) => {
        const Icon = option.icon
        const active = theme === option.value
        return (
          <button
            key={option.value}
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(option.value)}
            title={option.label}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
              full && 'flex-1',
              active ? 'bg-elevated text-ink shadow-sm' : 'text-muted hover:text-ink',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {full && option.label}
          </button>
        )
      })}
    </div>
  )
}
