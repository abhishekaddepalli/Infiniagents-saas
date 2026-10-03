'use client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { BarChart3, Braces, Palette, Settings2, UserCog } from 'lucide-react'
import { Tabs } from '@/components/ui/tabs'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { useTheme } from '@/components/theme-provider'
import { ProviderSettings, type ProviderMeta } from './provider-settings'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatNumber, percentOf } from '@/lib/utils'
import type { PlanUsage } from '@/lib/plans'

type Tab = 'general' | 'providers' | 'appearance' | 'usage' | 'account'

export function SettingsTabs({
  providers,
  demoMode,
  planUsage,
  usageSummary,
  appName,
  supportEmail,
  currencySymbol,
  isAdmin,
}: {
  providers: ProviderMeta[]
  demoMode: boolean
  planUsage: PlanUsage
  usageSummary: { requests: number; tokens: number; cost: number }
  appName: string
  supportEmail: string
  currencySymbol: string
  isAdmin: boolean
}) {
  const params = useSearchParams()
  const router = useRouter()
  const toast = useToast()
  const { theme } = useTheme()
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'general')
  const [savingTheme, setSavingTheme] = useState(false)

  /** Persist the theme to the account so it follows the user across devices. */
  async function rememberTheme() {
    setSavingTheme(true)
    try {
      await fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme }),
      })
      toast.success('Theme saved to your account')
    } catch {
      toast.error('Could not save your theme preference')
    } finally {
      setSavingTheme(false)
    }
  }

  function select(next: Tab) {
    setTab(next)
    router.replace(`/settings?tab=${next}`, { scroll: false })
  }

  return (
    <div>
      <Tabs
        className="mb-6"
        value={tab}
        onChange={select}
        tabs={[
          { value: 'general', label: 'General', icon: Settings2 },
          { value: 'providers', label: 'AI Providers', icon: Braces },
          { value: 'appearance', label: 'Appearance', icon: Palette },
          { value: 'usage', label: 'Usage', icon: BarChart3 },
          { value: 'account', label: 'Account', icon: UserCog },
        ]}
      />

      {tab === 'general' && (
        <Card>
          <CardHeader title="General" description="Application-wide information" />
          <CardBody className="space-y-4">
            <Row label="Application name" value={appName} />
            <Row label="Support email" value={supportEmail} />
            <Row label="Current plan" value={planUsage.planName} />
            <p className="rounded-lg border border-line bg-bg p-3.5 text-[13px] leading-relaxed text-muted">
              {isAdmin ? (
                <>
                  Branding, currency, default model, and legal links are managed in{' '}
                  <Link href="/admin/settings" className="font-medium text-brand-600 dark:text-brand-300">
                    Admin → Settings
                  </Link>
                  .
                </>
              ) : (
                <>These values are configured by your administrator.</>
              )}
            </p>
          </CardBody>
        </Card>
      )}

      {tab === 'providers' && <ProviderSettings providers={providers} demoMode={demoMode} />}

      {tab === 'appearance' && (
        <Card>
          <CardHeader title="Appearance" description="Choose how the interface looks on this device" />
          <CardBody className="space-y-4">
            <div className="max-w-sm">
              <ThemeToggle full />
            </div>
            <p className="text-[13px] text-muted">
              <span className="font-medium text-ink">System</span> follows your operating system setting and updates
              automatically when it changes.
            </p>
            <Button variant="secondary" size="sm" onClick={rememberTheme} loading={savingTheme}>
              Save to my account
            </Button>
          </CardBody>
        </Card>
      )}

      {tab === 'usage' && (
        <div className="space-y-5">
          <Card>
            <CardHeader title="Plan limits" description={`Your ${planUsage.planName} plan allowance`} />
            <CardBody className="space-y-5">
              {[
                { label: 'AI agents', ...planUsage.agents },
                { label: 'Automations', ...planUsage.automations },
                { label: 'AI requests this month', ...planUsage.requests },
              ].map((row) => (
                <div key={row.label}>
                  <div className="mb-1.5 flex justify-between text-[13px]">
                    <span className="text-ink">{row.label}</span>
                    <span className="font-mono text-muted">
                      {row.used} {row.limit === -1 ? '/ unlimited' : `/ ${row.limit}`}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
                    <div
                      className={`h-full rounded-full ${
                        percentOf(row.used, row.limit) >= 90 ? 'bg-warn' : 'bg-brand-600'
                      }`}
                      style={{ width: `${Math.max(percentOf(row.used, row.limit), 2)}%` }}
                    />
                  </div>
                </div>
              ))}
              <Link href="/billing">
                <Button variant="secondary" size="sm">
                  Manage plan
                </Button>
              </Link>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Lifetime usage" description="Across every agent and automation" />
            <CardBody>
              <dl className="grid gap-4 sm:grid-cols-3">
                <Metric label="AI requests" value={formatNumber(usageSummary.requests)} />
                <Metric label="Tokens used" value={formatNumber(usageSummary.tokens)} />
                <Metric label="Estimated cost" value={formatCurrency(usageSummary.cost, currencySymbol)} />
              </dl>
              <Link href="/usage" className="mt-4 inline-block">
                <Button variant="secondary" size="sm">
                  View detailed usage
                </Button>
              </Link>
            </CardBody>
          </Card>
        </div>
      )}

      {tab === 'account' && (
        <Card>
          <CardHeader title="Account" description="Your personal details and password" />
          <CardBody className="space-y-4">
            <p className="text-[13px] text-muted">
              Update your name, email, avatar, and password from your profile page.
            </p>
            <Link href="/profile">
              <Button>Go to profile</Button>
            </Link>
          </CardBody>
        </Card>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="text-[13px] font-medium text-ink">{value}</span>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-bg p-4">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tracking-tight text-ink">{value}</dd>
    </div>
  )
}
