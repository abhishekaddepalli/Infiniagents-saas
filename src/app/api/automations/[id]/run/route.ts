import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, route } from '@/lib/api'
import { requireWorkspace } from '@/lib/workspace'
import { runAutomation } from '@/lib/automation/engine'
import { limit } from '@/lib/rate-limit'

type Context = { params: Promise<{ id: string }> }

const bodySchema = z.object({ input: z.string().max(10000).default('') })

/** Manual trigger — runs the workflow and returns the full result. */
export const POST = route(async (request: NextRequest, context: Context) => {
  const { workspaceId, user } = await requireWorkspace()
  limit(`run:${user.id}`, 20, 60_000)

  const { id } = await context.params
  const { input } = bodySchema.parse(await request.json().catch(() => ({})))

  const result = await runAutomation({
    automationId: id,
    workspaceId,
    userId: user.id,
    input,
    source: 'MANUAL',
  })
  return ok(result)
})
