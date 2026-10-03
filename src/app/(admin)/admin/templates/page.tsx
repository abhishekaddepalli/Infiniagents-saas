import { PageHeader } from '@/components/layout/page-header'
import { TemplateManager } from '@/components/admin/template-manager'
import { requireAdmin } from '@/lib/auth'
import { getEnabledModels } from '@/lib/models'
import { prisma } from '@/lib/db'

export const metadata = { title: 'Templates' }
export const dynamic = 'force-dynamic'

export default async function AdminTemplatesPage() {
  await requireAdmin()
  const [templates, models] = await Promise.all([
    prisma.agentTemplate.findMany({ orderBy: [{ featured: 'desc' }, { name: 'asc' }] }),
    getEnabledModels(),
  ])

  return (
    <div>
      <PageHeader
        title="Templates"
        description="The ready-made agents your users can add in one click."
      />
      <TemplateManager
        templates={templates}
        models={models.map((model) => ({ provider: model.provider, modelId: model.modelId, name: model.name }))}
      />
    </div>
  )
}
