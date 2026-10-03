import { PageHeader } from '@/components/layout/page-header'
import { PromptLibrary } from '@/components/templates/prompt-library'
import { requireWorkspace } from '@/lib/workspace'
import { prisma } from '@/lib/db'

export const metadata = { title: 'Prompt Library' }
export const dynamic = 'force-dynamic'

export default async function PromptsPage() {
  await requireWorkspace()
  const prompts = await prisma.prompt.findMany({ orderBy: [{ category: 'asc' }, { title: 'asc' }] })

  return (
    <div>
      <PageHeader
        title="Prompt Library"
        description="Reusable prompts you can copy into an agent's instructions or straight into the playground."
      />
      <PromptLibrary prompts={prompts} />
    </div>
  )
}
