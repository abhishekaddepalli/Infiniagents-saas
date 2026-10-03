'use client'
import { useState } from 'react'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import type { SessionUser } from '@/lib/auth'
import type { PlanUsage } from '@/lib/plans'
import type { WorkspaceOption } from './workspace-switcher'

/**
 * Dashboard chrome. The sidebar is a fixed column from `lg` up and a slide-out
 * drawer below it, so the whole product works on a phone.
 */
export function AppShell({
  user,
  appName,
  logoUrl,
  usage,
  workspace,
  workspaces,
  unreadCount,
  children,
}: {
  user: SessionUser
  appName: string
  logoUrl?: string
  usage: PlanUsage
  workspace: WorkspaceOption
  workspaces: WorkspaceOption[]
  unreadCount: number
  children: React.ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen">
      <Sidebar
        appName={appName}
        logoUrl={logoUrl}
        isAdmin={user.role === 'ADMIN'}
        usage={usage}
        workspace={workspace}
        workspaces={workspaces}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <div className="lg:pl-64">
        <Topbar user={user} unreadCount={unreadCount} onMenu={() => setMenuOpen(true)} />
        <main className="px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  )
}
