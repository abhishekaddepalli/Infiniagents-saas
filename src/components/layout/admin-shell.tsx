'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  ArrowLeft, Bot, Braces, Building2, CreditCard, History, LayoutDashboard, Menu,
  Settings, Shield, Sparkles, Users, X,
} from 'lucide-react'
import { Logo } from '@/components/logo'
import { Topbar } from './topbar'
import { cn } from '@/lib/utils'
import type { SessionUser } from '@/lib/auth'

const links = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/workspaces', label: 'Workspaces', icon: Building2 },
  { href: '/admin/agents', label: 'Agents', icon: Bot },
  { href: '/admin/executions', label: 'Executions', icon: History },
  { href: '/admin/models', label: 'AI Models', icon: Braces },
  { href: '/admin/templates', label: 'Templates', icon: Sparkles },
  { href: '/admin/plans', label: 'Plans', icon: CreditCard },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

/** Admin chrome — visually distinct from the user dashboard on purpose. */
export function AdminShell({
  user,
  appName,
  logoUrl,
  children,
}: {
  user: SessionUser
  appName: string
  logoUrl?: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen">
      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-line bg-surface transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
          <Logo appName={appName} logoUrl={logoUrl} href="/admin" />
          <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-muted lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-line px-5 py-3">
          <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-300">
            <Shield className="h-3.5 w-3.5" />
            Admin panel
          </span>
        </div>

        <nav className="scroll-thin flex-1 space-y-0.5 overflow-y-auto p-3">
          {links.map((link) => {
            const active = link.href === '/admin' ? pathname === '/admin' : pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-brand-500/10 text-brand-600 dark:text-brand-300'
                    : 'text-muted hover:bg-elevated hover:text-ink',
                )}
              >
                <link.icon className="h-[18px] w-[18px] shrink-0" />
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="shrink-0 border-t border-line p-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-muted hover:bg-elevated hover:text-ink"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
            Back to app
          </Link>
        </div>
      </aside>

      <div className="lg:pl-64">
        <div className="flex items-center">
          <button
            onClick={() => setOpen(true)}
            className="ml-4 rounded-lg p-2 text-muted hover:bg-elevated lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <Topbar user={user} onMenu={() => setOpen(true)} />
          </div>
        </div>
        <main className="px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  )
}
