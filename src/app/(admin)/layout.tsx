import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/layout/admin-shell'
import { getCurrentUser } from '@/lib/auth'
import { getSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

/**
 * Admin gate.
 *
 * This template uses a role on the user record rather than a separate admin
 * login, so there is one identity and one session to reason about. Every admin
 * API route calls `requireAdmin()` independently — this layout is the UI half
 * of that check, not the whole of it.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'ADMIN') redirect('/dashboard')

  const settings = await getSettings()

  return (
    <AdminShell user={user} appName={settings.appName} logoUrl={settings.logoUrl || undefined}>
      {children}
    </AdminShell>
  )
}
