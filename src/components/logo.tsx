import Link from 'next/link'
import { Workflow } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Product logo.
 *
 * Branding: set a Logo URL under Admin → Settings to replace the icon with
 * your own image, or edit this component to drop in an SVG directly.
 */
export function Logo({
  appName,
  logoUrl,
  href,
  className,
  compact,
}: {
  appName: string
  logoUrl?: string
  href?: string
  className?: string
  compact?: boolean
}) {
  const content = (
    <span className={cn('flex items-center gap-2.5', className)}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={appName} className="h-8 w-8 rounded-lg object-contain" />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Workflow className="h-[18px] w-[18px]" />
        </span>
      )}
      {!compact && <span className="text-[15px] font-semibold tracking-tight text-ink">{appName}</span>}
    </span>
  )

  return href ? <Link href={href}>{content}</Link> : content
}
