import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { getCurrentUser } from '@/lib/auth'
import { getWorkspaceContext } from '@/lib/workspace'
import { getPlanUsage } from '@/lib/plans'
import { getSettings } from '@/lib/settings'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const context = await getWorkspaceContext()
  // An account with no workspace cannot use the app; onboarding creates one.
  if (!context) redirect('/onboarding')

  const [settings, usage, memberships, unread] = await Promise.all([
    getSettings(),
    getPlanUsage(context.workspaceId),
    prisma.workspaceMember.findMany({
      where: { userId: user.id },
      include: { workspace: { select: { id: true, name: true, slug: true, isPersonal: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ])

  return (
    <AppShell
      user={user}
      appName={settings.appName}
      logoUrl={settings.logoUrl || undefined}
      usage={usage}
      unreadCount={unread}
      workspace={{
        id: context.workspaceId,
        name: context.workspaceName,
        role: context.role,
        isPersonal: context.isPersonal,
      }}
      workspaces={memberships.map((membership) => ({
        id: membership.workspace.id,
        name: membership.workspace.name,
        isPersonal: membership.workspace.isPersonal,
        role: membership.role,
      }))}
    >
      {children}
    </AppShell>
  )
}
