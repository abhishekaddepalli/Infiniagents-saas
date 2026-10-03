import { cn } from '@/lib/utils'

/**
 * Table primitives. The wrapper scrolls horizontally on small screens so wide
 * tables (executions, users) stay usable on mobile.
 */
export function TableWrap({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('scroll-thin w-full overflow-x-auto rounded-xl border border-line bg-surface', className)}>
      {children}
    </div>
  )
}

export function Table({ children }: { children: React.ReactNode }) {
  return <table className="w-full min-w-[640px] border-collapse text-sm">{children}</table>
}

export function Th({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <th
      className={cn(
        'border-b border-line px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted',
        className,
      )}
    >
      {children}
    </th>
  )
}

export function Td({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('border-b border-line px-4 py-3 text-ink', className)} {...props}>
      {children}
    </td>
  )
}

export function Tr({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn('transition-colors last:[&>td]:border-0 hover:bg-elevated/60', className)} {...props}>
      {children}
    </tr>
  )
}
