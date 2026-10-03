'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'

/** Lightweight CSS tooltip — no positioning library needed. */
export function Tooltip({
  label,
  children,
  side = 'top',
}: {
  label: string
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={cn(
            'pointer-events-none absolute z-50 w-max max-w-xs animate-fade-in rounded-md bg-ink px-2 py-1 text-xs font-medium text-bg shadow-pop',
            positions[side],
          )}
        >
          {label}
        </span>
      )}
    </span>
  )
}
