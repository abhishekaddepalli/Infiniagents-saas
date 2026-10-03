import { PageHeader } from '@/components/layout/page-header'
import { ModelManager } from '@/components/admin/model-manager'
import { requireAdmin } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { prisma } from '@/lib/db'

export const metadata = { title: 'AI Models' }
export const dynamic = 'force-dynamic'

export default async function AdminModelsPage() {
  await requireAdmin()
  const [models, settings] = await Promise.all([
    prisma.aiModel.findMany({ orderBy: [{ provider: 'asc' }, { name: 'asc' }] }),
    getSettings(),
  ])

  return (
    <div>
      <PageHeader
        title="AI Models"
        description="The models your users can choose, and the prices every cost figure is calculated from."
      />
      <ModelManager models={models} currencySymbol={settings.currencySymbol} />
    </div>
  )
}
