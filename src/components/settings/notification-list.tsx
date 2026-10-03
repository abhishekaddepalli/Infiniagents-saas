'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AlertTriangle, Bell, CheckCircle2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { cn, timeAgo } from '@/lib/utils'

export type NotificationRow = {
  id: string
  type: string
  title: string
  body: string
  link: string | null
  read: boolean
  createdAt: string
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertTriangle,
}

const TONES: Record<string, string> = {
  info: 'bg-brand-500/10 text-brand-600 dark:text-brand-300',
  success: 'bg-ok/10 text-ok',
  warning: 'bg-warn/10 text-warn',
  error: 'bg-danger/10 text-danger',
}

export function NotificationList({ notifications }: { notifications: NotificationRow[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const unread = notifications.filter((notification) => !notification.read).length

  async function markAllRead() {
    setBusy(true)
    try {
      await fetch('/api/notifications', { method: 'PATCH' })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="No notifications"
        description="Workspace activity — invitations, failed runs and billing events — will appear here."
      />
    )
  }

  return (
    <div>
      {unread > 0 && (
        <div className="mb-4 flex justify-end">
          <Button variant="secondary" size="sm" onClick={markAllRead} loading={busy}>
            Mark all as read
          </Button>
        </div>
      )}

      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
        {notifications.map((notification) => {
          const Icon = ICONS[notification.type] ?? Info
          const content = (
            <div
              className={cn(
                'flex gap-3 px-5 py-4 transition-colors',
                !notification.read && 'bg-brand-500/[0.04]',
                notification.link && 'hover:bg-elevated',
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                  TONES[notification.type] ?? TONES.info,
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[14px] font-medium text-ink">
                  {notification.title}
                  {!notification.read && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />
                  )}
                </p>
                {notification.body && (
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{notification.body}</p>
                )}
                <p className="mt-1 text-[11px] text-faint">{timeAgo(notification.createdAt)}</p>
              </div>
            </div>
          )

          return (
            <li key={notification.id}>
              {notification.link ? <Link href={notification.link}>{content}</Link> : content}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
