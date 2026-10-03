'use client'
import { useRouter } from 'next/navigation'
import { Bell, LogOut, Menu, Plus, Settings, User as UserIcon } from 'lucide-react'
import Link from 'next/link'
import { Dropdown } from '@/components/ui/dropdown'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { initials } from '@/lib/utils'
import type { SessionUser } from '@/lib/auth'

export function Topbar({
  user,
  unreadCount = 0,
  onMenu,
}: {
  user: SessionUser
  unreadCount?: number
  onMenu: () => void
}) {
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-bg/80 px-4 backdrop-blur-lg sm:px-6">
      <button onClick={onMenu} className="rounded-lg p-2 text-muted hover:bg-elevated lg:hidden" aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>

      <div className="ml-auto flex items-center gap-2">
        <Link href="/agents/new" className="hidden sm:block">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            New Agent
          </Button>
        </Link>

        <Link
          href="/notifications"
          className="relative rounded-lg p-2 text-muted transition-colors hover:bg-elevated hover:text-ink"
          aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-medium text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        <ThemeToggle />

        <Dropdown
          trigger={
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-[13px] font-medium text-white"
              aria-label="Account menu"
            >
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                initials(user.name)
              )}
            </button>
          }
          items={[
            { label: 'Profile', icon: UserIcon, onClick: () => router.push('/profile') },
            { label: 'Settings', icon: Settings, onClick: () => router.push('/settings') },
            { label: 'Sign out', icon: LogOut, onClick: logout, danger: true },
          ]}
        />
      </div>
    </header>
  )
}
