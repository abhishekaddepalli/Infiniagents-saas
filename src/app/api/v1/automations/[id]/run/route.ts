import { NextRequest } from 'next/server'
import { ok, route } from '@/lib/api'
import { requireApiKey } from '@/lib/api-keys'
import { apiRunSchema } from '@/lib/validation'
import { runAutomation } from '@/lib/automation/engine'
import { clientIp, limit } from '@/lib/rate-limit'

type Context = { params: Promise<{ id: string }> }

/**
 * POST /api/v1/automations/:id/run — run a workflow and return its result.
 * Scope: automations:run
 */
export const POST = route(async (request: NextRequest, context: Context) => {
  const { workspaceId, keyId } = await requireApiKey(request, 'automations:run')
  limit(`v1run:${keyId}:${clientIp(request)}`, 30, 60_000)

  const { id } = await context.params
  const { input } = apiRunSchema.parse(await request.json().catch(() => ({})))

  const result = await runAutomation({
    automationId: id,
    workspaceId,
    userId: null,
    input,
    source: 'API',
  })

  return ok({
    data: {
      executionId: result.executionId,
      status: result.status,
      output: result.output,
      error: result.error,
      steps: result.steps.map((step) => ({
        label: step.label,
        type: step.type,
        status: step.status,
        ms: step.ms,
      })),
      usage: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsd: result.costUsd,
      },
      durationMs: result.durationMs,
    },
  })
})
