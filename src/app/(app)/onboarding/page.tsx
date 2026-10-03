import { redirect } from 'next/navigation'
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow'
import { getCurrentUser } from '@/lib/auth'
import { getWorkspaceContext } from '@/lib/workspace'
import { getSettings } from '@/lib/settings'
import { isEmailConfigured } from '@/lib/email'
import { env } from '@/lib/env'
import { prisma } from '@/lib/db'

export const metadata = { title: 'Get started' }
export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const context = await getWorkspaceContext()
  const [settings, templates] = await Promise.all([
    getSettings(),
    prisma.agentTemplate.findMany({
      where: { status: 'PUBLISHED', featured: true },
      orderBy: { name: 'asc' },
      take: 4,
      select: { id: true, name: true, description: true, icon: true, category: true },
    }),
  ])

  return (
    <OnboardingFlow
      appName={settings.appName}
      userName={user.name}
      demoMode={env.demoMode}
      emailConfigured={isEmailConfigured()}
      emailVerified={Boolean(user.emailVerifiedAt)}
      workspaceName={context?.workspaceName ?? ''}
      hasWorkspace={Boolean(context)}
      templates={templates}
    />
  )
}
