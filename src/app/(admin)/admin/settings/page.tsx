import { PageHeader } from '@/components/layout/page-header'
import { GlobalSettings } from '@/components/admin/global-settings'
import { requireAdmin } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { getEnabledModels } from '@/lib/models'

export const metadata = { title: 'Global settings' }
export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  await requireAdmin()
  const [settings, models] = await Promise.all([getSettings(), getEnabledModels()])

  return (
    <div>
      <PageHeader
        title="Global settings"
        description="Branding, contact details, and the defaults applied across the whole application."
      />
      <GlobalSettings
        settings={settings}
        models={models.map((model) => ({ provider: model.provider, modelId: model.modelId, name: model.name }))}
      />
    </div>
  )
}
