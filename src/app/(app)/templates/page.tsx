import { PageHeader } from '@/components/layout/page-header'
import { TemplateGrid } from '@/components/templates/template-grid'
import { requireWorkspace } from '@/lib/workspace'
import { prisma } from '@/lib/db'

export const metadata = { title: 'AI Templates' }
export const dynamic = 'force-dynamic'

export default async function TemplatesPage() {
  await requireWorkspace()
  const templates = await prisma.agentTemplate.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: [{ featured: 'desc' }, { name: 'asc' }],
    select: {
      id: true, name: true, description: true, category: true, icon: true,
      provider: true, model: true, systemPrompt: true, temperature: true, featured: true,
    },
  })

  return (
    <div>
      <PageHeader
        title="AI Templates"
        description="Ready-made agents you can add to your account in one click, then customise however you like."
      />
      <TemplateGrid templates={templates} />
    </div>
  )
}
