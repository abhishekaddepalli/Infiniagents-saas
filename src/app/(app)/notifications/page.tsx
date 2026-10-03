import { Bell } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { NotificationList } from '@/components/settings/notification-list'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const metadata = { title: 'Notifications' }
export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const user = await requireUser()
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return (
    <div>
      <PageHeader title="Notifications" description="Activity from your workspaces." />
      <NotificationList
        notifications={notifications.map((notification) => ({
          id: notification.id,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          link: notification.link,
          read: Boolean(notification.readAt),
          createdAt: notification.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}
