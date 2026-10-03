import { Suspense } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { SettingsTabs } from '@/components/settings/settings-tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { requireWorkspace } from '@/lib/workspace'
import { getSettings } from '@/lib/settings'
import { getPlanUsage } from '@/lib/plans'
import { providerList } from '@/lib/ai'
import { env } from '@/lib/env'
import { prisma } from '@/lib/db'

export const metadata = { title: 'Settings' }
export const dynamic = 'force-dynamic'

const envKeys: Record<string, () => boolean> = {
  OPENAI: () => Boolean(env.openaiKey),
  GEMINI: () => Boolean(env.geminiKey),
  ANTHROPIC: () => Boolean(env.anthropicKey),
}

export default async function SettingsPage() {
  const { workspaceId, user } = await requireWorkspace()
  const [settings, planUsage, keys, usage] = await Promise.all([
    getSettings(),
    getPlanUsage(workspaceId),
    prisma.providerKey.findMany({
      where: { workspaceId },
      select: { provider: true, keyHint: true, verifiedAt: true },
    }),
    prisma.aiUsage.aggregate({
      where: { workspaceId },
      _count: true,
      _sum: { inputTokens: true, outputTokens: true, costUsd: true },
    }),
  ])

  const keyByProvider = new Map(keys.map((key) => [key.provider, key]))

  return (
    <div>
      <PageHeader title="Settings" description="Configure providers, appearance, and how your account behaves." />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <SettingsTabs
          demoMode={env.demoMode}
          appName={settings.appName}
          supportEmail={settings.supportEmail}
          currencySymbol={settings.currencySymbol}
          planUsage={planUsage}
          isAdmin={user.role === 'ADMIN'}
          usageSummary={{
            requests: usage._count,
            tokens: (usage._sum.inputTokens ?? 0) + (usage._sum.outputTokens ?? 0),
            cost: usage._sum.costUsd ?? 0,
          }}
          providers={providerList.map((provider) => {
            const stored = keyByProvider.get(provider.id)
            return {
              id: provider.id,
              label: provider.label,
              consoleUrl: provider.consoleUrl,
              keyPlaceholder: provider.keyPlaceholder,
              keyHint: stored?.keyHint ?? null,
              verifiedAt: stored?.verifiedAt?.toISOString() ?? null,
              hasEnvKey: envKeys[provider.id]?.() ?? false,
            }
          })}
        />
      </Suspense>
    </div>
  )
}
