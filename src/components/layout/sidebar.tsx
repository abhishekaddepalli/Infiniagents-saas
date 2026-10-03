'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3, Bot, BookOpen, CreditCard, History, KeyRound, LayoutDashboard, Library,
  MessageSquare, ScrollText, Settings, Shield, Sparkles, Users, Workflow, X,
} from 'lucide-react'
import { Logo } from '@/components/logo'
import { WorkspaceSwitcher, type WorkspaceOption } from './workspace-switcher'
import { cn } from '@/lib/utils'
import { percentOf } from '@/lib/utils'
import type { PlanUsage } from '@/lib/plans'

const sections = [
  {
    title: null,
    items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Build',
    items: [
      { href: '/agents', label: 'AI Agents', icon: Bot },
      { href: '/playground', label: 'Playground', icon: MessageSquare },
      { href: '/automations', label: 'Automations', icon: Workflow },
    ],
  },
  {
    title: 'Knowledge',
    items: [
      { href: '/knowledge', label: 'Knowledge Bases', icon: BookOpen },
      { href: '/templates', label: 'AI Templates', icon: Sparkles },
      { href: '/prompts', label: 'Prompts', icon: Library },
    ],
  },
  {
    title: 'Insights',
    items: [
      { href: '/executions', label: 'Execution History', icon: History },
      { href: '/usage', label: 'Usage', icon: BarChart3 },
      { href: '/billing', label: 'Plan & Billing', icon: CreditCard },
    ],
  },
  {
    title: 'Workspace',
    items: [
      { href: '/team', label: 'Team', icon: Users },
      { href: '/api-keys', label: 'API Keys', icon: KeyRound },
      { href: '/audit', label: 'Audit Log', icon: ScrollText },
    ],
  },
]

export function Sidebar({
  appName,
  logoUrl,
  isAdmin,
  usage,
  workspace,
  workspaces,
  open,
  onClose,
}: {
  appName: string
  logoUrl?: string
  isAdmin: boolean
  usage: PlanUsage
  workspace: WorkspaceOption
  workspaces: WorkspaceOption[]
  open: boolean
  onClose: () => void
}) {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <>
      {/* Backdrop for the mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-line bg-surface transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
          <Logo appName={appName} logoUrl={logoUrl} href="/dashboard" />
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted lg:hidden" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="shrink-0 px-3 pt-3">
          <WorkspaceSwitcher current={workspace} workspaces={workspaces} />
        </div>

        <nav className="scroll-thin flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {sections.map((section, index) => (
            <div key={section.title ?? index}>
              {section.title && (
                <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-faint">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                      isActive(item.href)
                        ? 'bg-brand-500/10 text-brand-600 dark:text-brand-300'
                        : 'text-muted hover:bg-elevated hover:text-ink',
                    )}
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {isAdmin && (
            <div>
              <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-faint">
                Administration
              </p>
              <Link
                href="/admin"
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                  isActive('/admin')
                    ? 'bg-brand-500/10 text-brand-600 dark:text-brand-300'
                    : 'text-muted hover:bg-elevated hover:text-ink',
                )}
              >
                <Shield className="h-[18px] w-[18px] shrink-0" />
                Admin Panel
              </Link>
            </div>
          )}
        </nav>

        {/* Plan usage summary */}
        <div className="shrink-0 border-t border-line p-3">
          <div className="rounded-xl border border-line bg-bg p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-ink">{usage.planName} plan</span>
              <Link href="/billing" className="text-[11px] font-medium text-brand-600 dark:text-brand-300">
                Manage
              </Link>
            </div>

            <div className="mt-3 space-y-2.5">
              {[
                { label: 'Agents', ...usage.agents },
                { label: 'Requests', ...usage.requests },
              ].map((row) => (
                <div key={row.label}>
                  <div className="mb-1 flex justify-between text-[11px] text-muted">
                    <span>{row.label}</span>
                    <span className="font-mono">
                      {row.used}
                      {row.limit === -1 ? '' : ` / ${row.limit}`}
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-elevated">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        percentOf(row.used, row.limit) >= 90 ? 'bg-warn' : 'bg-brand-600',
                      )}
                      style={{ width: `${Math.max(percentOf(row.used, row.limit), 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Link
            href="/settings"
            onClick={onClose}
            className={cn(
              'mt-2 flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
              isActive('/settings')
                ? 'bg-brand-500/10 text-brand-600 dark:text-brand-300'
                : 'text-muted hover:bg-elevated hover:text-ink',
            )}
          >
            <Settings className="h-[18px] w-[18px]" />
            Settings
          </Link>
        </div>
      </aside>
    </>
  )
}
